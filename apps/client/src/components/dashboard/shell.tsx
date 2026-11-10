"use client";
import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Briefcase,
  Gavel,
  Inbox,
  LogOut,
  Menu,
  Search,
  Shield,
  User,
} from "lucide-react";
import { useAuth } from "../../providers/auth-provider";
import { ScalesMark } from "../scales-mark";
import { Spinner } from "../ui/primitives";

type Role = "ADMIN" | "REGISTRAR" | "JUDGE" | "LAWYER";

const ROLE_HOME: Record<Role, string> = {
  ADMIN: "/dashboard/admin",
  REGISTRAR: "/dashboard/registrar",
  JUDGE: "/dashboard/judge",
  LAWYER: "/dashboard/lawyer",
};

const ROLE_LABEL: Record<Role, string> = {
  ADMIN: "Administrator",
  REGISTRAR: "Registrar",
  JUDGE: "Judge",
  LAWYER: "Lawyer",
};

type NavItem = { href: string; label: string; icon: React.ReactNode };

const NAV_BY_ROLE: Record<Role, NavItem[]> = {
  ADMIN: [{ href: "/dashboard/admin", label: "Admin console", icon: <Shield size={16} aria-hidden="true" /> }],
  REGISTRAR: [{ href: "/dashboard/registrar", label: "Registrar desk", icon: <Inbox size={16} aria-hidden="true" /> }],
  JUDGE: [{ href: "/dashboard/judge", label: "My docket", icon: <Gavel size={16} aria-hidden="true" /> }],
  LAWYER: [{ href: "/dashboard/lawyer", label: "My cases", icon: <Briefcase size={16} aria-hidden="true" /> }],
};

