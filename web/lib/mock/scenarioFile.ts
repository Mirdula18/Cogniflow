import { z } from "zod";
import { CONTRACT_VERSION, DatasetProfileSchema, RunEventSchema, type RunEvent } from "@/lib/contract";

type DistributiveOmit<T, K extends PropertyKey> = T extends unknown ? Omit<T, K> : never;

/** A scenario event: a RunEvent without the fields the player fills at replay time. */
export type ScenarioEvent = DistributiveOmit<RunEvent, "contract_version" | "run_id" | "ts">;

export interface ScenarioFile {
  scenario_id: string;
  dataset_id: string;
  question: string;
  events: ScenarioEvent[];
}

/** File shape from docs/MOCK_SCENARIOS.md; event bodies are checked against the contract below. */
const ScenarioFileShape = z.object({
  scenario_id: z.string().min(1),
  dataset_id: z.string().min(1),
  question: z.string().min(1),
  events: z.array(z.looseObject({ seq: z.number(), type: z.string() })).min(1),
});

/** `lib/mock/datasets/<id>.profile.json`: a DatasetProfile plus an optional display name. */
export const DemoDatasetFileSchema = DatasetProfileSchema.extend({ name: z.string().min(1).optional() });
export type DemoDatasetFile = z.infer<typeof DemoDatasetFileSchema>;

const PLACEHOLDER = { contract_version: CONTRACT_VERSION, run_id: "validation", ts: "2000-01-01T00:00:00Z" };

/**
 * Validates a scenario file: every event must be a contract-valid RunEvent once the
 * player fills run_id/ts/contract_version; seq must run 1, 2, 3…; the run must start
 * with run_started and end with run_finished. Throws with the scenario id and seq on failure.
 */
export function parseScenarioFile(input: unknown): ScenarioFile {
  const file = ScenarioFileShape.parse(input);
  const label = `scenario ${file.scenario_id}`;

  const events = file.events.map((raw, i) => {
    if (raw.seq !== i + 1) throw new Error(`${label}: expected seq ${i + 1}, got ${raw.seq}`);
    const result = RunEventSchema.safeParse({ ...raw, ...PLACEHOLDER });
    if (!result.success) {
      throw new Error(`${label}: event seq ${raw.seq} (${raw.type}) is invalid: ${z.prettifyError(result.error)}`);
    }
    const { contract_version: _v, run_id: _r, ts: _t, ...event } = result.data;
    return event as ScenarioEvent;
  });

  if (events[0]?.type !== "run_started") throw new Error(`${label}: first event must be run_started`);
  if (events.at(-1)?.type !== "run_finished") throw new Error(`${label}: last event must be run_finished`);

  return { ...file, events };
}

/** Total scripted replay time at speed 1. */
export function totalDelayMs(scenario: ScenarioFile): number {
  return scenario.events.reduce((sum, e) => sum + (e.delay_ms ?? 0), 0);
}
