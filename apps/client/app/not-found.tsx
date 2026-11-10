import Link from "next/link";
import { ScalesMark } from "../src/components/scales-mark";

export const metadata = {
  title: "Page not found — Federal High Court of Nigeria",
};

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col bg-surface-page">
      <a
        href="#not-found-main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-30 focus:rounded-md focus:bg-primary focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-primary-foreground focus-ring"
      >
        Skip to error details
      </a>

      <header className="border-b border-border">
        <div className="mx-auto flex w-full max-w-5xl items-center justify-between gap-4 px-4 py-4">
          <Link
            href="/"
            className="flex min-h-[44px] items-center gap-3 rounded-md focus-ring"
            aria-label="Federal High Court of Nigeria — public case tracker home"
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <ScalesMark className="h-5 w-5" />
            </span>
            <span className="text-sm font-semibold leading-tight text-text-primary">
              Federal High Court of Nigeria
              <span className="block text-xs font-normal text-text-secondary">Public Case Tracker</span>
            </span>
          </Link>

          <Link
            href="/login"
            className="flex min-h-[44px] items-center rounded-md border border-border px-4 text-sm font-medium text-text-primary transition-colors hover:bg-surface-subtle focus-ring"
          >
            Staff sign in
          </Link>
        </div>
      </header>

      <main
        id="not-found-main"
        className="relative flex flex-1 items-center justify-center overflow-hidden px-4 py-12 sm:py-16"
      >
        <ScalesMark
          aria-hidden="true"
          className="pointer-events-none absolute -right-16 top-1/2 h-[26rem] w-[26rem] -translate-y-1/2 text-primary opacity-[0.04] sm:-right-10"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(90%_70%_at_50%_0%,color-mix(in_srgb,var(--surface-tint)_75%,transparent),transparent_65%)]"
        />

        <div className="relative w-full max-w-2xl">
          <article className="motion-rise overflow-hidden rounded-lg border border-border bg-surface-page shadow-e2">
            <div className="flex items-center justify-between gap-4 border-b border-border bg-surface-subtle px-5 py-3 sm:px-8">
              <p className="text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-text-muted">
                Court record · Public access
              </p>
              <p className="font-mono text-xs font-semibold text-text-secondary">REF 404</p>
            </div>

            <div className="flex items-start gap-8 px-5 py-8 sm:px-8 sm:py-10">
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">Error 404</p>
                <h1 className="mt-2 font-heading text-3xl font-bold leading-tight text-text-primary sm:text-4xl">
                  This page is not on the docket.
                </h1>
                <p className="mt-4 max-w-prose text-sm leading-relaxed text-text-secondary sm:text-base">
                  The address may be mistyped, or the page may have moved. Case records are only published
                  when a registrar makes them public, so not every reference is visible here.
                </p>

                <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                  <Link
                    href="/"
                    className="flex min-h-[44px] items-center justify-center rounded-md bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-e1 transition-colors hover:bg-primary-hover focus-ring"
                  >
                    Search the public tracker
                  </Link>
                  <Link
                    href="/login"
                    className="flex min-h-[44px] items-center justify-center rounded-md border border-border bg-surface-page px-5 py-2.5 text-sm font-semibold text-primary transition-colors hover:bg-surface-subtle focus-ring"
                  >
                    Staff sign in
                  </Link>
                </div>
              </div>

              <div
                aria-hidden="true"
                className="motion-stamp hidden shrink-0 -rotate-6 select-none flex-col items-center justify-center rounded-sm border-2 border-status-rejected px-4 py-3 text-status-rejected sm:flex"
              >
                <span className="font-heading text-3xl font-bold leading-none tracking-tight">404</span>
                <span className="mt-1 text-[0.6rem] font-semibold uppercase tracking-[0.18em]">
                  Not on docket
                </span>
              </div>
            </div>

            <div className="border-t border-border bg-surface-subtle px-5 py-4 text-xs leading-relaxed text-text-secondary sm:px-8">
              If you followed a link from the Court, contact the ICT desk and quote reference{" "}
              <span className="font-mono font-semibold text-text-primary">404</span>. Never share your
              password or one-time codes with anyone.
            </div>
          </article>

          <p className="mt-6 text-center text-sm text-text-secondary">
            Looking for a case?{" "}
            <Link href="/" className="font-medium text-primary underline underline-offset-4 focus-ring">
              Enter the case number on the tracker
            </Link>
            .
          </p>
        </div>
      </main>

      <footer className="border-t border-border">
        <div className="mx-auto flex w-full max-w-5xl flex-col gap-2 px-4 py-5 text-xs text-text-muted sm:flex-row sm:items-center sm:justify-between">
          <p>Federal High Court of Nigeria · Public access shows only published case information.</p>
          <nav aria-label="Legal and support" className="flex flex-wrap gap-x-5 gap-y-2">
            <Link href="/help" className="hover:text-text-primary">Help</Link>
            <Link href="/privacy" className="hover:text-text-primary">Privacy</Link>
            <Link href="/terms" className="hover:text-text-primary">Terms</Link>
            <Link href="/status" className="hover:text-text-primary">Status</Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}
