"use client";
import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { api, ApiError } from "@/src/lib/api";
import { useAuth } from "@/src/providers/auth-provider";
import { Spinner, StatusBadge } from "@/src/components/ui/primitives";
import { formatLagosDateTime } from "@/src/lib/datetime";

type Role = "ADMIN" | "REGISTRAR" | "JUDGE" | "LAWYER";
type LawyerProfile = {
  nbaEnrolmentNumber: string;
  verificationStatus: string;
  verifiedAt: string | null;
};
type Profile = {
  id: string;
  email: string;
  role: Role;
  firstName: string;
  lastName: string;
  phoneNumber: string | null;
  isActive: boolean;
  lastLoginAt: string | null;
  createdAt: string;
  lawyerProfile?: LawyerProfile | null;
};

const ROLE_LABEL: Record<Role, string> = {
  ADMIN: "Administrator",
  REGISTRAR: "Registrar",
  JUDGE: "Judge",
  LAWYER: "Lawyer",
};

export default function ProfilePage() {
  const { user } = useAuth();
  const profileQuery = useQuery({
    queryKey: ["auth", "profile"],
    queryFn: () => api.get<Profile>("/auth/profile"),
  });

  if (!user) return null;

  const p = profileQuery.data;
  const initials =
    `${user.firstName?.[0] ?? user.email[0] ?? "?"}${user.lastName?.[0] ?? ""}`.toUpperCase();
  const displayName =
    user.firstName || user.lastName
      ? `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim()
      : user.email;

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-text-muted">Account</p>
        <h1 className="mt-1 font-heading text-2xl font-bold text-text-primary sm:text-3xl">
          My profile
        </h1>
        <p className="mt-1 text-sm text-text-secondary">
          Your account details and security settings.
        </p>
      </div>

      <section className="flex flex-col items-start gap-4 rounded-lg border border-border bg-surface-page p-5 shadow-e1 sm:flex-row sm:items-center sm:p-6">
        <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-primary text-xl font-bold text-primary-foreground">
          {initials || "?"}
        </span>
        <div className="min-w-0">
          <h2 className="font-heading text-xl font-bold text-text-primary">{displayName}</h2>
          <p className="text-sm text-text-secondary">{user.email}</p>
          <p className="mt-1 inline-flex items-center gap-2 text-xs text-text-muted">
            <span className="rounded-pill bg-surface-tint px-2 py-0.5 font-semibold text-primary">
              {ROLE_LABEL[user.role]}
            </span>
            {p?.isActive === false ? <StatusBadge status="REJECTED" /> : <StatusBadge status="ACTIVE" />}
          </p>
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <section className="rounded-lg border border-border bg-surface-page p-5 shadow-e1 sm:p-6">
            <h2 className="font-heading text-lg font-semibold text-text-primary">Personal details</h2>
            <p className="mt-1 text-sm text-text-secondary">
              Contact your administrator to update these fields.
            </p>

            {profileQuery.isLoading ? (
              <div className="mt-4 flex items-center gap-2 text-sm text-text-muted">
                <Spinner /> Loading your profile…
              </div>
            ) : profileQuery.error ? (
              <p className="mt-4 rounded-md bg-status-rejected-bg px-3 py-2 text-sm text-status-rejected-fg">
                Could not load your profile. Please refresh.
              </p>
            ) : (
              <dl className="mt-5 grid gap-4 sm:grid-cols-2">
                <Row label="First name" value={p?.firstName ?? "—"} />
                <Row label="Last name" value={p?.lastName ?? "—"} />
                <Row label="Email" value={p?.email ?? user.email} mono />
                <Row label="Phone" value={p?.phoneNumber ?? "—"} mono />
                <Row label="Role" value={ROLE_LABEL[(p?.role as Role) ?? user.role]} />
                <Row label="Account ID" value={p?.id ?? user.id} mono />
                <Row
                  label="Member since"
                  value={p ? formatLagosDateTime(p.createdAt) : "—"}
                />
                <Row
                  label="Last sign-in"
                  value={p?.lastLoginAt ? formatLagosDateTime(p.lastLoginAt) : "—"}
                />
              </dl>
            )}
          </section>

          {p?.lawyerProfile ? (
            <section className="rounded-lg border border-border bg-surface-page p-5 shadow-e1 sm:p-6">
              <h2 className="font-heading text-lg font-semibold text-text-primary">
                Legal enrolment
              </h2>
              <dl className="mt-4 grid gap-4 sm:grid-cols-2">
                <Row label="NBA enrolment number" value={p.lawyerProfile.nbaEnrolmentNumber} mono />
                <div>
                  <dt className="text-xs font-semibold uppercase tracking-wide text-text-muted">
                    Verification
                  </dt>
                  <dd className="mt-1">
                    <StatusBadge status={p.lawyerProfile.verificationStatus} />
                  </dd>
                </div>
                <Row
                  label="Verified at"
                  value={p.lawyerProfile.verifiedAt ? formatLagosDateTime(p.lawyerProfile.verifiedAt) : "—"}
                />
              </dl>
            </section>
          ) : null}
        </div>

        <div className="space-y-6">
          <ChangePasswordCard />
        </div>
      </div>
    </div>
  );
}

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <dt className="text-xs font-semibold uppercase tracking-wide text-text-muted">{label}</dt>
      <dd className={`mt-1 text-sm text-text-primary ${mono ? "font-mono break-all" : ""}`}>{value}</dd>
    </div>
  );
}

function ChangePasswordCard() {
  const [current, setCurrent] = React.useState("");
  const [next, setNext] = React.useState("");
  const [confirm, setConfirm] = React.useState("");
  const [showPasswords, setShowPasswords] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [success, setSuccess] = React.useState(false);

  const tooShort = next.length > 0 && next.length < 12;
  const mismatch = confirm.length > 0 && next !== confirm;
  const canSubmit =
    !submitting &&
    current.length > 0 &&
    next.length >= 12 &&
    next === confirm;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);
    try {
      await api.post("/auth/change-password", { current, next });
      setSuccess(true);
      // The server revokes all refresh tokens on password change; the session
      // is effectively over. Give the user a moment to read the confirmation
      // then send them back to sign in.
      window.setTimeout(() => {
        window.location.assign("/login");
      }, 2500);
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.statusCode === 401
            ? "Current password is incorrect."
            : err.message
          : "Could not change your password. Please try again.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  if (success) {
    return (
      <section className="rounded-lg border border-border bg-surface-page p-5 shadow-e1 sm:p-6">
        <h2 className="font-heading text-lg font-semibold text-text-primary">Password updated</h2>
        <p className="mt-2 text-sm text-text-secondary">
          Your password has been changed. Redirecting to sign in again…
        </p>
      </section>
    );
  }

  return (
    <section className="rounded-lg border border-border bg-surface-page p-5 shadow-e1 sm:p-6">
      <h2 className="font-heading text-lg font-semibold text-text-primary">Change password</h2>
      <p className="mt-1 text-sm text-text-secondary">
        Use at least 12 characters. You will be signed out of all devices on success.
      </p>
      <form className="mt-4 space-y-3" onSubmit={onSubmit}>
        <PasswordField
          id="current-password"
          label="Current password"
          value={current}
          onChange={setCurrent}
          show={showPasswords}
          autoComplete="current-password"
        />
        <PasswordField
          id="new-password"
          label="New password"
          value={next}
          onChange={setNext}
          show={showPasswords}
          autoComplete="new-password"
          hint={tooShort ? "Must be at least 12 characters" : undefined}
          invalid={tooShort}
        />
        <PasswordField
          id="confirm-password"
          label="Confirm new password"
          value={confirm}
          onChange={setConfirm}
          show={showPasswords}
          autoComplete="new-password"
          hint={mismatch ? "Passwords do not match" : undefined}
          invalid={mismatch}
        />

        <label className="flex items-center gap-2 text-xs text-text-secondary">
          <input
            type="checkbox"
            checked={showPasswords}
            onChange={(e) => setShowPasswords(e.target.checked)}
            className="h-4 w-4 rounded border-border"
          />
          Show passwords
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
          className="flex w-full min-h-[44px] items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground shadow-e1 hover:bg-primary-hover focus-ring disabled:opacity-60"
        >
          {submitting ? <Spinner /> : null}
          {submitting ? "Updating…" : "Update password"}
        </button>
      </form>
    </section>
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
