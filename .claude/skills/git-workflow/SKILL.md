---
name: git-workflow
description: Committing, branching and pull request descriptions in this repo. Use when writing a commit message, staging a change, naming a branch, or opening a PR.
---

# Git workflow

## Commit messages

Conventional commits, scoped to the workspace the change belongs to:

```
feat(web): use the Nosh logo in the header and as the favicon
chore: add ESLint flat config and CI workflow
```

Scopes in use are `web`, `api` and `shared`. Repo-wide changes take no scope.

Keep the message short. The subject line carries the change; add body lines only
for a decision a reader could not infer from the diff, such as why an option was
rejected or what was deliberately left alone. Everything else lives in the diff,
the pull request, or a review report — repeating it in the message makes history
harder to scan, not easier.

## Before committing

Run what CI runs and commit once it is green:

```bash
npm run format:check && npm run lint && npm run typecheck && npm run build && npm test
```

`.github/workflows/ci.yml` is the source of truth for that list — follow it if the
two ever disagree.

## Branches

Short kebab-case names describing the work: `setup`, `weekly-planner`.

## Pull requests

The description is where the detail the commits leave out belongs: what changed,
why, and how a reviewer verifies it.
When mergeing, don't squash merge, we want to keep the commit history.
