"use client";
import * as React from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { X } from "lucide-react";
import { api, ApiError } from "../../lib/api";
import { StatusBadge, Spinner } from "../ui/primitives";
import { formatLagosDateTime, formatLagosDate } from "../../lib/datetime";

type CaseItem = { id: string; caseNumber?: string | null; title: string; status: string; createdAt: string };
type CaseFull = {
  id: string;
  caseNumber?: string | null;
  title: string;
  summary?: string | null;
  reliefSought?: string | null;
  caseType: string;
  suitTypeCode: string;
  status: string;
  rejectionReason?: string | null;
  division?: { name: string };
  court?: { name: string; number: string } | null;
  assignedJudge?: { firstName: string; lastName: string } | null;
  createdAt: string;
  updatedAt: string;
};
type Party = { id: string; name: string; role: string; counselName?: string | null; isIndividual: boolean };
type Doc = { id: string; fileName: string; mimeType: string; category: string; scanStatus: string; createdAt: string };
type Event = { id: string; type: string; createdAt: string; actorId?: string | null };

export function CaseDetailDrawer({ caseItem, onClose }: { caseItem: CaseItem | null; onClose: () => void }) {
  const id = caseItem?.id;
  const [submitting, setSubmitting] = React.useState(false);
  const [actionError, setActionError] = React.useState<string | null>(null);
  const qc = useQueryClient();

  const fullQuery = useQuery({
    queryKey: ["case", id],
    queryFn: () => api.get<CaseFull>(`/cases/${id}`),
    enabled: !!id,
  });
  const partiesQuery = useQuery({
    queryKey: ["case-parties", id],
    queryFn: () => api.get<Party[]>(`/cases/${id}/parties`),
    enabled: !!id,
  });
  const docsQuery = useQuery({
    queryKey: ["case-docs", id],
    queryFn: () => api.get<Doc[]>(`/cases/${id}/documents`),
    enabled: !!id,
  });
  const timelineQuery = useQuery({
    queryKey: ["case-timeline", id],
    queryFn: () => api.get<Event[]>(`/cases/${id}/timeline`),
    enabled: !!id,
  });

  React.useEffect(() => {
    if (!caseItem) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [caseItem, onClose]);

  if (!caseItem) return null;

  const full = fullQuery.data;
  const canSubmit =
    full?.status === "DRAFT" &&
    (partiesQuery.data?.length ?? 0) > 0 &&
    (docsQuery.data?.length ?? 0) > 0;

  async function submit() {
    if (!id) return;
    setSubmitting(true);
    setActionError(null);
    try {
      await api.post(`/cases/${id}/submit`);
      await Promise.all([
        qc.invalidateQueries({ queryKey: ["cases"] }),
        qc.invalidateQueries({ queryKey: ["case", id] }),
        qc.invalidateQueries({ queryKey: ["case-timeline", id] }),
      ]);
      onClose();
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : "Could not submit the case.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-text-primary/40" role="presentation">
      <button
        type="button"
        aria-label="Close case detail"
        onClick={onClose}
        className="flex-1 cursor-default"
        tabIndex={-1}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="case-drawer-title"
        className="motion-slide-up flex h-full w-full max-w-2xl flex-col border-l border-border bg-surface-page shadow-e2"
      >
        <header className="flex items-start justify-between gap-4 border-b border-border px-5 py-4">
          <div className="min-w-0">
            <p className="font-mono text-xs text-text-muted">
              {full?.caseNumber ?? "Draft — number on approval"}
            </p>
            <h2 id="case-drawer-title" className="mt-1 font-heading text-lg font-bold text-text-primary">
              {full?.title ?? caseItem.title}
            </h2>
            <div className="mt-2 flex items-center gap-2">
              {full ? <StatusBadge status={full.status} /> : null}
              {full?.division ? (
                <span className="text-xs text-text-muted">· {full.division.name}</span>
              ) : null}
              {full?.court ? (
                <span className="text-xs text-text-muted">
                  · {full.court.name} ({full.court.number})
                </span>
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
          {fullQuery.isLoading ? (
            <div className="flex items-center gap-2 text-sm text-text-muted">
              <Spinner /> Loading case…
            </div>
          ) : null}

          {full?.summary ? (
            <section>
              <h3 className="text-xs font-semibold uppercase tracking-wide text-text-muted">Summary</h3>
              <p className="mt-2 whitespace-pre-line text-sm text-text-secondary">{full.summary}</p>
            </section>
          ) : null}

          {full?.rejectionReason ? (
            <section className="rounded-md border border-status-rejected-fg/30 bg-status-rejected-bg px-3 py-2 text-sm text-status-rejected-fg">
              <p className="font-semibold">Rejected</p>
              <p className="mt-1">{full.rejectionReason}</p>
            </section>
          ) : null}

          <section>
            <h3 className="text-xs font-semibold uppercase tracking-wide text-text-muted">Parties</h3>
            {partiesQuery.isLoading ? (
              <p className="mt-2 text-sm text-text-muted">Loading…</p>
            ) : (partiesQuery.data ?? []).length === 0 ? (
              <p className="mt-2 text-sm text-text-muted">
                No parties recorded yet. Add at least one claimant and one defendant before submitting.
              </p>
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
              <p className="mt-2 text-sm text-text-muted">
                No documents uploaded yet. At least one document is required to submit the case.
              </p>
            ) : (
              <ul className="mt-2 space-y-2">
                {docsQuery.data!.map((d) => (
                  <li key={d.id} className="flex items-center justify-between gap-3 rounded-md border border-border px-3 py-2 text-sm">
                    <div className="min-w-0">
                      <p className="truncate font-medium text-text-primary">{d.fileName}</p>
                      <p className="text-xs text-text-muted">
                        {d.category} · {d.scanStatus}
                      </p>
                    </div>
                    <StatusBadge status={d.scanStatus} />
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section>
            <h3 className="text-xs font-semibold uppercase tracking-wide text-text-muted">Timeline</h3>
            {timelineQuery.isLoading ? (
              <p className="mt-2 text-sm text-text-muted">Loading…</p>
            ) : (timelineQuery.data ?? []).length === 0 ? (
              <p className="mt-2 text-sm text-text-muted">
                No activity yet. Filing, submitting, hearings and rulings will appear here.
              </p>
            ) : (
              <ol className="mt-3 space-y-4 border-l border-border pl-5">
                {timelineQuery.data!.map((e) => (
                  <li key={e.id} className="relative">
                    <span className="absolute -left-[27px] top-1 flex h-3 w-3 items-center justify-center rounded-full border-2 border-surface-page bg-primary" />
                    <p className="text-sm font-medium text-text-primary">{humanizeEvent(e.type)}</p>
                    <p className="text-xs text-text-muted">{formatLagosDateTime(e.createdAt)}</p>
                  </li>
                ))}
              </ol>
            )}
          </section>

          {full?.assignedJudge ? (
            <section>
              <h3 className="text-xs font-semibold uppercase tracking-wide text-text-muted">Assigned judge</h3>
              <p className="mt-1 text-sm text-text-primary">
                Hon. {full.assignedJudge.firstName} {full.assignedJudge.lastName}
              </p>
            </section>
          ) : null}

          {actionError ? (
            <p role="alert" className="rounded-md bg-status-rejected-bg px-3 py-2 text-sm text-status-rejected-fg">
              {actionError}
            </p>
          ) : null}
        </div>

        <footer className="flex flex-wrap items-center justify-between gap-2 border-t border-border bg-surface-subtle px-5 py-3 text-xs text-text-muted">
          <span>Filed {full ? formatLagosDate(full.createdAt) : ""}</span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="min-h-[44px] rounded-md border border-border bg-surface-page px-4 text-sm font-medium text-text-primary hover:bg-surface-subtle focus-ring"
            >
              Close
            </button>
            {full?.status === "DRAFT" ? (
              <button
                type="button"
                onClick={submit}
                disabled={!canSubmit || submitting}
                aria-busy={submitting}
                title={
                  !canSubmit
                    ? "Requires at least one party and one document"
                    : undefined
                }
                className="flex min-h-[44px] items-center gap-2 rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground shadow-e1 hover:bg-primary-hover focus-ring disabled:opacity-60"
              >
                {submitting ? <Spinner /> : null}
                {submitting ? "Submitting…" : "Submit for approval"}
              </button>
            ) : null}
          </div>
        </footer>
      </div>
    </div>
  );
}

function humanizeEvent(type: string): string {
  return type
    .split("_")
    .map((s) => s[0] + s.slice(1).toLowerCase())
    .join(" ");
}
