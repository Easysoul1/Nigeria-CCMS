"use client";

import * as React from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { LogOut } from "lucide-react";
import { api, ApiError } from "@/src/lib/api";
import { Spinner } from "@/src/components/ui/primitives";
import { useAuth } from "@/src/providers/auth-provider";
import { ScalesMark } from "@/src/components/scales-mark";
import { formatLagosDateTime } from "@/src/lib/datetime";

type Role = "ADMIN" | "REGISTRAR" | "JUDGE" | "LAWYER";
const ROLES: Role[] = ["ADMIN", "REGISTRAR", "JUDGE", "LAWYER"];
const ROLE_LABEL: Record<Role, string> = {
  ADMIN: "Administrator",
  REGISTRAR: "Registrar",
  JUDGE: "Judge",
  LAWYER: "Lawyer",
};
const PAGE_SIZES = [10, 25, 50] as const;
type PageSize = (typeof PAGE_SIZES)[number];

type UserItem = {
  id: string;
  email: string;
  role: Role;
  firstName: string;
  lastName: string;
  isActive: boolean;
};

type UsersResponse = { items: UserItem[]; total: number; page: number; pageSize: number };

type StatsResponse = {
  users: { role: string; _count: { _all: number } }[];
  cases: { status: string; _count: { _all: number } }[];
  hearings: number;
  documents: number;
  audits: number;
};

type AuditItem = {
  id: string;
  createdAt: string;
  userId?: string | null;
  action: string;
  entity: string;
  entityId: string;
};

type PendingChange = {
  userId: string;
  email: string;
  role?: Role;
  isActive?: boolean;
};

export default function AdminDashboard() {
  const { user, loading, logout } = useAuth();

  React.useEffect(() => {
    if (!loading && !user) window.location.assign("/login");
  }, [loading, user]);

  if (loading || !user) return <LoadingShell />;
  if (user.role !== "ADMIN") return <AccessDenied />;

  return <AdminConsole userEmail={user.email} onLogout={logout} />;
}

