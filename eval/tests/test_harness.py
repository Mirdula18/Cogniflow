import json
import sys
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import harness as h  # noqa: E402

EVAL = Path(__file__).resolve().parents[1]
NUM = h.Question("q1", "bike", "How many?", "number", 0.01)
TXT = h.Question("q2", "autompg", "Which car?", "text")


class FakeClient:
    """Test double standing in for a model; says what to return. Not a real model."""

    is_placeholder = False

    def __init__(self, reply=""):
        self.reply, self.prompts = reply, []

    def describe(self):
        return {"name": "fake", "version": "0", "temperature": 0}

    def complete(self, prompt):
        self.prompts.append(prompt)
        return self.reply


class FakeSystem:
    def __init__(self, name, attempts, client=None):
        self.name, self.client, self._attempts = name, client or FakeClient(), attempts

    def answer(self, question, dataset_path):
        return self._attempts[question.id]


def test_is_correct_uses_tolerance_for_numbers_and_ignores_case_for_text():
    assert h.is_correct(NUM, 12.005, 12) and not h.is_correct(NUM, 12.02, 12)
    assert not h.is_correct(NUM, None, 12) and not h.is_correct(NUM, "n/a", 12)
    assert h.is_correct(TXT, "  Mazda GLC ", "mazda glc") and not h.is_correct(TXT, "mazda", "mazda glc")


def test_invented_numbers_are_those_missing_from_executed_output():
    out = ["Backend 5.23", "total 1200000"]
    assert h.invented_numbers("Backend is 5.2 days late; total 12,00,000.", out) == []  # rounded, Indian grouping
    assert h.invented_numbers("Backend is 5.3 days late and 99 tasks", out) == ["5.3", "99"]
    assert h.invented_numbers("P1 tickets in Q3 are fine", []) == []  # labels are not numbers
    assert h.invented_numbers("5 tasks", []) == ["5"]  # nothing executed, so nothing can back a number


def test_parse_final_answer_takes_the_last_answer_line():
    assert h.parse_final_answer("thinking 3\nANSWER: 1,234.5 rentals\nANSWER: 42", "number") == 42
    assert h.parse_final_answer("ANSWER: Mazda GLC", "text") == "Mazda GLC"
    assert h.parse_final_answer("no answer line 7", "number") is None


def test_baseline_sends_one_prompt_with_the_profile_and_the_question(tmp_path):
    (tmp_path / "bike.csv").write_text("a,b\n1,\n2,3\n", encoding="utf8")
    client = FakeClient("ANSWER: 7")
    attempt = h.SinglePromptBaseline(client).answer(NUM, tmp_path / "bike.csv")
    assert attempt.answer == 7 and len(client.prompts) == 1
    assert "2 rows" in client.prompts[0] and "How many?" in client.prompts[0] and "ANSWER:" in client.prompts[0]


def test_run_system_scores_times_and_checks_for_invented_numbers():
    ok = h.Attempt(12, "It is 12.", ["12"])
    bad = h.Attempt(13, "It is 14.", ["13"])
    system = FakeSystem("agent", {"q1": ok, "q2": bad})
    a = h.run_system(system, NUM, 12, Path("x"))
    b = h.run_system(system, h.Question("q2", "bike", "?", "number"), 12, Path("x"))
    assert (a.status, a.correct, a.invented) == ("run", True, []) and a.seconds is not None
    assert (b.correct, b.invented) == (False, ["14"])
    row = h.results_row([a, b], [], "abc123", ["n"])
    assert row["Correct (agent)"] == "1/2" and row["Invented numbers"] == "1/2" and row["Correct (baseline)"] == h.NA
    assert row["Median time"].endswith("s (agent)")


def test_placeholders_and_unbuilt_systems_are_never_called_and_report_na():
    class Boom:
        name, client = "agent", h.PlaceholderClient()

        def answer(self, *a):
            raise AssertionError("placeholder system must not run")

    assert h.run_system(Boom(), NUM, 1, Path("x")).status == "not_run"
    real_client_unbuilt = h.AgentPipeline(FakeClient())
    r = h.run_system(real_client_unbuilt, NUM, 1, Path("x"))
    assert r.status == "not_run" and "not built" in r.note
    row = h.results_row([r], [r], "abc", [])
    assert [row[c] for c in ("Correct (agent)", "Correct (baseline)", "Invented numbers", "Median time")] == [h.NA] * 4
    assert row["Escapes"].startswith("not measured")


def test_question_and_reference_files_line_up():
    heldout, dev = h.load_questions(EVAL / "questions.json", "heldout"), h.load_questions(EVAL / "questions.json", "dev")
    assert (len(heldout), len(dev)) == (20, 10)
    refs = h.load_references(EVAL / "references_arunaw.json")
    assert {q.id for q in heldout + dev} == set(refs)


def test_default_run_writes_a_log_and_a_row_that_says_not_run(tmp_path, capsys):
    assert h.main(["--out-dir", str(tmp_path)]) == 0
    out = capsys.readouterr().out
    assert out.count(h.NA) >= 4 and "references NOT FROZEN" in out and "| Run date |" in out
    (log,) = list(tmp_path.glob("*.json"))
    data = json.loads(log.read_text(encoding="utf8"))
    assert list(data["row"]) == h.COLUMNS
    assert {r["status"] for r in data["results"]["agent"] + data["results"]["baseline"]} == {"not_run"}
    assert len(data["results"]["agent"]) == 20


def test_main_with_injected_systems_fills_real_cells(tmp_path, capsys):
    qs = h.load_questions(EVAL / "questions.json", "heldout")[:2]
    refs = h.load_references(EVAL / "references_arunaw.json")
    attempts = {q.id: h.Attempt(refs[q.id], f"The answer is {refs[q.id]}", [str(refs[q.id])]) for q in qs}
    h.main(["--limit", "2", "--out-dir", str(tmp_path)], agent=FakeSystem("agent", attempts), baseline=FakeSystem("baseline", attempts))
    row = json.loads(next(tmp_path.glob("*.json")).read_text(encoding="utf8"))["row"]
    assert row["Correct (agent)"] == "2/2" and row["Correct (baseline)"] == "2/2" and row["Invented numbers"] == "0/2"
