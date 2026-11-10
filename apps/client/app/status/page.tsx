"use client";
import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "../../src/lib/api";
import { PublicShell } from "../../src/components/public/public-shell";
import { Spinner } from "../../src/components/ui/primitives";

type Health = { status: "ok" | "degraded" | "error"; checks: Record<string, { ok: boolean; detail?: string }> };

export default function StatusPage() {
  const q = useQuery({
    queryKey: ["health"],
    queryFn: () => api.get<Health>("/health", { redirectOnUnauthorized: false }),
    refetchInterval: 15_000,
  });

  const overall = q.data?.status ?? (q.isLoading ? "checking" : q.error ? "error" : "unknown");
  const tone =
    overall === "ok"
      ? "bg-status-approved-bg text-status-approved-fg"
      : overall === "degraded"
        ? "bg-status-pending-bg text-status-pending-fg"
        : overall === "checking"
          ? "bg-status-info-bg text-status-info-fg"
          : "bg-status-rejected-bg text-status-rejected-fg";

  return (
    <PublicShell
      title="System status"
      subtitle="Live status of the public case tracker. This page refreshes every 15 seconds."
    >
      <div className="space-y-4">
        <div className={`flex items-center justify-between gap-3 rounded-lg border border-border px-5 py-4 ${tone}`}>
          <div className="flex items-center gap-3">
            {q.isLoading ? <Spinner /> : <span className="flex h-3 w-3 rounded-pill bg-current" aria-hidden="true" />}
            <div>
              <p className="text-sm font-semibold">
                {overall === "ok"
                  ? "All systems operational"
                  : overall === "degraded"
                    ? "Service is degraded"
                    : overall === "checking"
                      ? "Checking…"
                      : "Service is unavailable"}
              </p>
              <p className="text-xs opacity-80">
                {q.data?.status === "degraded"
                  ? "The tracker is available but some background services are degraded. Downloads may be slow."
                  : overall === "error"
                    ? "We are aware and investigating. Please try again shortly."
                    : "The public tracker and staff console are responding normally."}
              </p>
            </div>
          </div>
        </div>

        {q.data ? (
          <div className="overflow-hidden rounded-lg border border-border bg-surface-page">
            <table className="w-full text-sm">
              <thead className="bg-surface-subtle text-xs uppercase tracking-wide text-text-muted">
                <tr>
                  <th scope="col" className="px-4 py-3 text-left font-semibold">Component</th>
                  <th scope="col" className="px-4 py-3 text-left font-semibold">Status</th>
                  <th scope="col" className="px-4 py-3 text-left font-semibold">Detail</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(q.data.checks).map(([key, val]) => (
                  <tr key={key} className="border-t border-border">
                    <td className="px-4 py-3 font-medium capitalize text-text-primary">{key}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1.5 rounded-pill px-2.5 py-1 text-xs font-semibold ${val.ok ? "bg-status-approved-bg text-status-approved-fg" : "bg-status-rejected-bg text-status-rejected-fg"}`}>
                        <span aria-hidden="true" className="h-1.5 w-1.5 rounded-pill bg-current" />
                        {val.ok ? "Operational" : "Down"}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-text-muted">{val.detail ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}

        <p className="text-xs text-text-muted">
          If you are experiencing a problem not reflected here, please{" "}
          <a href="/help" className="font-medium text-primary underline underline-offset-4 focus-ring">
            contact the ICT desk
          </a>
          .
        </p>
      </div>
    </PublicShell>
  );
}
