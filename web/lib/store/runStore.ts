import { create } from "zustand";
import type { Run, RunEvent } from "@/lib/contract";
import { deriveRunView, initialRunView, reduceRunEvent, type RunView } from "./runView";

export interface RunMeta {
  id: string;
  dataset_id: string;
  question: string;
  created_at: string;
}

export interface RunStoreState {
  activeDatasetId: string | null;
  /** The run shown in the run view. */
  activeRunId: string | null;
  runs: Record<string, Run>;
  /** Derived from `runs[id].events`; kept in the store so selectors return stable references. */
  views: Record<string, RunView>;
  setActiveDataset: (datasetId: string | null) => void;
  setActiveRun: (runId: string | null) => void;
  /** Registers a new, empty run (status "queued"). */
  registerRun: (meta: RunMeta) => void;
  /** Appends one event; duplicate or stale `seq` values are ignored. */
  appendEvent: (runId: string, event: RunEvent) => void;
  /** Loads a stored run and rebuilds its view from its events. */
  loadRun: (run: Run) => void;
  reset: () => void;
}

/** Pure: applies one event to the run and its view. Exported for tests. */
export function appendEventToState(
  state: Pick<RunStoreState, "runs" | "views">,
  runId: string,
  event: RunEvent,
): Pick<RunStoreState, "runs" | "views"> {
  const run = state.runs[runId];
  if (!run) throw new Error(`appendEvent: unknown run "${runId}"`);
  if (event.run_id !== runId) throw new Error(`appendEvent: event for "${event.run_id}" sent to "${runId}"`);

  const view = state.views[runId] ?? initialRunView(runId);
  const nextView = reduceRunEvent(view, event);
  if (nextView === view) return state;

  return {
    runs: { ...state.runs, [runId]: { ...run, status: nextView.status, events: [...run.events, event] } },
    views: { ...state.views, [runId]: nextView },
  };
}

const empty = { activeDatasetId: null, activeRunId: null, runs: {}, views: {} };

export const useRunStore = create<RunStoreState>()((set) => ({
  ...empty,
  setActiveDataset: (activeDatasetId) => set({ activeDatasetId }),
  setActiveRun: (activeRunId) => set({ activeRunId }),
  registerRun: (meta) =>
    set((s) => ({
      runs: { ...s.runs, [meta.id]: { ...meta, status: "queued", events: [] } },
      views: { ...s.views, [meta.id]: initialRunView(meta.id) },
    })),
  appendEvent: (runId, event) => set((s) => appendEventToState(s, runId, event)),
  loadRun: (run) =>
    set((s) => {
      const view = deriveRunView(run.id, run.events);
      return {
        runs: { ...s.runs, [run.id]: { ...run, status: run.events.length ? view.status : run.status } },
        views: { ...s.views, [run.id]: view },
      };
    }),
  reset: () => set(empty),
}));

export const selectRunView =
  (runId: string | null | undefined) =>
  (state: RunStoreState): RunView | undefined =>
    runId ? state.views[runId] : undefined;
