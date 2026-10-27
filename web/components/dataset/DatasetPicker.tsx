"use client";

import { useId } from "react";
import { AlertCircle } from "lucide-react";
import type { Dataset } from "@/lib/contract";
import type { LoadStatus } from "@/hooks/useDatasets";

export interface DatasetPickerProps {
  datasets: Dataset[];
  status: LoadStatus;
  error?: string;
  value: string | null;
  onChange: (datasetId: string) => void;
}

const count = new Intl.NumberFormat("en-IN");

export function datasetLabel(d: Dataset): string {
  const origin = d.source === "demo" ? "demo" : "uploaded";
  return `${d.name} (${count.format(d.rows)} rows × ${d.columns} cols, ${origin})`;
}

/** Native select: keyboard and screen-reader support come for free. */
export function DatasetPicker({ datasets, status, error, value, onChange }: DatasetPickerProps) {
  const selectId = useId();
  const hintId = useId();
  const empty = status === "ready" && datasets.length === 0;
  const hint =
    status === "loading" ? "Loading datasets…" : empty ? "No datasets yet. Upload a CSV or Excel file below." : undefined;

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={selectId} className="text-sm font-medium">
        Dataset
      </label>
      <select
        id={selectId}
        value={value ?? ""}
        onChange={(e) => e.target.value && onChange(e.target.value)}
        disabled={status !== "ready" || empty}
        aria-describedby={hint ? hintId : undefined}
        className="h-9 w-full rounded-lg border border-input bg-background px-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-50"
      >
        <option value="" disabled>
          Choose a dataset
        </option>
        {datasets.map((d) => (
          <option key={d.id} value={d.id}>
            {datasetLabel(d)}
          </option>
        ))}
      </select>
      {hint && (
        <p id={hintId} className="text-xs text-muted-foreground">
          {hint}
        </p>
      )}
      {status === "error" && (
        <p role="alert" className="flex items-center gap-1 text-xs text-destructive">
          <AlertCircle className="size-3.5 shrink-0" aria-hidden />
          Error: {error ?? "Datasets could not be loaded"}
        </p>
      )}
    </div>
  );
}
