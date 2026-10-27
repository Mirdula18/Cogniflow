import { CONTRACT_VERSION, parseRunEvent, type RunEvent } from "@/lib/contract";
import type { ScenarioFile } from "./scenarioFile";

export type SleepFn = (ms: number, signal?: AbortSignal) => Promise<void>;

/** setTimeout-based sleep that rejects when the signal aborts. */
export const sleep: SleepFn = (ms, signal) =>
  new Promise((resolve, reject) => {
    if (signal?.aborted) return reject(signal.reason);
    const timer = setTimeout(resolve, ms);
    signal?.addEventListener(
      "abort",
      () => {
        clearTimeout(timer);
        reject(signal.reason);
      },
      { once: true },
    );
  });

export interface PlayOptions {
  runId: string;
  signal?: AbortSignal;
  /** Playback speed multiplier; 2 halves every delay. Default 1. */
  speed?: number;
  sleep?: SleepFn;
  now?: () => Date;
}

/**
 * Replays a scenario like an SSE stream: waits each event's `delay_ms`, then fills
 * contract_version, run_id and ts and yields the Zod-validated event.
 * Stops quietly when the signal aborts.
 */
export async function* playScenario(scenario: ScenarioFile, options: PlayOptions): AsyncGenerator<RunEvent> {
  const { runId, signal, speed = 1, sleep: wait = sleep, now = () => new Date() } = options;
  if (!(speed > 0)) throw new Error(`playScenario: speed must be > 0, got ${speed}`);

  for (const event of scenario.events) {
    try {
      await wait((event.delay_ms ?? 0) / speed, signal);
    } catch (error) {
      if (signal?.aborted) return;
      throw error;
    }
    if (signal?.aborted) return;
    yield parseRunEvent({ ...event, contract_version: CONTRACT_VERSION, run_id: runId, ts: now().toISOString() });
  }
}
