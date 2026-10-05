# Test with Vitest and Playwright, with accessibility checks inside journeys

## Status

Accepted

## Context

The brief requires WCAG AA and support for older phones. The app has logic worth testing quickly (formatting, shopping list maths, validation) and user journeys that need a real browser against the real API. Nosh Green measures 1.98:1 on white and fails AA, so contrast is a real risk, not a formality.

## Decision

Two layers, both in CI. **Vitest** covers the API (through HTTP with supertest, on an in-memory database), the client logic, and failure states that are hard to set up in a browser, such as a malformed response. **Playwright** covers journeys through the real client and API on their own ports (4100 and 5174) with an in-memory database, so it never touches dev data. Elements are found by role and label.

Each journey test calls `expectNoA11yViolations(page)` (axe, WCAG 2.2 AA) when it reaches a new page or state, rather than having a separate accessibility spec. States that E2E cannot reach, such as an empty list, are tested with a faked API.

## Consequences

- Each feature's spec covers its own accessibility, so a new state is checked as soon as a test visits it.
- Finding elements by role and label tests the page the way a screen-reader user meets it.
- Playwright needs a one-off `npx playwright install chromium`, and the E2E job installs it in CI.
- E2E tests are slower than unit tests and need the global-state rules in [ADR 0013](0013-isolate-tests-that-change-global-state-in-serial-playwright-projects.md).
