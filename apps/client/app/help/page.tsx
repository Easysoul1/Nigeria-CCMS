import * as React from "react";
import Link from "next/link";
import { PublicShell } from "../../src/components/public/public-shell";

export const metadata = { title: "Help — Federal High Court of Nigeria" };

export default function HelpPage() {
  return (
    <PublicShell
      title="Help and contact"
      subtitle="If the public tracker gives you a 404, shows a case as restricted, or something does not look right, contact the Court’s ICT desk."
    >
      <div className="space-y-6 text-sm leading-relaxed text-text-secondary">
        <section className="rounded-lg border border-border bg-surface-page p-5 shadow-e1 sm:p-6">
          <h2 className="font-heading text-lg font-semibold text-text-primary">ICT desk</h2>
          <dl className="mt-3 grid gap-3 sm:grid-cols-2">
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-text-muted">Email</dt>
              <dd className="mt-1 font-mono text-sm text-text-primary">ict@fhc.gov.ng</dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-text-muted">Hours</dt>
              <dd className="mt-1 text-sm text-text-primary">Monday to Friday, 08:00–17:00 WAT</dd>
            </div>
          </dl>
          <p className="mt-4 text-xs text-text-muted">
            Contact details are provisional pending the Court’s final ICT desk configuration.
          </p>
        </section>

        <section>
          <h2 className="font-heading text-lg font-semibold text-text-primary">Common questions</h2>
          <dl className="mt-3 space-y-4">
            <Q q="Why does the tracker return 404 for my case?">
              Either the case number is mistyped, the case has not yet been published by the registrar,
              or the Court has restricted public access to it. All three cases return the same response
              so that restricted matters stay private. Check the case number on your filing receipt and
              try again.
            </Q>
            <Q q="What format is the case number?">
              It looks like <code>FHC/L/CS/1042/2026</code> — division code, suit type, sequence, year.
              If your number is different, use the reference printed on your filing receipt.
            </Q>
            <Q q="Why is there no next hearing shown? ">
              No hearing has been scheduled yet, or the next hearing has not yet been confirmed by the
              registrar. Check again after the case has been assigned to a judge.
            </Q>
            <Q q="I am a lawyer and cannot sign in.">
              Lawyer accounts must be verified before they can sign in. If your verification is still
              pending, contact the registrar’s office at the division where you filed. If you have
              forgotten your password, use{" "}
              <Link href="/forgot-password" className="font-medium text-primary underline underline-offset-4 focus-ring">
                the reset flow
              </Link>
              .
            </Q>
            <Q q="How do I reset my password?">
              From the sign-in page, choose “Forgot password?” and follow the emailed link. The link
              expires in 15 minutes.
            </Q>
          </dl>
        </section>
      </div>
    </PublicShell>
  );
}

function Q({ q, children }: { q: string; children: React.ReactNode }) {
  return (
    <div className="rounded-md border border-border bg-surface-page p-4">
      <dt className="font-medium text-text-primary">{q}</dt>
      <dd className="mt-1 text-text-secondary">{children}</dd>
    </div>
  );
}
