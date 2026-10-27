import { createLiveDataSource } from "./live";
import { createMockDataSource } from "./mock";
import type { DataMode, DataSource } from "./types";

export { DataSourceError, UPLOAD_LIMITS } from "./types";
export type { DataMode, DataSource, DataSourceErrorCode, StartRunInput, StartRunResult } from "./types";

/** Parses a NEXT_PUBLIC_DATA_MODE value. Unset means mock; anything else unknown is a config error. */
export function parseDataMode(value: string | undefined): DataMode {
  const mode = value?.trim().toLowerCase() || "mock";
  if (mode === "mock" || mode === "live") return mode;
  throw new Error(`Invalid NEXT_PUBLIC_DATA_MODE "${value}": expected "mock" or "live"`);
}

// NEXT_PUBLIC_* values are inlined at build time, so they must be read by their literal names.
export const dataMode: DataMode = parseDataMode(process.env.NEXT_PUBLIC_DATA_MODE);

export const isMockMode = dataMode === "mock";

export function createDataSource(mode: DataMode, apiBaseUrl = ""): DataSource {
  return mode === "live" ? createLiveDataSource(apiBaseUrl) : createMockDataSource();
}

let instance: DataSource | undefined;

/** The app-wide DataSource. Hooks call this; components never import adapters directly. */
export function getDataSource(): DataSource {
  instance ??= createDataSource(dataMode, process.env.NEXT_PUBLIC_API_BASE_URL ?? "");
  return instance;
}
