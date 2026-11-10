"use client";
import * as React from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api, ApiError } from "../../lib/api";
import { FileDropzone } from "./file-dropzone";
import { Spinner } from "../ui/primitives";

type Division = { id: string; code: string; name: string; courts: { id: string; name: string; number: string }[] };
type DivisionList = { divisions: Division[] };
type CaseType = "CIVIL" | "CRIMINAL" | "REVENUE" | "ADMIRALTY" | "OTHER";
type PartyRole = "CLAIMANT" | "DEFENDANT" | "APPLICANT" | "RESPONDENT" | "WITNESS";

type PartyDraft = { name: string; role: PartyRole; isIndividual: boolean; counselName: string };
type Draft = {
  title: string;
  summary: string;
  reliefSought: string;
  caseType: CaseType;
  suitTypeCode: string;
  divisionId: string;
  courtId: string;
  parties: PartyDraft[];
};

const STORAGE_KEY = "draft:new-case:v2";

const emptyDraft: Draft = {
  title: "",
  summary: "",
  reliefSought: "",
  caseType: "CIVIL",
  suitTypeCode: "CS",
  divisionId: "",
  courtId: "",
  parties: [{ name: "", role: "CLAIMANT", isIndividual: true, counselName: "" }],
};

type Step = 0 | 1 | 2 | 3;
type Created = { caseId: string; caseNumber?: string | null };

