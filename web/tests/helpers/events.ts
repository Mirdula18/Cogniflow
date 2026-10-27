import { parseRunEvent, type RunEvent } from "@/lib/contract";

type DistributiveOmit<T, K extends PropertyKey> = T extends unknown ? Omit<T, K> : never;
export type EventInput = DistributiveOmit<RunEvent, "contract_version" | "run_id" | "seq" | "ts">;

/** Builds contract-valid events with sequential `seq`, validated through Zod. */
export function buildEvents(runId: string, inputs: EventInput[]): RunEvent[] {
  return inputs.map((input, i) =>
    parseRunEvent({
      ...input,
      contract_version: 1,
      run_id: runId,
      seq: i + 1,
      ts: new Date(Date.UTC(2026, 9, 27, 10, 0, i)).toISOString(),
    }),
  );
}

export const retryPathInputs: EventInput[] = [
  { type: "run_started", question: "Which region's revenue fell most?" },
  { type: "plan", steps: [{ id: "s1", goal: "Parse revenue text" }, { id: "s2", goal: "Compare quarters" }] },
  { type: "step_started", step_id: "s1", attempt: 1 },
  { type: "code", step_id: "s1", attempt: 1, language: "python", source: "df['revenue'].astype(float)" },
  { type: "error", step_id: "s1", attempt: 1, error_type: "ValueError", message: "could not convert" },
  { type: "retry", step_id: "s1", next_attempt: 2, reason: "Strip currency symbol" },
  { type: "step_started", step_id: "s1", attempt: 2 },
  { type: "code", step_id: "s1", attempt: 2, language: "python", source: "parse(df['revenue'])" },
  { type: "stdout", step_id: "s1", text: "Parsed 1200 values" },
  { type: "step_finished", step_id: "s1", status: "ok" },
  { type: "step_started", step_id: "s2", attempt: 1 },
  { type: "stdout", step_id: "s2", text: "South fell 12.5%" },
  { type: "artifact", step_id: "s2", kind: "metric", title: "Largest fall", payload: { name: "fall_pct", value: 12.5, unit: "%" } },
  { type: "step_finished", step_id: "s2", status: "ok" },
  { type: "report", markdown: "South fell 12.5%.", cited_metrics: ["fall_pct"] },
  { type: "run_finished", status: "succeeded" },
];

export const notVerifiedInputs: EventInput[] = [
  { type: "run_started", question: "Who is over-allocated?" },
  { type: "plan", steps: [{ id: "s1", goal: "Remove duplicate people" }] },
  ...[1, 2, 3].flatMap((attempt): EventInput[] => [
    { type: "step_started", step_id: "s1", attempt },
    { type: "code", step_id: "s1", attempt, language: "python", source: `dedupe_v${attempt}(df)` },
    { type: "error", step_id: "s1", attempt, error_type: "AmbiguousIdError", message: `attempt ${attempt} failed` },
    ...(attempt < 3
      ? [{ type: "retry", step_id: "s1", next_attempt: attempt + 1, reason: "Try another key" } as EventInput]
      : []),
  ]),
  { type: "step_finished", step_id: "s1", status: "failed" },
  { type: "run_finished", status: "not_verified" },
];
