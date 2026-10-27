import { createMockDataSource, type MockDataSourceOptions } from "@/lib/datasource/mock";
import { fixtureCatalog } from "./index";

export const FIXTURE_DATASET_ID = "ds_fixture_tasks";

/** MockDataSource over the test-only fixture scenarios. Used by tests. */
export function createFixtureDataSource(options: Omit<MockDataSourceOptions, "catalog"> = {}) {
  return createMockDataSource({ ...options, catalog: fixtureCatalog });
}
