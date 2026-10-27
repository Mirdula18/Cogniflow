import type { Dataset, Run, RunEvent } from "@/lib/contract";
import {
  getDefaultCatalog,
  matchScenario,
  playScenario,
  similarity,
  type MockCatalog,
  type ScenarioFile,
  type SleepFn,
} from "@/lib/mock";
import { DataSourceError, UPLOAD_LIMITS, type DataSource, type StartRunInput } from "./types";

export interface MockDataSourceOptions {
  /** Defaults to everything in lib/mock/scenarios and lib/mock/datasets. */
  catalog?: MockCatalog;
  speed?: number;
  sleep?: SleepFn;
  now?: () => Date;
}

interface MockRun {
  run: Run;
  scenario: ScenarioFile;
}

function hasAllowedExtension(name: string): boolean {
  const lower = name.toLowerCase();
  return UPLOAD_LIMITS.extensions.some((ext) => lower.endsWith(ext));
}

/** Replays scripted scenarios over time, exactly like the live SSE stream. */
export function createMockDataSource(options: MockDataSourceOptions = {}): DataSource {
  const { speed, sleep, now = () => new Date() } = options;
  const catalog = () => options.catalog ?? getDefaultCatalog();
  const runs = new Map<string, MockRun>();
  let counter = 0;

  const findDataset = (datasetId: string) => {
    const found = catalog().datasets.find((d) => d.dataset.id === datasetId);
    if (!found) throw new DataSourceError("not_found", `Unknown dataset "${datasetId}"`);
    return found;
  };

  const findRun = (runId: string) => {
    const found = runs.get(runId);
    if (!found) throw new DataSourceError("not_found", `Unknown run "${runId}"`);
    return found;
  };

  return {
    mode: "mock",

    async listDatasets(): Promise<Dataset[]> {
      return catalog().datasets.map((d) => ({ ...d.dataset }));
    },

    /** Mock upload: checks type and size, then maps the file to the closest demo dataset by name. */
    async uploadDataset(file: File): Promise<Dataset> {
      if (!hasAllowedExtension(file.name)) {
        throw new DataSourceError("unsupported_type", "Only .csv and .xlsx files are supported");
      }
      if (file.size > UPLOAD_LIMITS.maxBytes) {
        throw new DataSourceError("too_large", "Files must be 20 MB or smaller");
      }
      const datasets = catalog().datasets;
      if (datasets.length === 0) throw new DataSourceError("not_found", "No demo datasets are available");
      const scored = datasets.map((d) => ({ d, score: similarity(file.name.replace(/[_.-]/g, " "), d.dataset.name.replace(/[_.-]/g, " ")) }));
      const best = scored.reduce((a, b) => (b.score > a.score ? b : a));
      return { ...best.d.dataset };
    },

    async getProfile(datasetId) {
      return structuredClone(findDataset(datasetId).profile);
    },

    async startRun({ datasetId, question }: StartRunInput) {
      findDataset(datasetId);
      const match = matchScenario(catalog().scenarios, datasetId, question);
      if (!match) throw new DataSourceError("no_scenario", `No demo scenario for dataset "${datasetId}"`);

      counter += 1;
      const runId = `r_mock_${counter.toString().padStart(3, "0")}`;
      runs.set(runId, {
        scenario: match.scenario,
        run: {
          id: runId,
          dataset_id: datasetId,
          question,
          status: "queued",
          created_at: now().toISOString(),
          events: [],
        },
      });
      return match.exact
        ? { runId }
        : { runId, notice: `Showing closest demo scenario: "${match.scenario.question}"` };
    },

    async *streamRun(runId, streamOptions): AsyncGenerator<RunEvent> {
      const entry = findRun(runId);
      entry.run.events = [];
      const playback = playScenario(entry.scenario, { runId, signal: streamOptions?.signal, speed, sleep, now });
      for await (const event of playback) {
        entry.run.events.push(event);
        if (event.type === "run_started") entry.run.status = "running";
        if (event.type === "run_finished") entry.run.status = event.status;
        yield event;
      }
    },

    async getRun(runId) {
      return structuredClone(findRun(runId).run);
    },

    /** The scripted scenario questions for the dataset; these match exactly when asked. */
    async suggestQuestions(datasetId) {
      return catalog()
        .scenarios.filter((s) => s.dataset_id === datasetId)
        .sort((a, b) => a.scenario_id.localeCompare(b.scenario_id))
        .map((s) => s.question);
    },
  };
}
