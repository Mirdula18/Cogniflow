import type { DataSource } from "./types";

/** REST + SSE client for the FastAPI backend. Implemented in T17. */
export function createLiveDataSource(apiBaseUrl: string): DataSource {
  const notYet = (): never => {
    throw new Error(`LiveDataSource for "${apiBaseUrl || "same origin"}" is not implemented yet (T17)`);
  };
  return {
    mode: "live",
    listDatasets: async () => notYet(),
    uploadDataset: async () => notYet(),
    getProfile: async () => notYet(),
    startRun: async () => notYet(),
    streamRun: () => notYet(),
    getRun: async () => notYet(),
  };
}
