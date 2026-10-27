import type { Dataset, DatasetProfile, Run, RunEvent } from "@/lib/contract";

/** Which adapter backs the UI. Selected by NEXT_PUBLIC_DATA_MODE. */
export type DataMode = "mock" | "live";

export interface StartRunInput {
  datasetId: string;
  question: string;
}

export interface StartRunResult {
  runId: string;
  /** Shown to the user, e.g. "Showing closest demo scenario" in mock mode. */
  notice?: string;
}

export type DataSourceErrorCode = "unsupported_type" | "too_large" | "not_found" | "no_scenario";

export class DataSourceError extends Error {
  constructor(
    readonly code: DataSourceErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "DataSourceError";
  }
}

/** POST /api/datasets limits from docs/API_CONTRACT.md. */
export const UPLOAD_LIMITS = { extensions: [".csv", ".xlsx"], maxBytes: 20 * 1024 * 1024 } as const;

/**
 * The only way UI code reaches data (see docs/ARCHITECTURE.md §4).
 * Mock and live implementations must return contract-valid shapes;
 * every RunEvent yielded by `streamRun` is Zod-validated.
 */
export interface DataSource {
  readonly mode: DataMode;
  listDatasets(): Promise<Dataset[]>;
  uploadDataset(file: File): Promise<Dataset>;
  getProfile(datasetId: string): Promise<DatasetProfile>;
  startRun(input: StartRunInput): Promise<StartRunResult>;
  streamRun(runId: string, options?: { signal?: AbortSignal }): AsyncIterable<RunEvent>;
  getRun(runId: string): Promise<Run>;
  /**
   * Suggested questions for a dataset. Optional: not part of the REST contract yet,
   * so adapters without a source for them leave it undefined and the UI shows none.
   */
  suggestQuestions?(datasetId: string): Promise<string[]>;
}
