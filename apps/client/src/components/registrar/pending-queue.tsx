"use client";
import * as React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, ApiError } from "../../lib/api";
import { StatusBadge, EmptyState, Spinner, Modal } from "../ui/primitives";
import { formatLagosDate } from "../../lib/datetime";

export type CaseItem = {
  id: string;
  caseNumber?: string | null;
  title: string;
  status: string;
  createdAt: string;
  summary?: string | null;
};

const PAGE_SIZE = 10;

export function PendingQueue({ onOpen }: { onOpen: (c: CaseItem) => void }) {
  const qc = useQueryClient();
  const [page, setPage] = React.useState(1);
  const [rejectTarget, setRejectTarget] = React.useState<CaseItem | null>(null);
  const [reason, setReason] = React.useState("");
  const [actionError, setActionError] = React.useState<string | null>(null);

  const { data, isLoading, error, isFetching } = useQuery({
    queryKey: ["cases", "pending", page],
    queryFn: () =>
      api.get<{ items: CaseItem[]; total: number }>(
        `/cases?status=PENDING_APPROVAL&page=${page}&pageSize=${PAGE_SIZE}`,
      ),
  });

  const items = data?.items ?? [];
  const total = data?.total ?? 0;
  const startIdx = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const endIdx = Math.min(page * PAGE_SIZE, total);

  const reject = useMutation({
    mutationFn: (arg: { id: string; reason: string }) =>
      api.patch(`/cases/${arg.id}/reject`, { reason: arg.reason }),
    onSuccess: async () => {
      setRejectTarget(null);
      setReason("");
      setActionError(null);
      await Promise.all([
        qc.invalidateQueries({ queryKey: ["cases", "pending"] }),
        qc.invalidateQueries({ queryKey: ["cases"] }),
        qc.invalidateQueries({ queryKey: ["admin", "stats"] }),
      ]);
    },
    onError: (err) => {
      setActionError(err instanceof ApiError ? err.message : "Could not reject this case.");
    },
  });

  return (
    <section aria-labelledby="pending-heading" className="space-y-3">
      <div className="flex items-baseline justify-between gap-3">
        <h2 id="pending-heading" className="font-heading text-lg font-semibold text-text-primary">
          Pending approval
        </h2>
        <p className="text-xs text-text-muted">
          {isLoading ? "Loading…" : `${total} ${total === 1 ? "case" : "cases"}`}
        </p>
      </div>

      {error ? (
        <p role="alert" className="rounded-md bg-status-rejected-bg px-3 py-2 text-sm text-status-rejected-fg">
          Failed to load the queue. Please refresh.
        </p>
      ) : null}

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-20 animate-pulse rounded-lg bg-surface-subtle" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <EmptyState
          title="Queue is clear"
          description="There are no filings waiting for your review right now."
        />
      ) : (
        <>
          <ul className="space-y-2">
            {items.map((c) => (
              <li
                key={c.id}
                className="flex flex-col gap-3 rounded-lg border border-border bg-surface-page p-4 shadow-e1 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate font-medium text-text-primary">{c.title}</p>
                    <StatusBadge status={c.status} />
                  </div>
                  <p className="mt-1 font-mono text-xs text-text-muted">
                    {c.caseNumber ?? "Number on approval"} · Filed {formatLagosDate(c.createdAt)}
                  </p>
                  {c.summary ? (
                    <p className="mt-2 line-clamp-2 text-sm text-text-secondary">{c.summary}</p>
                  ) : null}
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setRejectTarget(c)}
                    className="min-h-[44px] rounded-md border border-border bg-surface-page px-4 text-sm font-medium text-status-rejected-fg hover:bg-status-rejected-bg focus-ring"
                  >
                    Reject
                  </button>
                  <button
                    type="button"
                    onClick={() => onOpen(c)}
                    className="min-h-[44px] rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground hover:bg-primary-hover focus-ring"
                  >
                    Review
                  </button>
                </div>
              </li>
            ))}
          </ul>

          <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-border bg-surface-page px-4 py-3 text-sm">
            <p className="text-text-secondary">
              {total === 0 ? "No cases" : `Showing ${startIdx}–${endIdx} of ${total}`}
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1 || isFetching}
                className="min-h-[44px] rounded-md border border-border bg-surface-page px-3 text-sm font-medium text-text-primary hover:bg-surface-subtle focus-ring disabled:opacity-50"
              >
                Previous
              </button>
              <button
                type="button"
                onClick={() => setPage((p) => p + 1)}
                disabled={endIdx >= total || isFetching}
                className="min-h-[44px] rounded-md border border-border bg-surface-page px-3 text-sm font-medium text-text-primary hover:bg-surface-subtle focus-ring disabled:opacity-50"
              >
                {isFetching ? <Spinner /> : "Next"}
              </button>
            </div>
          </div>
        </>
      )}

      <Modal
        open={rejectTarget !== null}
        title="Reject case"
        description="The lawyer will see your reason. This cannot be undone."
        onClose={() => {
          setRejectTarget(null);
          setReason("");
          setActionError(null);
        }}
        size="md"
        footer={
          <>
            <button
              type="button"
              onClick={() => {
                setRejectTarget(null);
                setReason("");
                setActionError(null);
              }}
              className="min-h-[44px] rounded-md border border-border bg-surface-page px-4 text-sm font-medium text-text-primary hover:bg-surface-subtle focus-ring"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => {
                if (!rejectTarget) return;
                if (reason.trim().length < 10) {
                  setActionError("Reason must be at least 10 characters.");
                  return;
                }
                reject.mutate({ id: rejectTarget.id, reason: reason.trim() });
              }}
              disabled={reject.isPending || reason.trim().length < 10}
              className="flex min-h-[44px] items-center gap-2 rounded-md bg-status-rejected-fg px-4 text-sm font-semibold text-surface-page hover:opacity-90 focus-ring disabled:opacity-60"
            >
              {reject.isPending ? <Spinner /> : null}
              {reject.isPending ? "Rejecting…" : "Confirm rejection"}
            </button>
          </>
        }
      >
        {rejectTarget ? (
          <p className="text-sm text-text-secondary">
            <span className="font-medium text-text-primary">{rejectTarget.title}</span> will be returned to
            the lawyer with your reason.
          </p>
        ) : null}
        <label htmlFor="reject-reason" className="mt-4 block text-xs font-semibold uppercase tracking-wide text-text-muted">
          Reason
        </label>
        <textarea
          id="reject-reason"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          rows={4}
          minLength={10}
          className="mt-1 w-full rounded-md border border-border bg-surface-page px-3 py-2 text-sm text-text-primary focus-ring"
          placeholder="Explain what is missing or incorrect."
        />
        {actionError ? (
          <p role="alert" className="mt-2 rounded-md bg-status-rejected-bg px-3 py-2 text-sm text-status-rejected-fg">
            {actionError}
          </p>
        ) : null}
      </Modal>
    </section>
  );
}
