"use client";
import * as React from "react";
import Link from "next/link";
import { api, ApiError } from "../../src/lib/api";
import { PublicShell } from "../../src/components/public/public-shell";
import { Spinner } from "../../src/components/ui/primitives";

export default function RegisterLawyerPage() {
  const [form, setForm] = React.useState({
    firstName: "",
    lastName: "",
    email: "",
    phoneNumber: "",
    nbaEnrolmentNumber: "",
    password: "",
  });
  const [submitting, setSubmitting] = React.useState(false);
  const [done, setDone] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  function set<K extends keyof typeof form>(k: K, v: string) {
    setForm((s) => ({ ...s, [k]: v }));
    setError(null);
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (submitting) return;
    if (form.password.length < 12) {
      setError("Password must be at least 12 characters.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await api.post("/auth/register-lawyer", {
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        email: form.email.trim(),
        phoneNumber: form.phoneNumber.trim(),
        nbaEnrolmentNumber: form.nbaEnrolmentNumber.trim(),
        password: form.password,
      }, { redirectOnUnauthorized: false, skipRefresh: true });
      setDone(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not submit your registration. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (done) {
    return (
      <PublicShell narrow title="Registration submitted" subtitle="The registrar’s office will verify your enrolment with the Nigerian Bar Association before your account is activated.">
        <div className="space-y-4 rounded-lg border border-border bg-surface-page p-5 shadow-e1">
          <p className="text-sm text-text-secondary">
            You will receive an email when your account has been verified. In the meantime, contact the
            registrar’s office at your division if you have any questions.
          </p>
          <div className="flex flex-wrap gap-2">
            <Link
              href="/login"
              className="inline-flex min-h-[44px] items-center rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground hover:bg-primary-hover focus-ring"
            >
              Back to sign in
            </Link>
            <Link
              href="/help"
              className="inline-flex min-h-[44px] items-center rounded-md border border-border bg-surface-page px-4 text-sm font-medium text-text-primary hover:bg-surface-subtle focus-ring"
            >
              Contact ICT desk
            </Link>
          </div>
        </div>
      </PublicShell>
    );
  }

  return (
    <PublicShell narrow title="Register as a lawyer" subtitle="Lawyer accounts are verified by the Court before they can sign in. Complete this form to request access.">
      <form onSubmit={onSubmit} className="space-y-4 rounded-lg border border-border bg-surface-page p-5 shadow-e1 sm:p-6">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field id="firstName" label="First name" value={form.firstName} onChange={(v) => set("firstName", v)} autoComplete="given-name" required />
          <Field id="lastName" label="Last name" value={form.lastName} onChange={(v) => set("lastName", v)} autoComplete="family-name" required />
        </div>
        <Field id="email" label="Work email" type="email" value={form.email} onChange={(v) => set("email", v)} autoComplete="email" required />
        <Field id="phone" label="Phone number" value={form.phoneNumber} onChange={(v) => set("phoneNumber", v)} autoComplete="tel" placeholder="+234 800 000 0000" required />
        <Field id="nba" label="NBA enrolment number" value={form.nbaEnrolmentNumber} onChange={(v) => set("nbaEnrolmentNumber", v)} required mono />
        <Field id="password" label="Password (min 12 chars)" type="password" value={form.password} onChange={(v) => set("password", v)} autoComplete="new-password" required />

        {error ? (
          <p role="alert" className="rounded-md bg-status-rejected-bg px-3 py-2 text-sm text-status-rejected-fg">
            {error}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={submitting}
          aria-busy={submitting}
          className="flex w-full min-h-[44px] items-center justify-center gap-2 rounded-md bg-primary px-5 text-sm font-semibold text-primary-foreground hover:bg-primary-hover focus-ring disabled:opacity-60"
        >
          {submitting ? <Spinner /> : null}
          {submitting ? "Submitting…" : "Submit registration"}
        </button>

        <p className="text-center text-xs text-text-muted">
          Already have an account?{" "}
          <Link href="/login" className="font-medium text-primary underline underline-offset-4 focus-ring">
            Sign in
          </Link>
        </p>
      </form>
    </PublicShell>
  );
}

function Field({
  id,
  label,
  value,
  onChange,
  type = "text",
  autoComplete,
  required,
  placeholder,
  mono,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  autoComplete?: string;
  required?: boolean;
  placeholder?: string;
  mono?: boolean;
}) {
  return (
    <div>
      <label htmlFor={id} className="text-xs font-semibold uppercase tracking-wide text-text-muted">
        {label}
      </label>
      <input
        id={id}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        autoComplete={autoComplete}
        required={required}
        placeholder={placeholder}
        className={`mt-1 min-h-[44px] w-full rounded-md border border-border bg-surface-page px-3 text-sm text-text-primary focus-ring ${mono ? "font-mono" : ""}`}
      />
    </div>
  );
}
