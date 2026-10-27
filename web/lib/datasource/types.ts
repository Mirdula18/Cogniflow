import type { Dataset, DatasetProfile, Run, RunEvent } from "@/lib/contract";

/** Which adapter backs the UI. Selected by NEXT_PUBLIC_DATA_MODE. */
export type DataMode = "mock" | "live";

export interface StartRunInput {
  datasetId: string;
  question: string;
}

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
  startRun(input: StartRunInput): Promise<{ runId: string }>;
  streamRun(runId: string, options?: { signal?: AbortSignal }): AsyncIterable<RunEvent>;
  getRun(runId: string): Promise<Run>;
}
