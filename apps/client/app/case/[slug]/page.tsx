"use client";
import * as React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { api, ApiError } from "../../../src/lib/api";
import { PublicShell } from "../../../src/components/public/public-shell";
import { StatusBadge, Spinner } from "../../../src/components/ui/primitives";
import { formatLagosDateTime } from "../../../src/lib/datetime";

type PublicCase = {
  maskedTitle: string;
  status: string;
  nextHearing: { date: string; time: string; court: string } | null;
  presidingJudge: string;
  lastUpdated: string;
};

/** The URL slug uses hyphens instead of slashes: FHC-L-CS-1042-2026. */
function fromSlug(slug: string): string {
  return slug.split("-").join("/").toUpperCase();
}

function toSlug(caseNumber: string): string {
  return caseNumber.split("/").join("-");
}

export default function CasePage() {
  const params = useParams<{ slug: string }>();
  const caseNumber = params?.slug ? fromSlug(params.slug) : "";

  const q = useQuery({
    queryKey: ["public", "track", caseNumber],
    queryFn: () => api.get<PublicCase>(`/public/track/${encodeURIComponent(caseNumber)}`),
    enabled: caseNumber.length > 0,
    retry: false,
  });

  const notFound = q.error instanceof ApiError && q.error.statusCode === 404;

  return (
    <PublicShell
      title={q.data ? q.data.maskedTitle : notFound ? "Case not publicly available" : "Case record"}
      subtitle={`Case reference ${caseNumber}`}
    >
      {q.isLoading ? (
        <div className="flex items-center gap-2 text-sm text-text-secondary">
          <Spinner /> Looking up case…
        </div>
      ) : q.data ? (
        <div className="space-y-4">
          <div className="overflow-hidden rounded-lg border border-border bg-surface-page shadow-e2">
            <div className="flex items-center justify-between gap-4 border-b border-border bg-surface-subtle px-5 py-3">
              <p className="text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-text-muted">
                Public record
              </p>
              <StatusBadge status={q.data.status} />
            </div>
            <dl className="grid gap-4 px-5 py-5 sm:grid-cols-2">
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-text-muted">Presiding judge</dt>
                <dd className="mt-1 text-sm text-text-primary">{q.data.presidingJudge}</dd>
              </div>
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-text-muted">Case status</dt>
                <dd className="mt-1"><StatusBadge status={q.data.status} /></dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="text-xs font-semibold uppercase tracking-wide text-text-muted">Next hearing</dt>
                <dd className="mt-1 text-sm text-text-primary">
                  {q.data.nextHearing
                    ? `${q.data.nextHearing.date} at ${q.data.nextHearing.time} · ${q.data.nextHearing.court}`
                    : "No hearing scheduled"}
                </dd>
              </div>
            </dl>
            <p className="border-t border-border bg-surface-subtle px-5 py-2 text-xs text-text-muted">
              Last updated {formatLagosDateTime(q.data.lastUpdated)}
            </p>
          </div>

          <p className="text-sm text-text-secondary">
            Share this link:{" "}
            <code className="rounded bg-surface-subtle px-1.5 py-0.5 font-mono text-xs text-text-primary">
              /case/{toSlug(caseNumber)}
            </code>
          </p>
        </div>
      ) : (
        <div className="space-y-4 rounded-lg border border-border bg-surface-page p-5 text-sm text-text-secondary shadow-e1">
          <p>
            The address may be mistyped, the case may not be published yet, or the Court may have
            restricted public access to it. All three return the same response so restricted matters
            stay private.
          </p>
          <div className="flex flex-wrap gap-2">
            <Link
              href="/"
              className="inline-flex min-h-[44px] items-center rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground hover:bg-primary-hover focus-ring"
            >
              Try the tracker
            </Link>
            <Link
              href="/help"
              className="inline-flex min-h-[44px] items-center rounded-md border border-border bg-surface-page px-4 text-sm font-medium text-text-primary hover:bg-surface-subtle focus-ring"
            >
              Contact ICT desk
            </Link>
          </div>
        </div>
      )}
    </PublicShell>
  );
}
