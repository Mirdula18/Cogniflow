"use client";

import { useEffect, useState } from "react";
import { useDataSource } from "./useDataSource";

/** Suggested questions for a dataset; empty while loading or when the adapter has none. */
export function useSuggestedQuestions(datasetId: string | null): string[] {
  const source = useDataSource();
  const [result, setResult] = useState<{ datasetId: string; questions: string[] } | null>(null);

  useEffect(() => {
    if (!datasetId || !source.suggestQuestions) return;
    let cancelled = false;
    source.suggestQuestions(datasetId).then(
      (questions) => !cancelled && setResult({ datasetId, questions }),
      () => !cancelled && setResult({ datasetId, questions: [] }),
    );
    return () => {
      cancelled = true;
    };
  }, [source, datasetId]);

  return result && result.datasetId === datasetId ? result.questions : [];
}
