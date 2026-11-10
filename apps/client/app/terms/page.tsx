import * as React from "react";
import { PublicShell } from "../../src/components/public/public-shell";

export const metadata = { title: "Terms of use — Federal High Court of Nigeria" };

export default function TermsPage() {
  return (
    <PublicShell
      title="Terms of use"
      subtitle="The rules that apply when you use the public case tracker or sign in to the staff console of the Federal High Court of Nigeria."
    >
      <article className="space-y-6 text-sm leading-relaxed text-text-secondary">
        <Section title="1. Acceptance">
          <p>By using this system you agree to these terms. If you do not agree, do not use the system.</p>
        </Section>

        <Section title="2. Purpose of the system">
          <p>
            The public tracker is for checking the status of a case. The staff console is for Court staff,
            judges and registered lawyers acting in an official capacity. It is not a general-purpose
            case database.
          </p>
        </Section>

        <Section title="3. What the public tracker shows">
          <ul className="list-disc space-y-1 pl-6">
            <li>The Court chooses which cases to publish. A case being absent does not mean it does not exist.</li>
            <li>Published information is limited to status, next scheduled hearing, presiding judge, and a masked title.</li>
            <li>Not-found, malformed and restricted case numbers return the same response.</li>
            <li>The Court may amend or remove published information at any time.</li>
          </ul>
        </Section>

        <Section title="4. Staff accounts">
          <p>
            Staff accounts are personal. You must not share credentials, allow anyone else to use your
            account, or attempt to access records outside your role. Every action is audited.
          </p>
        </Section>

        <Section title="5. Prohibited use">
          <ul className="list-disc space-y-1 pl-6">
            <li>Automated scanning of case numbers to discover unpublished records.</li>
            <li>Attempting to bypass authentication, rate limits, or CSRF protections.</li>
            <li>Uploading malicious content.</li>
            <li>Using the system to harass, defame, or unlawfully process another person’s data.</li>
          </ul>
        </Section>

        <Section title="6. Availability">
          <p>
            The system is provided as-is. The Court aims for high availability but does not guarantee
            uninterrupted service. Current status is published at{" "}
            <a href="/status" className="font-medium text-primary underline underline-offset-4 focus-ring">
              /status
            </a>
            .
          </p>
        </Section>

        <Section title="7. Intellectual property">
          <p>
            The text of court records is governed by applicable court rules. The system’s user interface,
            source code and design are the property of the Federal High Court of Nigeria.
          </p>
        </Section>

        <Section title="8. Liability">
          <p>
            Nothing in these terms limits any liability that cannot be limited by law. In all other
            respects the Court is not liable for decisions taken in reliance on information from the
            tracker — always confirm with the registry.
          </p>
        </Section>

        <Section title="9. Governing law">
          <p>These terms are governed by the laws of the Federal Republic of Nigeria.</p>
        </Section>

        <p className="border-t border-border pt-4 text-xs text-text-muted">
          Last updated: {new Date().getFullYear()}.
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
