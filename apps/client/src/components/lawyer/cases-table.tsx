"use client";
import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { Search } from "lucide-react";
import { api } from "../../lib/api";
import { StatusBadge, EmptyState, Spinner } from "../ui/primitives";
import { formatLagosDate } from "../../lib/datetime";
import { CaseDetailDrawer } from "./case-detail-drawer";

export type CaseItem = {
  id: string;
  caseNumber?: string | null;
  title: string;
  status: string;
  createdAt: string;
  updatedAt?: string;
};

const PAGE_SIZE = 10;

export function CasesTable({
  status,
  emptyTitle = "No cases yet",
  emptyDescription,
  emptyAction,
  title = "Cases",
}: {
  status?: string;
  emptyTitle?: string;
  emptyDescription?: string;
  emptyAction?: React.ReactNode;
  title?: string;
}) {
  const [q, setQ] = React.useState("");
  const [debouncedQ, setDebouncedQ] = React.useState("");
  const [page, setPage] = React.useState(1);
  const [openCase, setOpenCase] = React.useState<CaseItem | null>(null);

  React.useEffect(() => {
    const t = window.setTimeout(() => {
      setDebouncedQ(q.trim());
      setPage(1);
    }, 250);
    return () => window.clearTimeout(t);
  }, [q]);

  const params = new URLSearchParams();
  params.set("page", String(page));
  params.set("pageSize", String(PAGE_SIZE));
  if (status) params.set("status", status);
  if (debouncedQ) params.set("q", debouncedQ);

  const { data, isLoading, error, isFetching } = useQuery({
    queryKey: ["cases", "table", status ?? "all", debouncedQ, page],
    queryFn: () =>
      api.get<{ items: CaseItem[]; total: number }>(`/cases?${params.toString()}`),
  });

  const items = data?.items ?? [];
  const total = data?.total ?? 0;
  const startIdx = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const endIdx = Math.min(page * PAGE_SIZE, total);

  return (
    <section aria-labelledby={`cases-table-${title}`} className="space-y-3">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2
            id={`cases-table-${title}`}
            className="font-heading text-lg font-semibold text-text-primary"
          >
            {title}
          </h2>
          <p className="text-xs text-text-muted">
            {isLoading ? "Loading…" : `${total} ${total === 1 ? "case" : "cases"}`}
          </p>
        </div>
        <div className="relative w-full sm:max-w-xs">
          <label htmlFor="case-search" className="sr-only">
            Search cases
          </label>
          <Search
            size={16}
            aria-hidden="true"
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-text-muted"
          />
          <input
            id="case-search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search title or number…"
            className="min-h-[44px] w-full rounded-md border border-border bg-surface-page pl-10 pr-3 text-sm text-text-primary focus-ring"
          />
        </div>
      </div>

      {error ? (
        <p role="alert" className="rounded-md bg-status-rejected-bg px-3 py-2 text-sm text-status-rejected-fg">
          Failed to load cases. Please refresh.
        </p>
      ) : null}

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-14 animate-pulse rounded-md bg-surface-subtle" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <EmptyState
          title={debouncedQ ? "No matches" : emptyTitle}
          description={debouncedQ ? `No cases match “${debouncedQ}”.` : emptyDescription}
          action={!debouncedQ ? emptyAction : undefined}
        />
      ) : (
        <div className="overflow-hidden rounded-lg border border-border bg-surface-page">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-surface-subtle text-xs uppercase tracking-wide text-text-muted">
                <tr>
                  <th scope="col" className="px-4 py-3 text-left font-semibold">Case</th>
                  <th scope="col" className="px-4 py-3 text-left font-semibold">Status</th>
                  <th scope="col" className="px-4 py-3 text-left font-semibold">Filed</th>
                  <th scope="col" className="px-4 py-3 text-right font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {items.map((c) => (
                  <tr key={c.id} className="border-t border-border hover:bg-surface-subtle">
                    <td className="px-4 py-3">
                      <p className="font-medium text-text-primary">{c.title}</p>
                      <p className="mt-0.5 font-mono text-xs text-text-muted">
                        {c.caseNumber ?? "Draft — no number assigned"}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={c.status} />
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-text-secondary">
                      {formatLagosDate(c.createdAt)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => setOpenCase(c)}
                        className="min-h-[44px] rounded-md px-3 text-sm font-medium text-primary hover:bg-surface-tint focus-ring"
                      >
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border bg-surface-subtle px-4 py-3 text-sm">
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
        </div>
      )}

      <CaseDetailDrawer caseItem={openCase} onClose={() => setOpenCase(null)} />
    </section>
  );
}
