"use client";

import { useId, useState, type DragEvent } from "react";
import { AlertCircle, CheckCircle2, Loader2, UploadCloud } from "lucide-react";
import type { Dataset } from "@/lib/contract";
import { UPLOAD_LIMITS } from "@/lib/datasource";
import { cn } from "@/lib/utils";

/** UI_SPEC UploadDropzone states. */
export type UploadState =
  | { kind: "idle" }
  | { kind: "dragging" }
  | { kind: "uploading"; fileName: string }
  | { kind: "error"; message: string }
  | { kind: "done"; fileName: string; dataset: Dataset };

export interface UploadDropzoneProps {
  onUpload: (file: File) => Promise<Dataset>;
  /** In mock mode the file is matched to the closest demo dataset; say so instead of implying it was analysed. */
  mockMode: boolean;
}

/** Client-side check mirroring POST /api/datasets limits, so bad files fail before upload. */
export function validateUpload(file: File): string | undefined {
  const name = file.name.toLowerCase();
  if (!UPLOAD_LIMITS.extensions.some((ext) => name.endsWith(ext))) return "Only .csv and .xlsx files are supported.";
  if (file.size > UPLOAD_LIMITS.maxBytes) return "Files must be 20 MB or smaller.";
  return undefined;
}

export function UploadDropzone({ onUpload, mockMode }: UploadDropzoneProps) {
  const inputId = useId();
  const hintId = useId();
  const [state, setState] = useState<UploadState>({ kind: "idle" });
  const busy = state.kind === "uploading";

  const handle = async (file: File | undefined) => {
    if (!file || busy) return;
    const invalid = validateUpload(file);
    if (invalid) return setState({ kind: "error", message: invalid });
    setState({ kind: "uploading", fileName: file.name });
    try {
      const dataset = await onUpload(file);
      setState({ kind: "done", fileName: file.name, dataset });
    } catch (err) {
      setState({ kind: "error", message: err instanceof Error ? err.message : "The upload failed." });
    }
  };

  const onDrop = (e: DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    void handle(e.dataTransfer.files[0]);
  };
  const onDragOver = (e: DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    if (!busy && state.kind !== "dragging") setState({ kind: "dragging" });
  };

  return (
    <div className="flex flex-col gap-1.5">
      <label
        htmlFor={inputId}
        onDrop={onDrop}
        onDragOver={onDragOver}
        onDragLeave={() => state.kind === "dragging" && setState({ kind: "idle" })}
        data-state={state.kind}
        className={cn(
          "flex cursor-pointer flex-col items-center gap-1 rounded-xl border-2 border-dashed p-4 text-center text-sm",
          "has-focus-visible:border-ring has-focus-visible:ring-3 has-focus-visible:ring-ring/50",
          state.kind === "dragging" ? "border-primary bg-primary/5" : "border-input hover:bg-muted",
          busy && "cursor-wait opacity-70",
        )}
      >
        <UploadCloud className="size-6 text-muted-foreground" aria-hidden />
        <span className="font-medium">{state.kind === "dragging" ? "Drop the file to upload" : "Upload a file"}</span>
        <span id={hintId} className="text-xs text-muted-foreground">
          Drag a .csv or .xlsx file here, or press to browse. Up to 20 MB.
        </span>
        <input
          id={inputId}
          type="file"
          accept={UPLOAD_LIMITS.extensions.join(",")}
          aria-describedby={hintId}
          disabled={busy}
          className="sr-only"
          onChange={(e) => {
            void handle(e.target.files?.[0]);
            e.target.value = "";
          }}
        />
      </label>
      <UploadStatus state={state} mockMode={mockMode} />
    </div>
  );
}

function UploadStatus({ state, mockMode }: { state: UploadState; mockMode: boolean }) {
  return (
    <div role="status" aria-live="polite" className="text-xs">
      {state.kind === "uploading" && (
        <span className="flex flex-col gap-1">
          <span className="flex items-center gap-1">
            <Loader2 className="size-3.5 animate-spin motion-reduce:animate-none" aria-hidden />
            Uploading {state.fileName}…
          </span>
          <progress aria-label={`Uploading ${state.fileName}`} className="h-1 w-full accent-primary" />
        </span>
      )}
      {state.kind === "error" && (
        <span className="flex items-center gap-1 text-destructive">
          <AlertCircle className="size-3.5 shrink-0" aria-hidden />
          Error: {state.message}
        </span>
      )}
      {state.kind === "done" && (
        <span className="flex items-start gap-1">
          <CheckCircle2 className="mt-0.5 size-3.5 shrink-0 text-primary" aria-hidden />
          {mockMode
            ? `Demo mode: ${state.fileName} was not analysed. Showing the closest demo dataset, ${state.dataset.name}.`
            : `Uploaded ${state.fileName}.`}
        </span>
      )}
    </div>
  );
}
