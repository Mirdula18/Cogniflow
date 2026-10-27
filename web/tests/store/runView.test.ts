import { describe, expect, it } from "vitest";
import { deriveRunView, initialRunView, reduceRunEvent } from "@/lib/store/runView";
import { buildEvents, notVerifiedInputs, retryPathInputs } from "../helpers/events";

describe("reduceRunEvent", () => {
  it("starts queued and moves to running on run_started", () => {
    const [started] = buildEvents("r1", [{ type: "run_started", question: "Q?" }]);
    const view = reduceRunEvent(initialRunView("r1"), started!);
    expect(view.status).toBe("running");
    expect(view.question).toBe("Q?");
  });

  it("renders every planned step as pending", () => {
    const view = deriveRunView("r1", buildEvents("r1", retryPathInputs.slice(0, 2)));
    expect(view.steps.map((s) => [s.id, s.status])).toEqual([
      ["s1", "pending"],
      ["s2", "pending"],
    ]);
  });

  it("does not mutate the previous view", () => {
    const events = buildEvents("r1", retryPathInputs.slice(0, 3));
    const before = deriveRunView("r1", events.slice(0, 2));
    const snapshot = JSON.stringify(before);
    reduceRunEvent(before, events[2]!);
    expect(JSON.stringify(before)).toBe(snapshot);
  });

  it("ignores duplicate and stale seq values", () => {
    const events = buildEvents("r1", retryPathInputs.slice(0, 3));
    const view = deriveRunView("r1", events);
    expect(reduceRunEvent(view, events[1]!)).toBe(view);
    expect(reduceRunEvent(view, events[2]!)).toBe(view);
  });

  it("orders events by seq when deriving from an unordered list", () => {
    const events = buildEvents("r1", retryPathInputs);
    expect(deriveRunView("r1", [...events].reverse())).toEqual(deriveRunView("r1", events));
  });

  it("adds a placeholder step for an event whose step is not in the plan", () => {
    const view = deriveRunView("r1", buildEvents("r1", [{ type: "step_started", step_id: "sx", attempt: 1 }]));
    expect(view.steps).toHaveLength(1);
    expect(view.steps[0]?.id).toBe("sx");
  });
});

describe("retry path (error -> retry -> success)", () => {
  const events = buildEvents("r1", retryPathInputs);

  it("marks the step retrying after a first-attempt error", () => {
    const view = deriveRunView("r1", events.slice(0, 5));
    const s1 = view.steps[0]!;
    expect(s1.status).toBe("retrying");
    expect(s1.attempts[0]?.error).toEqual({ type: "ValueError", message: "could not convert" });
    expect(view.terminal.at(-1)).toMatchObject({ kind: "error", text: "Error ValueError: could not convert" });
  });

  it("records the retry reason and next attempt", () => {
    const s1 = deriveRunView("r1", events.slice(0, 6)).steps[0]!;
    expect(s1.attempt).toBe(2);
    expect(s1.retries).toEqual([{ nextAttempt: 2, reason: "Strip currency symbol" }]);
  });

  it("keeps code for each attempt and finishes ok", () => {
    const view = deriveRunView("r1", events);
    const s1 = view.steps[0]!;
    expect(s1.status).toBe("ok");
    expect(s1.attempts.map((a) => a.code)).toEqual(["df['revenue'].astype(float)", "parse(df['revenue'])"]);
    expect(view.steps[1]?.status).toBe("ok");
    expect(view.status).toBe("succeeded");
  });

  it("collects terminal lines, artifacts and the report", () => {
    const view = deriveRunView("r1", events);
    expect(view.terminal.map((l) => l.kind)).toEqual(["error", "stdout", "stdout"]);
    expect(view.artifacts).toHaveLength(1);
    expect(view.report).toEqual({ markdown: "South fell 12.5%.", citedMetrics: ["fall_pct"] });
  });
});

describe("not_verified path (3 failed attempts)", () => {
  const events = buildEvents("r5", notVerifiedInputs);

  it("shows retrying after attempts 1 and 2, failed after attempt 3", () => {
    const statusAfterError = events
      .map((_, i) => deriveRunView("r5", events.slice(0, i + 1)))
      .filter((_, i) => events[i]?.type === "error")
      .map((v) => v.steps[0]?.status);
    expect(statusAfterError).toEqual(["retrying", "retrying", "failed"]);
  });

  it("ends with a failed step, three attempts and a not_verified run", () => {
    const view = deriveRunView("r5", events);
    const s1 = view.steps[0]!;
    expect(s1.status).toBe("failed");
    expect(s1.attempt).toBe(3);
    expect(s1.attempts).toHaveLength(3);
    expect(s1.retries.map((r) => r.nextAttempt)).toEqual([2, 3]);
    expect(view.status).toBe("not_verified");
    expect(view.report).toBeUndefined();
  });
});
