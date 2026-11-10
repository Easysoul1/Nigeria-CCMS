"use client";
import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/src/lib/api";
import { useAuth } from "@/src/providers/auth-provider";
import { StatCard } from "@/src/components/ui/primitives";
import { PendingQueue, type CaseItem } from "@/src/components/registrar/pending-queue";
import { ApprovalDrawer } from "@/src/components/registrar/approval-drawer";
import { CasesTable } from "@/src/components/lawyer/cases-table";

type StatusItem = { id: string; status: string };

export default function RegistrarDashboard() {
  const { user } = useAuth();
  const [selected, setSelected] = React.useState<CaseItem | null>(null);
  const [open, setOpen] = React.useState(false);
  const [tab, setTab] = React.useState<"queue" | "all">("queue");

  const statsQuery = useQuery({
    queryKey: ["cases", "registrar-stats"],
    queryFn: () => api.get<{ items: StatusItem[]; total: number }>("/cases?page=1&pageSize=100"),
  });

  const items = statsQuery.data?.items ?? [];
  const counts = {
    pending: items.filter((c) => c.status === "PENDING_APPROVAL").length,
    active: items.filter((c) => c.status === "ACTIVE").length,
    adjourned: items.filter((c) => c.status === "ADJOURNED").length,
    closed: items.filter((c) => c.status === "CLOSED").length,
  };

  const firstName = user?.firstName?.trim() || user?.email.split("@")[0] || "Registrar";

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-text-muted">Registrar</p>
          <h1 className="mt-1 font-heading text-2xl font-bold text-text-primary sm:text-3xl">
            Good day, {firstName}
          </h1>
          <p className="mt-1 text-sm text-text-secondary">
            Review filings, assign judges, and keep the registry moving.
          </p>
        </div>
        <div className="inline-flex rounded-md border border-border bg-surface-page p-1" role="tablist">
          <button
            role="tab"
            aria-selected={tab === "queue"}
            onClick={() => setTab("queue")}
            className={`min-h-[36px] rounded-md px-3 text-sm font-medium focus-ring ${tab === "queue" ? "bg-primary text-primary-foreground" : "text-text-secondary hover:bg-surface-subtle"}`}
          >
            Approval queue
          </button>
          <button
            role="tab"
            aria-selected={tab === "all"}
            onClick={() => setTab("all")}
            className={`min-h-[36px] rounded-md px-3 text-sm font-medium focus-ring ${tab === "all" ? "bg-primary text-primary-foreground" : "text-text-secondary hover:bg-surface-subtle"}`}
          >
            All cases
          </button>
        </div>
      </div>

      <section className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard
          label="Pending approval"
          value={counts.pending}
          loading={statsQuery.isLoading}
          accent="pending"
          hint="Awaiting review"
        />
        <StatCard
          label="Active"
          value={counts.active}
          loading={statsQuery.isLoading}
          accent="approved"
          hint="Before the court"
        />
        <StatCard
          label="Adjourned"
          value={counts.adjourned}
          loading={statsQuery.isLoading}
          accent="info"
          hint="Rescheduled"
        />
        <StatCard
          label="Closed"
          value={counts.closed}
          loading={statsQuery.isLoading}
          accent="default"
          hint="Concluded"
        />
      </section>

      {tab === "queue" ? (
        <PendingQueue
          onOpen={(c) => {
            setSelected(c);
            setOpen(true);
          }}
        />
      ) : (
        <CasesTable
          title="All cases"
          emptyTitle="No cases in the registry yet"
          emptyDescription="Filings will appear here as lawyers submit them."
        />
      )}

      <ApprovalDrawer open={open} caseItem={selected} onClose={() => setOpen(false)} />
    </div>
  );
}
