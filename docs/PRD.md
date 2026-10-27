# PRD — CogniFlow P3 Proof of Concept

## 1. Problem (from Phase 1, E01–E11)

Project managers and project leads (non-programmers) in 3 companies must answer new, unplanned questions from messy Excel / CSV exports before reviews. Excel and Power BI are not flexible for new questions, and cleaning / coding skills sit with a few analysts. Questions mean switching tools or waiting in the analysts' queue, so decisions are made late or without verified numbers.

## 2. Selected concept (Phase 2, I03)

**Step-showing analysis assistant.** The user uploads a file and asks a question. Agents profile the data, plan steps, write and run code in an isolated sandbox, retry on errors, and return a chart and a summary. **Every step and line of code is visible** so an analyst can verify it.

## 3. Users

| User | Need in P3 demo |
| --- | --- |
| Project manager / lead (primary) | Ask in plain words, see a trustworthy answer and chart |
| Data analyst (verifier) | Inspect plan, code, outputs and retries |
| Reviewer / mentor | See the full flow and the honest "demo / not verified" labels |

## 4. Design requirements

- **R1** Answer new, unplanned questions on messy data in one place.
- **R2** Every step visible so an analyst can verify; works with Excel / CSV.
- **R3** No company data leaves approved systems; low running cost.

## 5. Scope for P3 (MoSCoW)

**Must have**
- Upload CSV / XLSX (mock mode: pick from predefined datasets; upload UI present)
- Data profile panel: rows, columns, dtypes, nulls, duplicates, sample rows
- Natural-language question box with suggested questions per dataset
- Live run view: plan steps, generated code, terminal output, retries, status per step
- Chart canvas rendering Plotly JSON
- Findings summary that only cites numbers present in step outputs
- Run history (in-memory / localStorage) for the session
- `mock` and `live` data modes behind one adapter; live adapter calls the API contract

**Should have**
- Download code (`.py`) and results (`.csv` / `.png`)
- "Not verified" state when a run fails after 3 retries, with route-to-analyst message
- Dark mode

**Could have**
- SQL connection form (UI only, disabled with "coming after P3")
- Compare two runs side by side

**Won't have in P3**
- Real company or client data, login / multi-user, deployment, live dashboards, model training, payments

## 6. Acceptance criteria (mock mode)

1. All 5 scenarios in `MOCK_SCENARIOS.md` play end to end without console errors.
2. At least one scenario shows a failed step → retry → success.
3. At least one scenario ends in "Not verified" after 3 failed retries and shows the fallback.
4. Every number in a summary is traceable to a step output (unit test checks this).
5. Switching `NEXT_PUBLIC_DATA_MODE=live` with the API stub running streams the same scenario through SSE.
6. Lighthouse accessibility score ≥ 90 on the main workspace page.

## 7. Out of scope reminder

Mock runs are demonstrations. The P3 measured result comes from `docs/POC_TEST_PLAN.md`, run against the real agent pipeline.
