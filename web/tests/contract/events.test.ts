import { describe, expect, it } from "vitest";
import { parseRunEvent, RunEventSchema, type RunEvent } from "@/lib/contract";

const base = { contract_version: 1, run_id: "r_01", ts: "2026-10-27T10:00:00Z" } as const;

const profile = {
  dataset_id: "ds_test",
  rows: 3,
  duplicates: 0,
  columns: [{ name: "a", dtype: "number", nulls: 0, unique: 3, sample: [1, 2, null], issues: [] }],
  head: [{ a: 1 }],
};

const validEvents = {
  run_started: { ...base, seq: 1, type: "run_started", question: "Why?" },
  profile: { ...base, seq: 2, type: "profile", profile },
  plan: { ...base, seq: 3, type: "plan", steps: [{ id: "s1", goal: "Clean dates" }] },
  step_started: { ...base, seq: 4, type: "step_started", step_id: "s1", attempt: 1 },
  code: { ...base, seq: 5, type: "code", step_id: "s1", attempt: 1, language: "python", source: "df.head()" },
  stdout: { ...base, seq: 6, type: "stdout", step_id: "s1", text: "Removed 14 duplicate rows" },
  error: { ...base, seq: 7, type: "error", step_id: "s1", attempt: 1, error_type: "ValueError", message: "bad" },
  retry: { ...base, seq: 8, type: "retry", step_id: "s1", next_attempt: 2, reason: "Strip currency symbol" },
  artifact_chart: {
    ...base,
    seq: 9,
    type: "artifact",
    step_id: "s1",
    kind: "chart",
    title: "Delay",
    payload: { data: [{ type: "bar", x: ["A"], y: [1] }], layout: { title: "Delay" } },
  },
  artifact_table: {
    ...base,
    seq: 10,
    type: "artifact",
    step_id: "s1",
    kind: "table",
    title: "Top",
    payload: { columns: ["team", "days"], rows: [["A", 3], ["B", null]] },
  },
  artifact_metric: {
    ...base,
    seq: 11,
    type: "artifact",
    step_id: "s1",
    kind: "metric",
    title: "SLA",
    payload: { name: "within_sla", value: 82.5, unit: "%" },
  },
  step_finished: { ...base, seq: 12, type: "step_finished", step_id: "s1", status: "ok" },
  report: { ...base, seq: 13, type: "report", markdown: "82.5% within SLA", cited_metrics: ["within_sla"] },
  run_finished: { ...base, seq: 14, type: "run_finished", status: "succeeded" },
};

describe("RunEventSchema", () => {
  it.each(Object.entries(validEvents))("accepts a valid %s event", (_name, event) => {
    expect(RunEventSchema.safeParse(event).success).toBe(true);
  });

  it("covers every event type in the contract", () => {
    const types = new Set(Object.values(validEvents).map((e) => e.type));
    expect([...types].sort()).toEqual([
      "artifact",
      "code",
      "error",
      "plan",
      "profile",
      "report",
      "retry",
      "run_finished",
      "run_started",
      "stdout",
      "step_finished",
      "step_started",
    ]);
  });

  it("accepts the mock-only delay_ms field", () => {
    expect(RunEventSchema.safeParse({ ...validEvents.stdout, delay_ms: 400 }).success).toBe(true);
  });

  it("narrows by type after parsing", () => {
    const event: RunEvent = parseRunEvent(validEvents.artifact_metric);
    if (event.type !== "artifact" || event.kind !== "metric") throw new Error("wrong narrowing");
    expect(event.payload.value).toBe(82.5);
  });

  const invalid: [string, unknown][] = [
    ["wrong contract_version", { ...validEvents.stdout, contract_version: 2 }],
    ["seq of 0", { ...validEvents.stdout, seq: 0 }],
    ["missing ts", { ...validEvents.stdout, ts: undefined }],
    ["unknown type", { ...base, seq: 1, type: "heartbeat" }],
    ["attempt above 3", { ...validEvents.step_started, attempt: 4 }],
    ["retry to attempt 1", { ...validEvents.retry, next_attempt: 1 }],
    ["non-python code", { ...validEvents.code, language: "r" }],
    ["empty plan", { ...validEvents.plan, steps: [] }],
    ["unknown run status", { ...validEvents.run_finished, status: "done" }],
    ["unknown step status", { ...validEvents.step_finished, status: "skipped" }],
    [
      "table row/column mismatch",
      { ...validEvents.artifact_table, payload: { columns: ["a", "b"], rows: [["x"]] } },
    ],
    [
      "table over 100 rows",
      {
        ...validEvents.artifact_table,
        payload: { columns: ["a"], rows: Array.from({ length: 101 }, (_, i) => [i]) },
      },
    ],
    ["metric payload on chart kind", { ...validEvents.artifact_chart, payload: { name: "x", value: 1 } }],
    ["unknown artifact kind", { ...validEvents.artifact_metric, kind: "image" }],
  ];

  it.each(invalid)("rejects %s", (_name, event) => {
    expect(RunEventSchema.safeParse(event).success).toBe(false);
  });

  it("parseRunEvent throws on invalid input", () => {
    expect(() => parseRunEvent({ type: "stdout" })).toThrow();
  });
});
