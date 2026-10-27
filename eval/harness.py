"""Evaluation harness skeleton (T23) for docs/POC_TEST_PLAN.md.

For each held-out question it runs (a) the agent pipeline and (b) the single-prompt baseline, compares each
answer with the reference answers, checks the summary for invented numbers, times the run, and writes one row
shaped like the plan's results table plus a per-question JSON log.

    python eval/harness.py [--split heldout] [--limit N]

No real model client or agent pipeline exists yet. Both systems default to placeholders, so a default run calls
nothing and reports "n/a (not run)": it never produces numbers that look like results. Real clients plug in
through the ModelClient interface; call main(agent=..., baseline=...) from your own script.
Nothing here edits docs/POC_TEST_PLAN.md: copy a row there by hand after a real run.
"""
import argparse
import hashlib
import json
import re
import statistics
import subprocess
import sys
import time
from dataclasses import asdict, dataclass, field
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Protocol

HERE = Path(__file__).resolve().parent
COLUMNS = ["Run date", "Commit", "Correct (agent)", "Correct (baseline)", "Invented numbers", "Median time", "Escapes", "Notes"]
NA = "n/a (not run)"


@dataclass(frozen=True)
class Question:
    id: str
    dataset: str
    question: str
    type: str  # "number" | "text"
    tolerance: float = 0


@dataclass
class Attempt:
    """What a system produced for one question."""

    answer: Any  # parsed final answer: number, text, or None if it gave none
    summary: str  # text a user would read
    outputs: list[str] = field(default_factory=list)  # text printed by code that really ran
    cost_usd: float | None = None


class ModelClient(Protocol):
    """The only door to a language model. Implementations record name, version and temperature (test plan, Boundary)."""

    is_placeholder: bool

    def describe(self) -> dict: ...

    def complete(self, prompt: str) -> str: ...


class PlaceholderClient:
    """Stands in until a model is approved (test plan: LLM use needs the mentor's approval). Calls nothing."""

    is_placeholder = True

    def describe(self) -> dict:
        return {"name": "placeholder", "version": None, "temperature": None}

    def complete(self, prompt: str) -> str:
        raise RuntimeError("PlaceholderClient has no model; the harness must not call it")


class System(Protocol):
    name: str
    client: ModelClient

    def answer(self, question: Question, dataset_path: Path) -> Attempt: ...


# --- answer checks -------------------------------------------------------------------------------

# Digits not glued to letters ("P1", "Q3" are labels); Indian (1,20,000) or Western (120,000) grouping.
_NUMBER = re.compile(r"(?<![\w.,])-?(?:\d{1,3}(?:,\d{2,3})+|\d+)(?:\.\d+)?(?![\w]|\.\d|,\d)")


def numbers(text: str) -> list[tuple[str, float, int]]:
    """(text, value, decimals written) for each number in `text`."""
    found = []
    for m in _NUMBER.finditer(text.replace("−", "-")):
        plain = m.group().replace(",", "")
        found.append((m.group(), float(plain), len(plain.split(".")[1]) if "." in plain else 0))
    return found


def is_correct(q: Question, answer: Any, reference: Any) -> bool:
    """Numbers match within the question's absolute tolerance; text matches ignoring case and outer spaces."""
    if answer is None:
        return False
    if q.type == "number":
        try:
            return abs(float(answer) - float(reference)) <= q.tolerance + 1e-9
        except (TypeError, ValueError):
            return False
    return str(answer).strip().casefold() == str(reference).strip().casefold()


def invented_numbers(summary: str, outputs: list[str]) -> list[str]:
    """Numbers in the summary that no executed output contains, compared at the precision written."""
    sources = [value for _, value, _ in numbers("\n".join(outputs))]
    return [
        text
        for text, value, decimals in numbers(summary)
        if not any(round(abs(s), decimals) == abs(value) for s in sources)
    ]


# --- systems ---------------------------------------------------------------------------------------


def profile_text(path: Path) -> str:
    """Schema and a few rows, the only data a single-prompt baseline gets."""
    import pandas as pd  # local: the harness itself needs no data libraries

    df = pd.read_csv(path)
    return f"{len(df)} rows\n{df.dtypes.to_string()}\nBlank cells per column:\n{df.isna().sum().to_string()}\n{df.head(5).to_string()}"


def parse_final_answer(text: str, qtype: str) -> Any:
    """Takes the last 'ANSWER: <value>' line; a number for number questions. None when absent."""
    lines = [m.group(1).strip() for line in text.splitlines() if (m := re.match(r"\s*ANSWER:\s*(.+)", line, re.I))]
    if not lines:
        return None
    if qtype == "number":
        nums = numbers(lines[-1])
        return nums[0][1] if nums else None
    return lines[-1]


class SinglePromptBaseline:
    """The comparator in the test plan: one prompt with the profile and the question. No plan, no retry, no code run."""

    name = "baseline"

    def __init__(self, client: ModelClient):
        self.client = client

    def answer(self, question: Question, dataset_path: Path) -> Attempt:
        prompt = (
            f"Dataset profile:\n{profile_text(dataset_path)}\n\nQuestion: {question.question}\n"
            "Give the final answer on the last line as 'ANSWER: <value>'."
        )
        text = self.client.complete(prompt)
        return Attempt(answer=parse_final_answer(text, question.type), summary=text)


class AgentPipeline:
    """Plan, code, execute in the sandbox, retry (up to 3), report. Not built yet: see docs/SANDBOX.md and docs/ARCHITECTURE.md."""

    name = "agent"

    def __init__(self, client: ModelClient):
        self.client = client

    def answer(self, question: Question, dataset_path: Path) -> Attempt:
        raise NotImplementedError("agent pipeline is not built yet (after P3)")


