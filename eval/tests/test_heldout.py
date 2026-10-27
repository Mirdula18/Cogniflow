"""The frozen held-out set must match questions.json and both independent reference files."""

import json
from pathlib import Path

EVAL = Path(__file__).resolve().parents[1]


def load(name):
    return json.loads((EVAL / name).read_text(encoding="utf8"))


def answers(name):
    return {a["id"]: a["answer"] for a in load(name)["answers"]}


def same(q, a, b):
    if q["type"] == "number":
        return abs(float(a) - float(b)) <= q["tolerance"] + 1e-9
    return str(a).strip().lower() == str(b).strip().lower()


def test_heldout_is_the_twenty_heldout_questions_unchanged():
    heldout = load("heldout.json")
    expected = [
        {k: q[k] for k in ("id", "dataset", "question", "type", "tolerance")}
        for q in load("questions.json")["questions"]
        if q["split"] == "heldout"
    ]
    assert heldout["questions"] == expected
    assert len(expected) == 20
    assert [a["id"] for a in heldout["answers"]] == [q["id"] for q in expected]


def test_both_independent_references_agree_on_every_question():
    questions = load("questions.json")["questions"]
    arunaw, mirdula = answers("references_arunaw.json"), answers("references_mirdula.json")
    disagreements = [q["id"] for q in questions if not same(q, arunaw[q["id"]], mirdula[q["id"]])]
    assert disagreements == []


def test_frozen_answers_match_both_references():
    questions = {q["id"]: q for q in load("questions.json")["questions"]}
    frozen = answers("heldout.json")
    for name in ("references_arunaw.json", "references_mirdula.json"):
        refs = answers(name)
        assert all(same(questions[i], a, refs[i]) for i, a in frozen.items()), name
