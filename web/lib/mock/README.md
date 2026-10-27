# lib/mock — scripted demo data

Drop files here; no code changes are needed. `scripts/gen-mock-registry.mjs` (run automatically by `npm run dev`, `build`, `test` and `typecheck`) picks them up.

| Folder | File name | Shape |
| --- | --- | --- |
| `scenarios/` | `<scenario_id>.json`, e.g. `sc_01.json` | Scenario file from `docs/MOCK_SCENARIOS.md`: `{ scenario_id, dataset_id, question, events[] }`. Events omit `run_id`, `ts`, `contract_version`; the player fills them at replay time. |
| `datasets/` | `<dataset_id>.profile.json`, e.g. `ds_delivery.profile.json` | A `DatasetProfile` from `docs/API_CONTRACT.md` plus an optional `name` (display file name, e.g. `"project_delivery.csv"`). The dataset list is built from these files. |

Raw CSV/XLSX files can sit next to the profiles; only `*.profile.json` is loaded by the app.

Every file is validated on load (`parseScenarioFile`, `DemoDatasetFileSchema`) and by `tests/mock/scenarioFile.test.ts`: events must be contract-valid, `seq` must run 1, 2, 3…, the first event is `run_started`, the last is `run_finished`, and each scenario's `dataset_id` needs a profile file.

Components never import from here — they go through hooks → `lib/datasource`.