# --- the run -------------------------------------------------------------------------------------


@dataclass
class QuestionResult:
    id: str
    status: str  # "run" | "not_run"
    note: str = ""
    answer: Any = None
    reference: Any = None
    correct: bool | None = None
    invented: list[str] = field(default_factory=list)
    seconds: float | None = None
    cost_usd: float | None = None


def run_system(system: System, q: Question, reference: Any, dataset_path: Path) -> QuestionResult:
    if system.client.is_placeholder:
        return QuestionResult(q.id, "not_run", "placeholder client", reference=reference)
    start = time.perf_counter()
    try:
        attempt = system.answer(q, dataset_path)
    except NotImplementedError as e:
        return QuestionResult(q.id, "not_run", str(e), reference=reference)
    seconds = time.perf_counter() - start
    return QuestionResult(
        q.id, "run", answer=attempt.answer, reference=reference, correct=is_correct(q, attempt.answer, reference),
        invented=invented_numbers(attempt.summary, attempt.outputs), seconds=seconds, cost_usd=attempt.cost_usd,
    )


def _score(results: list[QuestionResult]) -> str:
    ran = [r for r in results if r.status == "run"]
    return f"{sum(bool(r.correct) for r in ran)}/{len(ran)}" if ran else NA


def results_row(agent: list[QuestionResult], baseline: list[QuestionResult], commit: str, notes: list[str]) -> dict[str, str]:
    """One row for the plan's results table. Cells say n/a unless real runs happened."""
    ran = [r for r in agent if r.status == "run"]
    return {
        "Run date": datetime.now(timezone.utc).strftime("%Y-%m-%d"),
        "Commit": commit,
        "Correct (agent)": _score(agent),
        "Correct (baseline)": _score(baseline),
        "Invented numbers": f"{sum(bool(r.invented) for r in ran)}/{len(ran)}" if ran else NA,
        "Median time": f"{statistics.median(r.seconds for r in ran):.1f} s (agent)" if ran else NA,
        "Escapes": "not measured here (sandbox checks)",
        "Notes": "; ".join(notes),
    }


def markdown_row(row: dict[str, str]) -> str:
    return "| " + " | ".join(row[c] for c in COLUMNS) + " |"


def load_questions(path: Path, split: str) -> list[Question]:
    raw = json.loads(path.read_text(encoding="utf8"))["questions"]
    return [Question(q["id"], q["dataset"], q["question"], q["type"], q.get("tolerance", 0)) for q in raw if q["split"] == split]


def load_references(path: Path) -> dict[str, Any]:
    return {a["id"]: a["answer"] for a in json.loads(path.read_text(encoding="utf8"))["answers"]}


def git_commit() -> str:
    try:
        return subprocess.run(["git", "rev-parse", "--short", "HEAD"], cwd=HERE, capture_output=True, text=True, check=True).stdout.strip()
    except (OSError, subprocess.CalledProcessError):
        return "unknown"


def tag(path: Path) -> str:
    return f"{path.name}#{hashlib.sha256(path.read_bytes()).hexdigest()[:8]}"


def main(argv: list[str] | None = None, agent: System | None = None, baseline: System | None = None) -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--questions", type=Path, default=HERE / "questions.json")
    ap.add_argument("--references", type=Path, default=HERE / "references_arunaw.json")
    ap.add_argument("--split", choices=["heldout", "dev"], default="heldout")
    ap.add_argument("--data-dir", type=Path, default=HERE / "data/messy", help="messy CSVs written by inject_mess.py")
    ap.add_argument("--out-dir", type=Path, default=HERE / "runs")
    ap.add_argument("--limit", type=int, default=None)
    args = ap.parse_args(argv)

    agent = agent or AgentPipeline(PlaceholderClient())
    baseline = baseline or SinglePromptBaseline(PlaceholderClient())
    questions = load_questions(args.questions, args.split)[: args.limit]
    refs = load_references(args.references)
    missing = [q.id for q in questions if q.id not in refs]
    if missing:
        sys.exit(f"no reference answer for {missing}")

    logs = {s.name: [run_system(s, q, refs[q.id], args.data_dir / f"{q.dataset}.csv") for q in questions] for s in (agent, baseline)}
    notes = [f"{len(questions)} {args.split} questions", f"questions={tag(args.questions)}", f"refs={tag(args.references)}"]
    notes += [f"{s.name} model={s.client.describe()['name']}" for s in (agent, baseline)]
    if args.references.name != "heldout.json":
        notes.append("references NOT FROZEN")
    for s in (agent, baseline):
        reasons = {r.note for r in logs[s.name] if r.status == "not_run"}
        if reasons:
            notes.append(f"{s.name} not run: {', '.join(sorted(reasons))}")
    notes.append("manual Excel timing not recorded here")

    row = results_row(logs["agent"], logs["baseline"], git_commit(), notes)
    args.out_dir.mkdir(parents=True, exist_ok=True)
    stamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    log_path = args.out_dir / f"{stamp}.json"
    log_path.write_text(
        json.dumps({"row": row, "models": {s.name: s.client.describe() for s in (agent, baseline)}, "results": {k: [asdict(r) for r in v] for k, v in logs.items()}}, indent=2) + "\n",
        encoding="utf8",
    )
    print("| " + " | ".join(COLUMNS) + " |\n|" + " --- |" * len(COLUMNS))
    print(markdown_row(row))
    print(f"\nlog: {log_path}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
