import { z } from "zod";
import { DatasetProfileSchema } from "./dataset";

/** Mirrors the `RunEvent` union in docs/API_CONTRACT.md. */

export const CONTRACT_VERSION = 1 as const;

export const AttemptSchema = z.number().int().min(1).max(3);

const EventBase = {
  contract_version: z.literal(CONTRACT_VERSION),
  run_id: z.string().min(1),
  seq: z.number().int().positive(),
  ts: z.iso.datetime({ offset: true }),
  /** Mock-only replay delay; ignored by live mode. */
  delay_ms: z.number().int().nonnegative().optional(),
};

export const PlanStepSchema = z.object({
  id: z.string().min(1),
  goal: z.string().min(1),
});
export type PlanStep = z.infer<typeof PlanStepSchema>;

export const CellSchema = z.union([z.string(), z.number(), z.boolean(), z.null()]);
export type Cell = z.infer<typeof CellSchema>;

/** Plotly figure JSON: `data` traces plus optional `layout`. */
export const ChartPayloadSchema = z.object({
  data: z.array(z.record(z.string(), z.unknown())),
  layout: z.record(z.string(), z.unknown()).optional(),
});
export type ChartPayload = z.infer<typeof ChartPayloadSchema>;

/** Table rows are arrays of cells aligned with `columns`; at most 100 rows. */
export const TablePayloadSchema = z
  .object({
    columns: z.array(z.string()).min(1),
    rows: z.array(z.array(CellSchema)).max(100),
  })
  .refine((t) => t.rows.every((r) => r.length === t.columns.length), {
    message: "every table row must have one cell per column",
  });
export type TablePayload = z.infer<typeof TablePayloadSchema>;

export const MetricPayloadSchema = z.object({
  name: z.string().min(1),
  value: z.union([z.number(), z.string()]),
  unit: z.string().optional(),
});
export type MetricPayload = z.infer<typeof MetricPayloadSchema>;

const ArtifactBase = { ...EventBase, type: z.literal("artifact"), step_id: z.string().min(1), title: z.string() };

export const ArtifactEventSchema = z.discriminatedUnion("kind", [
  z.object({ ...ArtifactBase, kind: z.literal("chart"), payload: ChartPayloadSchema }),
  z.object({ ...ArtifactBase, kind: z.literal("table"), payload: TablePayloadSchema }),
  z.object({ ...ArtifactBase, kind: z.literal("metric"), payload: MetricPayloadSchema }),
]);
export type ArtifactEvent = z.infer<typeof ArtifactEventSchema>;

export const RunStartedEventSchema = z.object({
  ...EventBase,
  type: z.literal("run_started"),
  question: z.string().min(1),
});
export const ProfileEventSchema = z.object({
  ...EventBase,
  type: z.literal("profile"),
  profile: DatasetProfileSchema,
});
export const PlanEventSchema = z.object({
  ...EventBase,
  type: z.literal("plan"),
  steps: z.array(PlanStepSchema).min(1),
});
export const StepStartedEventSchema = z.object({
  ...EventBase,
  type: z.literal("step_started"),
  step_id: z.string().min(1),
  attempt: AttemptSchema,
});
export const CodeEventSchema = z.object({
  ...EventBase,
  type: z.literal("code"),
  step_id: z.string().min(1),
  attempt: AttemptSchema,
  language: z.literal("python"),
  source: z.string(),
});
export const StdoutEventSchema = z.object({
  ...EventBase,
  type: z.literal("stdout"),
  step_id: z.string().min(1),
  text: z.string(),
});
export const ErrorEventSchema = z.object({
  ...EventBase,
  type: z.literal("error"),
  step_id: z.string().min(1),
  attempt: AttemptSchema,
  error_type: z.string().min(1),
  message: z.string(),
});
export const RetryEventSchema = z.object({
  ...EventBase,
  type: z.literal("retry"),
  step_id: z.string().min(1),
  next_attempt: z.number().int().min(2).max(3),
  reason: z.string(),
});
export const StepFinishedEventSchema = z.object({
  ...EventBase,
  type: z.literal("step_finished"),
  step_id: z.string().min(1),
  status: z.enum(["ok", "failed"]),
});
export const ReportEventSchema = z.object({
  ...EventBase,
  type: z.literal("report"),
  markdown: z.string(),
  cited_metrics: z.array(z.string()),
});
export const RunFinishedEventSchema = z.object({
  ...EventBase,
  type: z.literal("run_finished"),
  status: z.enum(["succeeded", "failed", "not_verified"]),
});

// z.discriminatedUnion needs unique discriminator values, so the artifact
// variants (which share type "artifact") are nested as one union member.
export const RunEventSchema = z.union([
  z.discriminatedUnion("type", [
    RunStartedEventSchema,
    ProfileEventSchema,
    PlanEventSchema,
    StepStartedEventSchema,
    CodeEventSchema,
    StdoutEventSchema,
    ErrorEventSchema,
    RetryEventSchema,
    StepFinishedEventSchema,
    ReportEventSchema,
    RunFinishedEventSchema,
  ]),
  ArtifactEventSchema,
]);
export type RunEvent = z.infer<typeof RunEventSchema>;
export type RunEventType = RunEvent["type"];
export type RunEventOf<T extends RunEventType> = Extract<RunEvent, { type: T }>;

/** Parse an unknown payload (e.g. an SSE `data:` frame) into a RunEvent; throws on mismatch. */
export function parseRunEvent(input: unknown): RunEvent {
  return RunEventSchema.parse(input);
}
