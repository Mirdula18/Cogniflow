import { describe, expect, it } from "vitest";
import type { Run } from "@/lib/contract";
import { fromStored, MAX_STORED_RUNS, runDurationMs, toStored } from "@/lib/store/history";
import { replayDelays } from "@/lib/store/replay";
import { buildEvents, notVerifiedInputs, retryPathInputs } from "../helpers/events";

function run(id: string, status: Run["status"], created_at = "2026-10-27T10:00:00Z"): Run {
  const events = status === "running" ? [] : buildEvents(id, status === "not_verified" ? notVerifiedInputs : retryPathInputs);
  return { id, dataset_id: "ds_sales", question: "Q?", status, created_at, events };
}

describe("toStored", () => {
  it("keeps finished runs only, newest first, capped", () => {
    const runs: Record<string, Run> = {};
    for (let i = 0; i < MAX_STORED_RUNS + 2; i += 1) {
      runs[`r${i}`] = run(`r${i}`, "succeeded", new Date(Date.UTC(2026, 9, 27, 0, i)).toISOString());
    }
    runs.live = run("live", "running");
    const stored = toStored({ activeDatasetId: "ds_sales", runs });
    expect(Object.keys(stored.runs)).toHaveLength(MAX_STORED_RUNS);
    expect(stored.runs.live).toBeUndefined();
    expect(stored.runs.r0).toBeUndefined();
    expect(stored.activeDatasetId).toBe("ds_sales");
  });
});

describe("fromStored", () => {
  it("rebuilds views and drops runs that fail the contract", () => {
    const good = run("good", "not_verified");
    const restored = fromStored({ activeDatasetId: "ds_sales", runs: { good, bad: { id: "bad", events: "nope" } } });
    expect(Object.keys(restored.runs)).toEqual(["good"]);
    expect(restored.views.good?.status).toBe("not_verified");
    expect(restored.views.good?.steps[0]?.status).toBe("failed");
  });

  it("returns empty history for garbage", () => {
    expect(fromStored("garbage")).toEqual({ activeDatasetId: null, runs: {}, views: {} });
    expect(fromStored(null).runs).toEqual({});
  });
});

describe("runDurationMs and replayDelays", () => {
  // The helper spaces events one second apart.
  const events = buildEvents("r1", retryPathInputs);

  it("measures run_started to run_finished", () => {
    expect(runDurationMs({ ...run("r1", "succeeded"), events })).toBe((retryPathInputs.length - 1) * 1000);
    expect(runDurationMs(run("x", "running"))).toBeUndefined();
  });

  it("uses stored gaps, capped", () => {
    expect(replayDelays(events).slice(0, 3)).toEqual([0, 1000, 1000]);
    expect(replayDelays(events, 400)[1]).toBe(400);
  });
});