function AdminConsole({ userEmail, onLogout }: { userEmail: string; onLogout: () => Promise<void> }) {
  const qc = useQueryClient();

  const [page, setPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState<PageSize>(25);
  const [pending, setPending] = React.useState<Map<string, PendingChange>>(new Map());
  const [savingAll, setSavingAll] = React.useState(false);
  const [saveError, setSaveError] = React.useState<string | null>(null);
  const [savedAt, setSavedAt] = React.useState<Date | null>(null);
  const [loggingOut, setLoggingOut] = React.useState(false);
  const [confirmLogout, setConfirmLogout] = React.useState(false);

  const suppressGuardRef = React.useRef(false);
  const hasPending = pending.size > 0;

  const statsQuery = useQuery({
    queryKey: ["admin", "stats"],
    queryFn: () => api.get<StatsResponse>("/admin/stats"),
  });

  const usersQuery = useQuery({
    queryKey: ["users", page, pageSize],
    queryFn: () => api.get<UsersResponse>(`/users?page=${page}&pageSize=${pageSize}`),
  });

  const auditQuery = useQuery({
    queryKey: ["audit-logs"],
    queryFn: () => api.get<{ items: AuditItem[]; total: number }>("/audit-logs?page=1&pageSize=20"),
  });

  const users = usersQuery.data?.items ?? [];
  const total = usersQuery.data?.total ?? 0;
  const startIdx = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const endIdx = Math.min(page * pageSize, total);

  React.useEffect(() => {
    if (!savedAt) return;
    const t = window.setTimeout(() => setSavedAt(null), 4000);
    return () => window.clearTimeout(t);
  }, [savedAt]);

  React.useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (suppressGuardRef.current) return;
      if (!hasPending) return;
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [hasPending]);

  React.useEffect(() => {
    if (usersQuery.isLoading) return;
    const maxPage = Math.max(1, Math.ceil(total / pageSize));
    if (page > maxPage) setPage(maxPage);
  }, [usersQuery.isLoading, total, pageSize, page]);

  const setRole = React.useCallback((target: UserItem, role: Role) => {
    setSavedAt(null);
    setSaveError(null);
    setPending((prev) => stageRole(prev, target, role));
  }, []);

  const setActive = React.useCallback((target: UserItem, activate: boolean) => {
    setSavedAt(null);
    setSaveError(null);
    setPending((prev) => stageActive(prev, target, activate));
  }, []);

  const saveAll = React.useCallback(async () => {
    if (savingAll || pending.size === 0) return;
    setSavingAll(true);
    setSaveError(null);

    const failedIds = new Set<string>();
    const errors: string[] = [];

    for (const change of pending.values()) {
      try {
        if (change.role !== undefined) {
          await api.patch(`/users/${change.userId}/role`, { role: change.role });
        }
        if (change.isActive !== undefined) {
          await api.patch(
            change.isActive
              ? `/users/${change.userId}/reactivate`
              : `/users/${change.userId}/deactivate`,
          );
        }
      } catch (err) {
        failedIds.add(change.userId);
        const reason = err instanceof ApiError ? err.message : "could not be saved";
        errors.push(`${change.email}: ${reason}`);
      }
    }

    await Promise.all([
      qc.invalidateQueries({ queryKey: ["users"] }),
      qc.invalidateQueries({ queryKey: ["audit-logs"] }),
      qc.invalidateQueries({ queryKey: ["admin", "stats"] }),
    ]);

    if (failedIds.size > 0) {
      const retry = new Map<string, PendingChange>();
      for (const id of failedIds) {
        const change = pending.get(id);
        if (change) retry.set(id, change);
      }
      setPending(retry);
      setSaveError(errors.join(" · "));
    } else {
      setPending(new Map());
      setSavedAt(new Date());
    }
    setSavingAll(false);
  }, [pending, savingAll, qc]);

  React.useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        if (hasPending && !savingAll) void saveAll();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [hasPending, savingAll, saveAll]);

  const performLogout = React.useCallback(async () => {
    if (loggingOut) return;
    setLoggingOut(true);
    suppressGuardRef.current = true;
    try {
      await onLogout();
    } finally {
      setLoggingOut(false);
    }
  }, [loggingOut, onLogout]);

  const handleLogout = React.useCallback(() => {
    if (loggingOut) return;
    if (hasPending) {
      setConfirmLogout(true);
      return;
    }
    void performLogout();
  }, [hasPending, loggingOut, performLogout]);

  const totalUsers = sumCounts(statsQuery.data?.users);
  const totalCases = sumCounts(statsQuery.data?.cases);

  return (
    <div className="min-h-screen bg-surface-subtle">
      <header className="sticky top-0 z-20 border-b border-border bg-surface-page">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <ScalesMark className="h-5 w-5" />
            </span>
            <div className="min-w-0 leading-tight">
              <p className="truncate text-[0.68rem] font-semibold uppercase tracking-[0.14em] text-text-muted">
                Administration
              </p>
              <p className="truncate text-sm font-semibold text-text-primary">
                Federal High Court of Nigeria
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden text-right text-xs sm:block">
              <p className="font-semibold text-text-primary">{userEmail}</p>
              <p className="text-text-muted">Administrator</p>
            </div>
            <button
              type="button"
              onClick={handleLogout}
              disabled={loggingOut}
              aria-busy={loggingOut}
              className="flex min-h-[44px] min-w-[44px] items-center justify-center gap-2 rounded-md border border-border bg-surface-page px-4 text-sm font-medium text-text-primary transition-colors hover:bg-surface-subtle focus-ring disabled:opacity-60"
            >
              {loggingOut ? (
                <>
                  <Spinner aria-hidden="true" />
                  Signing out…
                </>
              ) : (
                <>
                  <LogOut size={16} aria-hidden="true" />
                  Logout
                </>
              )}
            </button>
          </div>
        </div>
      </header>

      <main
        className={`mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6 ${hasPending ? "pb-44 sm:pb-40" : "pb-10"}`}
      >
        <div>
          <h1 className="font-heading text-2xl font-bold text-text-primary sm:text-3xl">
            Admin console
          </h1>
          <p className="mt-1 text-sm text-text-secondary">
            Manage accounts, roles and access. Edits are staged until you save them.
          </p>
        </div>

        <section className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <StatCard label="Users" value={totalUsers} loading={statsQuery.isLoading} />
          <StatCard label="Cases" value={totalCases} loading={statsQuery.isLoading} />
          <StatCard label="Hearings" value={statsQuery.data?.hearings ?? 0} loading={statsQuery.isLoading} />
          <StatCard label="Documents" value={statsQuery.data?.documents ?? 0} loading={statsQuery.isLoading} />
        </section>

        <InviteSection />

        <section aria-labelledby="users-heading" className="space-y-3">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 id="users-heading" className="font-heading text-xl font-semibold text-text-primary">
              Users
            </h2>
            <p className="text-xs text-text-muted">
              {usersQuery.isLoading ? "Loading…" : `${total} account${total === 1 ? "" : "s"}`}
            </p>
          </div>

          <div className="overflow-hidden rounded-lg border border-border bg-surface-page">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-surface-subtle text-xs uppercase tracking-wide text-text-muted">
                  <tr>
                    <th scope="col" className="px-4 py-3 text-left font-semibold">Account</th>
                    <th scope="col" className="px-4 py-3 text-left font-semibold">Role</th>
                    <th scope="col" className="px-4 py-3 text-left font-semibold">Status</th>
                    <th scope="col" className="px-4 py-3 text-right font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {usersQuery.isLoading ? (
                    Array.from({ length: 3 }).map((_, i) => (
                      <tr key={i} className="border-t border-border">
                        <td className="px-4 py-3" colSpan={4}>
                          <span
                            aria-hidden="true"
                            className="block h-4 w-full animate-pulse rounded bg-surface-subtle"
                          />
                        </td>
                      </tr>
                    ))
                  ) : users.length === 0 ? (
                    <tr className="border-t border-border">
                      <td colSpan={4} className="px-4 py-6 text-center text-sm text-text-muted">
                        No users on this page.
                      </td>
                    </tr>
                  ) : (
                    users.map((u) => {
                      const change = pending.get(u.id);
                      const effectiveRole = change?.role ?? u.role;
                      const effectiveActive = change?.isActive ?? u.isActive;
                      const isSelf = u.email === userEmail;
                      const isDirty = change !== undefined;
                      const disabled = isSelf || savingAll;

                      return (
                        <tr
                          key={u.id}
                          className={`border-t border-border transition-colors ${isDirty ? "bg-status-pending-bg/60" : "hover:bg-surface-subtle"}`}
                        >
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <span className="truncate font-medium text-text-primary">{u.email}</span>
                              {isDirty ? <DirtyDot /> : null}
                              {isSelf ? (
                                <span className="rounded-pill bg-status-info-bg px-2 py-0.5 text-[0.65rem] font-semibold text-status-info-fg">
                                  You
                                </span>
                              ) : null}
                            </div>
                            <p className="mt-0.5 truncate text-xs text-text-muted">
                              {[u.firstName, u.lastName].filter(Boolean).join(" ") || "—"}
                            </p>
                          </td>
                          <td className="px-4 py-3">
                            <label className="sr-only" htmlFor={`role-${u.id}`}>
                              Role for {u.email}
                            </label>
                            <select
                              id={`role-${u.id}`}
                              value={effectiveRole}
                              onChange={(e) => setRole(u, e.target.value as Role)}
                              disabled={disabled}
                              title={isSelf ? "You cannot change your own role" : undefined}
                              className="min-h-[44px] w-full max-w-[11rem] rounded-md border border-border bg-surface-page px-3 text-sm text-text-primary focus-ring disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              {ROLES.map((r) => (
                                <option key={r} value={r}>
                                  {ROLE_LABEL[r]}
                                </option>
                              ))}
                            </select>
                          </td>
                          <td className="px-4 py-3">
                            <StatusBadge active={effectiveActive} />
                          </td>
                          <td className="px-4 py-3 text-right">
                            <button
                              type="button"
                              onClick={() => setActive(u, !effectiveActive)}
                              disabled={disabled}
                              title={isSelf ? "You cannot deactivate your own account" : undefined}
                              className="min-h-[44px] rounded-md px-3 text-sm font-medium text-primary transition-colors hover:bg-surface-tint focus-ring disabled:cursor-not-allowed disabled:text-text-muted disabled:hover:bg-transparent"
                            >
                              {effectiveActive ? "Deactivate" : "Reactivate"}
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border bg-surface-subtle px-4 py-3 text-sm">
              <p className="text-text-secondary">
                {usersQuery.isLoading
                  ? "Loading…"
                  : total === 0
                    ? "No users"
                    : `Showing ${startIdx}–${endIdx} of ${total}`}
              </p>
              <div className="flex flex-wrap items-center gap-2">
                <label htmlFor="users-page-size" className="text-text-secondary">
                  Rows per page
                </label>
                <select
                  id="users-page-size"
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(Number(e.target.value) as PageSize);
                    setPage(1);
                  }}
                  className="min-h-[44px] rounded-md border border-border bg-surface-page px-2 text-sm text-text-primary focus-ring"
                >
                  {PAGE_SIZES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1 || usersQuery.isFetching}
                  className="min-h-[44px] rounded-md border border-border bg-surface-page px-3 text-sm font-medium text-text-primary transition-colors hover:bg-surface-subtle focus-ring disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Previous
                </button>
                <button
                  type="button"
                  onClick={() => setPage((p) => p + 1)}
                  disabled={endIdx >= total || usersQuery.isFetching}
                  className="min-h-[44px] rounded-md border border-border bg-surface-page px-3 text-sm font-medium text-text-primary transition-colors hover:bg-surface-subtle focus-ring disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        </section>

        <section aria-labelledby="audit-heading" className="space-y-3">
          <h2 id="audit-heading" className="font-heading text-xl font-semibold text-text-primary">
            Audit log
          </h2>
          <div className="overflow-hidden rounded-lg border border-border bg-surface-page">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="bg-surface-subtle uppercase tracking-wide text-text-muted">
                  <tr>
                    <th scope="col" className="px-4 py-3 text-left font-semibold">When</th>
                    <th scope="col" className="px-4 py-3 text-left font-semibold">Actor</th>
                    <th scope="col" className="px-4 py-3 text-left font-semibold">Action</th>
                    <th scope="col" className="px-4 py-3 text-left font-semibold">Entity</th>
                  </tr>
                </thead>
                <tbody>
                  {auditQuery.isLoading ? (
                    <tr className="border-t border-border">
                      <td colSpan={4} className="px-4 py-3 text-text-muted">
                        Loading audit log…
                      </td>
                    </tr>
                  ) : (auditQuery.data?.items ?? []).length === 0 ? (
                    <tr className="border-t border-border">
                      <td colSpan={4} className="px-4 py-3 text-text-muted">
                        No audit entries yet.
                      </td>
                    </tr>
                  ) : (
                    auditQuery.data!.items.map((l) => (
                      <tr key={l.id} className="border-t border-border hover:bg-surface-subtle">
                        <td className="whitespace-nowrap px-4 py-3 text-text-secondary">
                          {formatLagosDateTime(l.createdAt)}
                        </td>
                        <td
                          className="truncate px-4 py-3 font-mono text-text-secondary"
                          title={l.userId ?? "system"}
                        >
                          {l.userId ?? "system"}
                        </td>
                        <td className="truncate px-4 py-3 text-text-primary" title={l.action}>
                          {l.action}
                        </td>
                        <td
                          className="truncate px-4 py-3 text-text-secondary"
                          title={`${l.entity}:${l.entityId}`}
                        >
                          <span className="font-medium text-text-primary">{l.entity}</span>
                          <span className="text-text-muted">:{l.entityId}</span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            <p className="border-t border-border bg-surface-subtle px-4 py-2 text-xs text-text-muted">
              Showing the {(auditQuery.data?.items ?? []).length} most recent{" "}
              {(auditQuery.data?.items ?? []).length === 1 ? "entry" : "entries"} of{" "}
              {auditQuery.data?.total ?? 0}.
            </p>
          </div>
        </section>
      </main>

      <SaveBar
        count={pending.size}
        hasPending={hasPending}
        saving={savingAll}
        savedAt={savedAt}
        error={saveError}
        onDiscard={() => {
          setPending(new Map());
          setSaveError(null);
        }}
        onSave={() => void saveAll()}
      />

      <ConfirmDialog
        open={confirmLogout}
        title="Log out with unsaved changes?"
        description={`You have ${pending.size} ${pending.size === 1 ? "user" : "users"} with unsaved changes. Logging out now will discard them.`}
        confirmLabel="Log out anyway"
        destructive
        onConfirm={() => {
          setConfirmLogout(false);
          void performLogout();
        }}
        onCancel={() => setConfirmLogout(false)}
      />
    </div>
  );
}

function StatCard({ label, value, loading }: { label: string; value: number; loading?: boolean }) {
  return (
    <div className="rounded-lg border border-border bg-surface-page p-4 shadow-e1">
      <p className="text-xs font-semibold uppercase tracking-wide text-text-muted">{label}</p>
      {loading ? (
        <span aria-hidden="true" className="mt-2 block h-7 w-12 animate-pulse rounded bg-surface-subtle" />
      ) : (
        <p className="mt-1 font-heading text-2xl font-bold text-primary">{value}</p>
      )}
    </div>
  );
}

function StatusBadge({ active }: { active: boolean }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-pill px-2.5 py-1 text-xs font-semibold ${active ? "bg-status-approved-bg text-status-approved-fg" : "bg-status-rejected-bg text-status-rejected-fg"}`}
    >
      <span
        aria-hidden="true"
        className={`h-1.5 w-1.5 rounded-pill ${active ? "bg-status-approved-fg" : "bg-status-rejected-fg"}`}
      />
      {active ? "Active" : "Disabled"}
    </span>
  );
}

function DirtyDot() {
  return (
    <span
      aria-label="Unsaved change"
      title="Unsaved change"
      className="inline-block h-2 w-2 shrink-0 rounded-pill bg-status-pending-fg"
    />
  );
}

function SaveBar({
  count,
  hasPending,
  saving,
  savedAt,
  error,
  onDiscard,
  onSave,
}: {
  count: number;
  hasPending: boolean;
  saving: boolean;
  savedAt: Date | null;
  error: string | null;
  onDiscard: () => void;
  onSave: () => void;
}) {
  const showConfirmation = !hasPending && savedAt !== null;

  if (!hasPending && !showConfirmation && !error) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-surface-page/95 shadow-e2 backdrop-blur motion-slide-up"
    >
      <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div className="min-w-0 text-sm">
          {error ? (
            <p className="font-medium text-status-rejected-fg">
              Some changes could not be saved. {error}
            </p>
          ) : hasPending ? (
            <p className="font-medium text-text-primary">
              {count} {count === 1 ? "user" : "users"} with unsaved changes
              <span className="ml-2 hidden text-text-muted sm:inline">
                · Press ⌘/Ctrl + S to save
              </span>
            </p>
          ) : showConfirmation ? (
            <p className="font-medium text-status-approved-fg">
              Changes saved at{" "}
              {savedAt.toLocaleTimeString("en-NG", { hour: "2-digit", minute: "2-digit" })}.
            </p>
          ) : null}
        </div>

        <div className="flex items-center gap-2">
          {hasPending ? (
            <button
              type="button"
              onClick={onDiscard}
              disabled={saving}
              className="min-h-[44px] rounded-md border border-border bg-surface-page px-4 text-sm font-medium text-text-primary transition-colors hover:bg-surface-subtle focus-ring disabled:opacity-60"
            >
              Discard
            </button>
          ) : null}
          {hasPending ? (
            <button
              type="button"
              onClick={onSave}
              disabled={saving}
              aria-busy={saving}
              className="flex min-h-[44px] items-center justify-center gap-2 rounded-md bg-primary px-5 text-sm font-semibold text-primary-foreground shadow-e1 transition-colors hover:bg-primary-hover focus-ring disabled:opacity-70"
            >
              {saving ? (
                <>
                  <Spinner aria-hidden="true" />
                  Saving…
                </>
              ) : (
                "Save changes"
              )}
            </button>
          ) : (
            <button
              type="button"
              onClick={onDiscard}
              className="min-h-[44px] rounded-md border border-border bg-surface-page px-4 text-sm font-medium text-text-secondary transition-colors hover:bg-surface-subtle focus-ring"
            >
              Dismiss
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel,
  destructive,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  destructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const dialogRef = React.useRef<HTMLDivElement>(null);
  const confirmRef = React.useRef<HTMLButtonElement>(null);

  React.useEffect(() => {
    if (!open) return;
    const previouslyFocused = document.activeElement as HTMLElement | null;
    const firstTarget = destructive
      ? dialogRef.current?.querySelector<HTMLElement>("[data-cancel]")
      : confirmRef.current;
    firstTarget?.focus();

    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onCancel();
        return;
      }
      if (e.key === "Tab" && dialogRef.current) {
        const focusable = dialogRef.current.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
        );
        if (focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last?.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first?.focus();
        }
      }
    };
    window.addEventListener("keydown", handler);
    return () => {
      window.removeEventListener("keydown", handler);
      previouslyFocused?.focus?.();
    };
  }, [open, destructive, onCancel]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-text-primary/40 px-4">
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-title"
        aria-describedby="confirm-desc"
        className="motion-rise w-full max-w-md rounded-lg border border-border bg-surface-page p-6 shadow-e2"
      >
        <h2 id="confirm-title" className="font-heading text-lg font-bold text-text-primary">
          {title}
        </h2>
        <p id="confirm-desc" className="mt-2 text-sm text-text-secondary">
          {description}
        </p>
        <div className="mt-6 flex justify-end gap-2">
          <button
            type="button"
            data-cancel
            onClick={onCancel}
            className="min-h-[44px] rounded-md border border-border bg-surface-page px-4 text-sm font-medium text-text-primary transition-colors hover:bg-surface-subtle focus-ring"
          >
            Cancel
          </button>
          <button
            ref={confirmRef}
            type="button"
            onClick={onConfirm}
            className={
              destructive
                ? "min-h-[44px] rounded-md bg-status-rejected-fg px-4 text-sm font-semibold text-surface-page transition-opacity hover:opacity-90 focus-ring"
                : "min-h-[44px] rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary-hover focus-ring"
            }
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

function InviteSection() {
  const qc = useQueryClient();
  const [form, setForm] = React.useState({
    email: "",
    password: "",
    role: "LAWYER" as Role,
    firstName: "",
    lastName: "",
  });
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [success, setSuccess] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!success) return;
    const t = window.setTimeout(() => setSuccess(null), 5000);
    return () => window.clearTimeout(t);
  }, [success]);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (submitting) return;
    setError(null);
    setSuccess(null);
    setSubmitting(true);
    try {
      await api.post("/users", form);
      setSuccess(`Invitation sent to ${form.email}.`);
      setForm({ email: "", password: "", role: "LAWYER", firstName: "", lastName: "" });
      await Promise.all([
        qc.invalidateQueries({ queryKey: ["users"] }),
        qc.invalidateQueries({ queryKey: ["audit-logs"] }),
        qc.invalidateQueries({ queryKey: ["admin", "stats"] }),
      ]);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not invite this user.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section
      aria-labelledby="invite-heading"
      className="space-y-3 rounded-lg border border-border bg-surface-page p-4 shadow-e1 sm:p-6"
    >
      <h2 id="invite-heading" className="font-heading text-xl font-semibold text-text-primary">
        Invite a new user
      </h2>
      <form className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3" onSubmit={onSubmit}>
        <Field label="First name" id="invite-first-name">
          <input
            id="invite-first-name"
            value={form.firstName}
            onChange={(e) => setForm({ ...form, firstName: e.target.value })}
            required
            autoComplete="given-name"
            className="min-h-[44px] w-full rounded-md border border-border bg-surface-page px-3 text-sm text-text-primary focus-ring"
          />
        </Field>
        <Field label="Last name" id="invite-last-name">
          <input
            id="invite-last-name"
            value={form.lastName}
            onChange={(e) => setForm({ ...form, lastName: e.target.value })}
            required
            autoComplete="family-name"
            className="min-h-[44px] w-full rounded-md border border-border bg-surface-page px-3 text-sm text-text-primary focus-ring"
          />
        </Field>
        <Field label="Email" id="invite-email">
          <input
            id="invite-email"
            type="email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            required
            autoComplete="email"
            className="min-h-[44px] w-full rounded-md border border-border bg-surface-page px-3 text-sm text-text-primary focus-ring"
          />
        </Field>
        <Field label="Temporary password" id="invite-password">
          <input
            id="invite-password"
            type="password"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            required
            minLength={12}
            autoComplete="new-password"
            className="min-h-[44px] w-full rounded-md border border-border bg-surface-page px-3 text-sm text-text-primary focus-ring"
          />
        </Field>
        <Field label="Role" id="invite-role">
          <select
            id="invite-role"
            value={form.role}
            onChange={(e) => setForm({ ...form, role: e.target.value as Role })}
            className="min-h-[44px] w-full rounded-md border border-border bg-surface-page px-3 text-sm text-text-primary focus-ring"
          >
            {ROLES.map((r) => (
              <option key={r} value={r}>
                {ROLE_LABEL[r]}
              </option>
            ))}
          </select>
        </Field>
        <div className="flex items-end">
          <button
            type="submit"
            disabled={submitting}
            aria-busy={submitting}
            className="flex min-h-[44px] w-full items-center justify-center gap-2 rounded-md bg-primary px-5 text-sm font-semibold text-primary-foreground shadow-e1 transition-colors hover:bg-primary-hover focus-ring disabled:opacity-70"
          >
            {submitting ? (
              <>
                <Spinner aria-hidden="true" />
                Inviting…
              </>
            ) : (
              "Send invite"
            )}
          </button>
        </div>
      </form>

      {error ? (
        <p
          role="alert"
          className="rounded-md bg-status-rejected-bg px-3 py-2 text-sm font-medium text-status-rejected-fg"
        >
          {error}
        </p>
      ) : null}
      {success ? (
        <p
          role="status"
          className="rounded-md bg-status-approved-bg px-3 py-2 text-sm font-medium text-status-approved-fg"
        >
          {success}
        </p>
      ) : null}
    </section>
  );
}

function Field({ label, id, children }: { label: string; id: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="text-xs font-semibold uppercase tracking-wide text-text-muted">
        {label}
      </label>
      {children}
    </div>
  );
}

function LoadingShell() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-surface-subtle">
      <div className="flex items-center gap-3 rounded-lg border border-border bg-surface-page px-5 py-4 text-sm text-text-secondary shadow-e1">
        <Spinner aria-hidden="true" />
        Loading admin console…
      </div>
    </div>
  );
}

function AccessDenied() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-surface-subtle px-4">
      <div className="max-w-md rounded-lg border border-border bg-surface-page p-6 text-center shadow-e1">
        <h1 className="font-heading text-xl font-bold text-text-primary">Administrator access only</h1>
        <p className="mt-2 text-sm text-text-secondary">
          Your account does not have permission to view this console.
        </p>
        <a
          href="/dashboard"
          className="mt-6 inline-flex min-h-[44px] items-center justify-center rounded-md bg-primary px-5 text-sm font-semibold text-primary-foreground hover:bg-primary-hover focus-ring"
        >
          Back to dashboard
        </a>
      </div>
    </div>
  );
}

function sumCounts(items: { _count: { _all: number } }[] | undefined): number {
  if (!items) return 0;
  return items.reduce((sum, item) => sum + item._count._all, 0);
}

function stageRole(
  prev: Map<string, PendingChange>,
  target: UserItem,
  newRole: Role,
): Map<string, PendingChange> {
  const next = new Map(prev);
  const existing = next.get(target.id);
  const draft: PendingChange = existing
    ? { ...existing }
    : { userId: target.id, email: target.email };

  if (newRole === target.role) {
    delete draft.role;
  } else {
    draft.role = newRole;
  }

  if (draft.role === undefined && draft.isActive === undefined) next.delete(target.id);
  else next.set(target.id, draft);
  return next;
}

function stageActive(
  prev: Map<string, PendingChange>,
  target: UserItem,
  activate: boolean,
): Map<string, PendingChange> {
  const next = new Map(prev);
  const existing = next.get(target.id);
  const draft: PendingChange = existing
    ? { ...existing }
    : { userId: target.id, email: target.email };

  if (activate === target.isActive) {
    delete draft.isActive;
  } else {
    draft.isActive = activate;
  }

  if (draft.role === undefined && draft.isActive === undefined) next.delete(target.id);
  else next.set(target.id, draft);
  return next;
}
