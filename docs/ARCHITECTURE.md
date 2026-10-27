# Architecture

## 1. Principle: mock now, live later — same contract

```
UI components ──► hooks (useRun, useDatasets) ──► DataSource interface
                                                     ├── MockDataSource  (P3: replays scripted events)
                                                     └── LiveDataSource  (after P3: REST + SSE to FastAPI)
```

The UI never knows which source is active. `NEXT_PUBLIC_DATA_MODE=mock|live` selects it in `lib/datasource/index.ts`.

## 2. Target system (final project)

```
Next.js (web) ──REST/SSE──► FastAPI (api) ──► LangGraph agents ──► Docker sandbox (IPython kernel, no network)
                                │                                   │
                                ├── PostgreSQL (datasets, runs, steps, artifacts)
                                └── Redis (job queue + event pub/sub)
```

Agent graph: `profile → plan → code → execute ─┬─ error & attempts<3 → code`
`                                              ├─ more steps → code`
`                                              └─ done → report`

## 3. Repository layout

```
cogniflow/
├── README.md  CLAUDE.md  CONTRIBUTING.md
├── docs/
├── web/                         # Next.js app (P3 focus)
│   ├── app/
│   │   ├── page.tsx             # landing → workspace
│   │   ├── workspace/page.tsx   # main 3-panel workspace
│   │   └── history/page.tsx
│   ├── components/
│   │   ├── dataset/   UploadDropzone, DatasetPicker, ProfilePanel
│   │   ├── query/     QueryBox, SuggestedQuestions
│   │   ├── run/       StepTimeline, StepCard, CodeBlock, Terminal, RetryBadge
│   │   ├── canvas/    ChartCanvas, TableView
│   │   ├── findings/  FindingsPanel, VerifiedBadge
│   │   └── ui/        shadcn primitives
│   ├── lib/
│   │   ├── contract/  events.ts, dataset.ts, run.ts   (Zod schemas = API_CONTRACT.md)
│   │   ├── datasource/ index.ts, types.ts, mock.ts, live.ts
│   │   ├── mock/      datasets/*.json, scenarios/*.json, player.ts
│   │   └── store/     runStore.ts (Zustand)
│   ├── hooks/         useRun.ts, useDatasets.ts
│   └── tests/
└── api/                         # FastAPI stub (contract-compatible)
    ├── main.py                  # /datasets, /runs, /runs/{id}/stream (replays scenarios)
    └── scenarios/               # same JSON as web/lib/mock/scenarios
```

## 4. DataSource interface

```ts
export interface DataSource {
  listDatasets(): Promise<Dataset[]>;
  uploadDataset(file: File): Promise<Dataset>;
  getProfile(datasetId: string): Promise<DatasetProfile>;
  startRun(input: { datasetId: string; question: string }): Promise<{ runId: string }>;
  streamRun(runId: string): AsyncIterable<RunEvent>;   // validated with Zod
  getRun(runId: string): Promise<Run>;
}
```

- **MockDataSource.streamRun** reads `lib/mock/scenarios/<id>.json` and yields each event after its `delay_ms`.
- **LiveDataSource.streamRun** opens `EventSource('/api/runs/{id}/stream')` and yields parsed events.

Scenario matching in mock mode: exact match on a suggested question, otherwise the closest scenario for that dataset, with a visible "Showing closest demo scenario" note.

## 5. State

Zustand `runStore`: `activeDatasetId`, `runs: Record<runId, Run>`, `appendEvent(runId, event)` (pure reducer, unit-tested). UI derives step status, terminal lines, charts and summary from the event list — **event-sourced**, so replay and live behave identically.

## 6. Security posture (final system, documented now)

Sandbox: `--network none`, non-root, CPU / memory / PID limits, read-only FS except `/workspace`, 60 s cell timeout, idle reaper. LLM sees schema + profile + code errors, not full raw data, where possible. No credentials in the sandbox.
