# Contributing

## One-time setup (each member, on their own machine)

```bash
gh auth login                      # sign in with YOUR GitHub account
git config --global user.name  "<your GitHub username>"
git config --global user.email "<your GitHub email>"
gh repo clone <org-or-owner>/cogniflow && cd cogniflow
```

| Member | GitHub username | Commit email |
| --- | --- | --- |
| Joe Daniel A | from `gh auth status` | from `gh api user --jq .email` |
| Arunaw Rishe M | ARUNAWRISHE | arunawrishe@gmail.com |
| Anish Karthic VS | ANISHKARTHIC | anishkarthicvs@gmail.com |
| Mirdula R | Mirdula18 | mirdula1801@gmail.com |

The repo owner adds the other three as collaborators in **Settings → Collaborators**, or with `gh api -X PUT repos/<owner>/cogniflow/collaborators/<username>`.

## Authorship rule

**Each commit is authored by the person who did the work, from their own signed-in machine.** Never override `user.name` / `user.email` or use `--author` for someone else; GitHub's contribution graph and the reviewers rely on it. When two people genuinely worked on a change together, add:

```
Co-authored-by: Mirdula18 <mirdula1801@gmail.com>
```

## Branches and pull requests

- Owner (Mirdula18) may push directly to main; other members use PRs.
- Members work on `feat/T<nn>-short-name`, `fix/...`, `docs/...`.
- Members open a PR per task; another member reviews and approves (rotate reviewers).
- Squash-merge; PR title = Conventional Commit, e.g. `feat(run): add retry badge (T12)`.

## Commit messages

```
<type>(<scope>): <summary in present tense>

<optional body: why, not what>
Refs: T12
```

Types: `feat`, `fix`, `docs`, `test`, `refactor`, `chore`, `style`.

## Before every commit

```bash
cd web && npm run lint && npm run typecheck && npm run test
```

Never commit `.env*`, datasets containing real company data, or API keys.
