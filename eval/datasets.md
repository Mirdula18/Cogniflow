# Evaluation datasets (T21)

Five public datasets for the P3 test in `docs/POC_TEST_PLAN.md`. All come from the UCI Machine Learning Repository. Licence checked on each dataset page on 2026-10-27: every page states "This dataset is licensed under a Creative Commons Attribution 4.0 International (CC BY 4.0) license", which allows sharing and adaptation for any purpose with credit. The site's donation policy (https://archive.ics.uci.edu/contribute/donation) says the same for donated datasets.

| Key | Dataset | Source page | DOI | Licence | File used | Mess injected |
| --- | --- | --- | --- | --- | --- | --- |
| `bike` | Bike Sharing | https://archive.ics.uci.edu/dataset/275/bike+sharing+dataset | 10.24432/C5W894 | CC BY 4.0 | `day.csv` | 15 duplicate rows, `dteday` in two formats, 5% blank `atemp` |
| `wine` | Wine Quality | https://archive.ics.uci.edu/dataset/186/wine+quality | 10.24432/C56S3T | CC BY 4.0 | `winequality-red.csv` | 20 duplicate rows, 5% blank `density` |
| `realestate` | Real Estate Valuation | https://archive.ics.uci.edu/dataset/477/real+estate+valuation+data+set | 10.24432/C5J30W | CC BY 4.0 | `Real estate valuation data set.xlsx` | 5 duplicate rows, price as text ("NT$ 1,234.5"), 4% blank latitude and longitude |
| `autompg` | Auto MPG | https://archive.ics.uci.edu/dataset/9/auto+mpg | 10.24432/C5859H | CC BY 4.0 | `auto-mpg.data` | 8 duplicate rows, `car_name` in upper case or with a trailing space, 5% blank `acceleration` |
| `energy` | Energy Efficiency | https://archive.ics.uci.edu/dataset/242/energy+efficiency | 10.24432/C51307 | CC BY 4.0 | `ENB2012_data.xlsx` | 10 duplicate rows, 5% blank `X7` |

Row counts per file are recorded when the files are downloaded (T22); the pages list the whole repository dataset, not the single file used. Auto MPG already has natural blanks (`?` in horsepower).

## Why these five

No personal or company data, all CC BY 4.0, all small (each download is under 300 KB on its page). Between them they cover the mess types in the test plan: duplicates, mixed date formats, blanks, currency stored as text, and spelling variants.

## Mess injection

```bash
python eval/inject_mess.py <key> <clean file> eval/data/messy/<key>.csv   # seed 42
python -m pytest eval
```

The script writes the messy CSV and `<file>.mess.json` listing exactly what changed. Same seed, same output.

- Duplicates, date formats, currency text and spelling variants can all be undone by a careful analyst.
- Blanks cannot. They are confined to columns that no evaluation question uses, so reference answers computed on the clean file stay valid.
- `eval/data/` is git-ignored. Raw downloads and messy files are not committed; regenerate them with the commands above.

## Credit (CC BY 4.0)

Datasets are from the UCI Machine Learning Repository (https://archive.ics.uci.edu), cited by the DOIs above. Mess-injected copies are adaptations made by the team for evaluation only.
