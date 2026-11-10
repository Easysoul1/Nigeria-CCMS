"use client";
import * as React from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { api, ApiError } from "../../src/lib/api";
import { PublicShell } from "../../src/components/public/public-shell";
import { Spinner } from "../../src/components/ui/primitives";

function ResetPasswordInner() {
  const params = useSearchParams();
  const token = params?.get("token") ?? "";
  const email = params?.get("email") ?? "";

  const [next, setNext] = React.useState("");
  const [confirm, setConfirm] = React.useState("");
  const [show, setShow] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);
  const [done, setDone] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const tooShort = next.length > 0 && next.length < 12;
  const mismatch = confirm.length > 0 && next !== confirm;
  const canSubmit = !submitting && next.length >= 12 && next === confirm && token && email;

  if (!token || !email) {
    return (
      <div className="rounded-lg border border-border bg-surface-page p-5 text-sm text-text-secondary shadow-e1">
        <p className="font-medium text-status-rejected-fg">This reset link is incomplete or invalid.</p>
        <p className="mt-1">Please request a new reset email.</p>
        <Link
          href="/forgot-password"
          className="mt-4 inline-flex min-h-[44px] items-center rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground hover:bg-primary-hover focus-ring"
        >
          Request new link
        </Link>
      </div>
    );
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);
    try {
      await api.post("/auth/reset-password", { token, email, password: next }, { redirectOnUnauthorized: false, skipRefresh: true });
      setDone(true);
      window.setTimeout(() => window.location.assign("/login"), 2000);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not reset your password. The link may have expired.");
    } finally {
      setSubmitting(false);
    }
  }

  if (done) {
    return (
      <div className="rounded-lg border border-border bg-surface-page p-5 shadow-e1">
        <p className="font-medium text-status-approved-fg">Password updated.</p>
        <p className="mt-1 text-sm text-text-secondary">Redirecting to sign in…</p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4 rounded-lg border border-border bg-surface-page p-5 shadow-e1 sm:p-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-text-muted">Resetting password for</p>
        <p className="mt-1 font-mono text-sm text-text-primary">{email}</p>
      </div>

      <PasswordField id="new" label="New password" value={next} onChange={setNext} show={show} autoComplete="new-password" hint={tooShort ? "Must be at least 12 characters" : undefined} invalid={tooShort} />
      <PasswordField id="confirm" label="Confirm new password" value={confirm} onChange={setConfirm} show={show} autoComplete="new-password" hint={mismatch ? "Passwords do not match" : undefined} invalid={mismatch} />

      <label className="flex items-center gap-2 text-xs text-text-secondary">
        <input type="checkbox" checked={show} onChange={(e) => setShow(e.target.checked)} className="h-4 w-4 rounded border-border" />
        Show password
      </label>

      {error ? (
        <p role="alert" className="rounded-md bg-status-rejected-bg px-3 py-2 text-sm text-status-rejected-fg">
          {error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={!canSubmit}
        aria-busy={submitting}
        className="flex w-full min-h-[44px] items-center justify-center gap-2 rounded-md bg-primary px-5 text-sm font-semibold text-primary-foreground hover:bg-primary-hover focus-ring disabled:opacity-60"
      >
        {submitting ? <Spinner /> : null}
        {submitting ? "Updating…" : "Set new password"}
      </button>

      <p className="text-center text-xs text-text-muted">
        <Link href="/forgot-password" className="hover:text-text-primary">
          Request a new link
        </Link>
      </p>
    </form>
  );
}

function PasswordField({
  id,
  label,
  value,
  onChange,
  show,
  autoComplete,
  hint,
  invalid,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  show: boolean;
  autoComplete: string;
  hint?: string;
  invalid?: boolean;
}) {
  return (
    <div>
      <label htmlFor={id} className="text-xs font-semibold uppercase tracking-wide text-text-muted">
        {label}
      </label>
      <input
        id={id}
        type={show ? "text" : "password"}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        autoComplete={autoComplete}
        aria-invalid={invalid || undefined}
        aria-describedby={hint ? `${id}-hint` : undefined}
        className={`mt-1 min-h-[44px] w-full rounded-md border bg-surface-page px-3 text-sm text-text-primary focus-ring ${invalid ? "border-status-rejected-fg" : "border-border"}`}
      />
      {hint ? (
        <p id={`${id}-hint`} className="mt-1 text-xs text-status-rejected-fg">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <React.Suspense fallback={null}>
      <PublicShell narrow title="Set a new password" subtitle="Choose a strong password to regain access to your account. You will be signed out of all other devices.">
        <ResetPasswordInner />
      </PublicShell>
    </React.Suspense>
  );
}
