"""CogniFlow API stub (T16): the REST + SSE contract in docs/API_CONTRACT.md, replaying scripted scenarios.

Run: `uvicorn main:app --port 8000` from this folder. Replies are scripted demos, not analysis results.
"""
import asyncio
import os
from contextlib import asynccontextmanager
from pathlib import Path
from typing import Annotated

from fastapi import FastAPI, Header, HTTPException, Query, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse

from models import RUN_EVENT, Dataset, DatasetProfile, Run, StartRunRequest, StartRunResponse
from store import RunRecord, load_datasets, load_scenarios, match_scenario, similarity

HERE = Path(__file__).resolve().parent
UPLOAD_EXTENSIONS = (".csv", ".xlsx")
UPLOAD_MAX_BYTES = 20 * 1024 * 1024  # docs/API_CONTRACT.md: .csv, .xlsx <= 20 MB
CORS_ORIGINS = ["http://localhost:3000", "http://127.0.0.1:3000"]


def create_app(scenario_dir: Path = HERE / "scenarios", dataset_dir: Path = HERE / "datasets", speed: float | None = None) -> FastAPI:
    """`speed` divides every scenario delay; defaults to $COGNIFLOW_SPEED or 1 (real time)."""
    speed = speed if speed is not None else float(os.environ.get("COGNIFLOW_SPEED", "1"))
    if speed <= 0:
        raise ValueError("speed must be > 0")
    scenarios = load_scenarios(scenario_dir)
    datasets = {d.dataset.id: d for d in load_datasets(dataset_dir)}
    runs: dict[str, RunRecord] = {}  # shortcut: in-memory, never evicted; fine for a demo stub
    tasks: set[asyncio.Task] = set()

    @asynccontextmanager
    async def lifespan(_: FastAPI):
        yield
        for task in tasks:
            task.cancel()

    app = FastAPI(title="CogniFlow API stub", version="1", lifespan=lifespan)
    app.add_middleware(CORSMiddleware, allow_origins=CORS_ORIGINS, allow_methods=["GET", "POST"], allow_headers=["Content-Type", "Last-Event-ID"])

    def dataset_or_404(dataset_id: str):
        if dataset_id not in datasets:
            raise HTTPException(404, f'Unknown dataset "{dataset_id}"')
        return datasets[dataset_id]

    def run_or_404(run_id: str) -> RunRecord:
        if run_id not in runs:
            raise HTTPException(404, f'Unknown run "{run_id}"')
        return runs[run_id]

    @app.get("/api/datasets", response_model=list[Dataset])
    def list_datasets():
        return [d.dataset for d in datasets.values()]

    @app.post("/api/datasets", response_model=Dataset)
    async def upload_dataset(file: UploadFile):
        """Stub: checks type and size, then maps the file to the closest demo dataset by name (nothing is parsed)."""
        name = file.filename or ""
        if not name.lower().endswith(UPLOAD_EXTENSIONS):
            raise HTTPException(415, "Only .csv and .xlsx files are supported")
        if len(await file.read(UPLOAD_MAX_BYTES + 1)) > UPLOAD_MAX_BYTES:
            raise HTTPException(413, "Files must be 20 MB or smaller")
        if not datasets:
            raise HTTPException(404, "No demo datasets are available")
        clean = lambda s: s.replace("_", " ").replace(".", " ").replace("-", " ")  # noqa: E731
        best = max(datasets.values(), key=lambda d: similarity(clean(name), clean(d.dataset.name)))
        return best.dataset

    @app.get("/api/datasets/{dataset_id}/profile", response_model=DatasetProfile)
    def get_profile(dataset_id: str):
        return dataset_or_404(dataset_id).profile

    @app.post("/api/runs", response_model=StartRunResponse)
    async def start_run(body: StartRunRequest):
        dataset_or_404(body.dataset_id)
        match = match_scenario(scenarios, body.dataset_id, body.question)
        if match is None:
            raise HTTPException(404, f'No demo scenario for dataset "{body.dataset_id}"')
        run_id = f"r_{len(runs) + 1:03d}"
        record = RunRecord(run_id, body.dataset_id, body.question, match[0], speed)
        runs[run_id] = record
        task = asyncio.create_task(record.play())
        tasks.add(task)
        task.add_done_callback(tasks.discard)
        return StartRunResponse(run_id=run_id)

    @app.get("/api/runs/{run_id}", response_model=Run)
    def get_run(run_id: str):
        return run_or_404(run_id).to_run()

    @app.get("/api/runs/{run_id}/stream")
    async def stream_run(
        run_id: str,
        last_event_id: Annotated[str | None, Header()] = None,
        resume_from: Annotated[str | None, Query(alias="last_event_id")] = None,
    ):
        """SSE. Resumes after the `Last-Event-ID` header (browser reconnect) or `?last_event_id=` (manual reconnect)."""
        record = run_or_404(run_id)
        raw = last_event_id if last_event_id is not None else resume_from
        try:
            after = int(raw) if raw not in (None, "") else 0
        except ValueError:
            raise HTTPException(400, "Last-Event-ID must be an integer seq") from None

        async def frames():
            async for event in record.stream(after):
                data = RUN_EVENT.dump_json(event).decode("utf8")
                yield f"event: run_event\nid: {event.seq}\ndata: {data}\n\n"

        return StreamingResponse(
            frames(), media_type="text/event-stream", headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"}
        )

    return app


app = create_app()
