# CogniFlow API stub (T16)

FastAPI + Pydantic v2 implementation of `docs/API_CONTRACT.md` (contract v1). It replays the scripted scenarios in `scenarios/` over SSE. **Replies are scripted demos, not analysis results**; no data file is read or executed.

## Run

```bash
cd api
python -m venv .venv && . .venv/bin/activate      # Windows: .venv\Scripts\activate
pip install -r requirements-dev.txt                # Python 3.11
uvicorn main:app --port 8000
```

`COGNIFLOW_SPEED=4` replays 4x faster (default 1, real `delay_ms`). CORS allows `http://localhost:3000` and `http://127.0.0.1:3000`.

Web side: `NEXT_PUBLIC_DATA_MODE=live` and `NEXT_PUBLIC_API_BASE_URL=http://localhost:8000` in `web/.env.local`.

## Endpoints

| Method | Path | Notes |
| --- | --- | --- |
| GET | `/api/datasets` | The five demo datasets |
| POST | `/api/datasets` | multipart `file`; `.csv` / `.xlsx` up to 20 MB (415 / 413 otherwise). Stub: maps the name to the closest demo dataset |
| GET | `/api/datasets/{id}/profile` | `DatasetProfile` |
| POST | `/api/runs` | `{dataset_id, question}` -> `{run_id}`. Exact scenario question, else the closest one for that dataset |
| GET | `/api/runs/{id}` | `Run` with the events emitted so far |
| GET | `/api/runs/{id}/stream` | SSE: `event: run_event`, `id: <seq>`, `data: <RunEvent JSON>` |

Resume: send `Last-Event-ID: <seq>` (browsers do this on their own reconnect) or `?last_event_id=<seq>`; the stream continues after that `seq`. The stream ends after `run_finished`. `delay_ms` is never sent.

## Files

- `models.py`: Pydantic mirror of the contract (keep in step with `web/lib/contract/` and the doc).
- `store.py`: scenario and dataset loading, question matching (port of `web/lib/mock/match.ts`), in-memory runs.
- `main.py`: the app (`create_app`).
- `scenarios/`, `datasets/`: byte-for-byte copies of `web/lib/mock/scenarios` and `web/lib/mock/datasets/*.profile.json`; a test fails if they drift.

## Test

```bash
cd api && pytest
```

Covers every scenario against the models (including an exact round trip), contract violations, REST, SSE framing, resume, CORS, upload limits.

## Limits of the stub

Runs live in memory and are never evicted; uploads are not parsed. The real backend (LangGraph agents, sandbox, Postgres, Redis) comes after P3.
