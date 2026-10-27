import sys
from pathlib import Path

import pandas as pd

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from inject_mess import DATASETS, inject  # noqa: E402

CLEAN = pd.DataFrame({
    "day": pd.date_range("2025-01-01", periods=200).strftime("%Y-%m-%d"),
    "price": [round(1000 + i * 12.5, 1) for i in range(200)],
    "name": [f"item {i}" for i in range(200)],
    "note": [float(i) for i in range(200)],
})
CFG = dict(duplicates=7, mixed_date_cols=["day"], currency_cols={"price": "NT$ "}, variant_cols=["name"], blank_cols={"note": 0.05})


def test_same_seed_same_output():
    a, _ = inject(CLEAN, CFG, 42)
    b, _ = inject(CLEAN, CFG, 42)
    pd.testing.assert_frame_equal(a, b)


def test_log_matches_the_data():
    messy, log = inject(CLEAN, CFG, 42)
    assert (log["rows_clean"], log["rows_messy"]) == (200, 207)
    assert int(messy.duplicated().sum()) == 7 == log["duplicates_added"]
    assert int(messy["note"].isna().sum()) == 10 == log["blanks"]["note"]
    assert sum(log["mixed_dates"]["day"].values()) == 200  # formats chosen per clean row; copies repeat them
    assert messy["day"].str.contains("/").sum() > 0 and messy["day"].str.contains("-").sum() > 0


def test_everything_but_blanks_can_be_undone():
    messy, _ = inject(CLEAN, CFG, 42)
    back = messy.drop_duplicates()
    assert len(back) == 200
    back = back.iloc[back["name"].str.extract(r"(\d+)")[0].astype(int).argsort()].reset_index(drop=True)  # a copy may precede its original
    iso = pd.to_datetime(back["day"], format="%Y-%m-%d", errors="coerce")
    dates = iso.fillna(pd.to_datetime(back["day"], format="%d/%m/%Y", errors="coerce"))
    assert dates.dt.strftime("%Y-%m-%d").tolist() == CLEAN["day"].tolist()
    assert back["price"].str.replace("NT$ ", "", regex=False).str.replace(",", "", regex=False).astype(float).tolist() == CLEAN["price"].tolist()
    assert back["name"].str.strip().str.lower().tolist() == CLEAN["name"].tolist()
    kept = back["note"].notna()
    assert back.loc[kept, "note"].tolist() == CLEAN.loc[kept, "note"].tolist()


def test_every_dataset_config_is_complete():
    for key, cfg in DATASETS.items():
        assert callable(cfg["read"]) and cfg["duplicates"] > 0, key
