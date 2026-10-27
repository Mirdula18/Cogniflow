import { describe, expect, it } from "vitest";
import { matchScenario, normaliseQuestion } from "@/lib/mock";
import { fixtureCatalog } from "../fixtures";

const { scenarios } = fixtureCatalog;

describe("matchScenario", () => {
  it("matches a suggested question exactly, ignoring case and punctuation", () => {
    const m = matchScenario(scenarios, "ds_fixture_tasks", "  what is the TOTAL budget ");
    expect(m).toMatchObject({ exact: true, scenario: { scenario_id: "fx_retry" } });
  });

  it("falls back to the closest scenario for the dataset", () => {
    const m = matchScenario(scenarios, "ds_fixture_tasks", "Show late tasks for each team please");
    expect(m).toMatchObject({ exact: false, scenario: { scenario_id: "fx_happy" } });
  });

  it("still returns a scenario when nothing overlaps", () => {
    const m = matchScenario(scenarios, "ds_fixture_tasks", "zzz");
    expect(m?.exact).toBe(false);
    expect(m?.scenario.dataset_id).toBe("ds_fixture_tasks");
  });

  it("returns undefined for a dataset without scenarios", () => {
    expect(matchScenario(scenarios, "ds_unknown", "How many tasks are late per team?")).toBeUndefined();
  });

  it("normalises whitespace and punctuation", () => {
    expect(normaliseQuestion("  Why did delivery   slip?! ")).toBe("why did delivery slip");
  });
});
