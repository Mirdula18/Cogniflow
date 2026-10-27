import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { getDefaultCatalog, totalDelayMs, type ScenarioFile } from "@/lib/mock";

// The shipped demo scenarios. getDefaultCatalog() runs every file through the Zod contract schemas.
const catalog = getDefaultCatalog();
const byId = (id: string): ScenarioFile => {
  const found = catalog.scenarios.find((s) => s.scenario_id === id);
  if (!found) throw new Error(`missing scenario ${id}`);
  return found;
};
const IDS = ["sc_01", "sc_02", "sc_03", "sc_04", "sc_05"];
const DATASET: Record<string, string> = { sc_01: "ds_delivery", sc_02: "ds_sales", sc_03: "ds_tickets", sc_04: "ds_costs", sc_05: "ds_hr" };

describe("demo scenarios sc_01–sc_05", () => {
  it("are all present, contract-valid and on the documented datasets", () => {
    expect(catalog.scenarios.map((s) => s.scenario_id).filter((id) => IDS.includes(id))).toEqual(IDS);
    for (const id of IDS) expect(byId(id).dataset_id).toBe(DATASET[id]);
  });

  it.each(IDS)("%s: question matches run_started and profile matches its dataset", (id) => {
    const s = byId(id);
    expect(s.events[0]).toMatchObject({ type: "run_started", question: s.question });
    const profile = s.events.find((e) => e.type === "profile");
    const dataset = catalog.datasets.find((d) => d.dataset.id === s.dataset_id);
    expect(profile && "profile" in profile ? profile.profile : undefined).toEqual(dataset?.profile);
  });

  it.each(IDS)("%s: replays in 8–20 seconds", (id) => {
    const total = totalDelayMs(byId(id));
    expect(total).toBeGreaterThanOrEqual(8_000);
    expect(total).toBeLessThanOrEqual(20_000);
  });

  it.each(IDS)("%s: every step that runs prints at least one stdout line", (id) => {
    const events = byId(id).events;
    const ran = new Set(events.flatMap((e) => (e.type === "step_started" ? [e.step_id] : [])));
    expect(ran.size).toBeGreaterThan(0);
    for (const step of ran) expect(events.some((e) => e.type === "stdout" && e.step_id === step), step).toBe(true);
  });

  it("sc_02 shows error → retry → success on s1", () => {
    const s1 = byId("sc_02").events.filter((e) => "step_id" in e && e.step_id === "s1").map((e) => e.type);
    expect(s1).toEqual(["step_started", "code", "stdout", "error", "retry", "step_started", "code", "stdout", "stdout", "step_finished"]);
    const error = byId("sc_02").events.find((e) => e.type === "error");
    expect(error).toMatchObject({ error_type: "ValueError", message: expect.stringContaining("₹1,20,000") });
    expect(byId("sc_02").events.at(-1)).toMatchObject({ type: "run_finished", status: "succeeded" });
  });

  it("sc_05 fails three attempts then ends not_verified with a fallback message", () => {
    const events = byId("sc_05").events;
    expect(events.filter((e) => e.type === "error").map((e) => e.type === "error" && e.attempt)).toEqual([1, 2, 3]);
    expect(events.filter((e) => e.type === "step_finished")).toEqual([expect.objectContaining({ step_id: "s1", status: "failed" })]);
    expect(events.at(-1)).toMatchObject({ type: "run_finished", status: "not_verified" });
    const report = events.find((e) => e.type === "report");
    expect(report && "markdown" in report ? report.markdown : "").toMatch(/analyst/i);
  });

  it("the other scenarios succeed without a failed step", () => {
    for (const id of ["sc_01", "sc_03", "sc_04"]) {
      const events = byId(id).events;
      expect(events.some((e) => e.type === "error"), id).toBe(false);
      expect(events.at(-1)).toMatchObject({ type: "run_finished", status: "succeeded" });
    }
  });

  it("are mirrored byte for byte in api/scenarios for the live stub", () => {
    for (const id of IDS) {
      const web = readFileSync(join(process.cwd(), "lib/mock/scenarios", `${id}.json`));
      const api = readFileSync(join(process.cwd(), "../api/scenarios", `${id}.json`));
      expect(Buffer.compare(web, api), id).toBe(0);
    }
  });
});
