import { describe, expect, it } from "vitest";
import type { ArtifactEvent, RunEvent } from "@/lib/contract";
import { extractNumbers, untracedNumbers } from "@/lib/findings/numbers";
import { getDefaultCatalog, playScenario, type ScenarioFile } from "@/lib/mock";

// PRD acceptance criterion 4 / CLAUDE.md rule 4: every number in a summary is traceable to a step output.
const noWait = async () => {};

async function replay(scenario: ScenarioFile): Promise<RunEvent[]> {
  const events: RunEvent[] = [];
  for await (const e of playScenario(scenario, { runId: "r_test", sleep: noWait })) events.push(e);
  return events;
}

const isArtifact = (e: RunEvent): e is ArtifactEvent => e.type === "artifact";
const scenarios = getDefaultCatalog().scenarios.filter((s) => /^sc_\d+$/.test(s.scenario_id));

describe("every number in a scenario report exists in that run's artifacts (T15)", () => {
  it("covers the five demo scenarios", () => {
    expect(scenarios.map((s) => s.scenario_id)).toEqual(["sc_01", "sc_02", "sc_03", "sc_04", "sc_05"]);
  });

  it.each(scenarios.map((s) => [s.scenario_id, s] as const))("%s", async (_id, scenario) => {
    const events = await replay(scenario);
    const artifacts = events.filter(isArtifact);
    const report = events.find((e) => e.type === "report");
    expect(report, "scenario has a report").toBeDefined();
    if (report?.type !== "report") return;

    expect(untracedNumbers(report.markdown, artifacts).map((t) => t.text)).toEqual([]);

    // Not vacuous: a succeeded run's summary states numbers; a not_verified one states none.
    const failed = events.some((e) => e.type === "run_finished" && e.status === "not_verified");
    expect(extractNumbers(report.markdown).length > 0).toBe(!failed);

    // cited_metrics names a metric (payload.name) or an artifact title that exists in the run.
    const known = new Set(artifacts.flatMap((a) => (a.kind === "metric" ? [a.payload.name, a.title] : [a.title])));
    for (const cited of report.cited_metrics) expect(known.has(cited), `cited "${cited}"`).toBe(true);
    if (!failed) expect(report.cited_metrics.length).toBeGreaterThan(0);
  });

  it("flags a number that no artifact contains", async () => {
    const [first] = scenarios;
    const artifacts = (await replay(first as ScenarioFile)).filter(isArtifact);
    expect(untracedNumbers("Delay was **99.9** days.", artifacts).map((t) => t.text)).toEqual(["99.9"]);
  });
});
