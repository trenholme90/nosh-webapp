# Run Stryker mutation testing through the command runner, outside CI

## Status

Accepted

## Context

Line coverage does not show whether tests pin behaviour down. Mutation testing does, by changing the source and checking a test fails. A full run is slow. The Stryker Vitest plugin (10.0.0) skips every test under Vitest 5, so it reports every mutant as surviving.

## Decision

Each workspace (`apps/api`, `apps/web`, `packages/shared`) has a `stryker.config.json` that runs the whole workspace's Vitest suite for each mutant through Stryker's command runner. Mutation testing is run when a feature is finished, aimed at what changed, and not in CI. HTML reports go to a git-ignored `reports/` folder. Survivors that are equivalent mutants, where the change cannot alter behaviour, are left alone.

## Consequences

- Surviving mutants point at behaviour no test pins down.
- Running the whole suite per mutant is slower than the plugin would be.
- Nothing enforces a score, so it depends on being run.
- Revisit the command runner when the plugin supports Vitest 5.
