import * as React from "react";
import { PublicShell } from "../../src/components/public/public-shell";

export const metadata = { title: "Accessibility — Federal High Court of Nigeria" };

export default function AccessibilityPage() {
  return (
    <PublicShell
      title="Accessibility statement"
      subtitle="The Federal High Court of Nigeria aims to meet the Web Content Accessibility Guidelines (WCAG) 2.2 at Level AA across the public tracker and staff console."
    >
      <article className="space-y-6 text-sm leading-relaxed text-text-secondary">
        <Section title="What we do">
          <ul className="list-disc space-y-1 pl-6">
            <li>All interactive targets are at least 44 × 44 pixels.</li>
            <li>Status is always conveyed with an icon and text, never colour alone.</li>
            <li>Every input has a programmatically associated label.</li>
            <li>Focus rings follow a consistent, high-contrast style and are visible on keyboard focus only.</li>
            <li>Animation respects the operating-system “reduce motion” setting.</li>
            <li>Public pages meet WCAG 2.2 contrast for text, focus indicators and essential graphics.</li>
            <li>Semantic HTML is used throughout; landmarks and skip links are present where needed.</li>
          </ul>
        </Section>

        <Section title="Known limitations">
          <p>
            This statement is being finalised. Accessibility testing is done as part of the release
            process. If you find something inaccessible, please contact the ICT desk at{" "}
            <a href="/help" className="font-medium text-primary underline underline-offset-4 focus-ring">
              the Help page
            </a>{" "}
            and we will address it.
          </p>
        </Section>

        <Section title="Feedback">
          <p>
            We welcome feedback on the accessibility of this system. When you report an issue, please tell
            us the page, what you tried to do, and the assistive technology you were using (if any).
          </p>
        </Section>

        <p className="border-t border-border pt-4 text-xs text-text-muted">
          Last reviewed: {new Date().getFullYear()}.
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
