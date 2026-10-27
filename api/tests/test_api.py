import json

import pytest

from models import RUN_EVENT

Q_DELIVERY = "Why did delivery slip last month?"


def sse(client, url, **kwargs):
    """Returns (response headers, [(event name, id, parsed data)]) for a finished stream."""
    frames, current = [], {}
    with client.stream("GET", url, **kwargs) as r:
        assert r.status_code == 200
        headers = r.headers
        for line in r.iter_lines():
            if line == "":
                if current:
                    frames.append((current["event"], current["id"], json.loads(current["data"])))
                current = {}
            else:
                key, _, value = line.partition(": ")
                current[key] = value
    return headers, frames


def start(client, dataset_id="ds_delivery", question=Q_DELIVERY):
    r = client.post("/api/runs", json={"dataset_id": dataset_id, "question": question})
    assert r.status_code == 200
    return r.json()["run_id"]


def test_datasets_and_profile(client):
    datasets = client.get("/api/datasets").json()
    assert [d["id"] for d in datasets] == ["ds_costs", "ds_delivery", "ds_hr", "ds_sales", "ds_tickets"]
    assert datasets[1] == {
        "id": "ds_delivery",
        "name": "project_delivery.csv",
        "rows": 480,
        "columns": 9,
        "source": "demo",
        "created_at": "2026-01-01T00:00:00Z",
    }
    profile = client.get("/api/datasets/ds_delivery/profile").json()
    assert profile["rows"] == 480 and profile["duplicates"] == 14 and "name" not in profile
    assert len(profile["head"]) == 5
    assert client.get("/api/datasets/nope/profile").status_code == 404


def test_upload_maps_to_closest_demo_dataset_and_enforces_limits(client):
    ok = client.post("/api/datasets", files={"file": ("regional_sales.xlsx", b"x")})
    assert ok.status_code == 200 and ok.json()["id"] == "ds_sales"
    assert client.post("/api/datasets", files={"file": ("notes.txt", b"x")}).status_code == 415
    assert client.post("/api/datasets", files={"file": ("big.csv", b"x" * (20 * 1024 * 1024 + 1))}).status_code == 413


def test_start_run_validates_input(client):
    assert client.post("/api/runs", json={"dataset_id": "nope", "question": "q"}).status_code == 404
    assert client.post("/api/runs", json={"dataset_id": "ds_delivery", "question": "   "}).status_code == 422
    assert client.post("/api/runs", json={"dataset_id": "ds_delivery"}).status_code == 422
    assert client.get("/api/runs/r_999").status_code == 404
    assert client.get("/api/runs/r_999/stream").status_code == 404


def test_stream_is_sse_with_contract_valid_events_in_order(client):
    headers, frames = sse(client, f"/api/runs/{start(client)}/stream")
    assert headers["content-type"].startswith("text/event-stream")
    assert {f[0] for f in frames} == {"run_event"}
    assert [int(f[1]) for f in frames] == list(range(1, len(frames) + 1))
    for _, seq, data in frames:
        event = RUN_EVENT.validate_python(data)
        assert event.seq == int(seq) and event.run_id == "r_001"
        assert "delay_ms" not in data
    assert frames[0][2]["type"] == "run_started" and frames[0][2]["question"] == Q_DELIVERY
    assert frames[-1][2]["type"] == "run_finished" and frames[-1][2]["status"] == "succeeded"


def test_stream_resumes_after_last_event_id(client):
    run_id = start(client)
    _, all_frames = sse(client, f"/api/runs/{run_id}/stream")
    _, by_header = sse(client, f"/api/runs/{run_id}/stream", headers={"Last-Event-ID": "10"})
    _, by_query = sse(client, f"/api/runs/{run_id}/stream?last_event_id=10")
    assert [f[1] for f in by_header] == [f[1] for f in all_frames[10:]] and by_header[0][1] == "11"
    assert by_query == by_header
    _, none_left = sse(client, f"/api/runs/{run_id}/stream", headers={"Last-Event-ID": str(len(all_frames))})
    assert none_left == []
    assert client.get(f"/api/runs/{run_id}/stream", headers={"Last-Event-ID": "abc"}).status_code == 400


def test_get_run_returns_the_events_and_final_status(client):
    run_id = start(client)
    _, frames = sse(client, f"/api/runs/{run_id}/stream")
    run = client.get(f"/api/runs/{run_id}").json()
    assert run["status"] == "succeeded" and run["dataset_id"] == "ds_delivery" and run["question"] == Q_DELIVERY
    assert run["events"] == [f[2] for f in frames]


@pytest.mark.parametrize(
    ("dataset_id", "question", "final"),
    [
        ("ds_sales", "Which region's revenue fell most this quarter?", "succeeded"),
        ("ds_hr", "Who is over-allocated next sprint?", "not_verified"),
    ],
)
def test_scenario_paths_end_with_the_scripted_status(client, dataset_id, question, final):
    run_id = start(client, dataset_id, question)
    _, frames = sse(client, f"/api/runs/{run_id}/stream")
    assert frames[-1][2]["status"] == final
    assert client.get(f"/api/runs/{run_id}").json()["status"] == final


def test_unknown_question_replays_the_closest_scenario_for_the_dataset(client):
    run_id = start(client, "ds_tickets", "how many urgent tickets met the SLA")
    _, frames = sse(client, f"/api/runs/{run_id}/stream")
    assert frames[0][2]["question"] == "Are P1 tickets resolved within 24 hours?"  # the scenario's own question


def test_cors_allows_the_web_dev_origin_only(client):
    ok = client.get("/api/datasets", headers={"Origin": "http://localhost:3000"})
    assert ok.headers["access-control-allow-origin"] == "http://localhost:3000"
    other = client.get("/api/datasets", headers={"Origin": "http://evil.example"})
    assert "access-control-allow-origin" not in other.headers
    pre = client.options(
        "/api/runs",
        headers={
            "Origin": "http://localhost:3000",
            "Access-Control-Request-Method": "POST",
            "Access-Control-Request-Headers": "content-type",
        },
    )
    assert pre.status_code == 200
