# Call the API same-origin through the Vite proxy

## Status

Accepted

## Context

The client and API run on different ports (5173 and 4000). Calling the API directly from the browser would be cross-origin and would need CORS configured.

## Decision

The client calls same-origin `/api/*` paths, and the Vite dev server proxies them to the API. The target is set with `NOSH_API_URL`. The API has no CORS configuration. `VITE_API_BASE_URL` exists for serving the API from another origin, but doing so first needs CORS added.

## Consequences

- No CORS code or preflight requests in development.
- The proxy is a Vite dev-server feature, so any real deployment needs a reverse proxy or CORS added.
- The E2E suite can point the client at its own API on a different port.
