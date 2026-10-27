import type { DataSource } from "./types";

/** Replays scripted scenarios from lib/mock. Implemented in T06. */
export function createMockDataSource(): DataSource {
  const notYet = (): never => {
    throw new Error("MockDataSource is not implemented yet (T06)");
  };
  return {
    mode: "mock",
    listDatasets: async () => notYet(),
    uploadDataset: async () => notYet(),
    getProfile: async () => notYet(),
    startRun: async () => notYet(),
    streamRun: () => notYet(),
    getRun: async () => notYet(),
  };
}
