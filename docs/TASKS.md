# Tasks — build order and owners

Each member runs their own tasks (with or without the coding agent) on their own machine, signed in with their own GitHub account, so commits show who actually did the work. Tick a task with its commit hash when merged.

| Owner | Area |
| --- | --- |
| Joe Daniel A | App shell, contract, data-source adapter, run view |
| Arunaw Rishe M | Mock datasets, scenarios, scenario checks |
| Anish Karthic VS | FastAPI stub, SSE, sandbox design, eval harness |
| Mirdula R (lead) | UI system, results panel, history, test plan, review |

## Phase A — foundation (day 1)

- [x] **T01** Scaffold `web/` (Next.js, TS strict, Tailwind, shadcn, ESLint, Vitest) — Joe (23c910c)
- [x] **T02** Zod schemas for every type and event in API_CONTRACT.md + tests — Joe (4205ebe)
- [x] **T03** `DataSource` interface, `index.ts` mode switch, `.env.example` — Joe (2f57dee)
- [x] **T04** Design tokens, layout shell, 3-panel workspace, responsive tabs, dark mode — Mirdula (b1b1f5d)
- [x] **T05** Seeded synthetic dataset generator + 5 datasets + profile JSON — Arunaw (8f3400c)

## Phase B — mock end-to-end (days 2–3)

- [x] **T06** Scenario player (async generator honouring `delay_ms`) + MockDataSource — Joe (9b8f949)
- [x] **T07** Scenarios sc_01–sc_05 JSON, validated by Zod in a test — Arunaw (d5c632e)
- [x] **T08** Notebook check that every scenario's code produces its shown output — Arunaw (410e59f)
- [x] **T09** Event-sourced `runStore` reducer + tests (retry, not_verified paths) — Joe (a41916e)
- [x] **T10** DatasetPicker, UploadDropzone (mock accepts file, maps to closest demo), ProfilePanel — Mirdula (8eb8a25)
- [x] **T11** QueryBox + SuggestedQuestions — Joe (7854637)
- [x] **T12** StepTimeline, StepCard, CodeBlock, RetryBadge, Terminal (xterm) — Joe (91c2fe1)
- [x] **T13** ChartCanvas (Plotly), TableView, metric cards — Mirdula (d4d29c2)
- [x] **T14** FindingsPanel, VerifiedBadge, number-to-source highlight — Mirdula (b4c6b36)
- [x] **T15** Test: every number in each scenario's report exists in its artifacts — Arunaw (fc95e37)

## Phase C — live-ready (days 3–4)

- [ ] **T16** FastAPI stub: `/datasets`, `/runs`, `/runs/{id}/stream` replaying scenarios over SSE — Anish
- [ ] **T17** LiveDataSource (fetch + EventSource, Last-Event-ID resume) — Anish
- [ ] **T18** Run sc_01 in live mode against the stub; record a screen capture — Anish
- [x] **T19** History page + session persistence — Mirdula (94444b2)
- [ ] **T20** Sandbox design doc + Dockerfile skeleton (`--network none`, limits) — Anish

## Phase D — PoC evaluation prep (days 4–5)

- [x] **T21** Pick 5 public datasets, mess-injection script, licences noted — Arunaw (e455e4a)
- [ ] **T22** 30 questions + independent reference answers (two members) → freeze held-out — Arunaw, Mirdula (Arunaw's part: 6a6fcdf; Mirdula's references and the freeze are still open)
- [ ] **T23** Eval harness skeleton: run agent vs baseline, log to POC_TEST_PLAN results table — Anish
- [x] **T24** Accessibility pass (Lighthouse ≥ 90), README screenshots, demo script — Mirdula (bd244d1)

## Demo script (Pre-Demo Day)

1. Open workspace (demo badge visible) → pick `ds_sales` → show profile issues.
2. Ask "Which region's revenue fell most this quarter?" → watch error → retry → chart.
3. Click a number in the summary → source table highlights.
4. Run `sc_05` → "Not verified — send to analyst".
5. Switch to live mode against the stub → same flow over SSE.
6. Show POC_TEST_PLAN.md: what will be measured, and that mock ≠ results.
