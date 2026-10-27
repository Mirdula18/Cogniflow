"use client";

import { useState } from "react";
import { AlertCircle, Info } from "lucide-react";
import { useRun } from "@/hooks/useRun";
import { useSuggestedQuestions } from "@/hooks/useSuggestedQuestions";
import { QueryBox, type QueryBoxStatus } from "./QueryBox";
import { SuggestedQuestions } from "./SuggestedQuestions";

export interface QueryPanelProps {
  datasetId: string | null;
}

/** QueryBox + SuggestedQuestions wired to useRun. Mounted by the workspace RUN panel. */
export function QueryPanel({ datasetId }: QueryPanelProps) {
  const [value, setValue] = useState("");
  const suggestions = useSuggestedQuestions(datasetId);
  const { start, isActive, phase, notice, error } = useRun();

  const status: QueryBoxStatus = phase === "starting" ? "submitting" : phase === "streaming" ? "running" : "idle";

  const ask = (question: string) => {
    if (!datasetId) return;
    setValue(question);
    void start(datasetId, question);
  };

  return (
    <div className="flex flex-col gap-3">
      <QueryBox
        value={value}
        onChange={setValue}
        onSubmit={ask}
        status={status}
        disabled={!datasetId}
        disabledReason="Pick a dataset first."
      />
      <SuggestedQuestions questions={suggestions} onSelect={ask} disabled={!datasetId || isActive} />
      {notice && (
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <Info className="size-4 shrink-0" aria-hidden />
          {notice}
        </p>
      )}
      {error && (
        <p role="alert" className="flex items-center gap-2 text-sm text-destructive">
          <AlertCircle className="size-4 shrink-0" aria-hidden />
          Error: {error}
        </p>
      )}
    </div>
  );
}
