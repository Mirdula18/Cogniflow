# Evaluation datasets (T21)

Five public datasets for the P3 test in `docs/POC_TEST_PLAN.md`. All come from the UCI Machine Learning Repository. Licence checked on each dataset page on 2026-10-27: every page states "This dataset is licensed under a Creative Commons Attribution 4.0 International (CC BY 4.0) license", which allows sharing and adaptation for any purpose with credit. The site's donation policy (https://archive.ics.uci.edu/contribute/donation) says the same for donated datasets.

| Key | Dataset | Source page | DOI | Licence | File used | Mess injected |
| --- | --- | --- | --- | --- | --- | --- |
| `bike` | Bike Sharing | https://archive.ics.uci.edu/dataset/275/bike+sharing+dataset | 10.24432/C5W894 | CC BY 4.0 | `day.csv` | 15 duplicate rows, `dteday` in two formats, 5% blank `atemp` |
| `wine` | Wine Quality | https://archive.ics.uci.edu/dataset/186/wine+quality | 10.24432/C56S3T | CC BY 4.0 | `winequality-red.csv` | 20 duplicate rows, 5% blank `density` |
| `realestate` | Real Estate Valuation | https://archive.ics.uci.edu/dataset/477/real+estate+valuation+data+set | 10.24432/C5J30W | CC BY 4.0 | `Real estate valuation data set.xlsx` | 5 duplicate rows, price as text ("NT$ 1,234.5"), 4% blank latitude and longitude |
| `autompg` | Auto MPG | https://archive.ics.uci.edu/dataset/9/auto+mpg | 10.24432/C5859H | CC BY 4.0 | `auto-mpg.data` | 8 duplicate rows, `car_name` in upper case or with a trailing space, 5% blank `acceleration` |
| `energy` | Energy Efficiency | https://archive.ics.uci.edu/dataset/242/energy+efficiency | 10.24432/C51307 | CC BY 4.0 | `ENB2012_data.xlsx` | 10 duplicate rows, 5% blank `X7` |

Downloaded in T22 from each dataset page's Download link (`https://archive.ics.uci.edu/static/public/<id>/<name>.zip`); sizes match the pages.

| Key | Zip downloaded 2026-10-27 | sha256 of the zip | Rows in file | Clean rows |
| --- | --- | --- | --- | --- |
| `bike` | 279,992 bytes | `b70182d0d0508e9abbb79306ce5c0cec34869000f8220175ac83d11dbe845401` | 731 (`day.csv`) | 731 |
| `wine` | 91,353 bytes | `3ed56667f4b828242bd732d7d1dd7f2861e54432239d7fa63877014cbb0304d4` | 1,599 (`winequality-red.csv`) | 1,359 |
| `realestate` | 32,885 bytes | `aa437bdac3ca23200258a0a58d251c0af90651aeaf7c7a07aaa714f0f9f25e2c` | 414 (`Real estate valuation data set.xlsx`) | 414 |
| `autompg` | 14,873 bytes | `5fc1507522b73b8050d3aa45df51eefe1b666ae5f428a5f1347b6483339f1003` | 398 (`auto-mpg.data`) | 398 |
| `energy` | 76,321 bytes | `499441eee27929a4b00417f58fd8c63c9cc14b8a71520cd0dd27fcb626738351` | 768 (`ENB2012_data.xlsx`) | 768 |

Auto MPG already has natural blanks (`?` in horsepower: 6 rows). `winequality-red.csv` has 240 exact duplicate rows of its own, so the clean base for every dataset is the file with exact duplicates removed (1,359 wine rows); the injected duplicates are then the only ones.

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
