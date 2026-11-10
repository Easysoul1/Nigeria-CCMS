import * as React from "react";
import Link from "next/link";
import { ScalesMark } from "../scales-mark";

export function PublicShell({
  children,
  title,
  subtitle,
  narrow,
}: {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
  narrow?: boolean;
}) {
  return (
    <div className="flex min-h-screen flex-col bg-surface-page">
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

      <main className="flex-1 px-4 py-10 sm:py-14">
        <div className={`mx-auto w-full ${narrow ? "max-w-xl" : "max-w-3xl"}`}>
          {title ? (
            <div className="mb-8">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">
                Federal High Court of Nigeria
              </p>
              <h1 className="mt-2 font-heading text-3xl font-bold leading-tight text-text-primary sm:text-4xl">
                {title}
              </h1>
              {subtitle ? (
                <p className="mt-3 max-w-prose text-sm leading-relaxed text-text-secondary sm:text-base">
                  {subtitle}
                </p>
              ) : null}
            </div>
          ) : null}
          {children}
        </div>
      </main>

      <footer className="border-t border-border bg-surface-subtle">
        <div className="mx-auto w-full max-w-5xl px-4 py-6 text-xs text-text-muted">
          <nav aria-label="Legal and support" className="flex flex-wrap gap-x-5 gap-y-2">
            <Link href="/privacy" className="hover:text-text-primary">Privacy</Link>
            <Link href="/terms" className="hover:text-text-primary">Terms of use</Link>
            <Link href="/accessibility" className="hover:text-text-primary">Accessibility</Link>
            <Link href="/help" className="hover:text-text-primary">Help</Link>
            <Link href="/status" className="hover:text-text-primary">System status</Link>
          </nav>
          <p className="mt-3">
            Federal High Court of Nigeria · Public access shows only published case information.
          </p>
        </div>
      </footer>
    </div>
  );
}
