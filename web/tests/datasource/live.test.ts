import { beforeEach, describe, expect, it, vi } from "vitest";
import type { RunEvent } from "@/lib/contract";
import { createLiveDataSource, type LiveDataSourceOptions } from "@/lib/datasource/live";
import { DataSourceError } from "@/lib/datasource";
import { playScenario } from "@/lib/mock";
import { fixtureCatalog } from "../fixtures";

class FakeEventSource {
  static instances: FakeEventSource[] = [];
  readonly CLOSED = 2;
  readyState = 1;
  private listeners = new Map<string, ((e: { data?: string }) => void)[]>();

  constructor(readonly url: string) {
    FakeEventSource.instances.push(this);
  }
  addEventListener(type: string, fn: (e: { data?: string }) => void) {
    this.listeners.set(type, [...(this.listeners.get(type) ?? []), fn]);
  }
  close() {
    this.readyState = this.CLOSED;
  }
  emit(type: string, data?: string) {
    for (const fn of this.listeners.get(type) ?? []) fn({ data });
  }
  send(event: RunEvent) {
    this.emit("run_event", JSON.stringify(event));
  }
  /** The browser gave up on this connection. */
  fail() {
    this.readyState = this.CLOSED;
    this.emit("error");
  }
}

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

function makeSource(overrides: LiveDataSourceOptions = {}, base = "http://api.test") {
  const fetchMock = vi.fn<typeof fetch>();
  const source = createLiveDataSource(base, {
    fetch: fetchMock,
    eventSource: FakeEventSource as unknown as typeof EventSource,
    retryDelayMs: 0,
    ...overrides,
  });
  return { source, fetchMock };
}

async function scenarioEvents(): Promise<RunEvent[]> {
  const events: RunEvent[] = [];
  const scenario = fixtureCatalog.scenarios.find((s) => s.scenario_id === "fx_retry");
  if (!scenario) throw new Error("fixture missing");
  for await (const e of playScenario(scenario, { runId: "r_1", sleep: async () => {} })) events.push(e);
  return events;
}

const dataset = { id: "ds_a", name: "a.csv", rows: 3, columns: 2, source: "demo", created_at: "2026-01-01T00:00:00Z" };
const profile = { dataset_id: "ds_a", rows: 3, duplicates: 0, columns: [], head: [] };

beforeEach(() => {
  FakeEventSource.instances = [];
});

