"use client";
import * as React from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { X } from "lucide-react";
import { api, ApiError } from "../../lib/api";
import { StatusBadge, Spinner } from "../ui/primitives";
import { formatLagosDateTime, formatLagosDate } from "../../lib/datetime";

export type CaseItem = { id: string; caseNumber?: string | null; title: string; status: string; createdAt: string };
type CaseFull = {
  id: string;
  caseNumber?: string | null;
  title: string;
  summary?: string | null;
  reliefSought?: string | null;
  caseType: string;
  status: string;
  divisionId: string;
  division?: { name: string };
};
type Party = { id: string; name: string; role: string; counselName?: string | null; isIndividual: boolean };
type Doc = { id: string; fileName: string; mimeType: string; category: string; scanStatus: string; createdAt: string };
type Judge = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  activeCaseload: number;
};
type Division = { id: string; code: string; name: string; courts: { id: string; name: string; number: string }[] };
type DivisionList = { divisions: Division[] };

export function ApprovalDrawer({
  open,
  caseItem,
  onClose,
}: {
  open: boolean;
  caseItem: CaseItem | null;
  onClose: () => void;
}) {
  const id = caseItem?.id;
  const qc = useQueryClient();

  const fullQuery = useQuery({
    queryKey: ["case", id],
    queryFn: () => api.get<CaseFull>(`/cases/${id}`),
    enabled: !!id && open,
  });
  const partiesQuery = useQuery({
    queryKey: ["case-parties", id],
    queryFn: () => api.get<Party[]>(`/cases/${id}/parties`),
    enabled: !!id && open,
  });
  const docsQuery = useQuery({
    queryKey: ["case-docs", id],
    queryFn: () => api.get<Doc[]>(`/cases/${id}/documents`),
    enabled: !!id && open,
  });
  const judgesQuery = useQuery({
    queryKey: ["users", "judges"],
    queryFn: () => api.get<Judge[]>("/users/judges"),
    enabled: open,
  });
  const divisionsQuery = useQuery({
    queryKey: ["meta", "divisions"],
    queryFn: () => api.get<DivisionList>("/meta/divisions"),
    enabled: open,
  });

  const [judgeId, setJudgeId] = React.useState("");
  const [courtId, setCourtId] = React.useState("");
  const [preferredHearingAt, setPreferredHearingAt] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [approving, setApproving] = React.useState(false);

  React.useEffect(() => {
    if (!open) return;
    setJudgeId("");
    setCourtId("");
    setPreferredHearingAt("");
    setError(null);
  }, [open, id]);

  React.useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  if (!open || !caseItem) return null;

  const full = fullQuery.data;
  const division = divisionsQuery.data?.divisions.find((d) => d.id === full?.divisionId);
  const judges = judgesQuery.data ?? [];

  async function approve() {
    if (!id) return;
    if (!judgeId) return setError("Please select a judge.");
    if (!courtId) return setError("Please select a court.");
    setApproving(true);
    setError(null);
    try {
      await api.patch(`/cases/${id}/approve`, {
        judgeId,
        courtId,
        preferredHearingAt: preferredHearingAt ? new Date(preferredHearingAt).toISOString() : undefined,
      });
      await Promise.all([
        qc.invalidateQueries({ queryKey: ["cases", "pending"] }),
        qc.invalidateQueries({ queryKey: ["cases"] }),
        qc.invalidateQueries({ queryKey: ["admin", "stats"] }),
      ]);
      onClose();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not approve this case.");
    } finally {
      setApproving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-text-primary/40">
      <button
        type="button"
        aria-label="Close approval panel"
        onClick={onClose}
        className="flex-1 cursor-default"
        tabIndex={-1}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="approval-title"
        className="motion-slide-up flex h-full w-full max-w-2xl flex-col border-l border-border bg-surface-page shadow-e2"
      >
        <header className="flex items-start justify-between gap-4 border-b border-border px-5 py-4">
          <div className="min-w-0">
            <p className="font-mono text-xs text-text-muted">
              {full?.caseNumber ?? caseItem.caseNumber ?? "Pending approval"}
            </p>
            <h2 id="approval-title" className="mt-1 font-heading text-lg font-bold text-text-primary">
              {full?.title ?? caseItem.title}
            </h2>
            <div className="mt-2 flex items-center gap-2">
              {full ? <StatusBadge status={full.status} /> : null}
              {full?.division ? (
                <span className="text-xs text-text-muted">· {full.division.name}</span>
              ) : null}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md text-text-secondary hover:bg-surface-subtle focus-ring"
          >
            <X size={16} aria-hidden="true" />
          </button>
        </header>

        <div className="min-h-0 flex-1 space-y-6 overflow-y-auto px-5 py-5">
          {full?.summary ? (
            <section>
              <h3 className="text-xs font-semibold uppercase tracking-wide text-text-muted">Summary</h3>
              <p className="mt-2 whitespace-pre-line text-sm text-text-secondary">{full.summary}</p>
            </section>
          ) : null}

          {full?.reliefSought ? (
            <section>
              <h3 className="text-xs font-semibold uppercase tracking-wide text-text-muted">Relief sought</h3>
              <p className="mt-2 whitespace-pre-line text-sm text-text-secondary">{full.reliefSought}</p>
            </section>
          ) : null}

          <section>
            <h3 className="text-xs font-semibold uppercase tracking-wide text-text-muted">Parties</h3>
            {partiesQuery.isLoading ? (
              <p className="mt-2 text-sm text-text-muted">Loading…</p>
            ) : (partiesQuery.data ?? []).length === 0 ? (
              <p className="mt-2 text-sm text-text-muted">No parties recorded.</p>
            ) : (
              <ul className="mt-2 space-y-2">
                {partiesQuery.data!.map((p) => (
                  <li key={p.id} className="rounded-md border border-border px-3 py-2 text-sm">
                    <p className="font-medium text-text-primary">{p.name}</p>
                    <p className="text-xs text-text-muted">
                      {p.role}
                      {p.counselName ? ` · Counsel: ${p.counselName}` : ""}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section>
            <h3 className="text-xs font-semibold uppercase tracking-wide text-text-muted">Documents</h3>
            {docsQuery.isLoading ? (
              <p className="mt-2 text-sm text-text-muted">Loading…</p>
            ) : (docsQuery.data ?? []).length === 0 ? (
              <p className="mt-2 text-sm text-text-muted">No documents uploaded.</p>
            ) : (
              <ul className="mt-2 space-y-2">
                {docsQuery.data!.map((d) => (
                  <li
                    key={d.id}
                    className="flex items-center justify-between gap-3 rounded-md border border-border px-3 py-2 text-sm"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-medium text-text-primary">{d.fileName}</p>
                      <p className="text-xs text-text-muted">
                        {d.category} · uploaded {formatLagosDate(d.createdAt)}
                      </p>
                    </div>
                    <StatusBadge status={d.scanStatus} />
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="rounded-lg border border-border bg-surface-subtle p-4">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-text-muted">Approval</h3>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label htmlFor="approve-judge" className="text-xs font-semibold uppercase tracking-wide text-text-muted">
                  Assign judge
                </label>
                <select
                  id="approve-judge"
                  value={judgeId}
                  onChange={(e) => setJudgeId(e.target.value)}
                  className="mt-1 min-h-[44px] w-full rounded-md border border-border bg-surface-page px-3 text-sm text-text-primary focus-ring"
                >
                  <option value="">Select a judge…</option>
                  {judges.map((j) => (
                    <option key={j.id} value={j.id}>
                      Hon. {j.firstName} {j.lastName} — {j.activeCaseload} active
                    </option>
                  ))}
                </select>
                {judges.length === 0 && !judgesQuery.isLoading ? (
                  <p className="mt-1 text-xs text-status-pending-fg">
                    No active judges. Add a judge before approving.
                  </p>
                ) : null}
              </div>

              <div>
                <label htmlFor="approve-court" className="text-xs font-semibold uppercase tracking-wide text-text-muted">
                  Court
                </label>
                <select
                  id="approve-court"
                  value={courtId}
                  onChange={(e) => setCourtId(e.target.value)}
                  className="mt-1 min-h-[44px] w-full rounded-md border border-border bg-surface-page px-3 text-sm text-text-primary focus-ring"
                >
                  <option value="">Select a court…</option>
                  {(division?.courts ?? []).map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} — {c.number}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="approve-when" className="text-xs font-semibold uppercase tracking-wide text-text-muted">
                  Preferred hearing (optional)
                </label>
                <input
                  id="approve-when"
                  type="datetime-local"
                  value={preferredHearingAt}
                  onChange={(e) => setPreferredHearingAt(e.target.value)}
                  className="mt-1 min-h-[44px] w-full rounded-md border border-border bg-surface-page px-3 text-sm text-text-primary focus-ring"
                />
              </div>
            </div>
          </section>

          {error ? (
            <p role="alert" className="rounded-md bg-status-rejected-bg px-3 py-2 text-sm text-status-rejected-fg">
              {error}
            </p>
          ) : null}

          {full ? (
            <p className="text-xs text-text-muted">Filed {formatLagosDateTime(caseItem.createdAt)}</p>
          ) : null}
        </div>

        <footer className="flex flex-wrap items-center justify-end gap-2 border-t border-border bg-surface-subtle px-5 py-3">
          <button
            type="button"
            onClick={onClose}
            className="min-h-[44px] rounded-md border border-border bg-surface-page px-4 text-sm font-medium text-text-primary hover:bg-surface-subtle focus-ring"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={approve}
            disabled={approving || !judgeId || !courtId}
            aria-busy={approving}
            className="flex min-h-[44px] items-center gap-2 rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground shadow-e1 hover:bg-primary-hover focus-ring disabled:opacity-60"
          >
            {approving ? <Spinner /> : null}
            {approving ? "Approving…" : "Approve and assign"}
          </button>
        </footer>
      </div>
    </div>
  );
}
