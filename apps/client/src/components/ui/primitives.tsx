"use client";
import * as React from "react";
import {
  Archive,
  Ban,
  BookOpen,
  Calendar,
  CalendarClock,
  CircleCheck,
  Clock,
  FileText,
  Gavel,
  Inbox,
  ShieldCheck,
  ShieldX,
  X,
  XCircle,
  type LucideIcon,
} from "lucide-react";

/* -------------------------------------------------------------------------- */
/*  Status badge — always icon + text (WCAG 2.2 AA: never colour-only).        */
/* -------------------------------------------------------------------------- */

export type StatusKind =
  | "DRAFT"
  | "PENDING_APPROVAL"
  | "REJECTED"
  | "ACTIVE"
  | "PART_HEARD"
  | "ADJOURNED"
  | "CLOSED"
  | "SCHEDULED"
  | "COMPLETED"
  | "CANCELLED"
  | "PUBLISHED"
  | "CLEAN"
  | "INFECTED"
  | "PENDING"
  | "APPROVED";

type StatusMeta = {
  label: string;
  fg: string;
  bg: string;
  icon: LucideIcon;
};

const STATUS_META: Record<StatusKind, StatusMeta> = {
  DRAFT:            { label: "Draft",            fg: "text-status-neutral-fg",  bg: "bg-status-neutral-bg",  icon: FileText },
  PENDING_APPROVAL: { label: "Pending approval", fg: "text-status-pending-fg",  bg: "bg-status-pending-bg",  icon: Clock },
  PENDING:          { label: "Pending",          fg: "text-status-pending-fg",  bg: "bg-status-pending-bg",  icon: Clock },
  REJECTED:         { label: "Rejected",         fg: "text-status-rejected-fg", bg: "bg-status-rejected-bg", icon: XCircle },
  ACTIVE:           { label: "Active",           fg: "text-status-approved-fg", bg: "bg-status-approved-bg", icon: CircleCheck },
  APPROVED:         { label: "Approved",         fg: "text-status-approved-fg", bg: "bg-status-approved-bg", icon: CircleCheck },
  CLEAN:            { label: "Clean",            fg: "text-status-approved-fg", bg: "bg-status-approved-bg", icon: ShieldCheck },
  PART_HEARD:       { label: "Part-heard",       fg: "text-status-info-fg",     bg: "bg-status-info-bg",     icon: Gavel },
  ADJOURNED:        { label: "Adjourned",        fg: "text-status-pending-fg",  bg: "bg-status-pending-bg",  icon: CalendarClock },
  CLOSED:           { label: "Closed",           fg: "text-status-neutral-fg",  bg: "bg-status-neutral-bg",  icon: Archive },
  COMPLETED:        { label: "Completed",        fg: "text-status-approved-fg", bg: "bg-status-approved-bg", icon: CircleCheck },
  CANCELLED:        { label: "Cancelled",        fg: "text-status-neutral-fg",  bg: "bg-status-neutral-bg",  icon: Ban },
  SCHEDULED:        { label: "Scheduled",        fg: "text-status-info-fg",     bg: "bg-status-info-bg",     icon: Calendar },
  PUBLISHED:        { label: "Published",        fg: "text-status-approved-fg", bg: "bg-status-approved-bg", icon: BookOpen },
  INFECTED:         { label: "Infected",         fg: "text-status-rejected-fg", bg: "bg-status-rejected-bg", icon: ShieldX },
};

const FALLBACK_META: StatusMeta = {
  label: "Status",
  fg: "text-status-neutral-fg",
  bg: "bg-status-neutral-bg",
  icon: FileText,
};

