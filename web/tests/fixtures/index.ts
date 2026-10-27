// Test-only scenarios on a tiny synthetic dataset. The real demo scenarios
// (sc_01–sc_05) live in lib/mock/scenarios and are owned by T07.
import { buildCatalog } from "@/lib/mock";
import dsFixtureTasks from "./datasets/ds_fixture_tasks.profile.json";
import fxHappy from "./scenarios/fx_happy.json";
import fxNotVerified from "./scenarios/fx_not_verified.json";
import fxRetry from "./scenarios/fx_retry.json";

export const fixtureScenarioFiles: unknown[] = [fxHappy, fxRetry, fxNotVerified];
export const fixtureDatasetFiles: unknown[] = [dsFixtureTasks];

export const fixtureCatalog = buildCatalog(fixtureScenarioFiles, fixtureDatasetFiles);
