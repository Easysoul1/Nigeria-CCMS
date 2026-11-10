"use client";
import * as React from "react";
import { useQueryClient } from "@tanstack/react-query";
import { X } from "lucide-react";
import { Spinner } from "../ui/primitives";

type FileState = {
  id: string;
  file: File;
  status: "queued" | "uploading" | "done" | "error";
  error?: string;
};

const API_BASE = `${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000"}/api/v1`;

function readCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.split("; ").find((p) => p.startsWith(`${name}=`));
  return match ? decodeURIComponent(match.slice(name.length + 1)) : null;
}

export function FileDropzone({
  caseId,
  category = "EVIDENCE",
  onUploaded,
}: {
  caseId: string;
  category?: "PLEADING" | "EVIDENCE" | "ORDER" | "NOTE";
  onUploaded?: () => void;
}) {
  const qc = useQueryClient();
  const [files, setFiles] = React.useState<FileState[]>([]);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = React.useState(false);

  function add(list: FileList | null) {
    if (!list) return;
    const next = Array.from(list).map<FileState>((file) => ({
      id: `${file.name}-${file.size}-${file.lastModified}`,
      file,
      status: "queued",
    }));
    setFiles((prev) => [...prev, ...next]);
  }

  async function upload(fs: FileState) {
    setFiles((prev) => prev.map((f) => (f.id === fs.id ? { ...f, status: "uploading", error: undefined } : f)));
    const form = new FormData();
    form.append("file", fs.file);
    form.append("category", category);
    try {
      const csrf = readCookie("csrf_token");
      const res = await fetch(`${API_BASE}/cases/${caseId}/documents`, {
        method: "POST",
        credentials: "include",
        body: form,
        headers: csrf ? { "x-csrf-token": csrf } : undefined,
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { message?: string } | null;
        throw new Error(body?.message ?? `Upload failed (${res.status})`);
      }
      setFiles((prev) => prev.map((f) => (f.id === fs.id ? { ...f, status: "done" } : f)));
      await qc.invalidateQueries({ queryKey: ["case-docs", caseId] });
      await qc.invalidateQueries({ queryKey: ["case-timeline", caseId] });
      onUploaded?.();
    } catch (err) {
      setFiles((prev) =>
        prev.map((f) =>
          f.id === fs.id
            ? { ...f, status: "error", error: err instanceof Error ? err.message : "Upload failed" }
            : f,
        ),
      );
    }
  }

  function remove(id: string) {
    setFiles((prev) => prev.filter((f) => f.id !== id));
  }

  return (
    <div className="space-y-3">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          add(e.dataTransfer.files);
        }}
        className={`flex flex-col items-center justify-center rounded-lg border-2 border-dashed px-4 py-8 text-center transition-colors ${dragOver ? "border-primary bg-surface-tint" : "border-border bg-surface-page"}`}
      >
        <input
          ref={inputRef}
          type="file"
          multiple
          className="sr-only"
          onChange={(e) => add(e.target.files)}
        />
        <p className="text-sm font-medium text-text-primary">Drop files here</p>
        <p className="mt-1 text-xs text-text-muted">PDF, DOCX, or image · max 20 MB each</p>
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="mt-3 min-h-[44px] rounded-md border border-border bg-surface-page px-4 text-sm font-medium text-primary hover:bg-surface-subtle focus-ring"
        >
          Choose files
        </button>
      </div>

      {files.length > 0 ? (
        <ul className="space-y-2">
          {files.map((f) => (
            <li
              key={f.id}
              className="flex items-center justify-between gap-3 rounded-md border border-border bg-surface-page px-3 py-2 text-sm"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium text-text-primary">{f.file.name}</p>
                <p className="text-xs text-text-muted">
                  {(f.file.size / 1024).toFixed(0)} KB
                  {f.status === "error" && f.error ? ` · ${f.error}` : ""}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                {f.status === "queued" ? (
                  <button
                    type="button"
                    onClick={() => upload(f)}
                    className="min-h-[44px] rounded-md bg-primary px-3 text-xs font-semibold text-primary-foreground hover:bg-primary-hover focus-ring"
                  >
                    Upload
                  </button>
                ) : null}
                {f.status === "uploading" ? (
                  <span className="inline-flex items-center gap-1 text-xs text-text-secondary">
                    <Spinner /> Uploading…
                  </span>
                ) : null}
                {f.status === "done" ? (
                  <span className="text-xs font-semibold text-status-approved-fg">✓ Done</span>
                ) : null}
                {f.status === "error" ? (
                  <button
                    type="button"
                    onClick={() => upload(f)}
                    className="min-h-[44px] rounded-md border border-border px-3 text-xs font-semibold text-primary hover:bg-surface-subtle focus-ring"
                  >
                    Retry
                  </button>
                ) : null}
                <button
                  type="button"
                  onClick={() => remove(f.id)}
                  aria-label={`Remove ${f.file.name}`}
                  className="flex h-9 w-9 items-center justify-center rounded-md text-text-muted hover:bg-surface-subtle focus-ring"
                >
                  <X size={16} aria-hidden="true" />
                </button>
              </div>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
