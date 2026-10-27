"""Arunaw's own reference answers for eval/questions.json, computed on the clean base of each dataset
(raw file, exact duplicate rows removed). Independent of any other member's answers.

    python eval/compute_references_arunaw.py     # reads eval/data/raw/, writes eval/references_arunaw.json
"""
import json
import sys
from pathlib import Path

import pandas as pd

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
from inject_mess import DATASETS  # noqa: E402

RAW = HERE / "data/raw"
FILES = {
    "bike": "bike/day.csv",
    "wine": "wine/winequality-red.csv",
    "realestate": "realestate/Real estate valuation data set.xlsx",
    "autompg": "autompg/auto-mpg.data",
    "energy": "energy/ENB2012_data.xlsx",
}
d = {k: DATASETS[k]["read"](RAW / f).drop_duplicates().reset_index(drop=True) for k, f in FILES.items()}
bike, wine, re_, auto, en = d["bike"], d["wine"], d["realestate"], d["autompg"], d["energy"]
bike["dt"] = pd.to_datetime(bike["dteday"])
PRICE = "Y house price of unit area"

# id -> (answer, how it was computed)
ANSWERS = {
    "q01": (bike.loc[bike.yr == 1, "cnt"].sum(), "sum of cnt where yr == 1 (2012)"),
    "q02": (bike.loc[(bike.dt.dt.year == 2011) & (bike.dt.dt.month == 7), "casual"].sum(), "sum of casual for dates in 2011-07"),
    "q03": (bike.loc[bike.cnt.idxmax(), "dteday"], "dteday of the row with the largest cnt"),
    "q04": (bike.groupby("season")["cnt"].mean().idxmax(), "season with the largest mean cnt"),
    "q05": ((bike.cnt > 6000).sum(), "count of days with cnt > 6000"),
    "q06": (round(bike.holiday.mean() * 100, 2), "mean of holiday flag x 100"),
    "q07": ((wine.quality >= 7).sum(), "count of quality >= 7"),
    "q08": (round(wine.loc[wine.quality == 8, "alcohol"].mean(), 2), "mean alcohol where quality == 8"),
    "q09": (wine.quality.value_counts().idxmax(), "most frequent quality value"),
    "q10": (wine.alcohol.max(), "max alcohol"),
    "q11": (round(wine.loc[wine.quality == 5, "pH"].mean(), 2), "mean pH where quality == 5"),
    "q12": ((wine["volatile acidity"] > 1.0).sum(), "count of volatile acidity > 1.0"),
    "q13": (len(re_), "row count"),
    "q14": (round(re_[PRICE].mean(), 2), "mean of price per unit area"),
    "q15": (re_[PRICE].max(), "max of price per unit area"),
    "q16": ((re_["X2 house age"] >= 30).sum(), "count of X2 house age >= 30"),
    "q17": (round(re_.loc[re_["X4 number of convenience stores"] >= 5, PRICE].mean(), 2), "mean price where X4 >= 5"),
    "q18": ((re_["X3 distance to the nearest MRT station"] <= 500).sum(), "count of X3 <= 500 m"),
    "q19": (round(auto.loc[auto.cylinders == 4, "mpg"].mean(), 2), "mean mpg where cylinders == 4"),
    "q20": ((auto.cylinders == 8).sum(), "count of cylinders == 8"),
    "q21": (auto.loc[auto.mpg.idxmax(), "car_name"], "car_name of the row with the largest mpg"),
    "q22": (round(auto.loc[auto.model_year == 70, "weight"].mean(), 2), "mean weight where model_year == 70"),
    "q23": ((auto.horsepower > 200).sum(), "count of horsepower > 200 (blank horsepower never counts)"),
    "q24": (auto.groupby("origin")["mpg"].mean().idxmax(), "origin with the largest mean mpg"),
    "q25": (round(en.Y1.mean(), 2), "mean of Y1"),
    "q26": (en.Y2.max(), "max of Y2"),
    "q27": ((en.X5 == 7).sum(), "count of X5 == 7"),
    "q28": (round(en.loc[en.X5 == 3.5, "Y1"].mean(), 2), "mean Y1 where X5 == 3.5"),
    "q29": ((en.Y1 > 30).sum(), "count of Y1 > 30"),
    "q30": (round(en.loc[en.X2 == 514.5, "Y2"].mean(), 2), "mean Y2 where X2 == 514.5"),
}


def plain(v):
    return v.item() if hasattr(v, "item") else v


questions = json.loads((HERE / "questions.json").read_text(encoding="utf8"))["questions"]
assert [q["id"] for q in questions] == list(ANSWERS), "questions.json and ANSWERS differ"
out = {
    "author": "Arunaw Rishe M",
    "clean_rows": {k: len(v) for k, v in d.items()},
    "answers": [{"id": q["id"], "answer": plain(ANSWERS[q["id"]][0]), "how": ANSWERS[q["id"]][1]} for q in questions],
}
(HERE / "references_arunaw.json").write_text(json.dumps(out, indent=2, ensure_ascii=False) + "\n", encoding="utf8")
print("wrote references_arunaw.json:", out["clean_rows"])
