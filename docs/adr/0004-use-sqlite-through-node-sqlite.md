# Use SQLite through `node:sqlite`

## Status

Accepted

## Context

The brief says SQLite is fine, with a single user and no auth. The app needs real SQL and persistence, and should be easy for a reviewer to run locally.

## Decision

The API stores data in SQLite using Node's built-in `node:sqlite` module, with no database dependency. The file is `apps/api/data/nosh.db`, generated and seeded on first boot and not committed. Foreign keys carry rules such as deleting a recipe cascading to its planned meals, so they live in the schema.

`node:sqlite` only became usable without `--experimental-sqlite` from Node 23.4, so Node 24 (the current LTS) is the minimum. This is declared in `engines`, `.nvmrc` and the CI workflow.

## Consequences

- No native compilation and no extra dependency to install.
- Requires Node 24 or newer; older runtimes will not start the API.
- `node:sqlite` is a newer API than the established SQLite packages.
- One file on disk suits a single-user demo but is not a design for concurrent multi-user use.
