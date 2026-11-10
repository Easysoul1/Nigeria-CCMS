"use client";
import * as React from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { api, ApiError } from "../../src/lib/api";
import { PublicCanvas } from "../../src/components/public/public-canvas";
import { SearchForm } from "../../src/components/public/search-form";
import { StatusBadge, Spinner } from "../../src/components/ui/primitives";
import { formatLagosDateTime } from "../../src/lib/datetime";

type PublicCase = {
  maskedTitle: string;
  status: string;
  nextHearing: { date: string; time: string; court: string } | null;
  presidingJudge: string;
  lastUpdated: string;
};

type LookupState =
  | { kind: "idle" }
  | { kind: "loading"; caseNumber: string }
  | { kind: "found"; caseNumber: string; data: PublicCase }
  | { kind: "not-found"; caseNumber: string }
  | { kind: "error"; caseNumber: string; message: string };

export default function SearchPage() {
  return (
    <React.Suspense fallback={null}>
      <SearchPageInner />
    </React.Suspense>
  );
}

function SearchPageInner() {
  const router = useRouter();
  const params = useSearchParams();
  const initialFromUrl = params?.get("case") ?? "";

  const [state, setState] = React.useState<LookupState>({ kind: "idle" });
  const [lastCase, setLastCase] = React.useState(initialFromUrl);

  const runLookup = React.useCallback(async (caseNumber: string) => {
    setState({ kind: "loading", caseNumber });
    setLastCase(caseNumber);
    try {
      const data = await api.get<PublicCase>(
        `/public/track/${encodeURIComponent(caseNumber)}`,
        { redirectOnUnauthorized: false },
      );
      setState({ kind: "found", caseNumber, data });
    } catch (err) {
      if (err instanceof ApiError && err.statusCode === 404) {
        setState({ kind: "not-found", caseNumber });
      } else {
        setState({
          kind: "error",
          caseNumber,
          message: err instanceof ApiError ? err.message : "Could not reach the tracker. Please try again.",
        });
      }
    }
  }, []);

  // Auto-run when arriving with ?case=…, and keep the URL in sync when the
  // user submits a new number from this page.
  React.useEffect(() => {
    if (!initialFromUrl) return;
    const normalised = initialFromUrl.trim().toUpperCase();
    if (normalised === lastCase) return;
    setLastCase(normalised);
    void runLookup(normalised);
  }, [initialFromUrl, lastCase, runLookup]);

  function handleSubmit(caseNumber: string) {
    // Update the URL so the result is shareable, then run the lookup locally.
    router.replace(`/search?case=${encodeURIComponent(caseNumber)}`);
    void runLookup(caseNumber);
  }

  return (
    <PublicCanvas active="search" narrow>
      <section className="border-b pd-hairline pt-12 pb-10 sm:pt-16 sm:pb-14">
        <p className="pd-mono" style={{ color: "var(--pd-signal)" }}>
          Public tracker <span className="pd-sup">01</span>
        </p>
        <h1 className="pd-display-section mt-4" style={{ color: "var(--pd-bone)" }}>
          Search a case<span style={{ color: "var(--pd-signal)" }}>.</span>
        </h1>
        <p className="pd-body mt-4 max-w-xl" style={{ color: "var(--pd-concrete)" }}>
          Enter the case number exactly as printed on your filing receipt. The number looks like
          <code className="pd-mono ml-1 px-1.5 py-0.5" style={{ background: "var(--pd-field)", color: "var(--pd-bone)" }}>
            FHC/L/CS/1042/2026
          </code>
          .
        </p>

        <div className="mt-8">
          <SearchForm
            mode="page"
            initialQuery={initialFromUrl}
            onSubmit={handleSubmit}
            autoFocus
          />
        </div>
      </section>

      <section className="py-10" aria-live="polite">
        {state.kind === "idle" ? <IdleState /> : null}
        {state.kind === "loading" ? <LoadingState caseNumber={state.caseNumber} /> : null}
        {state.kind === "found" ? (
          <FoundState caseNumber={state.caseNumber} data={state.data} />
        ) : null}
        {state.kind === "not-found" ? <NotFoundState caseNumber={state.caseNumber} /> : null}
        {state.kind === "error" ? (
          <ErrorState caseNumber={state.caseNumber} message={state.message} onRetry={() => void runLookup(state.caseNumber)} />
        ) : null}
      </section>
    </PublicCanvas>
  );
}

/* -------------------------------------------------------------------------- */
/*  Result states                                                             */
/* -------------------------------------------------------------------------- */

function IdleState() {
  return (
    <div className="border pd-hairline p-6 sm:p-8" style={{ background: "var(--pd-field)" }}>
      <p className="pd-mono" style={{ color: "var(--pd-ash)" }}>
        Nothing yet
      </p>
      <p className="pd-body mt-3" style={{ color: "var(--pd-concrete)" }}>
        Enter a case number above and press <span className="pd-mono" style={{ color: "var(--pd-bone)" }}>Look up</span> to see the current status, the next scheduled hearing and the presiding judge.
      </p>
    </div>
  );
}

function LoadingState({ caseNumber }: { caseNumber: string }) {
  return (
    <div role="status" className="flex items-center gap-3 border pd-hairline p-6" style={{ background: "var(--pd-field)", color: "var(--pd-concrete)" }}>
      <Spinner />
      <span className="pd-mono">
        Looking up <span style={{ color: "var(--pd-bone)" }}>{caseNumber}</span>…
      </span>
    </div>
  );
}