export function NewCaseWizard() {
  const qc = useQueryClient();
  const [step, setStep] = React.useState<Step>(0);
  const [draft, setDraft] = React.useState<Draft>(emptyDraft);
  const [created, setCreated] = React.useState<Created | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [saving, setSaving] = React.useState(false);
  const [savedAt, setSavedAt] = React.useState<Date | null>(null);
  const [docUploadedCount, setDocUploadedCount] = React.useState(0);

  const divisionsQuery = useQuery({
    queryKey: ["meta", "divisions"],
    queryFn: () => api.get<DivisionList>("/meta/divisions"),
  });

  React.useEffect(() => {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    try {
      const parsed = JSON.parse(raw) as Draft;
      setDraft({ ...emptyDraft, ...parsed });
    } catch {
      /* ignore */
    }
  }, []);

  React.useEffect(() => {
    const t = window.setTimeout(() => {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(draft));
      setSavedAt(new Date());
    }, 400);
    return () => window.clearTimeout(t);
  }, [draft]);

  const divisions = divisionsQuery.data?.divisions ?? [];
  const selectedDivision = divisions.find((d) => d.id === draft.divisionId);

  function set<K extends keyof Draft>(key: K, value: Draft[K]) {
    setDraft((d) => ({ ...d, [key]: value }));
    setError(null);
  }

  function setParty(idx: number, patch: Partial<PartyDraft>) {
    setDraft((d) => ({
      ...d,
      parties: d.parties.map((p, i) => (i === idx ? { ...p, ...patch } : p)),
    }));
  }

  async function stepOneNext() {
    if (draft.title.trim().length < 5) return setError("Title must be at least 5 characters.");
    if (!draft.divisionId) return setError("Please choose a division.");
    setError(null);
    setStep(1);
  }

  function stepTwoNext() {
    const hasClaimant = draft.parties.some((p) => p.role === "CLAIMANT" || p.role === "APPLICANT");
    const hasRespondent = draft.parties.some((p) => p.role === "DEFENDANT" || p.role === "RESPONDENT");
    if (!hasClaimant) return setError("At least one claimant or applicant is required.");
    if (!hasRespondent) return setError("At least one defendant or respondent is required.");
    if (draft.parties.some((p) => p.name.trim().length < 2)) return setError("Please fill every party name.");
    setError(null);
    setStep(2);
  }

  async function createCaseAndAdvance() {
    if (created) {
      setStep(3);
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const c = await api.post<{ id: string; caseNumber?: string | null }>("/cases", {
        title: draft.title.trim(),
        summary: draft.summary.trim() || undefined,
        reliefSought: draft.reliefSought.trim() || undefined,
        caseType: draft.caseType,
        suitTypeCode: draft.suitTypeCode.trim().toUpperCase(),
        divisionId: draft.divisionId,
        courtId: draft.courtId || undefined,
      });
      for (const p of draft.parties) {
        await api.post(`/cases/${c.id}/parties`, {
          name: p.name.trim(),
          role: p.role,
          counselName: p.counselName.trim() || undefined,
          isIndividual: p.isIndividual,
        });
      }
      setCreated({ caseId: c.id, caseNumber: c.caseNumber ?? null });
      await qc.invalidateQueries({ queryKey: ["cases"] });
      setStep(3);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not create the case.");
    } finally {
      setSaving(false);
    }
  }

  async function finalize(submit: boolean) {
    if (!created) return;
    if (docUploadedCount === 0) {
      setError("Upload at least one document before submitting for approval.");
      return;
    }
    if (!submit) {
      reset();
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await api.post(`/cases/${created.caseId}/submit`);
      await qc.invalidateQueries({ queryKey: ["cases"] });
      reset();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not submit the case.");
    } finally {
      setSaving(false);
    }
  }

  function reset() {
    setDraft(emptyDraft);
    setCreated(null);
    setStep(0);
    setSavedAt(null);
    setDocUploadedCount(0);
    localStorage.removeItem(STORAGE_KEY);
  }

  const steps = ["Case details", "Parties", "Documents", "Review"] as const;

  return (
    <section className="space-y-5 rounded-lg border border-border bg-surface-page p-5 shadow-e1 sm:p-6">
      <div>
        <h2 className="font-heading text-lg font-semibold text-text-primary">File a new case</h2>
        <p className="mt-1 text-sm text-text-secondary">
          Complete the four steps. Your draft is saved locally as you type.
        </p>
      </div>

      <ol className="flex flex-wrap gap-2" aria-label="Filing steps">
        {steps.map((s, i) => (
          <li
            key={s}
            aria-current={i === step ? "step" : undefined}
            className={`inline-flex items-center gap-2 rounded-pill px-3 py-1 text-xs font-semibold ${i === step ? "bg-primary text-primary-foreground" : i < step ? "bg-status-approved-bg text-status-approved-fg" : "bg-surface-subtle text-text-muted"}`}
          >
            <span aria-hidden="true" className="flex h-4 w-4 items-center justify-center rounded-full bg-white/20 text-[0.65rem]">
              {i < step ? "✓" : i + 1}
            </span>
            {s}
          </li>
        ))}
      </ol>

      {savedAt && !created ? (
        <p className="text-xs text-text-muted">Draft autosaved at {savedAt.toLocaleTimeString("en-NG", { hour: "2-digit", minute: "2-digit" })}.</p>
      ) : null}

      {error ? (
        <p role="alert" className="rounded-md bg-status-rejected-bg px-3 py-2 text-sm text-status-rejected-fg">
          {error}
        </p>
      ) : null}

      {step === 0 ? (
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label htmlFor="w-title" className="text-xs font-semibold uppercase tracking-wide text-text-muted">Case title</label>
            <input
              id="w-title"
              value={draft.title}
              onChange={(e) => set("title", e.target.value)}
              placeholder="e.g. Alhaji Ibrahim v. Federal Inland Revenue Service"
              className="mt-1 min-h-[44px] w-full rounded-md border border-border bg-surface-page px-3 text-sm text-text-primary focus-ring"
            />
          </div>
          <div>
            <label htmlFor="w-case-type" className="text-xs font-semibold uppercase tracking-wide text-text-muted">Case type</label>
            <select
              id="w-case-type"
              value={draft.caseType}
              onChange={(e) => set("caseType", e.target.value as CaseType)}
              className="mt-1 min-h-[44px] w-full rounded-md border border-border bg-surface-page px-3 text-sm text-text-primary focus-ring"
            >
              <option value="CIVIL">Civil</option>
              <option value="CRIMINAL">Criminal</option>
              <option value="REVENUE">Revenue</option>
              <option value="ADMIRALTY">Admiralty</option>
              <option value="OTHER">Other</option>
            </select>
          </div>
          <div>
            <label htmlFor="w-suit" className="text-xs font-semibold uppercase tracking-wide text-text-muted">Suit code</label>
            <input
              id="w-suit"
              value={draft.suitTypeCode}
              onChange={(e) => set("suitTypeCode", e.target.value)}
              placeholder="CS"
              maxLength={10}
              className="mt-1 min-h-[44px] w-full rounded-md border border-border bg-surface-page px-3 font-mono text-sm uppercase text-text-primary focus-ring"
            />
          </div>
          <div>
            <label htmlFor="w-division" className="text-xs font-semibold uppercase tracking-wide text-text-muted">Division</label>
            <select
              id="w-division"
              value={draft.divisionId}
              onChange={(e) => {
                set("divisionId", e.target.value);
                set("courtId", "");
              }}
              className="mt-1 min-h-[44px] w-full rounded-md border border-border bg-surface-page px-3 text-sm text-text-primary focus-ring"
            >
              <option value="">Select a division…</option>
              {divisions.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="w-court" className="text-xs font-semibold uppercase tracking-wide text-text-muted">Court (optional)</label>
            <select
              id="w-court"
              value={draft.courtId}
              onChange={(e) => set("courtId", e.target.value)}
              disabled={!selectedDivision}
              className="mt-1 min-h-[44px] w-full rounded-md border border-border bg-surface-page px-3 text-sm text-text-primary focus-ring disabled:opacity-60"
            >
              <option value="">Assign later</option>
              {selectedDivision?.courts.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} — {c.number}
                </option>
              ))}
            </select>
          </div>
          <div className="sm:col-span-2">
            <label htmlFor="w-summary" className="text-xs font-semibold uppercase tracking-wide text-text-muted">Summary</label>
            <textarea
              id="w-summary"
              rows={3}
              value={draft.summary}
              onChange={(e) => set("summary", e.target.value)}
              className="mt-1 w-full rounded-md border border-border bg-surface-page px-3 py-2 text-sm text-text-primary focus-ring"
            />
          </div>
        </div>
      ) : null}

      {step === 1 ? (
        <div className="space-y-3">
          {draft.parties.map((p, idx) => (
            <div key={idx} className="rounded-md border border-border bg-surface-subtle p-3">
              <div className="grid gap-3 sm:grid-cols-[1fr_180px_auto] sm:items-end">
                <div>
                  <label htmlFor={`p-${idx}-name`} className="text-xs font-semibold uppercase tracking-wide text-text-muted">Name</label>
                  <input
                    id={`p-${idx}-name`}
                    value={p.name}
                    onChange={(e) => setParty(idx, { name: e.target.value })}
                    className="mt-1 min-h-[44px] w-full rounded-md border border-border bg-surface-page px-3 text-sm text-text-primary focus-ring"
                  />
                </div>
                <div>
                  <label htmlFor={`p-${idx}-role`} className="text-xs font-semibold uppercase tracking-wide text-text-muted">Role</label>
                  <select
                    id={`p-${idx}-role`}
                    value={p.role}
                    onChange={(e) => setParty(idx, { role: e.target.value as PartyRole })}
                    className="mt-1 min-h-[44px] w-full rounded-md border border-border bg-surface-page px-3 text-sm text-text-primary focus-ring"
                  >
                    <option value="CLAIMANT">Claimant</option>
                    <option value="DEFENDANT">Defendant</option>
                    <option value="APPLICANT">Applicant</option>
                    <option value="RESPONDENT">Respondent</option>
                    <option value="WITNESS">Witness</option>
                  </select>
                </div>
                <button
                  type="button"
                  onClick={() => setDraft((d) => ({ ...d, parties: d.parties.filter((_, i) => i !== idx) }))}
                  disabled={draft.parties.length <= 1}
                  className="min-h-[44px] rounded-md border border-border bg-surface-page px-3 text-sm font-medium text-status-rejected-fg hover:bg-status-rejected-bg focus-ring disabled:opacity-40"
                >
                  Remove
                </button>
              </div>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <div>
                  <label htmlFor={`p-${idx}-counsel`} className="text-xs font-semibold uppercase tracking-wide text-text-muted">Counsel (optional)</label>
                  <input
                    id={`p-${idx}-counsel`}
                    value={p.counselName}
                    onChange={(e) => setParty(idx, { counselName: e.target.value })}
                    className="mt-1 min-h-[44px] w-full rounded-md border border-border bg-surface-page px-3 text-sm text-text-primary focus-ring"
                  />
                </div>
                <label className="mt-5 flex items-center gap-2 text-sm text-text-secondary">
                  <input
                    type="checkbox"
                    checked={p.isIndividual}
                    onChange={(e) => setParty(idx, { isIndividual: e.target.checked })}
                    className="h-4 w-4 rounded border-border"
                  />
                  Individual (not a company)
                </label>
              </div>
            </div>
          ))}
          <button
            type="button"
            onClick={() => setDraft((d) => ({ ...d, parties: [...d.parties, { name: "", role: "DEFENDANT", isIndividual: true, counselName: "" }] }))}
            className="min-h-[44px] rounded-md border border-border bg-surface-page px-4 text-sm font-medium text-primary hover:bg-surface-subtle focus-ring"
          >
            + Add party
          </button>
        </div>
      ) : null}

      {step === 2 ? (
        <div className="space-y-3">
          {!created ? (
            <>
              <p className="text-sm text-text-secondary">
                Upload documents now. The case record is created in the background before the upload starts.
              </p>
              <button
                type="button"
                onClick={createCaseAndAdvance}
                disabled={saving}
                className="flex min-h-[44px] items-center gap-2 rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground shadow-e1 hover:bg-primary-hover focus-ring disabled:opacity-60"
              >
                {saving ? <Spinner /> : null}
                {saving ? "Creating case…" : "Create draft and continue"}
              </button>
            </>
          ) : (
            <FileDropzone
              caseId={created.caseId}
              category="PLEADING"
              onUploaded={() => setDocUploadedCount((n) => n + 1)}
            />
          )}
        </div>
      ) : null}

      {step === 3 ? (
        <div className="space-y-3">
          <div className="rounded-md border border-border bg-surface-subtle p-4 text-sm">
            <p className="font-semibold text-text-primary">{draft.title}</p>
            <p className="mt-1 text-text-secondary">
              {draft.caseType} · {draft.suitTypeCode} · {selectedDivision?.name ?? "—"}
            </p>
            <p className="mt-2 text-xs text-text-muted">
              {draft.parties.length} parties · {docUploadedCount} document{docUploadedCount === 1 ? "" : "s"} uploaded
            </p>
            {created?.caseNumber ? (
              <p className="mt-2 font-mono text-xs text-text-primary">
                Reference {created.caseNumber}
              </p>
            ) : null}
          </div>
          <p className="text-sm text-text-secondary">
            Submit for approval now, or save as a draft and complete it later from your case list.
          </p>
        </div>
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border pt-4">
        <button
          type="button"
          onClick={() => setStep((s) => (Math.max(0, s - 1) as Step))}
          disabled={step === 0 || saving}
          className="min-h-[44px] rounded-md border border-border bg-surface-page px-4 text-sm font-medium text-text-primary hover:bg-surface-subtle focus-ring disabled:opacity-50"
        >
          Back
        </button>

        {step === 0 ? (
          <button
            type="button"
            onClick={stepOneNext}
            className="min-h-[44px] rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground hover:bg-primary-hover focus-ring"
          >
            Continue
          </button>
        ) : null}
        {step === 1 ? (
          <button
            type="button"
            onClick={stepTwoNext}
            className="min-h-[44px] rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground hover:bg-primary-hover focus-ring"
          >
            Continue
          </button>
        ) : null}
        {step === 2 && created ? (
          <button
            type="button"
            onClick={() => setStep(3)}
            disabled={docUploadedCount === 0}
            className="min-h-[44px] rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground hover:bg-primary-hover focus-ring disabled:opacity-60"
          >
            Continue
          </button>
        ) : null}
        {step === 3 ? (
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => finalize(false)}
              disabled={saving}
              className="min-h-[44px] rounded-md border border-border bg-surface-page px-4 text-sm font-medium text-text-primary hover:bg-surface-subtle focus-ring disabled:opacity-60"
            >
              Save as draft
            </button>
            <button
              type="button"
              onClick={() => finalize(true)}
              disabled={saving || docUploadedCount === 0}
              className="flex min-h-[44px] items-center gap-2 rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground hover:bg-primary-hover focus-ring disabled:opacity-60"
            >
              {saving ? <Spinner /> : null}
              {saving ? "Submitting…" : "Submit for approval"}
            </button>
          </div>
        ) : null}
      </div>
    </section>
  );
}
