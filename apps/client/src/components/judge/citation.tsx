"use client";
import * as React from "react";
import { ExternalLink } from "lucide-react";

export type CitationKind = "case" | "statute" | "book" | "other";
export type Citation = { kind: CitationKind; citation: string; note?: string };

const KIND_LABEL: Record<CitationKind, string> = {
  case: "Case",
  statute: "Statute",
  book: "Book",
  other: "Other",
};

/**
 * NigerianLII lookup. Opens the site's own search in a new tab — we do not
 * scrape it, do not send the query anywhere except nigerianlii.org, and do not
 * persist any copy of what the user searched for.
 */
export function nigerianLiiUrl(query: string): string {
  const q = query.trim();
  return `https://nigerianlii.org/search/?q=${encodeURIComponent(q)}`;
}

export function NigerianLiiButton({
  query,
  className,
  compact,
}: {
  query: string;
  className?: string;
  compact?: boolean;
}) {
  const disabled = query.trim().length < 3;
  const label = compact ? "Look up" : "Look up on NigerianLII";
  if (disabled) {
    return (
      <span
        aria-disabled="true"
        title="Enter at least 3 characters to look up on NigerianLII"
        className={`inline-flex cursor-not-allowed items-center gap-1.5 rounded-md border border-border bg-surface-subtle px-3 text-xs font-medium text-text-muted ${compact ? "min-h-[44px]" : "min-h-[44px]"} ${className ?? ""}`}
      >
        <ExternalLink size={14} aria-hidden="true" />
        {label}
      </span>
    );
  }
  return (
    <a
      href={nigerianLiiUrl(query)}
      target="_blank"
      rel="noreferrer nofollow noopener"
      className={`inline-flex items-center gap-1.5 rounded-md border border-border bg-surface-page px-3 text-xs font-medium text-primary hover:bg-surface-subtle focus-ring ${compact ? "min-h-[44px]" : "min-h-[44px]"} ${className ?? ""}`}
      title={`Open NigerianLII search for “${query.trim()}” in a new tab`}
    >
      <ExternalLink size={14} aria-hidden="true" />
      {label}
    </a>
  );
}

export function CitationList({ citations }: { citations: Citation[] | null | undefined }) {
  if (!citations || citations.length === 0) return null;
  return (
    <ul className="mt-3 space-y-1.5 text-sm">
      {citations.map((c, i) => (
        <li key={`${c.citation}-${i}`} className="flex flex-wrap items-baseline gap-2">
          <span className="rounded-pill bg-surface-tint px-2 py-0.5 text-[0.65rem] font-semibold uppercase tracking-wide text-primary">
            {KIND_LABEL[c.kind]}
          </span>
          <span className="font-medium text-text-primary">{c.citation}</span>
          {c.note ? <span className="text-text-muted">— {c.note}</span> : null}
        </li>
      ))}
    </ul>
  );
}

export { KIND_LABEL };
