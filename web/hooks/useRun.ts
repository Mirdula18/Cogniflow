"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { cancelReplay } from "@/lib/store/replay";
import { selectRunView, useRunStore } from "@/lib/store/runStore";
import type { RunView } from "@/lib/store/runView";
import { useDataSource } from "./useDataSource";

export type RunPhase = "idle" | "starting" | "streaming";

export interface UseRunResult {
  runId: string | null;
  view: RunView | undefined;
  /** E.g. "Showing closest demo scenario…" from the adapter. */
  notice: string | undefined;
  error: string | undefined;
  /** "starting" until the adapter returns a run id, then "streaming" until the stream ends. */
  phase: RunPhase;
  /** True from submit until the stream ends. */
  isActive: boolean;
  start: (datasetId: string, question: string) => Promise<void>;
  cancel: () => void;
}

/** Starts a run through the DataSource and streams its events into the runStore. */
export function useRun(): UseRunResult {
  const source = useDataSource();
  const runId = useRunStore((s) => s.activeRunId);
  const view = useRunStore(selectRunView(runId));
  const [notice, setNotice] = useState<string>();
  const [error, setError] = useState<string>();
  const [phase, setPhase] = useState<RunPhase>("idle");
  const controllerRef = useRef<AbortController | null>(null);

  useEffect(() => () => controllerRef.current?.abort(), []);

  const cancel = useCallback(() => {
    controllerRef.current?.abort();
    controllerRef.current = null;
    setPhase("idle");
  }, []);

  const start = useCallback(
    async (datasetId: string, question: string) => {
      controllerRef.current?.abort();
      cancelReplay();
      const controller = new AbortController();
      controllerRef.current = controller;
      setError(undefined);
      setNotice(undefined);
      setPhase("starting");
      try {
        const result = await source.startRun({ datasetId, question });
        const store = useRunStore.getState();
        store.registerRun({ id: result.runId, dataset_id: datasetId, question, created_at: new Date().toISOString() });
        store.setActiveRun(result.runId);
        setNotice(result.notice);
        setPhase("streaming");
        for await (const event of source.streamRun(result.runId, { signal: controller.signal })) {
          useRunStore.getState().appendEvent(result.runId, event);
        }
      } catch (err) {
        if (!controller.signal.aborted) setError(err instanceof Error ? err.message : "The run could not be started");
      } finally {
        if (controllerRef.current === controller) {
          controllerRef.current = null;
          setPhase("idle");
        }
      }
    },
    [source],
  );

  return { runId, view, notice, error, phase, isActive: phase !== "idle", start, cancel };
}

/** Read-only view of the active run, for components that only display it. */
export function useActiveRunView(): RunView | undefined {
  const runId = useRunStore((s) => s.activeRunId);
  return useRunStore(selectRunView(runId));
}
