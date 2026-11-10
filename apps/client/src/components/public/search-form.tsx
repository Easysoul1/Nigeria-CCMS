"use client";
import * as React from "react";
import { useRouter } from "next/navigation";
import { ArrowRight } from "lucide-react";

const CASE_NUMBER = /^FHC\/[A-Z]+\/[A-Z]+\/\d+\/\d{4}$/;

export function SearchForm({
  mode,
  initialQuery,
  onSubmit,
  autoFocus,
}: {
  /** "hero" navigates to /search?case=…; "page" runs the lookup inline. */
  mode: "hero" | "page";
  initialQuery?: string;
  onSubmit?: (caseNumber: string) => void;
  autoFocus?: boolean;
}) {
  const router = useRouter();
  const [value, setValue] = React.useState(initialQuery ?? "");
  const [touched, setTouched] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (initialQuery !== undefined) setValue(initialQuery);
  }, [initialQuery]);

  const trimmed = value.trim().toUpperCase();
  const formatOk = CASE_NUMBER.test(trimmed);
  const showError = touched && trimmed.length > 0 && !formatOk;

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setTouched(true);
    if (!formatOk) {
      inputRef.current?.focus();
      return;
    }
    if (mode === "hero") {
      router.push(`/search?case=${encodeURIComponent(trimmed)}`);
    } else {
      onSubmit?.(trimmed);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="w-full" noValidate>
      <label htmlFor="case-number" className="sr-only">
        Case number
      </label>

      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          ref={inputRef}
          id="case-number"
          name="case"
          type="text"
          autoComplete="off"
          autoCapitalize="characters"
          spellCheck={false}
          inputMode="text"
          autoFocus={autoFocus}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onBlur={() => setTouched(true)}
          aria-invalid={showError || undefined}
          aria-describedby="case-number-hint"
          placeholder="FHC/L/CS/1042/2026"
          className="pd-input flex-1"
        />
        <button
          type="submit"
          className="pd-btn-primary flex shrink-0 items-center justify-center gap-2 px-6 text-base"
        >
          <span>{mode === "hero" ? "Search" : "Look up"}</span>
          <ArrowRight size={16} aria-hidden="true" />
        </button>
      </div>

      <p
        id="case-number-hint"
        className="pd-small mt-2"
        style={{ color: showError ? "#FCA5A5" : "var(--pd-ash)" }}
      >
        {showError
          ? "Case number must look like FHC/L/CS/1042/2026 — division, suit type, sequence, year."
          : "Enter the case number printed on your filing receipt."}
      </p>
    </form>
  );
}