export function StatusBadge({ status }: { status: StatusKind | string }) {
  const meta = (STATUS_META as Record<string, StatusMeta>)[status] ?? {
    ...FALLBACK_META,
    label: status,
  };
  const Icon = meta.icon;
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-pill px-2.5 py-1 text-xs font-semibold ${meta.fg} ${meta.bg}`}
    >
      <Icon size={12} strokeWidth={2.5} aria-hidden="true" />
      {meta.label}
    </span>
  );
}

/* -------------------------------------------------------------------------- */
/*  Spinner                                                                    */
/* -------------------------------------------------------------------------- */

export function Spinner({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      className={`h-4 w-4 animate-spin ${className ?? ""}`}
      viewBox="0 0 24 24"
      fill="none"
    >
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity="0.25" strokeWidth="3" />
      <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

/* -------------------------------------------------------------------------- */
/*  Empty state                                                                */
/* -------------------------------------------------------------------------- */

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border bg-surface-page px-6 py-12 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-surface-tint text-primary">
        <Inbox size={22} aria-hidden="true" />
      </div>
      <h3 className="mt-4 font-heading text-base font-semibold text-text-primary">{title}</h3>
      {description ? (
        <p className="mt-1 max-w-sm text-sm text-text-secondary">{description}</p>
      ) : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Modal — accessible dialog with focus trap + Escape + restore focus         */
/* -------------------------------------------------------------------------- */

export function Modal({
  open,
  title,
  description,
  onClose,
  children,
  size = "md",
  footer,
}: {
  open: boolean;
  title: string;
  description?: string;
  onClose: () => void;
  children: React.ReactNode;
  size?: "sm" | "md" | "lg";
  footer?: React.ReactNode;
}) {
  const ref = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!open) return;
    const previouslyFocused = document.activeElement as HTMLElement | null;
    const first = ref.current?.querySelector<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
    );
    first?.focus();

    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
        return;
      }
      if (e.key === "Tab" && ref.current) {
        const focusables = ref.current.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
        );
        if (focusables.length === 0) return;
        const firstEl = focusables[0];
        const lastEl = focusables[focusables.length - 1];
        if (e.shiftKey && document.activeElement === firstEl) {
          e.preventDefault();
          lastEl?.focus();
        } else if (!e.shiftKey && document.activeElement === lastEl) {
          e.preventDefault();
          firstEl?.focus();
        }
      }
    };
    window.addEventListener("keydown", handler);
    return () => {
      window.removeEventListener("keydown", handler);
      previouslyFocused?.focus?.();
    };
  }, [open, onClose]);

  if (!open) return null;

  const maxW = size === "sm" ? "max-w-sm" : size === "lg" ? "max-w-3xl" : "max-w-lg";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-text-primary/50 px-4 py-6">
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        aria-describedby={description ? "modal-desc" : undefined}
        className={`motion-rise flex max-h-full w-full ${maxW} flex-col overflow-hidden rounded-lg border border-border bg-surface-page shadow-e2`}
      >
        <div className="flex items-start justify-between gap-4 border-b border-border px-5 py-4">
          <div className="min-w-0">
            <h2 id="modal-title" className="font-heading text-lg font-bold text-text-primary">
              {title}
            </h2>
            {description ? (
              <p id="modal-desc" className="mt-1 text-sm text-text-secondary">
                {description}
              </p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-text-secondary hover:bg-surface-subtle focus-ring"
          >
            <X size={16} aria-hidden="true" />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">{children}</div>
        {footer ? (
          <div className="flex flex-wrap items-center justify-end gap-2 border-t border-border bg-surface-subtle px-5 py-3">
            {footer}
          </div>
        ) : null}
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Stat card                                                                  */
/* -------------------------------------------------------------------------- */

export function StatCard({
  label,
  value,
  hint,
  loading,
  icon,
  accent,
}: {
  label: string;
  value: number | string;
  hint?: string;
  loading?: boolean;
  icon?: React.ReactNode;
  accent?: "default" | "pending" | "approved" | "rejected" | "info";
}) {
  const tone =
    accent === "pending"
      ? "bg-status-pending-bg text-status-pending-fg"
      : accent === "approved"
        ? "bg-status-approved-bg text-status-approved-fg"
        : accent === "rejected"
          ? "bg-status-rejected-bg text-status-rejected-fg"
          : accent === "info"
            ? "bg-status-info-bg text-status-info-fg"
            : "bg-surface-tint text-primary";

  return (
    <div className="rounded-lg border border-border bg-surface-page p-4 shadow-e1">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-text-muted">{label}</p>
        {icon ? (
          <span className={`flex h-8 w-8 items-center justify-center rounded-md ${tone}`} aria-hidden="true">
            {icon}
          </span>
        ) : null}
      </div>
      {loading ? (
        <span aria-hidden="true" className="mt-2 block h-7 w-16 animate-pulse rounded bg-surface-subtle" />
      ) : (
        <p className="mt-2 font-heading text-3xl font-bold leading-none text-text-primary">{value}</p>
      )}
      {hint ? <p className="mt-1 text-xs text-text-muted">{hint}</p> : null}
    </div>
  );
}
