# Inject dependencies into `createApp`

## Status

Accepted

## Context

API tests should exercise the real code path without binding a port, touching a file, or calling the internet.

## Decision

`createApp(db)` takes its database instead of importing a singleton, and `createDatabase(path)` takes a path. The postcode lookup used by the hub locator is also a parameter of `createApp`. `index.ts` is the only place that builds the real ones and calls `listen()`.

## Consequences

- Tests run against `:memory:` through the same code production uses, with supertest and no port.
- Tests can substitute the postcode lookup with a stub.
- Dependencies have to be passed in, so a new one means touching `createApp` and its callers.
