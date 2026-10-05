# Architecture decision records

Short records of significant decisions and the reasoning behind them. Write new ones from [`template.md`](template.md), number them in order, and never rewrite an accepted one: supersede it with a new ADR instead. See [ADR 0001](0001-record-architecture-decisions.md).

| ADR                                                                                   | Decision                                                               | Status   |
| ------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- | -------- |
| [0001](0001-record-architecture-decisions.md)                                         | Record architecture decisions                                          | Accepted |
| [0002](0002-separate-api-and-web-client-in-an-npm-workspaces-monorepo.md)             | Separate API and web client in an npm workspaces monorepo              | Accepted |
| [0003](0003-share-types-and-validation-through-a-source-only-package.md)              | Share types and validation through a source-only package               | Accepted |
| [0004](0004-use-sqlite-through-node-sqlite.md)                                        | Use SQLite through `node:sqlite`                                       | Accepted |
| [0005](0005-run-the-api-under-tsx-without-a-build-step.md)                            | Run the API under `tsx` without a build step                           | Accepted |
| [0006](0006-call-the-api-same-origin-through-the-vite-proxy.md)                       | Call the API same-origin through the Vite proxy                        | Accepted |
| [0007](0007-inject-dependencies-into-createapp.md)                                    | Inject dependencies into `createApp`                                   | Accepted |
| [0008](0008-add-up-only-units-that-convert-safely-in-the-shopping-list.md)            | Add up only units that convert safely in the shopping list             | Accepted |
| [0009](0009-a-tick-means-got-enough.md)                                               | A tick means "got enough"                                              | Accepted |
| [0010](0010-look-up-postcodes-in-the-api-and-rank-hubs-by-straight-line-distance.md)  | Look up postcodes in the API and rank hubs by straight-line distance   | Accepted |
| [0011](0011-self-host-fonts-and-brand-assets.md)                                      | Self-host fonts and brand assets                                       | Accepted |
| [0012](0012-test-with-vitest-and-playwright-with-accessibility-checks-in-journeys.md) | Test with Vitest and Playwright, with accessibility checks in journeys | Accepted |
| [0013](0013-isolate-tests-that-change-global-state-in-serial-playwright-projects.md)  | Isolate tests that change global state in serial Playwright projects   | Accepted |
| [0014](0014-run-stryker-mutation-testing-through-the-command-runner-outside-ci.md)    | Run Stryker mutation testing through the command runner, outside CI    | Accepted |
