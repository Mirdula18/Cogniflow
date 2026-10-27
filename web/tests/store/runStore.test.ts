import { beforeEach, describe, expect, it } from "vitest";
import { selectRunView, useRunStore } from "@/lib/store/runStore";
import { buildEvents, notVerifiedInputs, retryPathInputs } from "../helpers/events";

const meta = { id: "r1", dataset_id: "ds_sales", question: "Q?", created_at: "2026-10-27T10:00:00Z" };

describe("runStore", () => {
  beforeEach(() => useRunStore.getState().reset());

  it("registers a queued run with an empty view", () => {
    useRunStore.getState().registerRun(meta);
    const s = useRunStore.getState();
    expect(s.runs.r1?.status).toBe("queued");
    expect(selectRunView("r1")(s)?.steps).toEqual([]);
  });

  it("appends events, keeps them on the run and syncs run status", () => {
    const { registerRun, appendEvent } = useRunStore.getState();
    registerRun(meta);
    buildEvents("r1", retryPathInputs).forEach((e) => appendEvent("r1", e));
    const s = useRunStore.getState();
    expect(s.runs.r1?.events).toHaveLength(retryPathInputs.length);
    expect(s.runs.r1?.status).toBe("succeeded");
    expect(s.views.r1?.status).toBe("succeeded");
  });

  it("ignores a duplicate event without changing state references", () => {
    const { registerRun, appendEvent } = useRunStore.getState();
    registerRun(meta);
    const [first] = buildEvents("r1", retryPathInputs);
    appendEvent("r1", first!);
    const before = useRunStore.getState().views;
    appendEvent("r1", first!);
    expect(useRunStore.getState().views).toBe(before);
    expect(useRunStore.getState().runs.r1?.events).toHaveLength(1);
  });

  it("rejects events for an unknown run or a different run_id", () => {
    const { registerRun, appendEvent } = useRunStore.getState();
    const [first] = buildEvents("r1", retryPathInputs);
    expect(() => appendEvent("r1", first!)).toThrow(/unknown run/);
    registerRun({ ...meta, id: "r2" });
    expect(() => appendEvent("r2", first!)).toThrow(/sent to "r2"/);
  });

  it("loads a stored run and rebuilds its view (history replay)", () => {
    const events = buildEvents("r5", notVerifiedInputs);
    useRunStore.getState().loadRun({ ...meta, id: "r5", status: "running", events });
    const s = useRunStore.getState();
    expect(s.runs.r5?.status).toBe("not_verified");
    expect(s.views.r5?.steps[0]?.status).toBe("failed");
  });

  it("tracks the active dataset", () => {
    useRunStore.getState().setActiveDataset("ds_tickets");
    expect(useRunStore.getState().activeDatasetId).toBe("ds_tickets");
  });
});
