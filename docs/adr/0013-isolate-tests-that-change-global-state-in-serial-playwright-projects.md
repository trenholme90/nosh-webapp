# Isolate tests that change global state in serial Playwright projects

## Status

Accepted

## Context

With a single user and no auth ([ADR 0004](0004-use-sqlite-through-node-sqlite.md)), dietary preferences and the weekly plan are global, and the shopping list is derived from the plan. E2E tests run in parallel against one API, so a test that changes any of these changes what every other test sees.

## Decision

Tests that change global state run in their own Playwright projects, one test at a time, each starting after the one before: `preferences.spec.ts`, then `plan.spec.ts`, then `shopping-list.spec.ts`. Each resets the state it owns around every test. Tests that only create recipes give them unique names and delete them afterwards, and must not assume the list of custom recipes is empty. Any future test that changes global state belongs in a project like these.

## Consequences

- Parallel tests stay reliable without a database per test.
- The serial projects make the suite slower than a fully parallel one.
- Each new area of global state needs a new project and an ordering decision.
- A multi-user design would remove the cause, and this arrangement could then be relaxed.
