# Demo script — Pre-Demo Day

About 6 minutes. Runs in **mock mode**. Every run shown is a scripted demonstration, not a measured result. Say so at the start and again at the end.

## Before the demo

- [ ] T05 / T07 merged: `ds_sales`, `ds_hr` and `sc_01`–`sc_05` exist in `web/lib/mock/`
- [ ] T16 / T17 merged and the API stub runs, for step 5
- [ ] `cd web && npm run build && npx next start` (production build: no dev overlay)
- [ ] Browser zoom 125%, one tab, notifications off
- [ ] Open `/history` and click **Clear history**
- [ ] Light mode for the projector (toggle in the header)

## Script

| # | Do | Say | Point at |
| --- | --- | --- | --- |
| 0 | Open `/` | "CogniFlow answers new questions about messy Excel or CSV exports and shows every step. What you see today is scripted demo data." | The **Demo scenario — scripted data** badge |
| 1 | **Open workspace** → Dataset: `regional_sales.xlsx` | "First it profiles the file, so you see the mess before any analysis." | Profile: rows, duplicates, amber issue chips (revenue stored as text, region spelt 3 ways) |
| 2 | Click the suggested question **Which region's revenue fell most this quarter?** | "It plans the steps, writes the code and runs it. Watch step 1." | Step 1 fails (`₹1,20,000` will not parse) → **Retrying**, **Attempt 2/3** with the reason → **Done**. Red error line in Output. Then the bar chart. |
| 3 | In Findings, click a number | "Every number in the summary comes from a step output. Click one to see where." | The source card gets a **Source** label and the exact table cell is outlined. Badge: **Steps shown — review before use**. |
| 4 | Dataset: `team_allocation.csv` → **Who is over-allocated next sprint?** | "When it cannot do a step reliably, it does not guess." | 3 failed attempts → **Not verified — send to analyst** and the fallback note |
| 5 | Stop the server, set `NEXT_PUBLIC_DATA_MODE=live`, start the API stub and web again, repeat step 2 | "Same screen, now streamed over SSE from the backend stub. The UI did not change." | Same flow, no demo badge in live mode |
| 6 | Open `docs/POC_TEST_PLAN.md` | "This is what P3 will actually measure: 20 held-out questions against a single-prompt baseline, zero invented numbers. None of today's runs count as results." | Thresholds and the empty results log |

Optional, if time allows: `/history` → **Replay** a run; press the tab keys at a narrow window to show the Data · Run · Results tabs.

## If something goes wrong

| Problem | Recovery |
| --- | --- |
| Free-text question shows "Showing closest demo scenario" | Expected in mock mode; say so and continue |
| Live stub not reachable in step 5 | Skip it, show the T18 screen recording instead |
| Page looks stuck | Open `/history`, Replay the last finished run |

## Do not say

- "It is accurate" / "it got the right answer". Say "the steps are shown for review".
- Any number from a demo run as a result. Results come only from `POC_TEST_PLAN.md` runs.
