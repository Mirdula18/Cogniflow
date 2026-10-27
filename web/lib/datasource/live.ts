import { z } from "zod";
import {
  DatasetProfileSchema,
  DatasetSchema,
  RunSchema,
  StartRunResponseSchema,
  parseRunEvent,
  type RunEvent,
} from "@/lib/contract";
import { DataSourceError, UPLOAD_LIMITS, type DataSource, type DataSourceErrorCode } from "./types";

export interface LiveDataSourceOptions {
  /** Defaults to the global fetch. */
  fetch?: typeof fetch;
  /** Defaults to the global EventSource. */
  eventSource?: typeof EventSource;
  /** Consecutive stream errors tolerated before giving up. Default 5. */
  maxStreamErrors?: number;
  /** Wait before reopening a stream the browser gave up on, multiplied by the error count. Default 500. */
  retryDelayMs?: number;
}

const STATUS_CODES: Record<number, DataSourceErrorCode> = { 404: "not_found", 413: "too_large", 415: "unsupported_type" };

async function toError(res: Response): Promise<Error> {
  let detail = "";
  try {
    const body: unknown = await res.json();
    if (typeof body === "object" && body !== null && "detail" in body && typeof body.detail === "string") detail = body.detail;
  } catch {
    // not JSON: fall back to the status line
  }
  const code = STATUS_CODES[res.status];
  return code ? new DataSourceError(code, detail || res.statusText) : new Error(`API error ${res.status}${detail ? `: ${detail}` : ""}`);
}

type StreamItem = { event: RunEvent } | { error: Error } | { done: true };

/** REST + SSE client for the FastAPI backend (docs/API_CONTRACT.md). Every payload is Zod-validated. */
export function createLiveDataSource(apiBaseUrl: string, options: LiveDataSourceOptions = {}): DataSource {
  const base = apiBaseUrl.replace(/\/+$/, "");
  const { maxStreamErrors = 5, retryDelayMs = 500 } = options;
  const doFetch = (...args: Parameters<typeof fetch>) => (options.fetch ?? fetch)(...args);
  const Source = () => options.eventSource ?? EventSource;

  async function request<T>(schema: z.ZodType<T>, path: string, init?: RequestInit): Promise<T> {
    const res = await doFetch(`${base}${path}`, init);
    if (!res.ok) throw await toError(res);
    const parsed = schema.safeParse(await res.json());
    if (!parsed.success) throw new Error(`Unexpected response from ${path}: ${z.prettifyError(parsed.error)}`);
    return parsed.data;
  }

  const id = encodeURIComponent;

  return {
    mode: "live",

    listDatasets: () => request(z.array(DatasetSchema), "/api/datasets"),

    async uploadDataset(file) {
      const name = file.name.toLowerCase();
      if (!UPLOAD_LIMITS.extensions.some((ext) => name.endsWith(ext))) {
        throw new DataSourceError("unsupported_type", "Only .csv and .xlsx files are supported");
      }
      if (file.size > UPLOAD_LIMITS.maxBytes) throw new DataSourceError("too_large", "Files must be 20 MB or smaller");
      const body = new FormData();
      body.append("file", file);
      return request(DatasetSchema, "/api/datasets", { method: "POST", body });
    },

    getProfile: (datasetId) => request(DatasetProfileSchema, `/api/datasets/${id(datasetId)}/profile`),

    async startRun({ datasetId, question }) {
      const { run_id } = await request(StartRunResponseSchema, "/api/runs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dataset_id: datasetId, question }),
      });
      return { runId: run_id };
    },

    getRun: (runId) => request(RunSchema, `/api/runs/${id(runId)}`),

    /**
     * Streams RunEvents over EventSource. The browser reconnects by itself with Last-Event-ID; when it
     * gives up (readyState CLOSED) the stream is reopened with ?last_event_id=<last seq>. Events at or
     * before the last seq are dropped, so a resume never shows an event twice.
     */
    async *streamRun(runId, streamOptions): AsyncGenerator<RunEvent> {
      const signal = streamOptions?.signal;
      if (signal?.aborted) return;

      const url = `${base}/api/runs/${id(runId)}/stream`;
      const queue: StreamItem[] = [];
      let wake: (() => void) | undefined;
      let source: EventSource | undefined;
      let timer: ReturnType<typeof setTimeout> | undefined;
      let lastSeq = 0;
      let errors = 0;
      let ended = false;

      const push = (item: StreamItem) => {
        queue.push(item);
        wake?.();
      };
      const end = (item: StreamItem) => {
        ended = true;
        source?.close();
        push(item);
      };

      const open = () => {
        const src = new (Source())(lastSeq > 0 ? `${url}?last_event_id=${lastSeq}` : url);
        source = src;
        src.addEventListener("run_event", (message) => {
          if (ended) return;
          errors = 0;
          try {
            const event = parseRunEvent(JSON.parse((message as MessageEvent<string>).data));
            if (event.seq <= lastSeq) return;
            lastSeq = event.seq;
            push({ event });
            if (event.type === "run_finished") end({ done: true });
          } catch (e) {
            end({ error: e instanceof Error ? e : new Error(String(e)) });
          }
        });
        src.addEventListener("error", () => {
          if (ended) return;
          errors += 1;
          if (errors > maxStreamErrors) return end({ error: new Error("Lost connection to the run stream") });
          if (src.readyState === src.CLOSED) timer = setTimeout(open, retryDelayMs * errors);
        });
      };

      const onAbort = () => end({ done: true });
      signal?.addEventListener("abort", onAbort, { once: true });
      try {
        open();
        for (;;) {
          while (queue.length === 0) await new Promise<void>((resolve) => (wake = resolve));
          const item = queue.shift() as StreamItem;
          if ("error" in item) throw item.error;
          if ("done" in item) return;
          yield item.event;
        }
      } finally {
        ended = true;
        clearTimeout(timer);
        source?.close();
        signal?.removeEventListener("abort", onAbort);
      }
    },
  };
}
