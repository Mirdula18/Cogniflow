# CogniFlow — P3 Proof of Concept

**Team:** Synapse Crew · **Team ID:** P-2024-28-AD-003-AY26-27 · **Vertical:** AD (AI & Data) · **Mentor:** Chitradevi M

CogniFlow lets project managers and project leads ask a new question about a messy Excel / CSV file and get a correct, verifiable answer in one place. The assistant profiles the data, plans the analysis, writes and runs the code in an isolated sandbox, and shows every step, chart and summary for review.

This repository is the **P3 Proof of Concept**. It starts as a **frontend running on predefined (mock) scenarios**, built against the same event contract the real backend will use, so swapping mock → live is a config change, not a rewrite.

## Quick start

```bash
cd web
npm install
cp .env.example .env.local      # NEXT_PUBLIC_DATA_MODE=mock
npm run dev                     # http://localhost:3000
```

## Docs

| File | What it covers |
| --- | --- |
| [CLAUDE.md](CLAUDE.md) | Instructions for the coding agent: stack, rules, git workflow |
| [docs/PRD.md](docs/PRD.md) | Problem, user, P3 scope (MoSCoW), acceptance criteria |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | Mock-now / live-later architecture, folders, data flow |
| [docs/API_CONTRACT.md](docs/API_CONTRACT.md) | REST + SSE event schema shared by mock and live modes |
| [docs/MOCK_SCENARIOS.md](docs/MOCK_SCENARIOS.md) | The predefined datasets, questions and scripted runs |
| [docs/UI_SPEC.md](docs/UI_SPEC.md) | Screens, components, states, layout |
| [docs/POC_TEST_PLAN.md](docs/POC_TEST_PLAN.md) | P3 hypothesis, measures, thresholds, stop rule |
| [docs/TASKS.md](docs/TASKS.md) | Work split per team member, in build order |
| [CONTRIBUTING.md](CONTRIBUTING.md) | Branches, commits, authorship, PR rules |

## Status

| Layer | P3 state |
| --- | --- |
| Frontend (Next.js) | Built — runs on mock scenarios |
| Event contract | Frozen v1 (docs/API_CONTRACT.md) |
| Backend (FastAPI + LangGraph) | Stub only — planned after P3 |
| Sandbox (Docker) | Planned — not in mock mode |

> Mock results are scripted demonstrations, **not** test results. Do not report them as P3 measurements.