function FoundState({ caseNumber, data }: { caseNumber: string; data: PublicCase }) {
  return (
    <article className="border pd-hairline" style={{ background: "var(--pd-field)" }}>
      <div className="flex flex-wrap items-center justify-between gap-3 border-b pd-hairline px-5 py-3">
        <p className="pd-mono" style={{ color: "var(--pd-ash)" }}>
          Public record <span className="pd-sup">ref</span>{" "}
          <span style={{ color: "var(--pd-bone)" }}>{caseNumber}</span>
        </p>
        <StatusBadge status={data.status} />
      </div>

      <div className="px-5 py-6 sm:px-8 sm:py-8">
        <h2 className="pd-project" style={{ color: "var(--pd-bone)" }}>
          {data.maskedTitle}
        </h2>

        <dl className="mt-6 grid gap-4 sm:grid-cols-2">
          <Row label="Status">
            <StatusBadge status={data.status} />
          </Row>
          <Row label="Presiding judge">
            <span className="pd-body" style={{ color: "var(--pd-bone)" }}>
              {data.presidingJudge}
            </span>
          </Row>
          <Row label="Next hearing" wide>
            {data.nextHearing ? (
              <span className="pd-body" style={{ color: "var(--pd-bone)" }}>
                {data.nextHearing.date} at {data.nextHearing.time}{" "}
                <span style={{ color: "var(--pd-ash)" }}>·</span> {data.nextHearing.court}
              </span>
            ) : (
              <span className="pd-body" style={{ color: "var(--pd-concrete)" }}>
                No hearing scheduled
              </span>
            )}
          </Row>
        </dl>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t pd-hairline px-5 py-3">
        <p className="pd-mono" style={{ color: "var(--pd-ash)" }}>
          Last updated {formatLagosDateTime(data.lastUpdated)}
        </p>
        <div className="flex items-center gap-2">
          <ShareLink caseNumber={caseNumber} />
          <Link href="/help" className="pd-btn-ghost flex min-h-[44px] items-center px-3 text-sm">
            Something wrong?
          </Link>
        </div>
      </div>
    </article>
  );
}

function NotFoundState({ caseNumber }: { caseNumber: string }) {
  return (
    <div className="border pd-hairline" style={{ background: "var(--pd-field)" }} role="status">
      <div className="border-b pd-hairline px-5 py-3">
        <p className="pd-mono" style={{ color: "var(--pd-rejected, #FCA5A5)" }}>
          Not publicly available <span className="pd-sup">ref</span>{" "}
          <span style={{ color: "var(--pd-bone)" }}>{caseNumber}</span>
        </p>
      </div>
      <div className="px-5 py-6 sm:px-8">
        <h2 className="pd-project" style={{ color: "var(--pd-bone)" }}>
          This case is not on the public tracker.
        </h2>
        <p className="pd-body mt-3 max-w-prose" style={{ color: "var(--pd-concrete)" }}>
          The address may be mistyped, the case may not yet be published, or the Court may have restricted
          public access to it. All three return the same response, so a restricted matter cannot be
          distinguished from one that does not exist.
        </p>
        <ul className="mt-4 space-y-1.5 pd-small" style={{ color: "var(--pd-ash)" }}>
          <li>· Check the number on your filing receipt — division, suit type, sequence and year.</li>
          <li>· A case appears here once a registrar has made it public.</li>
          <li>· If you believe this is wrong, contact the ICT desk.</li>
        </ul>
        <div className="mt-6 flex flex-wrap gap-2">
          <Link href="/help" className="pd-btn-primary inline-flex items-center px-5 text-sm">
            Contact the ICT desk
          </Link>
          <Link href="/" className="pd-btn-ghost inline-flex items-center px-5 text-sm">
            Back to home
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorState({
  caseNumber,
  message,
  onRetry,
}: {
  caseNumber: string;
  message: string;
  onRetry: () => void;
}) {
  return (
    <div className="border pd-hairline" style={{ background: "var(--pd-field)" }} role="alert">
      <div className="px-5 py-6">
        <p className="pd-mono" style={{ color: "#FCA5A5" }}>
          Lookup failed
        </p>
        <p className="pd-body mt-3" style={{ color: "var(--pd-bone)" }}>
          {message}
        </p>
        <p className="pd-mono mt-2" style={{ color: "var(--pd-ash)" }}>
          Ref: {caseNumber}
        </p>
        <div className="mt-5 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={onRetry}
            className="pd-btn-primary inline-flex items-center px-5 text-sm"
          >
            Try again
          </button>
          <Link href="/status" className="pd-btn-ghost inline-flex items-center px-5 text-sm">
            Check status
          </Link>
        </div>
      </div>
    </div>
  );
}

function Row({
  label,
  children,
  wide,
}: {
  label: string;
  children: React.ReactNode;
  wide?: boolean;
}) {
  return (
    <div className={wide ? "sm:col-span-2" : undefined}>
      <dt className="pd-mono" style={{ color: "var(--pd-ash)" }}>
        {label}
      </dt>
      <dd className="mt-1">{children}</dd>
    </div>
  );
}

function ShareLink({ caseNumber }: { caseNumber: string }) {
  const [copied, setCopied] = React.useState(false);
  const onClick = async () => {
    if (typeof window === "undefined") return;
    const url = `${window.location.origin}/case/${caseNumber.split("/").join("-")}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      /* silently ignore — no fallback needed for a nice-to-have */
    }
  };
  return (
    <button
      type="button"
      onClick={onClick}
      className="pd-btn-ghost flex min-h-[44px] items-center gap-2 px-3 text-sm"
    >
      {copied ? "Link copied" : "Copy share link"}
    </button>
  );
}
