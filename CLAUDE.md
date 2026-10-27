# CLAUDE.md — instructions for the coding agent

You are building the **CogniFlow P3 Proof of Concept**. Read `docs/PRD.md`, `docs/ARCHITECTURE.md` and `docs/API_CONTRACT.md` before writing code. Work through `docs/TASKS.md` in order.

## Goal of this phase

A working **frontend** that demonstrates the full user journey — upload → ask → live agent steps → chart → summary — using **predefined mock scenarios** (`docs/MOCK_SCENARIOS.md`). Every component must consume data through the **data-source adapter** so the same UI later runs against the real FastAPI backend with no UI changes.

## Stack (do not substitute)

- `web/`: Next.js 14+ (App Router) · TypeScript (strict) · Tailwind CSS · shadcn/ui · `react-plotly.js` (charts) · `@xterm/xterm` (live terminal) · Zustand (client state) · Zod (contract validation)
- `api/` (stub only in P3): Python 3.11 · FastAPI · Pydantic v2
- Package manager: npm. Node 20+.

## Non-negotiable rules

1. **Never call mock data directly from components.** Components use hooks (`useRun`, `useDatasets`) → `lib/datasource/index.ts` → `mock` or `live` adapter, chosen by `NEXT_PUBLIC_DATA_MODE`.
2. **All event payloads are validated with the Zod schemas** in `lib/contract/` that mirror `docs/API_CONTRACT.md`. If you change the contract, update the doc in the same commit and bump `contract_version`.
3. **Mock mode must replay events over time** (async generator with delays) so the UI is exercised exactly like a real SSE stream.
4. **Summaries only use numbers that appear in step outputs.** Mock summaries must follow this rule too.
5. **Label demo output.** In mock mode, show a visible "Demo scenario — scripted data" badge. Never present mock output as measured results.
6. No company or personal data in the repo. Mock datasets are synthetic or public (see MOCK_SCENARIOS.md).
7. Keep components small (< 200 lines), typed props, no `any`.
8. Accessibility: keyboard reachable, visible focus, labels on inputs, colour is never the only signal.

## Commands

```bash
cd web && npm run dev        # dev server
npm run lint && npm run typecheck && npm run test   # must pass before every commit
```

## Git workflow (see CONTRIBUTING.md)

- Commit as the **person running the session** — never set or change `user.name` / `user.email`, and never use `--author` to attribute work to someone else.
- Small, focused commits using Conventional Commits: `feat(ui): add step timeline`.
- One task from `docs/TASKS.md` per branch: `feat/T07-step-timeline`.
- If a teammate genuinely paired on the change, add a `Co-authored-by:` trailer for them.
- Run lint, typecheck and tests before committing. Do not commit `.env*` files.

## Definition of done for a task

- Builds, lints, typechecks, tests pass
- Works in mock mode end to end
- Uses the adapter and Zod contract
- Task ticked in `docs/TASKS.md` with the commit hash
