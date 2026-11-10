"use client";
import * as React from "react";
import { z } from "zod";

const schema = z
  .string()
  .trim()
  .toUpperCase()
  .regex(/^FHC\/[A-Z]+\/[A-Z]+\/\d+\/\d{4}$/, "Invalid case number format");

type TrackerResult = {
  maskedTitle?: string;
  status?: string;
  nextHearing?: { date: string; time: string; court: string } | null;
  presidingJudge?: string;
  lastUpdated?: string;
};
type State = { status: "idle" | "loading" | "found" | "notfound" | "invalid"; data?: TrackerResult; message?: string };

const LAGOS = "Africa/Lagos";

function formatDateTime(value?: string): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat("en-NG", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: LAGOS,
  }).format(date);
}

function humanise(status?: string): string {
  if (!status) return "Unknown";
  return status
    .toLowerCase()
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

export function PublicSearch() {
  const [number, setNumber] = React.useState("");
  const [state, setState] = React.useState<State>({ status: "idle" });

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    const parsed = schema.safeParse(number);
    if (!parsed.success) {
      setState({ status: "invalid", message: "Expected format FHC/DIVISION/TYPE/NUMBER/YEAR, e.g. FHC/L/CS/1042/2026." });
      return;
    }

    setState({ status: "loading" });
    const base = (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000") + "/api/v1";
    try {
      const res = await fetch(`${base}/public/track/${encodeURIComponent(parsed.data)}`, { credentials: "omit" });
      const payload: unknown = await res.json().catch(() => null);
      if (!res.ok) {
        const message =
          typeof payload === "object" && payload !== null && "message" in payload && typeof payload.message === "string"
            ? payload.message
            : "No case with that number is publicly available.";
        setState({ status: "notfound", message });
        return;
      }
      setState({ status: "found", data: payload as TrackerResult });
    } catch {
      setState({ status: "notfound", message: "We could not reach the tracker. Please try again." });
    }
  }

  const lastUpdated = formatDateTime(state.data?.lastUpdated);

  return (
    <div className="rounded-lg border border-border bg-surface-subtle p-4 sm:p-6">
      <form onSubmit={submit} className="flex flex-col gap-2 sm:flex-row">
        <label htmlFor="case-number" className="sr-only">
          Case number
        </label>
        <input
          id="case-number"
          className="min-h-[44px] flex-1 rounded-md border border-border bg-surface-page px-3 py-2 text-text-primary placeholder:text-text-muted focus-ring"
          placeholder="FHC/L/CS/1042/2026"
          value={number}
          onChange={(event) => setNumber(event.target.value.toUpperCase())}
          autoComplete="off"
          autoCapitalize="characters"
          spellCheck={false}
          aria-describedby="case-hint"
        />
        <button
          type="submit"
          disabled={state.status === "loading"}
          className="min-h-[44px] rounded-md bg-primary px-5 py-2 font-semibold text-primary-foreground transition-colors hover:bg-primary-hover focus-ring disabled:opacity-70"
        >
          {state.status === "loading" ? "Searching…" : "Search"}
        </button>
      </form>
      <p id="case-hint" className="mt-2 text-xs text-text-secondary">
        Format: FHC/DIVISION/TYPE/SEQ/YEAR. Letters are upper-cased automatically.
      </p>

      <div aria-live="polite" className="mt-4">
        {state.status === "loading" && <p className="text-sm text-text-secondary">Loading…</p>}

        {state.status === "invalid" && (
          <p role="alert" className="rounded-md border border-status-pending bg-status-pending-bg px-3 py-2 text-sm text-status-pending">
            {state.message}
          </p>
        )}

        {state.status === "notfound" && (
          <p role="alert" className="rounded-md border border-status-neutral bg-status-neutral-bg px-3 py-2 text-sm text-status-neutral">
            {state.message}
          </p>
        )}

        {state.status === "found" && state.data && (
          <article className="rounded-md border border-border bg-surface-page p-4">
            <h3 className="font-heading font-semibold text-text-primary">{state.data.maskedTitle ?? "Case record"}</h3>
            <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-text-secondary">Status</dt>
                <dd className="font-medium text-text-primary">{humanise(state.data.status)}</dd>
              </div>
              {state.data.presidingJudge ? (
                <div>
                  <dt className="text-text-secondary">Presiding judge</dt>
                  <dd className="font-medium text-text-primary">{state.data.presidingJudge}</dd>
                </div>
              ) : null}
              {lastUpdated ? (
                <div>
                  <dt className="text-text-secondary">Last updated</dt>
                  <dd className="font-medium text-text-primary">{lastUpdated}</dd>
                </div>
              ) : null}
              {state.data.nextHearing ? (
                <div>
                  <dt className="text-text-secondary">Next hearing</dt>
                  <dd className="font-medium text-text-primary">
                    {state.data.nextHearing.date} {state.data.nextHearing.time} — {state.data.nextHearing.court}
                  </dd>
                </div>
              ) : null}
            </dl>
          </article>
        )}
      </div>
    </div>
  );
}
