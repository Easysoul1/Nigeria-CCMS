"use client";
import * as React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/src/lib/api";
import { StatusBadge, Spinner, EmptyState } from "@/src/components/ui/primitives";
import { formatLagosDateTime, formatLagosDate } from "@/src/lib/datetime";
import { AddRulingButton } from "@/src/components/judge/add-ruling";
import { CitationList, type Citation } from "@/src/components/judge/citation";

type CaseFull = {
  id: string;
  caseNumber?: string | null;
  title: string;
  summary?: string | null;
  reliefSought?: string | null;
  caseType: string;
  status: string;
  division?: { name: string };
  court?: { name: string; number: string } | null;
  assignedJudge?: { firstName: string; lastName: string } | null;
  createdAt: string;
};
type Party = { id: string; name: string; role: string; counselName?: string | null; isIndividual: boolean };
type Doc = { id: string; fileName: string; category: string; scanStatus: string; createdAt: string };
type Event = { id: string; type: string; createdAt: string };
type Ruling = { id: string; title: string; status: string; createdAt: string; publishedAt?: string | null; citations?: Citation[] | null };

type Tab = "parties" | "documents" | "timeline" | "rulings";

export default function JudgeCaseDetail() {
  const params = useParams<{ id: string }>();
  const id = params?.id;
  const [tab, setTab] = React.useState<Tab>("parties");

  const caseQuery = useQuery({
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
  const rulingsQuery = useQuery({
    queryKey: ["case-rulings", id],
    queryFn: () => api.get<Ruling[]>(`/cases/${id}/rulings`),
    enabled: !!id,
  });

  if (caseQuery.isLoading) {
    return (
      <div className="flex items-center gap-2 text-sm text-text-secondary">
        <Spinner /> Loading case…
      </div>
    );
  }
  if (caseQuery.error || !caseQuery.data) {
    return (
      <div className="space-y-3">
        <p className="rounded-md bg-status-rejected-bg px-3 py-2 text-sm text-status-rejected-fg">
          Case could not be loaded. It may have been removed or you do not have access.
        </p>
        <Link
          href="/dashboard/judge"
          className="inline-flex min-h-[44px] items-center rounded-md border border-border bg-surface-page px-4 text-sm font-medium text-text-primary hover:bg-surface-subtle focus-ring"
        >
          Back to docket
        </Link>
      </div>
    );
  }

  const cas = caseQuery.data;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs text-text-muted">
            <Link href="/dashboard/judge" className="hover:text-text-primary">
              Docket
            </Link>{" "}
            / <span className="font-mono">{cas.caseNumber ?? "draft"}</span>
          </p>
          <h1 className="mt-1 font-heading text-2xl font-bold text-text-primary sm:text-3xl">
            {cas.title}
          </h1>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-text-muted">
            <StatusBadge status={cas.status} />
            <span>·</span>
            <span>{cas.caseType}</span>
            {cas.division ? (
              <>
                <span>·</span>
                <span>{cas.division.name}</span>
              </>
            ) : null}
            {cas.court ? (
              <>
                <span>·</span>
                <span>
                  {cas.court.name} ({cas.court.number})
                </span>
              </>
            ) : null}
          </div>
        </div>
        <AddRulingButton caseId={cas.id} />
      </div>

      <div className="flex flex-wrap gap-2 border-b border-border" role="tablist">
        {(
          [
            ["parties", "Parties"],
            ["documents", "Documents"],
            ["timeline", "Timeline"],
            ["rulings", "Rulings"],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={tab === key}
            onClick={() => setTab(key)}
            className={`min-h-[44px] border-b-2 px-3 text-sm font-medium transition-colors ${tab === key ? "border-primary text-primary" : "border-transparent text-text-secondary hover:text-text-primary"}`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "parties" ? (
        <section>
          {partiesQuery.isLoading ? (
            <p className="text-sm text-text-muted">Loading…</p>
          ) : (partiesQuery.data ?? []).length === 0 ? (
            <EmptyState
              title="No parties recorded"
              description="The lawyer must add at least one claimant and one defendant before this case can be approved."
            />
          ) : (
            <ul className="grid gap-2 sm:grid-cols-2">
              {partiesQuery.data!.map((p) => (
                <li key={p.id} className="rounded-lg border border-border bg-surface-page px-4 py-3">
                  <p className="font-medium text-text-primary">{p.name}</p>
                  <p className="mt-0.5 text-xs text-text-muted">
                    {p.role}
                    {p.counselName ? ` · Counsel: ${p.counselName}` : ""}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </section>
      ) : null}

      {tab === "documents" ? (
        <section>
          {docsQuery.isLoading ? (
            <p className="text-sm text-text-muted">Loading…</p>
          ) : (docsQuery.data ?? []).length === 0 ? (
            <EmptyState
              title="No documents yet"
              description="Uploads by the lawyer appear here. A case must have at least one document before it can be submitted for approval."
            />
          ) : (
            <ul className="space-y-2">
              {docsQuery.data!.map((d) => (
                <li
                  key={d.id}
                  className="flex items-center justify-between gap-3 rounded-lg border border-border bg-surface-page px-4 py-3 text-sm"
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
      ) : null}

      {tab === "timeline" ? (
        <section>
          {timelineQuery.isLoading ? (
            <p className="text-sm text-text-muted">Loading…</p>
          ) : (timelineQuery.data ?? []).length === 0 ? (
            <EmptyState
              title="No activity yet"
              description="Each filing, approval, hearing, and ruling is recorded here as it happens."
            />
          ) : (
            <ol className="space-y-4 border-l border-border pl-5">
              {timelineQuery.data!.map((e) => (
                <li key={e.id} className="relative">
                  <span className="absolute -left-[27px] top-1 flex h-3 w-3 items-center justify-center rounded-full border-2 border-surface-page bg-primary" />
                  <p className="text-sm font-medium text-text-primary">
                    {e.type
                      .split("_")
                      .map((s) => s[0] + s.slice(1).toLowerCase())
                      .join(" ")}
                  </p>
                  <p className="text-xs text-text-muted">{formatLagosDateTime(e.createdAt)}</p>
                </li>
              ))}
            </ol>
          )}
        </section>
      ) : null}

      {tab === "rulings" ? (
        <section>
          {rulingsQuery.isLoading ? (
            <p className="text-sm text-text-muted">Loading…</p>
          ) : (rulingsQuery.data ?? []).length === 0 ? (
            <EmptyState
              title="No rulings yet"
              description={'Use "Draft ruling" above to start a ruling on this case. Drafts remain editable; once published they are locked.'}
            />
          ) : (
            <ul className="space-y-2">
              {rulingsQuery.data!.map((r) => (
                <li
                  key={r.id}
                  className="rounded-lg border border-border bg-surface-page px-4 py-3 text-sm"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate font-medium text-text-primary">{r.title}</p>
                      <p className="text-xs text-text-muted">
                        {r.publishedAt
                          ? `Published ${formatLagosDate(r.publishedAt)}`
                          : `Drafted ${formatLagosDate(r.createdAt)}`}
                        {r.citations && r.citations.length > 0
                          ? ` · ${r.citations.length} ${r.citations.length === 1 ? "authority" : "authorities"} cited`
                          : ""}
                      </p>
                    </div>
                    <StatusBadge status={r.status} />
                  </div>
                  <CitationList citations={r.citations} />
                </li>
              ))}
            </ul>
          )}
        </section>
      ) : null}
    </div>
  );
}
