# Look up postcodes in the API and rank hubs by straight-line distance

## Status

Accepted

## Context

The hub locator (our own feature, added to the brief) takes a postcode and returns the 5 closest of 40 sample hubs. It needs a location for the postcode, and a way to rank hubs against it.

## Decision

The API turns the postcode into a location using [postcodes.io](https://postcodes.io), then ranks hubs by straight-line distance. The browser never calls postcodes.io. Its base URL is `POSTCODES_API_URL`, and the lookup is injected into `createApp` ([ADR 0007](0007-inject-dependencies-into-createapp.md)). The 40 sample hubs in `apps/api/data/hubs.json` have invented names and addresses and are seeded into SQLite on first boot. The E2E suite points the API at a local stub, so it needs no internet.

The choice of postcodes.io over alternatives, and of straight-line over road distance, is inferred; the reasoning was not recorded.

## Consequences

- The client talks to one origin, and the third-party dependency is hidden behind the API.
- The hub locator needs internet in normal use. A postcodes.io outage surfaces as a plain "unavailable" message that does not blame the user.
- Straight-line distance can differ from travel distance, and is simple to compute and test.
- Real hubs would replace the sample JSON.
