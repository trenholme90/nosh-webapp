# Share types and validation through a source-only package

## Status

Accepted

## Context

The API and the client agree on the shape of recipes, plans, shopping lists and hubs. If each side defined its own types and checks, they would drift apart and a mismatch would only show up at runtime.

## Decision

`@nosh/shared` holds the domain types, validation (recipes, ticks, postcodes) and response guards, plus the API contract. It has no build step: its `exports` and `types` point straight at `src/index.ts`, and both apps import the TypeScript source through the workspace link.

The validation is hand-written rather than coming from a schema library. This is inferred from the package having no dependencies; the reasoning was not recorded.

## Consequences

- One definition of each type and rule, used by both sides and tested once.
- No compile or publish step to run before the apps see a change.
- Every consumer must be able to compile TypeScript (Vite and `tsx` both can).
- Validation rules are written and maintained by hand.
