"""Mirdula's independent reference answers for eval/questions.json (T22).

Written without reading references_arunaw.json or compute_references_arunaw.py.
Answers are computed on the clean base described in eval/datasets.md: the
original UCI file with exact duplicate rows removed.

    python eval/compute_references_mirdula.py eval/data/raw eval/references_mirdula.json

`eval/data/raw/<zip name>/` must hold the extracted downloads listed in datasets.md.
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

import pandas as pd

AUTO_MPG_COLUMNS = [
    "mpg", "cylinders", "displacement", "horsepower", "weight",
    "acceleration", "model_year", "origin", "car_name",
]


def load_clean(raw: Path) -> dict[str, pd.DataFrame]:
    bike = pd.read_csv(raw / "bike+sharing+dataset" / "day.csv")
    wine = pd.read_csv(raw / "wine+quality" / "winequality-red.csv", sep=";")
    realestate = pd.read_excel(raw / "real+estate+valuation+data+set" / "Real estate valuation data set.xlsx")
    autompg = pd.read_csv(
        raw / "auto+mpg" / "auto-mpg.data",
        sep=r"\s+", names=AUTO_MPG_COLUMNS, na_values="?", quotechar='"',
    )
    energy = pd.read_excel(raw / "energy+efficiency" / "ENB2012_data.xlsx").dropna(how="all").dropna(axis=1, how="all")
    frames = {"bike": bike, "wine": wine, "realestate": realestate, "autompg": autompg, "energy": energy}
    return {k: df.drop_duplicates().reset_index(drop=True) for k, df in frames.items()}


def col(df: pd.DataFrame, prefix: str) -> str:
    """Real estate headers are long ('X2 house age'); pick a column by its leading code."""
    matches = [c for c in df.columns if c.startswith(prefix)]
    if len(matches) != 1:
        raise KeyError(f"expected one column starting {prefix!r}, got {matches}")
    return matches[0]


def r2(x: float) -> float:
    return round(float(x), 2)


def num(x: float) -> float | int:
    """Whole numbers as int, others unchanged, so JSON reads naturally."""
    x = float(x)
    return int(x) if x.is_integer() else x


def unique_argmax(series: pd.Series, what: str) -> object:
    top = series.max()
    winners = series[series == top]
    if len(winners) != 1:
        raise ValueError(f"{what}: tie between {list(winners.index)}")
    return winners.index[0]


def answers(d: dict[str, pd.DataFrame]) -> list[dict[str, object]]:
    bike, wine, re_, car, en = d["bike"], d["wine"], d["realestate"], d["autompg"], d["energy"]
    bike_dates = pd.to_datetime(bike["dteday"])
    price, age, mrt, stores = col(re_, "Y "), col(re_, "X2"), col(re_, "X3"), col(re_, "X4")
    car_mpg = car.assign(car_name=car["car_name"].str.strip())

    out: list[tuple[str, object, str]] = [
        ("q01", int(bike.loc[bike_dates.dt.year == 2012, "cnt"].sum()), "sum of cnt where dteday is in 2012"),
        ("q02", int(bike.loc[(bike_dates.dt.year == 2011) & (bike_dates.dt.month == 7), "casual"].sum()),
         "sum of casual where dteday is in July 2011"),
        ("q03", bike_dates[unique_argmax(bike["cnt"], "q03")].strftime("%Y-%m-%d"), "dteday of the row with the highest cnt (unique)"),
        ("q04", int(unique_argmax(bike.groupby("season")["cnt"].mean(), "q04")), "season with the highest mean cnt"),
        ("q05", int((bike["cnt"] > 6000).sum()), "days with cnt strictly greater than 6000"),
        ("q06", r2((bike["holiday"] == 1).mean() * 100), "share of rows with holiday == 1, x100, rounded to 2 dp"),
        ("q07", int((wine["quality"] >= 7).sum()), "rows with quality >= 7"),
        ("q08", r2(wine.loc[wine["quality"] == 8, "alcohol"].mean()), "mean alcohol where quality == 8"),
        ("q09", int(unique_argmax(wine["quality"].value_counts(), "q09")), "most frequent quality value"),
        ("q10", num(wine["alcohol"].max()), "max alcohol"),
        ("q11", r2(wine.loc[wine["quality"] == 5, "pH"].mean()), "mean pH where quality == 5"),
        ("q12", int((wine["volatile acidity"] > 1.0).sum()), "rows with volatile acidity strictly above 1.0"),
        ("q13", int(len(re_)), "row count"),
        ("q14", r2(re_[price].mean()), "mean of Y house price of unit area"),
        ("q15", num(re_[price].max()), "max of Y house price of unit area"),
        ("q16", int((re_[age] >= 30).sum()), "rows with X2 house age >= 30"),
        ("q17", r2(re_.loc[re_[stores] >= 5, price].mean()), "mean Y where X4 convenience stores >= 5"),
        ("q18", int((re_[mrt] <= 500).sum()), "rows with X3 MRT distance <= 500 m"),
        ("q19", r2(car.loc[car["cylinders"] == 4, "mpg"].mean()), "mean mpg where cylinders == 4"),
        ("q20", int((car["cylinders"] == 8).sum()), "rows with cylinders == 8"),
        ("q21", car_mpg.loc[unique_argmax(car_mpg["mpg"], "q21"), "car_name"], "car_name of the row with the highest mpg (unique)"),
        ("q22", r2(car.loc[car["model_year"] == 70, "weight"].mean()), "mean weight where model_year == 70"),
        ("q23", int((car["horsepower"] > 200).sum()), "rows with horsepower strictly above 200 ('?' treated as blank)"),
        ("q24", int(unique_argmax(car.groupby("origin")["mpg"].mean(), "q24")), "origin with the highest mean mpg"),
        ("q25", r2(en["Y1"].mean()), "mean Y1"),
        ("q26", num(en["Y2"].max()), "max Y2"),
        ("q27", int((en["X5"] == 7).sum()), "rows with X5 == 7"),
        ("q28", r2(en.loc[en["X5"] == 3.5, "Y1"].mean()), "mean Y1 where X5 == 3.5"),
        ("q29", int((en["Y1"] > 30).sum()), "rows with Y1 strictly above 30"),
        ("q30", r2(en.loc[en["X2"] == 514.5, "Y2"].mean()), "mean Y2 where X2 == 514.5"),
    ]
    return [{"id": i, "answer": a, "how": h} for i, a, h in out]


def boundary_notes(d: dict[str, pd.DataFrame]) -> dict[str, str]:
    """Values sitting exactly on a question's threshold, where wording changes the answer."""
    re_, car, en, bike, wine = d["realestate"], d["autompg"], d["energy"], d["bike"], d["wine"]
    checks = {
        "q05": int((bike["cnt"] == 6000).sum()),
        "q12": int((wine["volatile acidity"] == 1.0).sum()),
        "q18": int((re_[col(re_, "X3")] == 500).sum()),
        "q23": int((car["horsepower"] == 200).sum()),
        "q29": int((en["Y1"] == 30).sum()),
    }
    return {q: f"{n} row(s) exactly on the threshold" for q, n in checks.items() if n}


def main() -> None:
    raw, out_path = Path(sys.argv[1]), Path(sys.argv[2])
    data = load_clean(raw)
    result = {
        "author": "Mirdula R (Mirdula18)",
        "method": "Independent of Arunaw's answers and script. Clean base = original file minus exact duplicate rows.",
        "clean_rows": {k: int(len(v)) for k, v in data.items()},
        "boundary_notes": boundary_notes(data),
        "answers": answers(data),
    }
    out_path.write_text(json.dumps(result, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(json.dumps(result["clean_rows"]), json.dumps(result["boundary_notes"]))


if __name__ == "__main__":
    main()
