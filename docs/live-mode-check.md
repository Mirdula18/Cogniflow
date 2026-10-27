# Live mode check: sc_01 against the API stub (T18)

Checked on 2026-10-27 in the Claude desktop app's built-in browser, with `NEXT_PUBLIC_DATA_MODE=live` and the `api/` stub. **The stub replays the scripted scenario `sc_01`; nothing here is a measured analysis result.** The screen capture is added separately by Anish.

## Setup

```bash
# terminal 1
cd api && pip install -r requirements-dev.txt && uvicorn main:app --port 8000

# terminal 2
cd web && NEXT_PUBLIC_DATA_MODE=live NEXT_PUBLIC_API_BASE_URL=http://localhost:8000 npm run dev
```

Open http://localhost:3000/workspace. (On Windows PowerShell set the two variables with `$env:...` first, or put them in `web/.env.local`.)

## Steps and what happened

| # | Step | Observed |
| --- | --- | --- |
| 1 | Open `/workspace` | Dataset list loaded from the API (`GET /api/datasets` 200): the five demo files. No console errors, no CORS errors. |
| 2 | Choose `project_delivery.csv` | Profile loaded from `GET /api/datasets/ds_delivery/profile` 200: 480 rows, 9 columns, 14 duplicate rows, 22 blank owners, mixed date formats in three columns. |
| 3 | Type "Why did delivery slip last month?" and press Ask | `OPTIONS /api/runs` 200, `POST /api/runs` 200 (run `r_001`), then one `GET /api/runs/r_001/stream` 200. No reconnects, no console errors. |
| 4 | Watch the run (about 17 s, the scripted `delay_ms` total) | Plan with 4 steps; each step went to Done ("Steps (4 of 4 done)"). Code and terminal output streamed per step. |
| 5 | Results | Chart "Average delay by team, last month" (Backend 5.2, Frontend 1.4, DevOps 0.7, Design 0.4, QA 0.0), two metric cards (1.4 and 0.8 days), tables "Delay by team" and "Delay causes last month". |
| 6 | Findings | "Delivery slipped most in Backend, which finished tasks 5.2 days late on average last month (2.2 days earlier)..." with the badge "Steps shown — review before use". Every number matches the artifacts, as in mock mode. |

Result: **pass.** The same UI ran sc_01 end to end through REST and SSE with no UI changes, and the output matched what mock mode shows for the same scenario.

## Also verified outside the browser

- `api/` pytest (36 tests): every scenario validates against the Pydantic models; SSE framing, resume by `Last-Event-ID` and `?last_event_id=`, CORS, upload limits.
- `web/tests/datasource/live.test.ts`: Zod validation of REST and SSE payloads, error mapping, de-duplication, reopen with `last_event_id`, abort. These use a fake `EventSource`.
- `curl` against the running stub: SSE frames and `Last-Event-ID: 47` resume.

## Not checked

- Reconnect after a real dropped connection in the browser (covered only by the fake `EventSource` test).
- Other scenarios (`sc_02` to `sc_05`) in the browser; they pass the API tests.
- Browsers other than the built-in one; mobile layout.

## Observations for the UI owner

- **No demo label in live mode.** The "Demo scenario — scripted data" badge shows in mock mode only (`DemoBadge.tsx` renders nothing in live mode). Against this stub the output is still scripted, so the page should not look like real analysis. Not changed here (T18 is no UI change).
- **No suggested questions in live mode.** `suggestQuestions` is not part of the REST contract, so the question must be typed. A different wording gets the closest scenario for that dataset, with no "closest scenario" note, because `POST /api/runs` returns only `run_id`.
- The browser pane could not take a screenshot in this session, so the checks above come from page text, the network log and the console.
