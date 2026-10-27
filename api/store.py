"""Scenario and dataset catalogue, question matching, and in-memory runs that replay a scenario over time."""
import asyncio
import json
import re
from dataclasses import dataclass, field
from datetime import datetime, timezone
from pathlib import Path

from models import (
    CONTRACT_VERSION,
    RUN_EVENT,
    Dataset,
    DatasetProfile,
    DemoDatasetFile,
    Run,
    RunEvent,
)

# Same value the web mock uses, so demo datasets look identical in both modes.
DEMO_CREATED_AT = "2026-01-01T00:00:00Z"
_PLACEHOLDER = {"contract_version": CONTRACT_VERSION, "run_id": "validation", "ts": "2000-01-01T00:00:00Z"}


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="milliseconds").replace("+00:00", "Z")


@dataclass(frozen=True)
class Scenario:
    scenario_id: str
    dataset_id: str
    question: str
    events: list[dict]  # raw scenario events: no run_id / ts / contract_version yet


@dataclass(frozen=True)
class DemoDataset:
    dataset: Dataset
    profile: DatasetProfile


def parse_scenario(raw: dict) -> Scenario:
    """Mirror of parseScenarioFile in web/lib/mock/scenarioFile.ts: contract-valid events, seq 1..n, run_started first, run_finished last."""
    label = f"scenario {raw['scenario_id']}"
    events = raw["events"]
    for i, event in enumerate(events, 1):
        if event.get("seq") != i:
            raise ValueError(f"{label}: expected seq {i}, got {event.get('seq')}")
        RUN_EVENT.validate_python({**event, **_PLACEHOLDER})  # raises with the offending field
    if events[0]["type"] != "run_started":
        raise ValueError(f"{label}: first event must be run_started")
    if events[-1]["type"] != "run_finished":
        raise ValueError(f"{label}: last event must be run_finished")
    return Scenario(raw["scenario_id"], raw["dataset_id"], raw["question"], events)


def load_scenarios(directory: Path) -> list[Scenario]:
    scenarios = [parse_scenario(json.loads(p.read_text(encoding="utf8"))) for p in sorted(directory.glob("*.json"))]
    ids = [s.scenario_id for s in scenarios]
    if len(ids) != len(set(ids)):
        raise ValueError("duplicate scenario_id")
    return scenarios


def load_datasets(directory: Path) -> list[DemoDataset]:
    found = []
    for path in sorted(directory.glob("*.profile.json")):
        file = DemoDatasetFile.model_validate_json(path.read_text(encoding="utf8"))
        profile = DatasetProfile.model_validate(file.model_dump(exclude={"name"}))
        found.append(
            DemoDataset(
                Dataset(
                    id=profile.dataset_id,
                    name=file.name or profile.dataset_id,
                    rows=profile.rows,
                    columns=len(profile.columns),
                    source="demo",
                    created_at=DEMO_CREATED_AT,
                ),
                profile,
            )
        )
    return sorted(found, key=lambda d: d.dataset.id)


# --- matching: port of web/lib/mock/match.ts --------------------------------------------------

_STOP_WORDS = {"the", "and", "for", "are", "was", "did", "who", "what", "which", "why", "how", "this", "that", "with", "per", "last", "next"}


def normalise_question(question: str) -> str:
    return re.sub(r"\s+", " ", re.sub(r"[^\w\s]", " ", question.lower())).strip()


def _keywords(text: str) -> set[str]:
    return {w for w in normalise_question(text).split(" ") if len(w) > 2 and w not in _STOP_WORDS}


def similarity(a: str, b: str) -> float:
    """Jaccard overlap of keyword sets, 0..1."""
    ka, kb = _keywords(a), _keywords(b)
    if not ka or not kb:
        return 0.0
    return len(ka & kb) / len(ka | kb)


def match_scenario(scenarios: list[Scenario], dataset_id: str, question: str) -> tuple[Scenario, bool] | None:
    """Exact match on a scenario question, otherwise the closest one for that dataset. (scenario, exact)."""
    candidates = sorted((s for s in scenarios if s.dataset_id == dataset_id), key=lambda s: s.scenario_id)
    wanted = normalise_question(question)
    for s in candidates:
        if normalise_question(s.question) == wanted:
            return s, True
    best, best_score = None, -1.0
    for s in candidates:
        score = similarity(question, s.question)
        if score > best_score:
            best, best_score = s, score
    return (best, False) if best else None


# --- runs ----------------------------------------------------------------------------------


@dataclass
class RunRecord:
    run_id: str
    dataset_id: str
    question: str
    scenario: Scenario
    speed: float
    created_at: str = field(default_factory=now_iso)
    status: str = "queued"
    events: list[RunEvent] = field(default_factory=list)  # events[seq - 1]
    finished: bool = False
    _changed: asyncio.Condition = field(default_factory=asyncio.Condition)

    async def play(self) -> None:
        """Replays the scenario, waiting each event's delay_ms. Live events carry no delay_ms."""
        try:
            for raw in self.scenario.events:
                await asyncio.sleep(raw.get("delay_ms", 0) / 1000 / self.speed)
                body = {k: v for k, v in raw.items() if k != "delay_ms"}
                event = RUN_EVENT.validate_python(
                    {**body, "contract_version": CONTRACT_VERSION, "run_id": self.run_id, "ts": now_iso()}
                )
                async with self._changed:
                    self.events.append(event)
                    if event.type == "run_started":
                        self.status = "running"
                    elif event.type == "run_finished":
                        self.status = event.status
                    self._changed.notify_all()
        finally:
            async with self._changed:
                self.finished = True
                self._changed.notify_all()

    async def stream(self, after_seq: int = 0):
        """Yields every event with seq > after_seq, waiting for new ones until the run ends."""
        sent = max(after_seq, 0)
        while True:
            async with self._changed:
                await self._changed.wait_for(lambda: len(self.events) > sent or self.finished)
                batch = self.events[sent:]
            for event in batch:
                yield event
            sent += len(batch)
            if self.finished and sent >= len(self.events):
                return

    def to_run(self) -> Run:
        return Run(
            id=self.run_id,
            dataset_id=self.dataset_id,
            question=self.question,
            status=self.status,
            created_at=self.created_at,
            events=list(self.events),
        )
