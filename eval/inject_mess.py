"""Inject reproducible mess into a clean public dataset for the P3 evaluation (docs/POC_TEST_PLAN.md).

    python eval/inject_mess.py <dataset> <clean_file> <messy.csv> [--seed 42]

<dataset> is a key of DATASETS below. Writes <messy.csv> and <messy.csv>.mess.json (what was injected).

Mess types: exact duplicate rows, mixed date formats, blanks, currency stored as text, spelling variants.
The clean base is the file with its own exact duplicate rows removed (wine-red has 240), so injected
duplicates are the only ones left. Everything except blanks can be undone by a careful analyst. Blanks are confined to columns that no
evaluation question uses, so reference answers computed on the clean file stay valid.
"""
import argparse
import json
from pathlib import Path

import numpy as np
import pandas as pd

AUTO_MPG_COLUMNS = ["mpg", "cylinders", "displacement", "horsepower", "weight", "acceleration", "model_year", "origin", "car_name"]

DATASETS = {
    "bike": dict(
        read=lambda p: pd.read_csv(p),  # day.csv
        duplicates=15, mixed_date_cols=["dteday"], blank_cols={"atemp": 0.05},
    ),
    "wine": dict(
        read=lambda p: pd.read_csv(p, sep=";"),  # winequality-red.csv
        duplicates=20, blank_cols={"density": 0.05},
    ),
    "realestate": dict(
        read=lambda p: pd.read_excel(p),  # Real estate valuation data set.xlsx
        duplicates=5, blank_cols={"X5 latitude": 0.04, "X6 longitude": 0.04},
        currency_cols={"Y house price of unit area": "NT$ "},
    ),
    "autompg": dict(
        read=lambda p: pd.read_csv(p, sep=r"\s+", names=AUTO_MPG_COLUMNS, na_values="?"),  # auto-mpg.data
        duplicates=8, blank_cols={"acceleration": 0.05}, variant_cols=["car_name"],
    ),
    "energy": dict(
        read=lambda p: pd.read_excel(p),  # ENB2012_data.xlsx
        duplicates=10, blank_cols={"X7": 0.05},
    ),
}


def inject(df: pd.DataFrame, cfg: dict, seed: int = 42) -> tuple[pd.DataFrame, dict]:
    """Returns the messy copy of `df` and a log of exactly what was changed. Same seed, same output."""
    rng = np.random.default_rng(seed)
    out = df.drop_duplicates().reset_index(drop=True)  # clean base: reference answers use this too
    log: dict = {"seed": seed, "natural_duplicates_removed": len(df) - len(out), "rows_clean": len(out)}

    for col in cfg.get("mixed_date_cols", []):
        dates = pd.to_datetime(out[col])
        dmy = rng.random(len(out)) < 0.5
        out[col] = np.where(dmy, dates.dt.strftime("%d/%m/%Y"), dates.dt.strftime("%Y-%m-%d"))
        log.setdefault("mixed_dates", {})[col] = {"dd/mm/yyyy": int(dmy.sum()), "yyyy-mm-dd": int((~dmy).sum())}

    for col, prefix in cfg.get("currency_cols", {}).items():
        out[col] = [f"{prefix}{v:,.1f}" for v in out[col]]
        log.setdefault("currency_text", {})[col] = prefix.strip()

    for col in cfg.get("variant_cols", []):
        pick = rng.integers(0, 3, len(out))  # 0 keep, 1 UPPER, 2 trailing space
        s = out[col].astype(str)
        out[col] = np.where(pick == 1, s.str.upper(), np.where(pick == 2, s + " ", s))
        log.setdefault("spelling_variants", {})[col] = {"upper": int((pick == 1).sum()), "trailing_space": int((pick == 2).sum())}

    for col, rate in cfg.get("blank_cols", {}).items():
        idx = rng.choice(len(out), size=round(len(out) * rate), replace=False)
        out[col] = out[col].astype(object)
        out.iloc[idx, out.columns.get_loc(col)] = None
        log.setdefault("blanks", {})[col] = int(len(idx))

    n = cfg.get("duplicates", 0)
    if n:
        copies = out.iloc[rng.choice(len(out), size=n, replace=False)]
        original = len(out)
        out = pd.concat([out, copies]).iloc[_scatter(original, n, rng)].reset_index(drop=True)
        log["duplicates_added"] = n
    log["rows_messy"] = len(out)
    return out, log


def _scatter(original: int, copies: int, rng: np.random.Generator) -> list[int]:
    """Row order that keeps the original rows in order and inserts each copy at a random position."""
    order = list(range(original))
    for k in range(copies):
        order.insert(int(rng.integers(0, len(order) + 1)), original + k)
    return order


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("dataset", choices=sorted(DATASETS))
    ap.add_argument("clean_file", type=Path)
    ap.add_argument("messy_csv", type=Path)
    ap.add_argument("--seed", type=int, default=42)
    args = ap.parse_args()
    cfg = DATASETS[args.dataset]
    messy, log = inject(cfg["read"](args.clean_file), cfg, args.seed)
    args.messy_csv.parent.mkdir(parents=True, exist_ok=True)
    messy.to_csv(args.messy_csv, index=False)
    Path(f"{args.messy_csv}.mess.json").write_text(json.dumps(log, indent=2) + "\n", encoding="utf8")
    print(f"{args.dataset}: {len(cfg['read'](args.clean_file))} raw -> {log['rows_clean']} clean -> {log['rows_messy']} messy rows, wrote {args.messy_csv}")


if __name__ == "__main__":
    main()
