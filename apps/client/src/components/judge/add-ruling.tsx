"use client";
import * as React from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Plus, X } from "lucide-react";
import { api, ApiError } from "../../lib/api";
import { Modal, Spinner, StatusBadge } from "../ui/primitives";
import { NigerianLiiButton, KIND_LABEL, type Citation, type CitationKind } from "./citation";

const emptyCitation: Citation = { kind: "case", citation: "", note: "" };

export function AddRulingButton({ caseId }: { caseId: string }) {
  const qc = useQueryClient();
  const [open, setOpen] = React.useState(false);
  const [title, setTitle] = React.useState("");
  const [body, setBody] = React.useState("");
  const [citations, setCitations] = React.useState<Citation[]>([]);
  const [rulingId, setRulingId] = React.useState<string | null>(null);
  const [publishedAt, setPublishedAt] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [saving, setSaving] = React.useState<"draft" | "publish" | null>(null);

  const reset = () => {
    setTitle("");
    setBody("");
    setCitations([]);
    setRulingId(null);
    setPublishedAt(null);
    setError(null);
  };

  function updateCitation(index: number, patch: Partial<Citation>) {
    setCitations((prev) => prev.map((c, i) => (i === index ? { ...c, ...patch } : c)));
  }

  function addCitation() {
    setCitations((prev) => [...prev, { ...emptyCitation }]);
  }

  function removeCitation(index: number) {
    setCitations((prev) => prev.filter((_, i) => i !== index));
  }

  /** Strip empties client-side; the server re-sanitizes anyway. */
  function cleanCitations(): Citation[] {
    return citations
      .map((c) => ({
        kind: c.kind,
        citation: c.citation.trim(),
        ...(c.note && c.note.trim() ? { note: c.note.trim() } : {}),
      }))
      .filter((c) => c.citation.length >= 3);
  }

  async function save(mode: "draft" | "publish") {
    if (title.trim().length < 3) return setError("Title must be at least 3 characters.");
    if (body.trim().length < 20) return setError("Ruling body must be at least 20 characters.");
    setSaving(mode);
    setError(null);
    try {
      const payload = {
        title: title.trim(),
        body: body.trim(),
        citations: cleanCitations(),
      };
      let id = rulingId;
      if (!id) {
        const r = await api.post<{ id: string }>(`/cases/${caseId}/rulings`, payload);
        id = r.id;
        setRulingId(r.id);
      } else {
        await api.patch(`/cases/${caseId}/rulings/${id}`, payload);
      }
      if (mode === "publish") {
        await api.post(`/cases/${caseId}/rulings/${id}/publish`);
        setPublishedAt(new Date().toISOString());
      }
      await Promise.all([
        qc.invalidateQueries({ queryKey: ["case-rulings", caseId] }),
        qc.invalidateQueries({ queryKey: ["case-timeline", caseId] }),
        qc.invalidateQueries({ queryKey: ["case", caseId] }),
      ]);
      if (mode === "publish") {
        window.setTimeout(() => {
          reset();
          setOpen(false);
        }, 900);
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not save this ruling.");
    } finally {
      setSaving(null);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex min-h-[44px] items-center gap-2 rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground shadow-e1 hover:bg-primary-hover focus-ring"
      >
        <Plus size={16} aria-hidden="true" />
        Draft ruling
      </button>

      <Modal
        open={open}
        title={publishedAt ? "Ruling published" : rulingId ? "Edit ruling" : "New ruling"}
        description={
          publishedAt
            ? "The published ruling is now immutable and visible to the parties."
            : "Save as draft to continue later, or publish to finalize. Published rulings cannot be edited."
        }
        onClose={() => {
          if (saving) return;
          reset();
          setOpen(false);
        }}
        size="lg"
        footer={
          publishedAt ? (
            <button
              type="button"
              onClick={() => {
                reset();
                setOpen(false);
              }}
              className="min-h-[44px] rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground hover:bg-primary-hover focus-ring"
            >
              Done
            </button>
          ) : (
            <>
              <button
                type="button"
                onClick={() => save("draft")}
                disabled={saving !== null}
                className="flex min-h-[44px] items-center gap-2 rounded-md border border-border bg-surface-page px-4 text-sm font-medium text-text-primary hover:bg-surface-subtle focus-ring disabled:opacity-60"
              >
                {saving === "draft" ? <Spinner /> : null}
                {saving === "draft" ? "Saving…" : rulingId ? "Save changes" : "Save draft"}
              </button>
              <button
                type="button"
                onClick={() => save("publish")}
                disabled={saving !== null}
                className="flex min-h-[44px] items-center gap-2 rounded-md bg-status-approved-fg px-4 text-sm font-semibold text-surface-page hover:opacity-90 focus-ring disabled:opacity-60"
              >
                {saving === "publish" ? <Spinner /> : null}
                {saving === "publish" ? "Publishing…" : "Publish (immutable)"}
              </button>
            </>
          )
        }
      >
        {publishedAt ? (
          <div className="space-y-3">
            <StatusBadge status="PUBLISHED" />
            <p className="text-sm text-text-secondary">
              The ruling has been published and locked. It is now part of the case record.
            </p>
          </div>
        ) : (
          <div className="space-y-5">
            <div>
              <label htmlFor="ruling-title" className="text-xs font-semibold uppercase tracking-wide text-text-muted">
                Title
              </label>
              <input
                id="ruling-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="mt-1 min-h-[44px] w-full rounded-md border border-border bg-surface-page px-3 text-sm text-text-primary focus-ring"
                placeholder="e.g. Ruling on application for adjournment"
              />
            </div>

            <div>
              <label htmlFor="ruling-body" className="text-xs font-semibold uppercase tracking-wide text-text-muted">
                Ruling body
              </label>
              <textarea
                id="ruling-body"
                value={body}
                onChange={(e) => setBody(e.target.value)}
                rows={12}
                className="mt-1 w-full rounded-md border border-border bg-surface-page px-3 py-2 font-serif text-sm leading-relaxed text-text-primary focus-ring"
                placeholder="Set out the ruling in full."
              />
              <p className="mt-1 text-xs text-text-muted">{body.length} characters</p>
            </div>

            <div>
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-text-muted">
                  Authorities cited
                </h3>
                <p className="text-xs text-text-muted">
                  Optional. Use the NigerianLII lookup to check or confirm a citation.
                </p>
              </div>

              {citations.length === 0 ? (
                <p className="mt-2 rounded-md border border-dashed border-border bg-surface-subtle px-3 py-2 text-xs text-text-muted">
                  No authorities added. You can draft the ruling without citations and add them later.
                </p>
              ) : (
                <ul className="mt-2 space-y-2">
                  {citations.map((c, i) => (
                    <li key={i} className="rounded-md border border-border bg-surface-subtle p-3">
                      <div className="grid gap-2 sm:grid-cols-[140px_1fr_auto]">
                        <div>
                          <label htmlFor={`cit-${i}-kind`} className="text-[0.68rem] font-semibold uppercase tracking-wide text-text-muted">Kind</label>
                          <select
                            id={`cit-${i}-kind`}
                            value={c.kind}
                            onChange={(e) => updateCitation(i, { kind: e.target.value as CitationKind })}
                            className="mt-1 min-h-[44px] w-full rounded-md border border-border bg-surface-page px-2 text-sm text-text-primary focus-ring"
                          >
                            {(Object.keys(KIND_LABEL) as CitationKind[]).map((k) => (
                              <option key={k} value={k}>{KIND_LABEL[k]}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label htmlFor={`cit-${i}-value`} className="text-[0.68rem] font-semibold uppercase tracking-wide text-text-muted">Citation</label>
                          <input
                            id={`cit-${i}-value`}
                            value={c.citation}
                            onChange={(e) => updateCitation(i, { citation: e.target.value })}
                            placeholder="e.g. Amaechi v. INEC (2008) 5 NWLR (Pt 1080) 227"
                            className="mt-1 min-h-[44px] w-full rounded-md border border-border bg-surface-page px-3 font-mono text-sm text-text-primary focus-ring"
                          />
                        </div>
                        <div className="flex items-end gap-2">
                          <NigerianLiiButton query={c.citation} compact />
                          <button
                            type="button"
                            onClick={() => removeCitation(i)}
                            aria-label={`Remove citation ${i + 1}`}
                            className="flex h-11 w-11 items-center justify-center rounded-md border border-border bg-surface-page text-text-muted hover:bg-surface-subtle focus-ring"
                          >
                            <X size={16} aria-hidden="true" />
                          </button>
                        </div>
                      </div>
                      <div className="mt-2">
                        <label htmlFor={`cit-${i}-note`} className="text-[0.68rem] font-semibold uppercase tracking-wide text-text-muted">Note (optional)</label>
                        <input
                          id={`cit-${i}-note`}
                          value={c.note ?? ""}
                          onChange={(e) => updateCitation(i, { note: e.target.value })}
                          placeholder="e.g. applied; distinguished; considered"
                          className="mt-1 min-h-[44px] w-full rounded-md border border-border bg-surface-page px-3 text-sm text-text-primary focus-ring"
                        />
                      </div>
                    </li>
                  ))}
                </ul>
              )}

              <button
                type="button"
                onClick={addCitation}
                className="mt-3 inline-flex min-h-[44px] items-center gap-2 rounded-md border border-border bg-surface-page px-3 text-sm font-medium text-primary hover:bg-surface-subtle focus-ring"
              >
                <Plus size={16} aria-hidden="true" />
                Add authority
              </button>
            </div>

            {error ? (
              <p role="alert" className="rounded-md bg-status-rejected-bg px-3 py-2 text-sm text-status-rejected-fg">
                {error}
              </p>
            ) : null}
          </div>
        )}
      </Modal>
    </>
  );
}
