import type { Dataset, DatasetProfile } from "@/lib/contract";
import { DemoDatasetFileSchema, parseScenarioFile, type ScenarioFile } from "./scenarioFile";

export interface DemoDataset {
  dataset: Dataset;
  profile: DatasetProfile;
}

export interface MockCatalog {
  datasets: DemoDataset[];
  scenarios: ScenarioFile[];
}

/** Fixed so demo datasets look the same on every load. */
export const DEMO_CREATED_AT = "2026-01-01T00:00:00Z";

/** Validates raw scenario and dataset files and indexes them. Throws on any invalid file. */
export function buildCatalog(scenarioFiles: readonly unknown[], datasetFiles: readonly unknown[]): MockCatalog {
  const datasets = datasetFiles
    .map((raw) => DemoDatasetFileSchema.parse(raw))
    .map(({ name, ...profile }): DemoDataset => ({
      profile,
      dataset: {
        id: profile.dataset_id,
        name: name ?? profile.dataset_id,
        rows: profile.rows,
        columns: profile.columns.length,
        source: "demo",
        created_at: DEMO_CREATED_AT,
      },
    }))
    .sort((a, b) => a.dataset.id.localeCompare(b.dataset.id));

  const scenarios = scenarioFiles.map(parseScenarioFile);
  const ids = new Set<string>();
  for (const s of scenarios) {
    if (ids.has(s.scenario_id)) throw new Error(`Duplicate scenario_id "${s.scenario_id}"`);
    ids.add(s.scenario_id);
  }
  return { datasets, scenarios };
}
