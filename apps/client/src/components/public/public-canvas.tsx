"use client";
import * as React from "react";
import Link from "next/link";
import { ScalesMark } from "../scales-mark";

type NavKey = "home" | "search" | "help" | "status";

export function PublicCanvas({
  children,
  active,
  narrow,
}: {
  children: React.ReactNode;
  active?: NavKey;
  narrow?: boolean;
}) {
  return (
    <div className="public-dark pd-canvas min-h-screen flex flex-col">
      <a
        href="#pd-main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded focus:bg-[var(--pd-signal)] focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-[#0C1406]"
      >
        Skip to content
      </a>

      <PublicNav active={active} />

      <main id="pd-main" className="flex-1">
        <div className={`mx-auto w-full ${narrow ? "max-w-3xl" : "max-w-[1440px]"} px-4 sm:px-6 lg:px-8`}>
          {children}
        </div>
      </main>

      <PublicFooter />
    </div>
  );
}

function PublicNav({ active }: { active?: NavKey }) {
  const items: { key: NavKey; href: string; label: string; count: string }[] = [
    { key: "home", href: "/", label: "Home", count: "·" },
    { key: "search", href: "/search", label: "Search", count: "→" },
    { key: "help", href: "/help", label: "Help", count: "?" },
    { key: "status", href: "/status", label: "Status", count: "●" },
  ];

  return (
    <header
      className="sticky top-0 z-30 border-b pd-hairline backdrop-blur-[6px]"
      style={{ backgroundColor: "rgba(12, 20, 6, 0.88)" }}
    >
      <div className="mx-auto flex h-14 w-full max-w-[1440px] items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <Link
          href="/"
          aria-label="Federal High Court of Nigeria — public case tracker home"
          className="pd-focus flex min-h-[44px] items-center gap-3 rounded"
        >
          <span
            className="flex h-8 w-8 shrink-0 items-center justify-center"
            style={{ background: "var(--pd-accent)", color: "#FFFFFF" }}
            aria-hidden="true"
          >
            <ScalesMark className="h-4 w-4" />
          </span>
          <span className="flex items-baseline gap-2">
            <span className="pd-display" style={{ fontSize: "1rem", color: "var(--pd-bone)" }}>
              FHC
            </span>
            <span className="pd-mono hidden sm:inline" style={{ color: "var(--pd-ash)" }}>
              PUBLIC TRACKER
            </span>
          </span>
        </Link>

        <nav aria-label="Primary" className="hidden md:flex items-center gap-1">
          {items.map((item) => {
            const isActive = active === item.key;
            return (
              <Link
                key={item.key}
                href={item.href}
                aria-current={isActive ? "page" : undefined}
                className="pd-focus relative flex min-h-[44px] items-center rounded px-3 text-sm font-medium transition-colors duration-100"
                style={{ color: isActive ? "var(--pd-bone)" : "var(--pd-concrete)" }}
              >
                {item.label}
                <span className="pd-sup">{item.count}</span>
                {isActive ? (
                  <span
                    aria-hidden="true"
                    className="absolute inset-x-3 -bottom-px h-px"
                    style={{ background: "var(--pd-signal)" }}
                  />
                ) : null}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-2">
          <span
            className="hidden items-center gap-2 text-xs sm:inline-flex"
            aria-label="Service is online"
          >
            <span
              aria-hidden="true"
              className="pd-pulse inline-block h-1.5 w-1.5 rounded-full"
              style={{ background: "var(--pd-signal)" }}
            />
            <span className="pd-mono" style={{ color: "var(--pd-concrete)" }}>
              ONLINE
            </span>
          </span>
          <Link
            href="/login"
            className="pd-btn-ghost flex min-h-[44px] items-center px-3 text-sm"
          >
            Staff sign in
          </Link>
        </div>
      </div>
    </header>
  );
}

function PublicFooter() {
  return (
    <footer className="mt-24 border-t pd-hairline">
      <div className="mx-auto w-full max-w-[1440px] px-4 py-10 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-8 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p
              className="pd-display-hero select-none"
              style={{ fontSize: "clamp(2.25rem, 6vw, 4.5rem)", color: "var(--pd-concrete)" }}
              aria-hidden="true"
            >
              FHC<span style={{ color: "var(--pd-signal)" }}>.</span>
            </p>
            <p className="pd-small mt-2" style={{ color: "var(--pd-ash)" }}>
              Federal High Court of Nigeria · Public Case Tracker
            </p>
          </div>

          <nav aria-label="Legal and support" className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
            <Link href="/privacy" className="pd-focus rounded hover:opacity-80" style={{ color: "var(--pd-concrete)" }}>
              Privacy<span className="pd-sup">01</span>
            </Link>
            <Link href="/terms" className="pd-focus rounded hover:opacity-80" style={{ color: "var(--pd-concrete)" }}>
              Terms<span className="pd-sup">02</span>
            </Link>
            <Link href="/accessibility" className="pd-focus rounded hover:opacity-80" style={{ color: "var(--pd-concrete)" }}>
              Accessibility<span className="pd-sup">03</span>
            </Link>
            <Link href="/help" className="pd-focus rounded hover:opacity-80" style={{ color: "var(--pd-concrete)" }}>
              Help<span className="pd-sup">04</span>
            </Link>
            <Link href="/status" className="pd-focus rounded hover:opacity-80" style={{ color: "var(--pd-concrete)" }}>
              Status<span className="pd-sup">05</span>
            </Link>
          </nav>
        </div>

        <p className="mt-8 border-t pd-hairline pt-6 pd-small" style={{ color: "var(--pd-ash)" }}>
          Public access shows only published case information. Not-found, malformed and restricted case numbers all return the same response.
        </p>
      </div>
    </footer>
  );
}
