import { buildCatalog, type MockCatalog } from "./catalog";
import { datasetFiles, scenarioFiles } from "./registry.generated";

export { buildCatalog, DEMO_CREATED_AT, type DemoDataset, type MockCatalog } from "./catalog";
export { matchScenario, normaliseQuestion, similarity, type ScenarioMatch } from "./match";
export { playScenario, sleep, type PlayOptions, type SleepFn } from "./player";
export {
  DemoDatasetFileSchema,
  parseScenarioFile,
  totalDelayMs,
  type DemoDatasetFile,
  type ScenarioEvent,
  type ScenarioFile,
} from "./scenarioFile";

let catalog: MockCatalog | undefined;

/** Catalog of everything in lib/mock/scenarios and lib/mock/datasets, validated once on first use. */
export function getDefaultCatalog(): MockCatalog {
  catalog ??= buildCatalog(scenarioFiles, datasetFiles);
  return catalog;
}
