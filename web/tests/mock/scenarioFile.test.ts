import { describe, expect, it } from "vitest";
import { buildCatalog, getDefaultCatalog, parseScenarioFile, totalDelayMs } from "@/lib/mock";
import { fixtureCatalog, fixtureDatasetFiles, fixtureScenarioFiles } from "../fixtures";
import fxHappy from "../fixtures/scenarios/fx_happy.json";

const minimal = {
  scenario_id: "sc_x",
  dataset_id: "ds_x",
  question: "Q?",
  events: [
    { seq: 1, type: "run_started", delay_ms: 0, question: "Q?" },
    { seq: 2, type: "run_finished", delay_ms: 100, status: "succeeded" },
  ],
};

describe("parseScenarioFile", () => {
  it("accepts every fixture scenario", () => {
    expect(fixtureCatalog.scenarios.map((s) => s.scenario_id)).toEqual(["fx_happy", "fx_retry", "fx_not_verified"]);
  });

  it("strips nothing but keeps delay_ms and leaves run_id/ts to the player", () => {
    const parsed = parseScenarioFile(minimal);
    expect(parsed.events[1]).toEqual({ seq: 2, type: "run_finished", delay_ms: 100, status: "succeeded" });
  });

  it("rejects a contract-invalid event and names its seq", () => {
    const bad = { ...minimal, events: [minimal.events[0], { seq: 2, type: "run_finished", status: "done" }] };
    expect(() => parseScenarioFile(bad)).toThrow(/sc_x: event seq 2 \(run_finished\)/);
  });

  it("rejects gaps in seq", () => {
    const bad = { ...minimal, events: [minimal.events[0], { ...minimal.events[1], seq: 3 }] };
    expect(() => parseScenarioFile(bad)).toThrow(/expected seq 2, got 3/);
  });

  it("requires run_started first and run_finished last", () => {
    expect(() => parseScenarioFile({ ...minimal, events: [minimal.events[1]!].map((e) => ({ ...e, seq: 1 })) })).toThrow(
      /first event must be run_started/,
    );
    expect(() => parseScenarioFile({ ...minimal, events: [minimal.events[0]] })).toThrow(/last event must be run_finished/);
  });

  it("sums replay time", () => {
    expect(totalDelayMs(parseScenarioFile(fxHappy))).toBe(4500);
  });
});

describe("buildCatalog", () => {
  it("derives demo datasets from profile files", () => {
    expect(fixtureCatalog.datasets[0]?.dataset).toEqual({
      id: "ds_fixture_tasks",
      name: "fixture_tasks.csv",
      rows: 40,
      columns: 5,
      source: "demo",
      created_at: "2026-01-01T00:00:00Z",
    });
    expect(fixtureCatalog.datasets[0]?.profile).not.toHaveProperty("name");
  });

  it("rejects duplicate scenario ids", () => {
    expect(() => buildCatalog([fxHappy, fxHappy], fixtureDatasetFiles)).toThrow(/Duplicate scenario_id "fx_happy"/);
  });

  it("builds the scenario fixture set without error", () => {
    expect(() => buildCatalog(fixtureScenarioFiles, fixtureDatasetFiles)).not.toThrow();
  });
});

describe("lib/mock drop-in files", () => {
  // Validates whatever is in lib/mock/scenarios and lib/mock/datasets (T05/T07 files).
  const catalog = getDefaultCatalog();

  it("all scenario and dataset files are contract-valid", () => {
    expect(catalog.scenarios.length).toBeGreaterThanOrEqual(0);
  });

  it("every scenario's dataset has a profile file", () => {
    const ids = new Set(catalog.datasets.map((d) => d.dataset.id));
    expect(catalog.scenarios.filter((s) => !ids.has(s.dataset_id)).map((s) => s.scenario_id)).toEqual([]);
  });
});
