"use client";
import * as React from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { PublicCanvas } from "../src/components/public/public-canvas";
import { SearchForm } from "../src/components/public/search-form";
import { ScalesMark } from "../src/components/scales-mark";
import { StatusBadge } from "../src/components/ui/primitives";

export default function HomePage() {
  return (
    <PublicCanvas active="home">
      <Hero />
      <LiveStrip />
      <HowItWorks />
      <StatusVocabulary />
      <Capabilities />
      <Contact />
    </PublicCanvas>
  );
}

/* -------------------------------------------------------------------------- */
/*  Hero                                                                      */
/* -------------------------------------------------------------------------- */

function Hero() {
  return (
    <section className="relative overflow-hidden border-b pd-hairline pt-16 pb-20 sm:pt-24 sm:pb-28">
      <ScalesMark
        aria-hidden="true"
        className="pointer-events-none absolute -right-24 top-1/2 h-[36rem] w-[36rem] -translate-y-1/2 opacity-[0.035]"
      />
      <div className="relative grid gap-12 lg:grid-cols-[1.35fr_1fr] lg:items-end">
        <div>
          <p className="pd-mono" style={{ color: "var(--pd-signal)" }}>
            Federal High Court of Nigeria · Public Case Tracker
          </p>

          <h1 className="pd-display-hero mt-6" style={{ color: "var(--pd-bone)" }}>
            One record of
            <br />
            every case
            <span style={{ color: "var(--pd-signal)" }}>.</span>
          </h1>

          <p
            className="pd-body-lg mt-8 max-w-xl"
            style={{ color: "var(--pd-concrete)" }}
          >
            Search by case number for status, hearing dates and the presiding judge. Public access shows
            only the information the Court has chosen to publish.
          </p>

          <div className="mt-10 max-w-2xl">
            <SearchForm mode="hero" />
          </div>
        </div>

        <aside
          className="border pd-hairline p-5 sm:p-6"
          style={{ background: "var(--pd-field)" }}
          aria-labelledby="case-format-heading"
        >
          <p id="case-format-heading" className="pd-mono" style={{ color: "var(--pd-ash)" }}>
            How to read a case number
          </p>

          <p
            className="pd-mono mt-3 break-all"
            style={{
              color: "var(--pd-bone)",
              fontSize: "1rem",
              letterSpacing: "0.02em",
            }}
          >
            FHC<span style={{ color: "var(--pd-signal)" }}>/</span>L
            <span style={{ color: "var(--pd-signal)" }}>/</span>CS
            <span style={{ color: "var(--pd-signal)" }}>/</span>1042
            <span style={{ color: "var(--pd-signal)" }}>/</span>2026
          </p>

          <div
            className="mt-4 grid grid-cols-5 gap-px"
            style={{ background: "var(--pd-rule)" }}
            role="list"
            aria-label="Case number segments"
          >
            {[
              { value: "FHC", label: "Court" },
              { value: "L", label: "Division" },
              { value: "CS", label: "Suit" },
              { value: "1042", label: "Seq." },
              { value: "2026", label: "Year" },
            ].map((part) => (
              <div
                key={part.label}
                role="listitem"
                className="min-w-0 p-2"
                style={{ background: "var(--pd-field)" }}
              >
                <p
                  className="pd-mono truncate"
                  style={{ color: "var(--pd-bone)", fontSize: "0.75rem" }}
                >
                  {part.value}
                </p>
                <p
                  className="pd-counter mt-1 truncate"
                  style={{ color: "var(--pd-ash)" }}
                >
                  {part.label}
                </p>
              </div>
            ))}
          </div>

          <p className="pd-small mt-3" style={{ color: "var(--pd-ash)" }}>
            The case number is printed on your filing receipt.
          </p>
        </aside>
      </div>
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/*  Live strip                                                                */
/* -------------------------------------------------------------------------- */

function LiveStrip() {
  return (
    <section
      aria-label="Service status"
      className="border-b pd-hairline py-4"
    >
      <div className="flex flex-wrap items-center gap-x-8 gap-y-3">
        <span className="flex items-center gap-2">
          <span
            aria-hidden="true"
            className="pd-pulse inline-block h-2 w-2 rounded-full"
            style={{ background: "var(--pd-signal)" }}
          />
          <span className="pd-mono" style={{ color: "var(--pd-bone)" }}>
            ONLINE
          </span>
          <span className="pd-mono" style={{ color: "var(--pd-ash)" }}>
            · service operational
          </span>
        </span>
        <span className="pd-mono" style={{ color: "var(--pd-ash)" }}>
          Public access only
        </span>
        <span className="pd-mono" style={{ color: "var(--pd-ash)" }}>
          Times shown in Africa/Lagos
        </span>
        <span className="pd-mono ml-auto hidden sm:inline" style={{ color: "var(--pd-ash)" }}>
          v1.0 · 2026
        </span>
      </div>
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/*  How it works                                                              */
/* -------------------------------------------------------------------------- */

const STEPS: { n: string; title: string; body: string }[] = [
  {
    n: "01",
    title: "Enter the case number",
    body: "Type the number exactly as it appears on your filing receipt — division, suit type, sequence and year.",
  },
  {
    n: "02",
    title: "The tracker looks it up",
    body: "We check the court record. Cases are only visible if a registrar has made them public.",
  },
  {
    n: "03",
    title: "See the current status",
    body: "Status, next scheduled hearing and presiding judge. Party details and documents stay private.",
  },
];

function HowItWorks() {
  return (
    <section aria-labelledby="how-heading" className="border-b pd-hairline py-16 sm:py-20">
      <div className="flex items-end justify-between gap-6 border-b pd-hairline pb-6">
        <h2 id="how-heading" className="pd-display-section" style={{ color: "var(--pd-bone)" }}>
          How it works
        </h2>
        <p className="pd-mono hidden sm:block" style={{ color: "var(--pd-ash)" }}>
          Three steps <span className="pd-sup">03</span>
        </p>
      </div>

      <div className="grid border-l pd-hairline md:grid-cols-3">
        {STEPS.map((step) => (
          <div key={step.n} className="border-b md:border-b-0 md:border-r pd-hairline p-6 sm:p-8">
            <p className="pd-mono" style={{ color: "var(--pd-signal)" }}>
              {step.n}
            </p>
            <h3 className="pd-project mt-4" style={{ color: "var(--pd-bone)" }}>
              {step.title}
            </h3>
            <p className="pd-body mt-3" style={{ color: "var(--pd-concrete)" }}>
              {step.body}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/*  Status vocabulary                                                         */
/* -------------------------------------------------------------------------- */

const STATUSES: { code: string; label: string; description: string }[] = [
  { code: "DRAFT", label: "Draft", description: "Filed by the lawyer. Not yet submitted for approval." },
  { code: "PENDING_APPROVAL", label: "Pending approval", description: "Waiting for the registrar to review." },
  { code: "ACTIVE", label: "Active", description: "Approved and assigned to a judge." },
  { code: "PART_HEARD", label: "Part-heard", description: "Trial has begun and is continuing." },
  { code: "ADJOURNED", label: "Adjourned", description: "Postponed to a later date." },
  { code: "CLOSED", label: "Closed", description: "Concluded." },
];

function StatusVocabulary() {
  return (
    <section aria-labelledby="statuses-heading" className="border-b pd-hairline py-16 sm:py-20">
      <div className="flex items-end justify-between gap-6 border-b pd-hairline pb-6">
        <h2 id="statuses-heading" className="pd-display-section" style={{ color: "var(--pd-bone)" }}>
          What the statuses mean
        </h2>
        <p className="pd-mono hidden sm:block" style={{ color: "var(--pd-ash)" }}>
          Six states <span className="pd-sup">06</span>
        </p>
      </div>

      <div className="mt-6 grid border-l pd-hairline sm:grid-cols-2 lg:grid-cols-3">
        {STATUSES.map((s) => (
          <div key={s.code} className="border-b border-r pd-hairline p-5 sm:p-6">
            <StatusBadge status={s.code} />
            <p className="pd-body mt-3" style={{ color: "var(--pd-concrete)" }}>
              {s.description}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/*  Capabilities                                                              */
/* -------------------------------------------------------------------------- */

const CAPABILITIES: { title: string; body: string; tags: string[] }[] = [
  {
    title: "Privacy by design",
    body: "Personal information only appears where the Court has deliberately published it. Contact details, documents and internal notes are never exposed on the public tracker.",
    tags: ["NDPA 2023", "Data minimisation", "Identical 404"],
  },
  {
    title: "Accessibility",
    body: "Every interactive element is at least 44 pixels. Status is always shown as icon and text, never colour alone. Motion respects the operating-system setting.",
    tags: ["WCAG 2.2 AA", "44 px targets", "Reduced motion"],
  },
  {
    title: "Security",
    body: "Role-based access, audited actions, encrypted transport and hashed credentials. Every read and write is logged, and credentials never appear in logs.",
    tags: ["Audited", "Role-based", "Encrypted"],
  },
  {
    title: "Verifiable staff",
    body: "Lawyer accounts are verified against the Nigerian Bar Association before they can sign in. Registrars approve filings and assign judges.",
    tags: ["NBA verification", "Registrar review", "Signed rulings"],
  },
];

function Capabilities() {
  return (
    <section aria-labelledby="caps-heading" className="border-b pd-hairline py-16 sm:py-20">
      <div className="flex items-end justify-between gap-6 border-b pd-hairline pb-6">
        <h2 id="caps-heading" className="pd-display-section" style={{ color: "var(--pd-bone)" }}>
          Built for a court,
          <br />
          not a startup<span style={{ color: "var(--pd-signal)" }}>.</span>
        </h2>
        <p className="pd-mono hidden sm:block" style={{ color: "var(--pd-ash)" }}>
          Four pillars <span className="pd-sup">04</span>
        </p>
      </div>

      <div className="mt-6 grid border-l pd-hairline sm:grid-cols-2 lg:grid-cols-4">
        {CAPABILITIES.map((c) => (
          <div key={c.title} className="border-b border-r pd-hairline p-5 sm:p-6">
            <h3 className="pd-project" style={{ color: "var(--pd-bone)" }}>
              {c.title}
            </h3>
            <p className="pd-body mt-3" style={{ color: "var(--pd-concrete)" }}>
              {c.body}
            </p>
            <ul className="mt-4 flex flex-wrap gap-1.5" aria-label="Keywords">
              {c.tags.map((t) => (
                <li key={t} className="pd-tag">
                  {t}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/*  Contact                                                                   */
/* -------------------------------------------------------------------------- */

function Contact() {
  return (
    <section aria-labelledby="contact-heading" className="py-16 sm:py-24">
      <p className="pd-eyebrow" style={{ color: "var(--pd-ash)" }}>
        Ready when you are
      </p>
      <h2 id="contact-heading" className="pd-display-section mt-4" style={{ color: "var(--pd-bone)" }}>
        Search the
        <br />
        public tracker<span style={{ color: "var(--pd-signal)" }}>.</span>
      </h2>
      <p className="pd-body-lg mt-6 max-w-2xl" style={{ color: "var(--pd-concrete)" }}>
        If the tracker returns a 404, the case may be unpublished, mistyped, or restricted. All three
        return the same response so restricted matters stay private.
      </p>
      <div className="mt-8 flex flex-wrap gap-3">
        <Link href="/search" className="pd-btn-primary inline-flex items-center gap-2 px-6 text-base">
          Open the tracker
          <ArrowRight size={16} aria-hidden="true" />
        </Link>
        <Link href="/help" className="pd-btn-ghost inline-flex items-center px-6 text-base">
          Contact the ICT desk
        </Link>
      </div>
    </section>
  );
}
