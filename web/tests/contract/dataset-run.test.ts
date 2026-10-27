import { describe, expect, it } from "vitest";
import {
  DatasetProfileSchema,
  DatasetSchema,
  RunSchema,
  StartRunRequestSchema,
  StartRunResponseSchema,
} from "@/lib/contract";

const dataset = {
  id: "ds_delivery",
  name: "project_delivery.csv",
  rows: 480,
  columns: 9,
  source: "demo",
  created_at: "2026-10-27T10:00:00Z",
};

describe("DatasetSchema", () => {
  it("accepts a valid dataset", () => {
    expect(DatasetSchema.safeParse(dataset).success).toBe(true);
  });

  it("rejects an unknown source", () => {
    expect(DatasetSchema.safeParse({ ...dataset, source: "s3" }).success).toBe(false);
  });

  it("rejects a non-ISO created_at", () => {
    expect(DatasetSchema.safeParse({ ...dataset, created_at: "yesterday" }).success).toBe(false);
  });
});

describe("DatasetProfileSchema", () => {
  const owner = { name: "owner", dtype: "string", nulls: 12, unique: 20, sample: ["Asha", null], issues: ["blank owners"] };
  const profile = {
    dataset_id: "ds_delivery",
    rows: 480,
    duplicates: 14,
    columns: [owner, { name: "due", dtype: "mixed", nulls: 0, unique: 300, sample: ["01/02/2026", "2026-02-01"], issues: [] }],
    head: [{ owner: "Asha", due: "01/02/2026" }],
  };

  it("accepts a valid profile", () => {
    expect(DatasetProfileSchema.safeParse(profile).success).toBe(true);
  });

  it("rejects an unknown dtype", () => {
    expect(DatasetProfileSchema.safeParse({ ...profile, columns: [{ ...owner, dtype: "float64" }] }).success).toBe(false);
  });

  it("rejects negative null counts", () => {
    expect(DatasetProfileSchema.safeParse({ ...profile, columns: [{ ...owner, nulls: -1 }] }).success).toBe(false);
  });
});

describe("RunSchema", () => {
  const run = {
    id: "r_01",
    dataset_id: "ds_delivery",
    question: "Why did delivery slip last month?",
    status: "running",
    created_at: "2026-10-27T10:00:00Z",
    events: [
      { contract_version: 1, run_id: "r_01", seq: 1, ts: "2026-10-27T10:00:00Z", type: "run_started", question: "Why?" },
    ],
  };

  it("accepts a valid run with events", () => {
    expect(RunSchema.safeParse(run).success).toBe(true);
  });

  it("rejects a run containing an invalid event", () => {
    expect(RunSchema.safeParse({ ...run, events: [{ type: "stdout" }] }).success).toBe(false);
  });

  it("rejects an unknown status", () => {
    expect(RunSchema.safeParse({ ...run, status: "done" }).success).toBe(false);
  });
});

describe("REST bodies", () => {
  it("requires a non-blank question to start a run", () => {
    expect(StartRunRequestSchema.safeParse({ dataset_id: "ds_sales", question: "   " }).success).toBe(false);
    expect(StartRunRequestSchema.safeParse({ dataset_id: "ds_sales", question: "Which region?" }).success).toBe(true);
  });

  it("parses the start-run response", () => {
    expect(StartRunResponseSchema.parse({ run_id: "r_01" })).toEqual({ run_id: "r_01" });
  });
});
