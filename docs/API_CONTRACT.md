# API & Event Contract — v1

`contract_version: 1`. Mock and live modes both produce exactly these shapes. Zod schemas in `web/lib/contract/` and Pydantic models in `api/` must match this file.

## REST

| Method | Path | Body | Returns |
| --- | --- | --- | --- |
| GET | `/api/datasets` | – | `Dataset[]` |
| POST | `/api/datasets` | multipart `file` (.csv, .xlsx ≤ 20 MB) | `Dataset` |
| GET | `/api/datasets/{id}/profile` | – | `DatasetProfile` |
| POST | `/api/runs` | `{ "dataset_id": str, "question": str }` | `{ "run_id": str }` |
| GET | `/api/runs/{id}` | – | `Run` |
| GET | `/api/runs/{id}/stream` | – | `text/event-stream` of `RunEvent` |

## Types

```ts
Dataset        = { id: string; name: string; rows: number; columns: number; source: "upload" | "demo"; created_at: string }
ColumnProfile  = { name: string; dtype: "number" | "string" | "date" | "bool" | "mixed"; nulls: number; unique: number; sample: (string|number|null)[]; issues: string[] }
DatasetProfile = { dataset_id: string; rows: number; duplicates: number; columns: ColumnProfile[]; head: Record<string, unknown>[] }
Run            = { id: string; dataset_id: string; question: string; status: "queued"|"running"|"succeeded"|"failed"|"not_verified"; created_at: string; events: RunEvent[] }
```

## RunEvent (discriminated union on `type`)

Every event: `{ contract_version: 1, run_id: string, seq: number, ts: string, type: ..., delay_ms?: number }` (`delay_ms` is mock-only, ignored by live).

| `type` | Extra fields | UI effect |
| --- | --- | --- |
| `run_started` | `question` | Show run header, status running |
| `profile` | `profile: DatasetProfile` | Fill profile panel |
| `plan` | `steps: { id: string; goal: string }[]` | Render step timeline (all pending) |
| `step_started` | `step_id`, `attempt` (1–3) | Mark step running |
| `code` | `step_id`, `attempt`, `language: "python"`, `source` | Show code block |
| `stdout` | `step_id`, `text` | Append to terminal |
| `error` | `step_id`, `attempt`, `error_type`, `message` | Terminal in red, step "retrying" |
| `retry` | `step_id`, `next_attempt`, `reason` | Retry badge |
| `artifact` | `step_id`, `kind: "chart"\|"table"\|"metric"`, `title`, `payload` | Chart → Plotly JSON; table → `{columns, rows}` (≤100); metric → `{name, value, unit?}` |
| `step_finished` | `step_id`, `status: "ok"\|"failed"` | Mark step done / failed |
| `report` | `markdown`, `cited_metrics: string[]` | Findings panel; every number must exist in a metric or table |
| `run_finished` | `status: "succeeded"\|"failed"\|"not_verified"` | Final badge; "not_verified" shows analyst fallback |

## SSE framing (live)

```
event: run_event
id: 12
data: {"contract_version":1,"run_id":"r_01","seq":12,"type":"stdout","step_id":"s2","text":"Removed 14 duplicate rows"}
```

Client reconnects with `Last-Event-ID`; server resumes after that `seq`.

## Rules

- `seq` strictly increases per run, starting at 1.
- Max 3 attempts per step; after attempt 3 fails → `step_finished: failed` → `run_finished: not_verified`.
- `report.cited_metrics` lists metric names / table cells used; the frontend test fails if a number in `markdown` is not found in run artifacts.
