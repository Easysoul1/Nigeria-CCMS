import * as React from "react";
import { PublicShell } from "../../src/components/public/public-shell";

export const metadata = { title: "Privacy notice — Federal High Court of Nigeria" };

export default function PrivacyPage() {
  return (
    <PublicShell
      title="Privacy notice"
      subtitle="How the Federal High Court of Nigeria handles personal data in the Case Management and Public Tracking System, consistent with the Nigeria Data Protection Act 2023 (NDPA)."
    >
      <article className="prose-court space-y-6 text-sm leading-relaxed text-text-secondary">
        <Notice>
          This is the Court’s working privacy notice. Its final legal wording is being reviewed by the
          Court’s Data Protection Officer. If you spot anything incorrect, please{" "}
          <a href="/help" className="font-medium text-primary underline underline-offset-4 focus-ring">
            contact the ICT desk
          </a>
          .
        </Notice>

        <Section title="1. Who we are">
          <p>
            The Federal High Court of Nigeria (“the Court”, “we”, “us”) is the data controller for the
            personal data processed through this system. Our registered address and DPO contact details
            will appear here once the Court finalises them.
          </p>
        </Section>

        <Section title="2. What we collect">
          <ul className="list-disc space-y-1 pl-6">
            <li>Staff accounts: name, work email, role, contact telephone, sign-in history.</li>
            <li>Case participants (recorded by staff): names, party roles, counsel, contact information as needed for a case.</li>
            <li>Case records: filings, documents, hearings, rulings, and case events.</li>
            <li>Public tracker: only the information the Court chooses to publish about a case (status, next hearing date, presiding judge, masked title).</li>
            <li>Technical data: IP address, request identifiers, and standard logs used for security and audit.</li>
          </ul>
        </Section>

        <Section title="3. Why we process it (lawful basis)">
          <p>
            Under the NDPA, we process personal data on the following lawful bases:
          </p>
          <ul className="list-disc space-y-1 pl-6">
            <li><strong>Public task / exercise of official authority</strong> — administering justice and maintaining court records.</li>
            <li><strong>Legal obligation</strong> — where the law requires us to retain or disclose a record.</li>
            <li><strong>Consent</strong> — where you have opted in (for example, hearing notifications by SMS or email). You may withdraw consent at any time.</li>
            <li><strong>Legitimate interest</strong> — for the security and integrity of the system. We balance this against your rights.</li>
          </ul>
        </Section>

        <Section title="4. Who can see your data">
          <p>
            Staff access is role-based. Lawyers see their own filings; judges see cases assigned to them;
            registrars and administrators see cases within their remit. Public access never shows internal
            case details, party contact information, or documents unless the Court has deliberately
            published them.
          </p>
          <p>
            Not-found, malformed and restricted case numbers all return the same response so the public
            tracker cannot be used to confirm that a restricted case exists.
          </p>
        </Section>

        <Section title="5. How long we keep it">
          <p>
            Court records are retained in line with applicable court rules and the Court’s Retention
            Policy. Retention periods are recorded per record type and are being finalised with the
            DPO. Personal data will not be kept longer than necessary for the purpose for which it was
            collected, unless a legal obligation requires otherwise.
          </p>
        </Section>

        <Section title="6. Your rights">
          <p>Under the NDPA you have the right to:</p>
          <ul className="list-disc space-y-1 pl-6">
            <li>Be informed about how your data is used.</li>
            <li>Access the personal data we hold about you.</li>
            <li>Request correction of inaccurate data.</li>
            <li>Request erasure, where the law allows (for example, once a case is CLOSED and the Court approves).</li>
            <li>Object to or restrict processing in the circumstances the NDPA allows.</li>
            <li>Withdraw consent you have previously given.</li>
            <li>Lodge a complaint with the Nigeria Data Protection Commission (NDPC).</li>
          </ul>
          <p className="mt-2">
            To exercise any of these rights, contact the Court’s Data Protection Officer (contact details
            to be published).
          </p>
        </Section>

        <Section title="7. Security">
          <p>
            Access is authenticated, role-based and audited. Transport is encrypted end-to-end. Uploaded
            documents are scanned and stored in dedicated storage. We never log passwords, session tokens,
            one-time codes or party contact information.
          </p>
        </Section>

        <Section title="8. International transfers">
          <p>
            Where we use a service provider outside Nigeria (for example, email delivery), we do so under
            appropriate safeguards. We prefer Nigerian hosting for the primary system.
          </p>
        </Section>

        <Section title="9. Changes to this notice">
          <p>
            This notice may be updated. The “last updated” date below will change whenever it is
            revised.
          </p>
        </Section>

        <p className="border-t border-border pt-4 text-xs text-text-muted">
          Last updated: {new Date().getFullYear()} — working draft pending DPO review.
        </p>
      </article>
    </PublicShell>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="font-heading text-lg font-semibold text-text-primary">{title}</h2>
      <div className="mt-2 space-y-2">{children}</div>
    </section>
  );
}

function Notice({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-md border border-status-pending-fg/30 bg-status-pending-bg px-4 py-3 text-sm text-status-pending-fg">
      {children}
    </div>
  );
}
