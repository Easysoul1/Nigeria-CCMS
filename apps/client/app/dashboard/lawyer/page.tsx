"use client";
import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { Archive, CircleCheck, Clock, FileText } from "lucide-react";
import { api } from "@/src/lib/api";
import { useAuth } from "@/src/providers/auth-provider";
import { StatCard } from "@/src/components/ui/primitives";
import { CasesTable } from "@/src/components/lawyer/cases-table";
import { NewCaseWizard } from "@/src/components/lawyer/new-case-wizard";

type CaseItem = { id: string; status: string; title: string; caseNumber?: string | null; createdAt: string };

export default function LawyerDashboard() {
  const { user } = useAuth();
  const [tab, setTab] = React.useState<"cases" | "file">("cases");

  const { data, isLoading } = useQuery({
    queryKey: ["cases", "lawyer-stats"],
    queryFn: () => api.get<{ items: CaseItem[]; total: number }>("/cases?page=1&pageSize=100"),
  });

  const items = data?.items ?? [];
  const counts = {
    drafts: items.filter((c) => c.status === "DRAFT").length,
    pending: items.filter((c) => c.status === "PENDING_APPROVAL").length,
    active: items.filter((c) => ["ACTIVE", "PART_HEARD", "ADJOURNED"].includes(c.status)).length,
    closed: items.filter((c) => c.status === "CLOSED").length,
  };

  const firstName = user?.firstName?.trim() || user?.email.split("@")[0] || "Counsel";

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-text-muted">Lawyer</p>
          <h1 className="mt-1 font-heading text-2xl font-bold text-text-primary sm:text-3xl">
            Welcome back, {firstName}
          </h1>
          <p className="mt-1 text-sm text-text-secondary">
            File cases, track their progress, and prepare for hearings.
          </p>
        </div>
        <div className="inline-flex rounded-md border border-border bg-surface-page p-1" role="tablist">
          <button
            role="tab"
            aria-selected={tab === "cases"}
            onClick={() => setTab("cases")}
            className={`min-h-[36px] rounded-md px-3 text-sm font-medium focus-ring ${tab === "cases" ? "bg-primary text-primary-foreground" : "text-text-secondary hover:bg-surface-subtle"}`}
          >
            My cases
          </button>
          <button
            role="tab"
            aria-selected={tab === "file"}
            onClick={() => setTab("file")}
            className={`min-h-[36px] rounded-md px-3 text-sm font-medium focus-ring ${tab === "file" ? "bg-primary text-primary-foreground" : "text-text-secondary hover:bg-surface-subtle"}`}
          >
            File new case
          </button>
        </div>
      </div>

      <section className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard label="Drafts" value={counts.drafts} loading={isLoading} accent="default" icon={<FileText size={16} aria-hidden="true" />} hint="Not yet submitted" />
        <StatCard label="Awaiting approval" value={counts.pending} loading={isLoading} accent="pending" icon={<Clock size={16} aria-hidden="true" />} hint="With the registrar" />
        <StatCard label="Active" value={counts.active} loading={isLoading} accent="approved" icon={<CircleCheck size={16} aria-hidden="true" />} hint="Live before the court" />
        <StatCard label="Closed" value={counts.closed} loading={isLoading} accent="info" icon={<Archive size={16} aria-hidden="true" />} hint="Concluded" />
      </section>

      {tab === "cases" ? (
        <CasesTable
          title="My cases"
          emptyTitle="You have not filed a case yet"
          emptyDescription="Start your first filing to see it appear here."
          emptyAction={
            <button
              type="button"
              onClick={() => setTab("file")}
              className="min-h-[44px] rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground hover:bg-primary-hover focus-ring"
            >
              File new case
            </button>
          }
        />
      ) : (
        <NewCaseWizard />
      )}
    </div>
  );
}


