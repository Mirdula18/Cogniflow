import json
from pathlib import Path

import pytest
from pydantic import ValidationError

from models import RUN_EVENT, DemoDatasetFile, MetricArtifactEvent
from store import load_datasets, load_scenarios, parse_scenario

API = Path(__file__).resolve().parents[1]
WEB_MOCK = API.parent / "web/lib/mock"
BASE = {"contract_version": 1, "run_id": "r_1", "ts": "2026-01-01T00:00:00Z"}
SCENARIOS = sorted((API / "scenarios").glob("sc_*.json"))


def event(**fields):
    return {**BASE, "seq": 1, **fields}


def test_there_are_five_scenarios():
    assert [p.stem for p in SCENARIOS] == ["sc_01", "sc_02", "sc_03", "sc_04", "sc_05"]


@pytest.mark.parametrize("path", SCENARIOS, ids=lambda p: p.stem)
def test_every_scenario_validates_against_the_models(path):
    parse_scenario(json.loads(path.read_text(encoding="utf8")))


@pytest.mark.parametrize("path", SCENARIOS, ids=lambda p: p.stem)
def test_events_round_trip_unchanged(path):
    """Validating then serialising must not drop, add or coerce anything (null vs absent, int vs float)."""
    for raw in json.loads(path.read_text(encoding="utf8"))["events"]:
        full = {**raw, **BASE}
        back = RUN_EVENT.dump_python(RUN_EVENT.validate_python(full), mode="json")
        assert back == full, f"seq {raw['seq']} ({raw['type']})"


def test_catalogue_loads_and_mirrors_the_web_mock_files():
    assert [s.scenario_id for s in load_scenarios(API / "scenarios")] == ["sc_01", "sc_02", "sc_03", "sc_04", "sc_05"]
    assert len(load_datasets(API / "datasets")) == 5
    if WEB_MOCK.is_dir():
        for folder, pattern in (("scenarios", "sc_*.json"), ("datasets", "*.profile.json")):
            for path in (API / folder).glob(pattern):
                assert path.read_bytes() == (WEB_MOCK / folder / path.name).read_bytes(), path.name


def test_dataset_profile_files_validate():
    for path in (API / "datasets").glob("*.profile.json"):
        DemoDatasetFile.model_validate_json(path.read_text(encoding="utf8"))


@pytest.mark.parametrize(
    "bad",
    [
        event(type="run_started", question=""),
        event(type="run_finished", status="done"),
        event(type="step_started", step_id="s1", attempt=4),
        event(type="retry", step_id="s1", next_attempt=1, reason="x"),
        event(type="code", step_id="s1", attempt=1, language="sql", source="x"),
        event(type="artifact", step_id="s1", kind="table", title="t", payload={"columns": ["a", "b"], "rows": [[1]]}),
        event(type="artifact", step_id="s1", kind="table", title="t", payload={"columns": ["a"], "rows": [[1]] * 101}),
        event(type="artifact", step_id="s1", kind="pie", title="t", payload={}),
        event(type="nope"),
        {**event(type="run_started", question="q"), "contract_version": 2},
        {**event(type="run_started", question="q"), "ts": "2026-01-01T00:00:00"},
        {**event(type="run_started", question="q"), "seq": 0},
    ],
)
def test_contract_violations_are_rejected(bad):
    with pytest.raises(ValidationError):
        RUN_EVENT.validate_python(bad)


def test_optional_fields_are_left_out_not_null():
    metric = RUN_EVENT.validate_python(
        event(type="artifact", step_id="s1", kind="metric", title="m", payload={"name": "n", "value": 1})
    )
    assert isinstance(metric, MetricArtifactEvent)
    dumped = RUN_EVENT.dump_python(metric, mode="json")
    assert "unit" not in dumped["payload"] and "delay_ms" not in dumped
    with_delay = RUN_EVENT.validate_python({**event(type="run_started", question="q"), "delay_ms": 5})
    assert RUN_EVENT.dump_python(with_delay, mode="json")["delay_ms"] == 5
