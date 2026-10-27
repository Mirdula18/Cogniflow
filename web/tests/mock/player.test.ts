import { describe, expect, it, vi } from "vitest";
import type { RunEvent } from "@/lib/contract";
import { playScenario, sleep, type SleepFn } from "@/lib/mock";
import { fixtureCatalog } from "../fixtures";

const happy = fixtureCatalog.scenarios.find((s) => s.scenario_id === "fx_happy")!;
const fixedNow = () => new Date("2026-10-27T10:00:00.000Z");

async function collect(iterable: AsyncIterable<RunEvent>): Promise<RunEvent[]> {
  const out: RunEvent[] = [];
  for await (const e of iterable) out.push(e);
  return out;
}

describe("playScenario", () => {
  it("fills contract_version, run_id and ts on every event", async () => {
    const events = await collect(playScenario(happy, { runId: "r_7", sleep: async () => {}, now: fixedNow }));
    expect(events).toHaveLength(happy.events.length);
    for (const e of events) {
      expect(e).toMatchObject({ contract_version: 1, run_id: "r_7", ts: "2026-10-27T10:00:00.000Z" });
    }
    expect(events.map((e) => e.seq)).toEqual(happy.events.map((e) => e.seq));
  });

  it("waits each event's delay_ms, scaled by speed", async () => {
    const waits: number[] = [];
    const recordSleep: SleepFn = async (ms) => {
      waits.push(ms);
    };
    await collect(playScenario(happy, { runId: "r", sleep: recordSleep, speed: 2 }));
    expect(waits).toEqual(happy.events.map((e) => (e.delay_ms ?? 0) / 2));
  });

  it("replays over real time with fake timers", async () => {
    vi.useFakeTimers();
    try {
      const it = playScenario(happy, { runId: "r" });
      const first = it.next();
      await vi.advanceTimersByTimeAsync(0);
      expect((await first).value?.type).toBe("run_started");

      const second = it.next();
      let settled = false;
      void second.then(() => (settled = true));
      await vi.advanceTimersByTimeAsync(399);
      expect(settled).toBe(false);
      await vi.advanceTimersByTimeAsync(1);
      expect((await second).value?.type).toBe("profile");
    } finally {
      vi.useRealTimers();
    }
  });

  it("stops quietly when aborted mid-replay", async () => {
    const controller = new AbortController();
    const seen: RunEvent[] = [];
    for await (const e of playScenario(happy, { runId: "r", signal: controller.signal, sleep })) {
      seen.push(e);
      if (seen.length === 1) controller.abort();
    }
    expect(seen).toHaveLength(1);
  });

  it("rejects a non-positive speed", async () => {
    await expect(collect(playScenario(happy, { runId: "r", speed: 0 }))).rejects.toThrow(/speed/);
  });
});
