import { z } from "zod";
import { RunSchema, type Run, type RunStatus } from "@/lib/contract";
import { deriveRunView, type RunView } from "./runView";

/** Bump when the stored shape changes; older stored history is then dropped. */
export const HISTORY_VERSION = 1;
export const HISTORY_STORAGE_KEY = "cogniflow-run-history";
/** Keeps storage small; oldest runs are dropped first. */
export const MAX_STORED_RUNS = 50;

const FINAL: readonly RunStatus[] = ["succeeded", "failed", "not_verified"];

export const isFinished = (run: Pick<Run, "status">) => FINAL.includes(run.status);

export interface StoredHistory {
  activeDatasetId: string | null;
  runs: Record<string, Run>;
}

/**
 * What survives a reload: finished runs only (a half-streamed run cannot resume
 * in mock mode), newest MAX_STORED_RUNS, plus the selected dataset.
 */
export function toStored(state: StoredHistory): StoredHistory {
  const finished = Object.values(state.runs)
    .filter(isFinished)
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
    .slice(0, MAX_STORED_RUNS);
  return { activeDatasetId: state.activeDatasetId, runs: Object.fromEntries(finished.map((r) => [r.id, r])) };
}

const StoredShape = z.object({
  activeDatasetId: z.string().nullable().catch(null),
  runs: z.record(z.string(), z.unknown()).catch({}),
});

/**
 * Reads stored history defensively: every run is re-validated against the
 * contract and invalid ones are dropped, then views are rebuilt from events.
 */
export function fromStored(raw: unknown): StoredHistory & { views: Record<string, RunView> } {
  const parsed = StoredShape.safeParse(raw);
  if (!parsed.success) return { activeDatasetId: null, runs: {}, views: {} };

  const runs: Record<string, Run> = {};
  const views: Record<string, RunView> = {};
  for (const value of Object.values(parsed.data.runs)) {
    const run = RunSchema.safeParse(value);
    if (!run.success || !isFinished(run.data)) continue;
    runs[run.data.id] = run.data;
    views[run.data.id] = deriveRunView(run.data.id, run.data.events);
  }
  return { activeDatasetId: parsed.data.activeDatasetId, runs, views };
}

/** Wall-clock time from run_started to run_finished, in ms; undefined if either is missing. */
export function runDurationMs(run: Run): number | undefined {
  const start = run.events.find((e) => e.type === "run_started");
  const end = run.events.findLast((e) => e.type === "run_finished");
  if (!start || !end) return undefined;
  return Math.max(0, Date.parse(end.ts) - Date.parse(start.ts));
}
