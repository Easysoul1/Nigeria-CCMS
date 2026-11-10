"use client";
import * as React from "react";
import Link from "next/link";
import { useAuth } from "../../src/providers/auth-provider";
import { ApiError } from "../../src/lib/api";
import { ScalesMark } from "../../src/components/scales-mark";

const ROUTE_BY_ROLE: Record<string, string> = {
  ADMIN: "/dashboard/admin",
  REGISTRAR: "/dashboard/registrar",
  JUDGE: "/dashboard/judge",
  LAWYER: "/dashboard/lawyer",
};

export default function LoginPage() {
  const { user, login } = useAuth();
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [submitting, setSubmitting] = React.useState(false);
  const errorRef = React.useRef<HTMLParagraphElement | null>(null);

  // Already signed in (for example the token was refreshed in another tab).
  React.useEffect(() => {
    if (user) window.location.assign(ROUTE_BY_ROLE[user.role] ?? "/dashboard");
  }, [user]);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;
    setError(null);
    setSubmitting(true);
    try {
      const account = await login(email.trim(), password);
      window.location.assign(ROUTE_BY_ROLE[account.role] ?? "/dashboard");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Unable to sign in right now. Please try again.");
      window.requestAnimationFrame(() => errorRef.current?.focus());
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="grid min-h-screen bg-surface-page lg:grid-cols-[1.05fr_1fr]">
      {/* Brand panel — hidden on small screens so the form stays above the fold. */}
      <aside className="relative hidden overflow-hidden bg-sidebar text-sidebar-foreground lg:flex lg:flex-col lg:justify-between lg:p-12">
        <ScalesMark className="pointer-events-none absolute right-6 top-24 h-80 w-80 text-sidebar-foreground opacity-[0.05]" />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(120%_90%_at_15%_0%,color-mix(in_srgb,var(--primary)_28%,transparent),transparent_60%)]"
        />

        <div className="relative flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <ScalesMark className="h-6 w-6" />
          </span>
          <div className="leading-tight">
            <p className="text-sm font-semibold tracking-wide">Federal High Court of Nigeria</p>
            <p className="text-xs text-sidebar-subtle">Case Management &amp; Public Tracking</p>
          </div>
        </div>

        <div className="relative max-w-md">
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-sidebar-muted">
            Official system
          </p>
          <h2 className="mb-4 font-heading text-3xl font-bold leading-tight">
            One record of every case, from filing to judgment.
          </h2>
          <p className="text-sm leading-relaxed text-sidebar-muted">
            Filing, assessment, assignment, hearings and rulings — held in a single audited record,
            with public tracking limited to what the Court chooses to publish.
          </p>
          <ul className="mt-8 space-y-3 text-sm text-sidebar-muted">
            <li className="flex items-start gap-3">
              <span aria-hidden="true" className="mt-2 h-1.5 w-1.5 shrink-0 rounded-pill bg-accent-large" />
              Role-based access for lawyers, registrars and judges
            </li>
            <li className="flex items-start gap-3">
              <span aria-hidden="true" className="mt-2 h-1.5 w-1.5 shrink-0 rounded-pill bg-accent-large" />
              Every action recorded in an append-only audit trail
            </li>
            <li className="flex items-start gap-3">
              <span aria-hidden="true" className="mt-2 h-1.5 w-1.5 shrink-0 rounded-pill bg-accent-large" />
              Public case tracking without exposing party details
            </li>
          </ul>
        </div>

        <p className="relative text-xs text-sidebar-subtle">
          Authorised users only. Unauthorised access is an offence.
        </p>
      </aside>

      <div className="flex min-h-screen flex-col">
        <header className="flex items-center gap-3 bg-sidebar px-4 py-5 text-sidebar-foreground lg:hidden">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <ScalesMark className="h-5 w-5" />
          </span>
          <p className="text-sm font-semibold leading-tight">
            Federal High Court of Nigeria
            <span className="block text-xs font-normal text-sidebar-subtle">Case Management</span>
          </p>
        </header>

        <main className="flex flex-1 items-start justify-center px-4 py-8 sm:px-8 lg:items-center lg:py-10">
          <div className="w-full max-w-sm">
            <h1 className="mb-1 font-heading text-2xl font-bold text-text-primary">Sign in</h1>
            <p className="mb-7 text-sm text-text-secondary">Use your official court account.</p>

            <form onSubmit={onSubmit} className="space-y-5" aria-busy={submitting}>
              <div className="space-y-1.5">
                <label htmlFor="email" className="block text-sm font-medium text-text-primary">
                  Email address
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  autoFocus
                  autoComplete="username"
                  inputMode="email"
                  spellCheck={false}
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  disabled={submitting}
                  aria-describedby={error ? "login-error" : undefined}
                  className="block min-h-[44px] w-full rounded-md border border-border bg-surface-page px-3 py-2 text-text-primary placeholder:text-text-muted focus-ring disabled:opacity-70"
                  placeholder="you@example.gov.ng"
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                  <label htmlFor="password" className="block text-sm font-medium text-text-primary">
                    Password
                  </label>
                  <Link
                    href="/forgot-password"
                    className="text-xs font-medium text-primary underline-offset-4 hover:underline focus-ring"
                  >
                    Forgot password?
                  </Link>
                </div>
                <input
                  id="password"
                  name="password"
                  type="password"
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  disabled={submitting}
                  aria-describedby={error ? "login-error" : undefined}
                  className="block min-h-[44px] w-full rounded-md border border-border bg-surface-page px-3 py-2 text-text-primary focus-ring disabled:opacity-70"
                />
              </div>

              {error ? (
                <p
                  id="login-error"
                  ref={errorRef}
                  role="alert"
                  tabIndex={-1}
                  className="rounded-md border border-status-rejected bg-status-rejected-bg px-3 py-2 text-sm font-medium text-status-rejected focus:outline-none"
                >
                  {error}
                </p>
              ) : null}

              <button
                type="submit"
                disabled={submitting}
                aria-disabled={submitting}
                className="flex min-h-[44px] w-full items-center justify-center gap-2 rounded-md bg-primary px-4 py-2.5 text-base font-semibold text-primary-foreground shadow-e1 transition-colors hover:bg-primary-hover focus-ring disabled:cursor-wait disabled:opacity-70"
              >
                {submitting ? "Signing in…" : "Sign in"}
              </button>
            </form>

            <div className="mt-6 space-y-2 text-xs leading-relaxed text-text-secondary">
              <p>
                New lawyer?{" "}
                <Link
                  href="/register-lawyer"
                  className="font-medium text-primary underline-offset-4 hover:underline focus-ring"
                >
                  Request an account
                </Link>
                .
              </p>
              <p>
                Trouble signing in?{" "}
                <Link
                  href="/help"
                  className="font-medium text-primary underline-offset-4 hover:underline focus-ring"
                >
                  Contact the Court ICT desk
                </Link>
                . Never share your password or one-time codes.
              </p>
              <nav aria-label="Legal" className="flex flex-wrap gap-x-4 gap-y-1">
                <Link href="/privacy" className="text-text-muted hover:text-text-primary">Privacy</Link>
                <Link href="/terms" className="text-text-muted hover:text-text-primary">Terms</Link>
                <Link href="/status" className="text-text-muted hover:text-text-primary">Status</Link>
              </nav>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
