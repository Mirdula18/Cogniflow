import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type { Run, RunEvent } from "@/lib/contract";
import { fromStored, HISTORY_STORAGE_KEY, HISTORY_VERSION, toStored } from "./history";
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
  /** Replay: empties the run's view; the stored run and its events are untouched. */
  resetView: (runId: string) => void;
  /** Replay: folds one stored event into the view only. */
  replayEvent: (runId: string, event: RunEvent) => void;
  /** Removes all runs (history) but keeps the selected dataset. */
  clearRuns: () => void;
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

/**
 * Finished runs and the selected dataset persist in sessionStorage (T19), so
 * history survives a reload but not closing the tab. Hydration is manual
 * (`useRunStore.persist.rehydrate()` after mount) to keep SSR output stable.
 */
export const useRunStore = create<RunStoreState>()(
  persist(
    (set) => ({
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
      resetView: (runId) =>
        set((s) => (s.runs[runId] ? { views: { ...s.views, [runId]: initialRunView(runId) } } : s)),
      replayEvent: (runId, event) =>
        set((s) => {
          const view = s.views[runId];
          if (!view) return s;
          const next = reduceRunEvent(view, event);
          return next === view ? s : { views: { ...s.views, [runId]: next } };
        }),
      clearRuns: () => set({ activeRunId: null, runs: {}, views: {} }),
      reset: () => set(empty),
    }),
    {
      name: HISTORY_STORAGE_KEY,
      version: HISTORY_VERSION,
      storage: createJSONStorage(() => sessionStorage),
      skipHydration: true,
      partialize: (s) => toStored(s),
      merge: (persisted, current) => ({ ...current, ...fromStored(persisted) }),
    },
  ),
);

export const selectRunView =
  (runId: string | null | undefined) =>
  (state: RunStoreState): RunView | undefined =>
    runId ? state.views[runId] : undefined;
