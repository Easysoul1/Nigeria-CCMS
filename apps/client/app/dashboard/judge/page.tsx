"use client";
import * as React from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/src/lib/api";
import { useAuth } from "@/src/providers/auth-provider";
import { StatCard, StatusBadge, EmptyState } from "@/src/components/ui/primitives";
import JudgeDocket from "@/src/components/judge/judge-docket";
import { formatLagosDate } from "@/src/lib/datetime";

type Hearing = { id: string; scheduledAt: string; status: string };
type CaseRow = {
  id: string;
  title: string;
  status: string;
  caseNumber?: string | null;
  createdAt: string;
};

type Tab = "hearings" | "cases";

export default function JudgeDashboard() {
  const { user } = useAuth();
  const [tab, setTab] = React.useState<Tab>("hearings");

  const todayQuery = useQuery({
    queryKey: ["hearings", "today"],
    queryFn: () => api.get<Hearing[]>("/hearings/today"),
  });
  const weekQuery = useQuery({
    queryKey: ["hearings", "week"],
    queryFn: () => api.get<Hearing[]>("/hearings/week"),
  });
  const casesQuery = useQuery({
    queryKey: ["cases", "judge-assigned"],
    queryFn: () => api.get<{ items: CaseRow[]; total: number }>("/cases?page=1&pageSize=100"),
  });

  const today = todayQuery.data ?? [];
  const week = weekQuery.data ?? [];
  const cases = casesQuery.data?.items ?? [];

  const caseCounts = {
    active: cases.filter((c) => c.status === "ACTIVE").length,
    partHeard: cases.filter((c) => c.status === "PART_HEARD").length,
    adjourned: cases.filter((c) => c.status === "ADJOURNED").length,
    closed: cases.filter((c) => c.status === "CLOSED").length,
  };

  const firstName = user?.firstName?.trim() || user?.email.split("@")[0] || "Judge";

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-text-muted">Judge</p>
          <h1 className="mt-1 font-heading text-2xl font-bold text-text-primary sm:text-3xl">
            Your docket, {firstName}
          </h1>
          <p className="mt-1 text-sm text-text-secondary">
            Review the day’s hearings, adjourn where necessary, and record rulings.
          </p>
        </div>
        <div className="inline-flex rounded-md border border-border bg-surface-page p-1" role="tablist" aria-label="Judge views">
          <button
            role="tab"
            aria-selected={tab === "hearings"}
            onClick={() => setTab("hearings")}
            className={`min-h-[36px] rounded-md px-3 text-sm font-medium focus-ring ${tab === "hearings" ? "bg-primary text-primary-foreground" : "text-text-secondary hover:bg-surface-subtle"}`}
          >
            Hearings
          </button>
          <button
            role="tab"
            aria-selected={tab === "cases"}
            onClick={() => setTab("cases")}
            className={`min-h-[36px] rounded-md px-3 text-sm font-medium focus-ring ${tab === "cases" ? "bg-primary text-primary-foreground" : "text-text-secondary hover:bg-surface-subtle"}`}
          >
            Assigned cases
          </button>
        </div>
      </div>

      {tab === "hearings" ? (
        <>
          <section className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <StatCard
              label="Today"
              value={today.length}
              loading={todayQuery.isLoading}
              accent="pending"
              hint="Hearings scheduled"
            />
            <StatCard
              label="This week"
              value={week.length}
              loading={weekQuery.isLoading}
              accent="info"
              hint="Across 7 days"
            />
            <StatCard
              label="Adjourned (week)"
              value={week.filter((h) => h.status === "ADJOURNED").length}
              loading={weekQuery.isLoading}
              accent="default"
              hint="Awaiting reschedule"
            />
            <StatCard
              label="Completed (week)"
              value={week.filter((h) => h.status === "COMPLETED").length}
              loading={weekQuery.isLoading}
              accent="approved"
              hint="Concluded"
            />
          </section>

          <JudgeDocket />
        </>
      ) : (
        <>
          <section className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <StatCard
              label="Active"
              value={caseCounts.active}
              loading={casesQuery.isLoading}
              accent="approved"
              hint="Before the court"
            />
            <StatCard
              label="Part-heard"
              value={caseCounts.partHeard}
              loading={casesQuery.isLoading}
              accent="info"
              hint="Ongoing trial"
            />
            <StatCard
              label="Adjourned"
              value={caseCounts.adjourned}
              loading={casesQuery.isLoading}
              accent="pending"
              hint="Rescheduled"
            />
            <StatCard
              label="Closed"
              value={caseCounts.closed}
              loading={casesQuery.isLoading}
              accent="default"
              hint="Concluded"
            />
          </section>

          <section aria-labelledby="assigned-cases-heading" className="space-y-3">
            <div className="flex flex-wrap items-baseline justify-between gap-3">
              <h2
                id="assigned-cases-heading"
                className="font-heading text-lg font-semibold text-text-primary"
              >
                Assigned cases
              </h2>
              <p className="text-xs text-text-muted">
                {casesQuery.isLoading
                  ? "Loading…"
                  : `${cases.length} ${cases.length === 1 ? "case" : "cases"}`}
              </p>
            </div>

            {casesQuery.isLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="h-14 animate-pulse rounded-md bg-surface-subtle" />
                ))}
              </div>
            ) : cases.length === 0 ? (
              <EmptyState
                title="No assigned cases"
                description="Cases assigned to you by the registrar will appear here."
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
                      {cases.map((c) => (
                        <tr key={c.id} className="border-t border-border hover:bg-surface-subtle">
                          <td className="px-4 py-3">
                            <p className="font-medium text-text-primary">{c.title}</p>
                            <p className="mt-0.5 font-mono text-xs text-text-muted">
                              {c.caseNumber ?? "—"}
                            </p>
                          </td>
                          <td className="px-4 py-3">
                            <StatusBadge status={c.status} />
                          </td>
                          <td className="whitespace-nowrap px-4 py-3 text-text-secondary">
                            {formatLagosDate(c.createdAt)}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <Link
                              href={`/dashboard/judge/cases/${c.id}`}
                              className="inline-flex min-h-[44px] items-center rounded-md px-3 text-sm font-medium text-primary hover:bg-surface-tint focus-ring"
                            >
                              Open
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}
