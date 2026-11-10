"use client";
import * as React from "react";
import Link from "next/link";
import { api, ApiError } from "../../src/lib/api";
import { PublicShell } from "../../src/components/public/public-shell";
import { Spinner } from "../../src/components/ui/primitives";

export default function ForgotPasswordPage() {
  const [email, setEmail] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);
  const [sent, setSent] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (submitting) return;
    setError(null);
    setSubmitting(true);
    try {
      await api.post("/auth/forgot-password", { email: email.trim() }, { redirectOnUnauthorized: false, skipRefresh: true });
      setSent(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not send the reset email. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <PublicShell
      narrow
      title={sent ? "Check your email" : "Reset your password"}
      subtitle={
        sent
          ? "If that email is on file, we have sent a link to reset your password. The link expires in 15 minutes."
          : "Enter the email address registered to your account and we will send you a secure link to reset your password."
      }
    >
      {sent ? (
        <div className="space-y-4 rounded-lg border border-border bg-surface-page p-5 shadow-e1">
          <p className="text-sm text-text-secondary">
            Did not receive the email? Check your spam folder, or try again below.
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setSent(false)}
              className="min-h-[44px] rounded-md border border-border bg-surface-page px-4 text-sm font-medium text-text-primary hover:bg-surface-subtle focus-ring"
            >
              Try another email
            </button>
            <Link
              href="/login"
              className="inline-flex min-h-[44px] items-center rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground hover:bg-primary-hover focus-ring"
            >
              Back to sign in
            </Link>
          </div>
        </div>
      ) : (
        <form onSubmit={onSubmit} className="space-y-4 rounded-lg border border-border bg-surface-page p-5 shadow-e1 sm:p-6">
          <div>
            <label htmlFor="email" className="text-xs font-semibold uppercase tracking-wide text-text-muted">
              Email address
            </label>
            <input
              id="email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 min-h-[44px] w-full rounded-md border border-border bg-surface-page px-3 text-sm text-text-primary focus-ring"
              placeholder="you@fhc.gov.ng"
            />
          </div>

          {error ? (
            <p role="alert" className="rounded-md bg-status-rejected-bg px-3 py-2 text-sm text-status-rejected-fg">
              {error}
            </p>
          ) : null}

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="submit"
              disabled={submitting || email.trim().length === 0}
              aria-busy={submitting}
              className="flex min-h-[44px] items-center gap-2 rounded-md bg-primary px-5 text-sm font-semibold text-primary-foreground hover:bg-primary-hover focus-ring disabled:opacity-60"
            >
              {submitting ? <Spinner /> : null}
              {submitting ? "Sending…" : "Send reset link"}
            </button>
            <Link
              href="/login"
              className="inline-flex min-h-[44px] items-center rounded-md border border-border bg-surface-page px-4 text-sm font-medium text-text-primary hover:bg-surface-subtle focus-ring"
            >
              Cancel
            </Link>
          </div>
        </form>
      )}
    </PublicShell>
  );
}
