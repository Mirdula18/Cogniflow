# P3 Proof of Concept — test plan (from Phase 2, Slide 10)

> Everything here is **planned**. Mock-mode demos are not results. Results are recorded only after running the real pipeline below.

## Riskiest assumption

Generated cleaning and analysis steps are correct and verifiable often enough to be useful (P2-A03).

## Hypothesis

On held-out messy public datasets, the plan–code–retry assistant answers more predefined questions correctly than a single-prompt baseline, with zero invented numbers.

## Test set

- 5 public datasets (e.g. from UCI / Kaggle open licences) with mess injected by script: duplicates, mixed date formats, blanks, currency-as-text.
- 30 questions; reference answers computed **independently by two team members**; disagreements resolved and logged before testing.
- Split: 10 development (tuning prompts) / **20 held-out (never used for tuning)**. Freeze the held-out set and reference answers in `eval/heldout.json` with a commit hash before the first run.
- **Frozen** in `eval/heldout.json` at commit `53a43ba` (2026-10-27). Both members' independent references agreed on 30/30 questions; no disagreements to log. Run the harness with `--references eval/heldout.json`.

## Comparator

Same LLM, single prompt containing the profile and the question, no plan, no retry.

## Measures and planned thresholds

| Measure | Comparator | Planned pass threshold | How measured |
| --- | --- | --- | --- |
| Correct answers | Single-prompt baseline | ≥ 16/20 **and** ≥ 4 more than baseline | Exact / tolerance match against frozen references |
| Invented numbers | Required limit | 0/20 summaries | Every number in summary traced to an executed output |
| Time per question | Manual Excel attempt by a team member (timed) | Median ≤ 3 min | Timer per question, both routes |
| Sandbox safety | Required limit | 0 escapes in 5 defined checks | Attempted network call, file read outside `/workspace`, fork bomb, 10 GB alloc, infinite loop |

## Stop / pivot

Under 12/20 correct, any invented number, or any sandbox escape → stop, revise, or test I01 / I02 instead. Do not change thresholds after seeing results.

## Boundary

Public or synthetic data only. Isolated, no-network sandbox. LLM API use approved by mentor (Chitradevi M) before the first run. Record model name, version, temperature and cost.

## Results log (fill only after real runs)

| Run date | Commit | Correct (agent) | Correct (baseline) | Invented numbers | Median time | Escapes | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- |
| | | | | | | | |
