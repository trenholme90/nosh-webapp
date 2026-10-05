# Run the API under `tsx` without a build step

## Status

Accepted

## Context

The API is run locally as a demo. Compiling it would add a build output, a start path that differs from development, and more to keep working, without helping the demo.

## Decision

The API runs under `tsx` in both `npm run dev` and `npm start`. Only the web client has a `build` script. `npm run typecheck` covers the API.

## Consequences

- One way to run the API, in development and in "production".
- Type errors are caught by `typecheck` in CI rather than by a compile step.
- Startup pays for on-the-fly transpilation, and this is not how an API deployed for real use would normally run. A real deployment would need a build step added.
