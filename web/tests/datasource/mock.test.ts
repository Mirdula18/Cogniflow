import { describe, expect, it } from "vitest";
import { RunSchema, type RunEvent } from "@/lib/contract";
import { DataSourceError } from "@/lib/datasource";
import { createMockDataSource } from "@/lib/datasource/mock";
import { deriveRunView } from "@/lib/store/runView";
import { fixtureCatalog } from "../fixtures";

const instant = async () => {};
const source = () => createMockDataSource({ catalog: fixtureCatalog, sleep: instant });

async function play(ds: ReturnType<typeof source>, question: string) {
  const { runId, notice } = await ds.startRun({ datasetId: "ds_fixture_tasks", question });
  const events: RunEvent[] = [];
  for await (const e of ds.streamRun(runId)) events.push(e);
  return { runId, notice, events };
}

describe("MockDataSource", () => {
  it("lists demo datasets and serves their profiles", async () => {
    const ds = source();
    expect((await ds.listDatasets()).map((d) => d.id)).toEqual(["ds_fixture_tasks"]);
    expect((await ds.getProfile("ds_fixture_tasks")).duplicates).toBe(2);
    await expect(ds.getProfile("nope")).rejects.toMatchObject({ code: "not_found" });
  });

  it("plays the happy path end to end", async () => {
    const ds = source();
    const { runId, notice, events } = await play(ds, "How many tasks are late per team?");
    expect(notice).toBeUndefined();
    expect(events.at(-1)).toMatchObject({ type: "run_finished", status: "succeeded" });
    const run = await ds.getRun(runId);
    expect(RunSchema.safeParse(run).success).toBe(true);
    expect(run.status).toBe("succeeded");
    expect(run.events).toHaveLength(events.length);
  });

  it("plays the retry path: error, retry, then success", async () => {
    const { runId, events } = await play(source(), "What is the total budget?");
    expect(events.map((e) => e.type)).toEqual(expect.arrayContaining(["error", "retry"]));
    const view = deriveRunView(runId, events);
    expect(view.steps.every((s) => s.status === "ok")).toBe(true);
    expect(view.status).toBe("succeeded");
  });

  it("plays the not_verified path after 3 failed attempts", async () => {
    const { runId, events } = await play(source(), "Which owner has the most tasks?");
    const view = deriveRunView(runId, events);
    expect(view.steps[0]).toMatchObject({ status: "failed", attempt: 3 });
    expect(view.status).toBe("not_verified");
  });

  it("returns a notice when showing the closest scenario", async () => {
    const { notice, events } = await play(source(), "late tasks per team?");
    expect(notice).toMatch(/Showing closest demo scenario/);
    expect(events[0]).toMatchObject({ type: "run_started", question: "How many tasks are late per team?" });
  });

  it("gives each run its own id", async () => {
    const ds = source();
    const a = await ds.startRun({ datasetId: "ds_fixture_tasks", question: "What is the total budget?" });
    const b = await ds.startRun({ datasetId: "ds_fixture_tasks", question: "What is the total budget?" });
    expect(a.runId).not.toBe(b.runId);
  });

  it("rejects unknown datasets and runs", async () => {
    const ds = source();
    await expect(ds.startRun({ datasetId: "nope", question: "Q" })).rejects.toBeInstanceOf(DataSourceError);
    await expect(ds.getRun("r_missing")).rejects.toMatchObject({ code: "not_found" });
  });

  describe("uploadDataset", () => {
    it("maps an accepted file to the closest demo dataset", async () => {
      const file = new File(["a,b\n1,2"], "my_tasks.csv", { type: "text/csv" });
      expect((await source().uploadDataset(file)).id).toBe("ds_fixture_tasks");
    });

    it("rejects unsupported types", async () => {
      const file = new File(["x"], "notes.txt");
      await expect(source().uploadDataset(file)).rejects.toMatchObject({ code: "unsupported_type" });
    });

    it("rejects files over 20 MB", async () => {
      const file = new File(["x"], "big.xlsx");
      Object.defineProperty(file, "size", { value: 20 * 1024 * 1024 + 1 });
      await expect(source().uploadDataset(file)).rejects.toMatchObject({ code: "too_large" });
    });
  });
});