describe("live REST calls", () => {
  it("reports mode live and builds URLs from the base (trailing slash ignored, empty base = same origin)", async () => {
    const { source, fetchMock } = makeSource({}, "http://api.test/");
    fetchMock.mockResolvedValue(json([dataset]));
    expect(source.mode).toBe("live");
    expect(await source.listDatasets()).toEqual([dataset]);
    expect(fetchMock.mock.calls[0]?.[0]).toBe("http://api.test/api/datasets");

    const same = makeSource({}, "");
    same.fetchMock.mockResolvedValue(json([]));
    await same.source.listDatasets();
    expect(same.fetchMock.mock.calls[0]?.[0]).toBe("/api/datasets");
  });

  it("validates responses with the Zod contract", async () => {
    const { source, fetchMock } = makeSource();
    fetchMock.mockResolvedValue(json([{ ...dataset, source: "cloud" }]));
    await expect(source.listDatasets()).rejects.toThrow(/Unexpected response from \/api\/datasets/);
  });

  it("fetches profile and run, encoding ids", async () => {
    const { source, fetchMock } = makeSource();
    fetchMock.mockResolvedValueOnce(json(profile));
    expect(await source.getProfile("ds a")).toEqual(profile);
    expect(fetchMock.mock.calls[0]?.[0]).toBe("http://api.test/api/datasets/ds%20a/profile");

    const run = { id: "r_1", dataset_id: "ds_a", question: "q", status: "queued", created_at: "2026-01-01T00:00:00Z", events: [] };
    fetchMock.mockResolvedValueOnce(json(run));
    expect(await source.getRun("r_1")).toEqual(run);
  });

  it("starts a run with a JSON body and maps run_id to runId", async () => {
    const { source, fetchMock } = makeSource();
    fetchMock.mockResolvedValue(json({ run_id: "r_007" }));
    expect(await source.startRun({ datasetId: "ds_a", question: "Why?" })).toEqual({ runId: "r_007" });
    const [url, init] = fetchMock.mock.calls[0] ?? [];
    expect(url).toBe("http://api.test/api/runs");
    expect(init?.method).toBe("POST");
    expect(JSON.parse(String(init?.body))).toEqual({ dataset_id: "ds_a", question: "Why?" });
  });

  it.each([
    [404, "not_found"],
    [413, "too_large"],
    [415, "unsupported_type"],
  ] as const)("maps HTTP %i to DataSourceError %s", async (status, code) => {
    const { source, fetchMock } = makeSource();
    fetchMock.mockResolvedValue(json({ detail: "nope" }, status));
    await expect(source.getRun("r_9")).rejects.toMatchObject({ name: "DataSourceError", code, message: "nope" });
  });

  it("turns other failures into a plain error with the server detail", async () => {
    const { source, fetchMock } = makeSource();
    fetchMock.mockResolvedValue(json({ detail: "boom" }, 500));
    await expect(source.getRun("r_9")).rejects.toThrow("API error 500: boom");
  });

  it("uploads as multipart and rejects bad files before any request", async () => {
    const { source, fetchMock } = makeSource();
    fetchMock.mockResolvedValue(json(dataset));
    expect(await source.uploadDataset(new File(["a,b"], "a.csv"))).toEqual(dataset);
    const body = fetchMock.mock.calls[0]?.[1]?.body;
    expect(body).toBeInstanceOf(FormData);
    expect((body as FormData).get("file")).toBeInstanceOf(File);

    fetchMock.mockClear();
    await expect(source.uploadDataset(new File(["x"], "notes.txt"))).rejects.toBeInstanceOf(DataSourceError);
    await expect(source.uploadDataset(new File([new Uint8Array(20 * 1024 * 1024 + 1)], "big.csv"))).rejects.toMatchObject({ code: "too_large" });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("leaves suggested questions to the UI (not part of the REST contract)", () => {
    expect(makeSource().source.suggestQuestions).toBeUndefined();
  });
});

describe("live SSE stream", () => {
  it("yields Zod-validated events in order and closes after run_finished", async () => {
    const events = await scenarioEvents();
    const { source } = makeSource();
    const it = source.streamRun("r_1")[Symbol.asyncIterator]();
    const first = it.next();
    const es = FakeEventSource.instances[0] as FakeEventSource;
    expect(es.url).toBe("http://api.test/api/runs/r_1/stream");
    events.forEach((e) => es.send(e));

    const got = [(await first).value as RunEvent];
    for (;;) {
      const next = await it.next();
      if (next.done) break;
      got.push(next.value);
    }
    expect(got).toEqual(events);
    expect(es.readyState).toBe(es.CLOSED);
  });

  it("drops events it has already seen", async () => {
    const events = await scenarioEvents();
    const { source } = makeSource();
    const it = source.streamRun("r_1")[Symbol.asyncIterator]();
    const first = it.next();
    const es = FakeEventSource.instances[0] as FakeEventSource;
    es.send(events[0] as RunEvent);
    es.send(events[0] as RunEvent);
    es.send(events[1] as RunEvent);
    expect(((await first).value as RunEvent).seq).toBe(1);
    expect(((await it.next()).value as RunEvent).seq).toBe(2);
    await it.return?.(undefined);
  });

  it("rejects and closes on an event that breaks the contract", async () => {
    const { source } = makeSource();
    const it = source.streamRun("r_1")[Symbol.asyncIterator]();
    const pending = it.next();
    const es = FakeEventSource.instances[0] as FakeEventSource;
    es.emit("run_event", JSON.stringify({ contract_version: 1, run_id: "r_1", seq: 1, ts: "2026-01-01T00:00:00Z", type: "run_finished", status: "done" }));
    await expect(pending).rejects.toThrow();
    expect(es.readyState).toBe(es.CLOSED);
  });

  it("reopens with last_event_id when the browser gives up, without repeating events", async () => {
    const events = await scenarioEvents();
    const { source } = makeSource();
    const it = source.streamRun("r_1")[Symbol.asyncIterator]();
    const first = it.next();
    const one = FakeEventSource.instances[0] as FakeEventSource;
    one.send(events[0] as RunEvent);
    one.send(events[1] as RunEvent);
    expect(((await first).value as RunEvent).seq).toBe(1);
    expect(((await it.next()).value as RunEvent).seq).toBe(2);

    const third = it.next();
    one.fail();
    await vi.waitFor(() => expect(FakeEventSource.instances).toHaveLength(2));
    const two = FakeEventSource.instances[1] as FakeEventSource;
    expect(two.url).toBe("http://api.test/api/runs/r_1/stream?last_event_id=2");
    events.slice(1).forEach((e) => two.send(e)); // server re-sends from seq 2 here; client keeps only seq 3+
    expect(((await third).value as RunEvent).seq).toBe(3);
    await it.return?.(undefined);
  });

  it("gives up after too many consecutive errors", async () => {
    const { source } = makeSource({ maxStreamErrors: 2 });
    const it = source.streamRun("r_9")[Symbol.asyncIterator]();
    const pending = it.next();
    (FakeEventSource.instances[0] as FakeEventSource).fail();
    await vi.waitFor(() => expect(FakeEventSource.instances.length).toBeGreaterThan(1));
    (FakeEventSource.instances[1] as FakeEventSource).fail();
    await vi.waitFor(() => expect(FakeEventSource.instances.length).toBeGreaterThan(2));
    (FakeEventSource.instances[2] as FakeEventSource).fail();
    await expect(pending).rejects.toThrow("Lost connection to the run stream");
  });

  it("stops quietly and closes the connection when aborted", async () => {
    const { source } = makeSource();
    const controller = new AbortController();
    const it = source.streamRun("r_1", { signal: controller.signal })[Symbol.asyncIterator]();
    const pending = it.next();
    const es = FakeEventSource.instances[0] as FakeEventSource;
    controller.abort();
    expect((await pending).done).toBe(true);
    expect(es.readyState).toBe(es.CLOSED);

    const already = new AbortController();
    already.abort();
    const none = source.streamRun("r_1", { signal: already.signal });
    expect((await none[Symbol.asyncIterator]().next()).done).toBe(true);
    expect(FakeEventSource.instances).toHaveLength(1);
  });
});