function isActive(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const { user, loading, logout } = useAuth();
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = React.useState(false);
  const [loggingOut, setLoggingOut] = React.useState(false);

  React.useEffect(() => {
    if (!loading && !user) window.location.assign("/login");
  }, [loading, user]);

  React.useEffect(() => {
    setSidebarOpen(false);
  }, [pathname]);

  if (loading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface-subtle">
        <div className="flex items-center gap-3 rounded-lg border border-border bg-surface-page px-5 py-4 text-sm text-text-secondary shadow-e1">
          <Spinner />
          Loading your session…
        </div>
      </div>
    );
  }

  const role = user.role as Role;
  const nav = NAV_BY_ROLE[role] ?? [];
  const home = ROLE_HOME[role] ?? "/dashboard";
  const initials =
    `${user.firstName?.[0] ?? user.email[0] ?? "?"}${user.lastName?.[0] ?? ""}`.toUpperCase();
  const displayName =
    user.firstName || user.lastName
      ? `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim()
      : user.email;

  const handleLogout = async () => {
    if (loggingOut) return;
    setLoggingOut(true);
    try {
      await logout();
    } finally {
      setLoggingOut(false);
    }
  };

  return (
    <div className="min-h-screen bg-surface-subtle">
      {sidebarOpen ? (
        <button
          type="button"
          aria-label="Close navigation"
          onClick={() => setSidebarOpen(false)}
          className="fixed inset-0 z-30 bg-text-primary/40 lg:hidden"
        />
      ) : null}

      <aside
        aria-label="Primary"
        className={`fixed inset-y-0 left-0 z-40 flex w-[264px] flex-col bg-sidebar text-sidebar-foreground transition-transform lg:translate-x-0 ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}`}
      >
        <div className="flex items-center gap-3 px-5 py-4">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <ScalesMark className="h-5 w-5" />
          </span>
          <div className="min-w-0 leading-tight">
            <p className="truncate text-sm font-semibold text-sidebar-foreground">Federal High Court</p>
            <p className="truncate text-xs text-sidebar-subtle">Case Management</p>
          </div>
        </div>

        <nav className="flex-1 space-y-1 px-3 py-4">
          <p className="px-2 pb-2 text-[0.68rem] font-semibold uppercase tracking-[0.14em] text-sidebar-subtle">
            {ROLE_LABEL[role]}
          </p>
          {nav.map((item) => (
            <Link
              key={item.label}
              href={item.href}
              aria-current={isActive(pathname, item.href) ? "page" : undefined}
              className={`flex min-h-[44px] items-center gap-3 rounded-md px-3 text-sm font-medium transition-colors ${isActive(pathname, item.href) ? "bg-sidebar-active text-sidebar-foreground" : "text-sidebar-muted hover:bg-white/5 hover:text-sidebar-foreground"}`}
            >
              <span className="flex h-4 w-4 items-center justify-center">{item.icon}</span>
              {item.label}
            </Link>
          ))}

          <Link
            href="/dashboard/profile"
            aria-current={isActive(pathname, "/dashboard/profile") ? "page" : undefined}
            className={`flex min-h-[44px] items-center gap-3 rounded-md px-3 text-sm font-medium transition-colors ${isActive(pathname, "/dashboard/profile") ? "bg-sidebar-active text-sidebar-foreground" : "text-sidebar-muted hover:bg-white/5 hover:text-sidebar-foreground"}`}
          >
            <span className="flex h-4 w-4 items-center justify-center">
              <User size={16} aria-hidden="true" />
            </span>
            My profile
          </Link>

          <div className="my-3 h-px bg-white/10" />

          <Link
            href="/"
            className="flex min-h-[44px] items-center gap-3 rounded-md px-3 text-sm font-medium text-sidebar-muted hover:bg-white/5 hover:text-sidebar-foreground"
          >
            <span className="flex h-4 w-4 items-center justify-center">
              <Search size={16} aria-hidden="true" />
            </span>
            Public tracker
          </Link>
        </nav>

        <div className="border-t border-white/10 p-3">
          <Link
            href="/dashboard/profile"
            className="flex items-center gap-3 rounded-md px-2 py-2 hover:bg-white/5 focus-ring"
            aria-label="Open my profile"
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
              {initials || "?"}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-sidebar-foreground">{displayName}</p>
              <p className="truncate text-xs text-sidebar-subtle">{ROLE_LABEL[role]}</p>
            </div>
          </Link>
          <button
            type="button"
            onClick={handleLogout}
            disabled={loggingOut}
            className="mt-1 flex w-full min-h-[44px] items-center gap-2 rounded-md px-2 text-sm font-medium text-sidebar-muted transition-colors hover:bg-white/5 hover:text-sidebar-foreground focus-ring disabled:opacity-60"
          >
            {loggingOut ? <Spinner /> : <LogOut size={16} aria-hidden="true" />}
            {loggingOut ? "Signing out…" : "Sign out"}
          </button>
        </div>
      </aside>

      <div className="lg:pl-[264px]">
        <header className="sticky top-0 z-20 border-b border-border bg-surface-page">
          <div className="flex items-center justify-between gap-3 px-4 py-3 sm:px-6">
            <div className="flex min-w-0 items-center gap-2">
              <button
                type="button"
                onClick={() => setSidebarOpen(true)}
                aria-label="Open navigation"
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-border text-text-primary hover:bg-surface-subtle focus-ring lg:hidden"
              >
                <Menu size={16} aria-hidden="true" />
              </button>
              <nav aria-label="Breadcrumb" className="min-w-0 text-sm">
                <ol className="flex items-center gap-1 text-text-muted">
                  <li className="hidden sm:block">
                    <Link href={home} className="hover:text-text-primary">
                      {ROLE_LABEL[role]}
                    </Link>
                  </li>
                  <li aria-hidden="true" className="hidden sm:block">
                    /
                  </li>
                  <li className="truncate font-medium text-text-primary">
                    {pathname === home
                      ? "Overview"
                      : pathname === "/dashboard/profile"
                        ? "My profile"
                        : "Detail"}
                  </li>
                </ol>
              </nav>
            </div>
            <div className="flex items-center gap-2">
              <Link
                href="/dashboard/profile"
                className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full bg-primary px-2 text-xs font-bold text-primary-foreground hover:bg-primary-hover focus-ring"
                aria-label="Open my profile"
                title="My profile"
              >
                {initials || "?"}
              </Link>
              <button
                type="button"
                onClick={handleLogout}
                disabled={loggingOut}
                className="flex min-h-[44px] items-center gap-2 rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground shadow-e1 hover:bg-primary-hover focus-ring disabled:opacity-60"
              >
                {loggingOut ? <Spinner /> : <LogOut size={16} aria-hidden="true" />}
                <span className="hidden sm:inline">Sign out</span>
              </button>
            </div>
          </div>
        </header>

        <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6">{children}</main>
      </div>
    </div>
  );
}
