"use client";
import * as React from "react";
import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api, ApiError } from "../../lib/api";
import { StatusBadge, Spinner, EmptyState, Modal } from "../ui/primitives";
import { formatLagosDateTime } from "../../lib/datetime";

type Hearing = {
  id: string;
  scheduledAt: string;
  purpose?: string | null;
  status: string;
  notes?: string | null;
  case?: { id: string; title?: string; caseNumber?: string | null };
  court?: { id: string; name: string; number: string };
};

const LAGOS = "Africa/Lagos";

function dayKey(d: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: LAGOS,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

function dayLabel(d: Date): string {
  return new Intl.DateTimeFormat("en-NG", {
    timeZone: LAGOS,
    weekday: "short",
    day: "2-digit",
  }).format(d);
}

function timeOnly(d: Date): string {
  return new Intl.DateTimeFormat("en-NG", {
    timeZone: LAGOS,
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}

export default function JudgeDocket() {
  const qc = useQueryClient();
  const today = useQuery({
    queryKey: ["hearings", "today"],
    queryFn: () => api.get<Hearing[]>("/hearings/today"),
  });
  const week = useQuery({
    queryKey: ["hearings", "week"],
    queryFn: () => api.get<Hearing[]>("/hearings/week"),
  });

  const [detail, setDetail] = React.useState<Hearing | null>(null);
  const [adjournTarget, setAdjournTarget] = React.useState<Hearing | null>(null);
  const [adjournReason, setAdjournReason] = React.useState("");
  const [actionError, setActionError] = React.useState<string | null>(null);
  const [saving, setSaving] = React.useState(false);

  const weekBuckets = React.useMemo(() => {
    const start = new Date();
    const days: { key: string; label: string; hearings: Hearing[] }[] = [];
    const items = week.data ?? [];
    for (let i = 0; i < 7; i += 1) {
      const d = new Date(start.getTime() + i * 24 * 3600 * 1000);
      const key = dayKey(d);
      days.push({
        key,
        label: dayLabel(d),
        hearings: items.filter((h) => dayKey(new Date(h.scheduledAt)) === key),
      });
    }
    return days;
  }, [week.data]);

  async function adjourn() {
    if (!adjournTarget) return;
    if (adjournReason.trim().length < 5) {
      setActionError("Reason must be at least 5 characters.");
      return;
    }
    setSaving(true);
    setActionError(null);
    try {
      await api.patch(`/hearings/${adjournTarget.id}/adjourn`, { reason: adjournReason.trim() });
      setAdjournTarget(null);
      setDetail(null);
      setAdjournReason("");
      await Promise.all([
        qc.invalidateQueries({ queryKey: ["hearings", "today"] }),
        qc.invalidateQueries({ queryKey: ["hearings", "week"] }),
      ]);
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : "Could not adjourn this hearing.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <section aria-labelledby="today-heading" className="space-y-3">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 id="today-heading" className="font-heading text-lg font-semibold text-text-primary">
            Today’s docket
          </h2>
          <p className="text-xs text-text-muted">
            {today.isLoading
              ? "Loading…"
              : `${today.data?.length ?? 0} ${(today.data?.length ?? 0) === 1 ? "hearing" : "hearings"}`}
          </p>
        </div>

        {today.isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 2 }).map((_, i) => (
              <div key={i} className="h-24 animate-pulse rounded-lg bg-surface-subtle" />
            ))}
          </div>
        ) : (today.data ?? []).length === 0 ? (
          <EmptyState
            title="No hearings today"
            description="Your docket is clear for today. Check the week ahead below."
          />
        ) : (
          <ul className="space-y-2">
            {today.data!.map((h) => (
              <li
                key={h.id}
                className="flex flex-col gap-3 rounded-lg border border-border bg-surface-page p-4 shadow-e1 sm:flex-row sm:items-center sm:justify-between"
              >
                <button
                  type="button"
                  onClick={() => setDetail(h)}
                  className="min-w-0 flex-1 text-left focus-ring"
                >
                  <div className="flex items-center gap-2">
                    <p className="truncate font-medium text-text-primary">
                      {h.case?.title ?? "Case"}
                    </p>
                    <StatusBadge status={h.status} />
                  </div>
                  <p className="mt-1 font-mono text-xs text-text-muted">
                    {h.case?.caseNumber ?? "—"} · {formatLagosDateTime(h.scheduledAt)}
                  </p>
                  <p className="mt-1 text-sm text-text-secondary">
                    {h.purpose ?? "Hearing"}
                    {h.court ? ` · ${h.court.name} (${h.court.number})` : ""}
                  </p>
                </button>
                <div className="flex shrink-0 items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setAdjournTarget(h)}
                    className="min-h-[44px] rounded-md border border-border bg-surface-page px-4 text-sm font-medium text-status-pending-fg hover:bg-status-pending-bg focus-ring"
                  >
                    Adjourn
                  </button>
                  {h.case ? (
                    <Link
                      href={`/dashboard/judge/cases/${h.case.id}`}
                      className="min-h-[44px] inline-flex items-center rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground hover:bg-primary-hover focus-ring"
                    >
                      Open case
                    </Link>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="week-heading" className="space-y-3">
        <h2 id="week-heading" className="font-heading text-lg font-semibold text-text-primary">
          Week ahead
        </h2>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-7">
          {weekBuckets.map((d) => (
            <div key={d.key} className="min-h-[120px] rounded-lg border border-border bg-surface-page p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-text-muted">{d.label}</p>
              {week.isLoading ? (
                <span aria-hidden="true" className="mt-2 block h-3 w-16 animate-pulse rounded bg-surface-subtle" />
              ) : d.hearings.length === 0 ? (
                <p className="mt-2 text-xs text-text-muted">—</p>
              ) : (
                <ul className="mt-2 space-y-1.5">
                  {d.hearings.map((h) => (
                    <li key={h.id}>
                      <button
                        type="button"
                        onClick={() => setDetail(h)}
                        className="w-full rounded border border-border bg-surface-subtle px-2 py-1.5 text-left text-xs transition-colors hover:border-primary hover:bg-surface-tint focus-ring"
                        aria-label={`View details: ${h.case?.title ?? "Case"} at ${timeOnly(new Date(h.scheduledAt))}`}
                      >
                        <p className="truncate font-medium text-text-primary">
                          {h.case?.title ?? "Case"}
                        </p>
                        <p className="mt-0.5 flex items-center justify-between gap-1 text-text-muted">
                          <span>{timeOnly(new Date(h.scheduledAt))}</span>
                          <StatusBadge status={h.status} />
                        </p>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Hearing detail — opens when a week-ahead or today item is clicked. */}
      <Modal
        open={detail !== null}
        title={detail?.case?.title ?? "Hearing details"}
        description={
          detail?.case?.caseNumber ? `Case ${detail.case.caseNumber}` : undefined
        }
        onClose={() => setDetail(null)}
        size="md"
        footer={
          detail ? (
            <>
              <button
                type="button"
                onClick={() => {
                  setDetail(null);
                  setAdjournTarget(detail);
                  setAdjournReason("");
                  setActionError(null);
                }}
                className="min-h-[44px] rounded-md border border-border bg-surface-page px-4 text-sm font-medium text-status-pending-fg hover:bg-status-pending-bg focus-ring"
              >
                Adjourn
              </button>
              {detail.case ? (
                <Link
                  href={`/dashboard/judge/cases/${detail.case.id}`}
                  className="inline-flex min-h-[44px] items-center rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground hover:bg-primary-hover focus-ring"
                >
                  Open case
                </Link>
              ) : (
                <button
                  type="button"
                  onClick={() => setDetail(null)}
                  className="min-h-[44px] rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground hover:bg-primary-hover focus-ring"
                >
                  Close
                </button>
              )}
            </>
          ) : null
        }
      >
        {detail ? (
          <dl className="space-y-3 text-sm">
            <Row label="When">
              <span className="font-medium text-text-primary">
                {formatLagosDateTime(detail.scheduledAt)}
              </span>
              <span className="ml-1 text-xs text-text-muted">(West Africa Time)</span>
            </Row>
            <Row label="Status">
              <StatusBadge status={detail.status} />
            </Row>
            <Row label="Purpose">
              <span className="text-text-primary">{detail.purpose ?? "Hearing"}</span>
            </Row>
            <Row label="Court">
              {detail.court ? (
                <span className="text-text-primary">
                  {detail.court.name} ({detail.court.number})
                </span>
              ) : (
                <span className="text-text-muted">Not assigned</span>
              )}
            </Row>
            <Row label="Case number">
              <span className="font-mono text-text-primary">
                {detail.case?.caseNumber ?? "—"}
              </span>
            </Row>
            {detail.notes ? (
              <Row label="Notes">
                <p className="whitespace-pre-line text-text-secondary">{detail.notes}</p>
              </Row>
            ) : null}
          </dl>
        ) : null}
      </Modal>

      {/* Adjourn dialog — opened from either list. */}
      <Modal
        open={adjournTarget !== null}
        title="Adjourn hearing"
        description="The registrar and parties will be notified."
        onClose={() => {
          setAdjournTarget(null);
          setAdjournReason("");
          setActionError(null);
        }}
        footer={
          <>
            <button
              type="button"
              onClick={() => {
                setAdjournTarget(null);
                setAdjournReason("");
                setActionError(null);
              }}
              className="min-h-[44px] rounded-md border border-border bg-surface-page px-4 text-sm font-medium text-text-primary hover:bg-surface-subtle focus-ring"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={adjourn}
              disabled={saving || adjournReason.trim().length < 5}
              className="flex min-h-[44px] items-center gap-2 rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground hover:bg-primary-hover focus-ring disabled:opacity-60"
            >
              {saving ? <Spinner /> : null}
              {saving ? "Saving…" : "Adjourn hearing"}
            </button>
          </>
        }
      >
        {adjournTarget?.case ? (
          <p className="mb-3 text-sm text-text-secondary">
            <span className="font-medium text-text-primary">{adjournTarget.case.title}</span> — scheduled{" "}
            {formatLagosDateTime(adjournTarget.scheduledAt)}
          </p>
        ) : null}
        <label htmlFor="adjourn-reason" className="block text-xs font-semibold uppercase tracking-wide text-text-muted">
          Reason
        </label>
        <textarea
          id="adjourn-reason"
          value={adjournReason}
          onChange={(e) => setAdjournReason(e.target.value)}
          rows={4}
          className="mt-1 w-full rounded-md border border-border bg-surface-page px-3 py-2 text-sm text-text-primary focus-ring"
          placeholder="e.g. Counsel application for adjournment."
        />
        {actionError ? (
          <p role="alert" className="mt-2 rounded-md bg-status-rejected-bg px-3 py-2 text-sm text-status-rejected-fg">
            {actionError}
          </p>
        ) : null}
      </Modal>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[7rem_1fr] items-start gap-3">
      <dt className="text-xs font-semibold uppercase tracking-wide text-text-muted">{label}</dt>
      <dd className="min-w-0">{children}</dd>
    </div>
  );
}
