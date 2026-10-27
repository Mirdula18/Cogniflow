import type { RunEvent } from "@/lib/contract";
import { useRunStore } from "./runStore";

/** Gaps longer than this (e.g. a slow live step) are shortened so a replay stays watchable. */
export const MAX_REPLAY_GAP_MS = 1500;

export type ReplaySleep = (ms: number, signal: AbortSignal) => Promise<void>;

const defaultSleep: ReplaySleep = (ms, signal) =>
  new Promise((resolve) => {
    const timer = setTimeout(resolve, ms);
    signal.addEventListener("abort", () => (clearTimeout(timer), resolve()), { once: true });
  });

/** Delay before each event, from the gaps between stored timestamps (first event: 0). */
export function replayDelays(events: readonly RunEvent[], maxGapMs = MAX_REPLAY_GAP_MS): number[] {
  return events.map((e, i) => {
    const prev = events[i - 1];
    if (!prev) return 0;
    const gap = Date.parse(e.ts) - Date.parse(prev.ts);
    return Number.isFinite(gap) ? Math.min(Math.max(gap, 0), maxGapMs) : 0;
  });
}

let current: AbortController | null = null;

/**
 * Replays a stored run in the workspace: selects its dataset and run, empties its
 * view, then feeds the stored events back in with their original pacing. The stored
 * run is never modified. Starting another replay cancels the previous one.
 */
export async function replayRun(runId: string, sleep: ReplaySleep = defaultSleep): Promise<void> {
  const store = useRunStore.getState();
  const run = store.runs[runId];
  if (!run) throw new Error(`replayRun: unknown run "${runId}"`);

  current?.abort();
  const controller = new AbortController();
  current = controller;

  store.setActiveDataset(run.dataset_id);
  store.setActiveRun(runId);
  store.resetView(runId);

  const events = [...run.events].sort((a, b) => a.seq - b.seq);
  const delays = replayDelays(events);
  for (const [i, event] of events.entries()) {
    await sleep(delays[i] ?? 0, controller.signal);
    if (controller.signal.aborted) return;
    useRunStore.getState().replayEvent(runId, event);
  }
  if (current === controller) current = null;
}

/** Stops a replay in progress, if any. */
export function cancelReplay(): void {
  current?.abort();
  current = null;
}
