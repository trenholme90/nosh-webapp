# Separate API and web client in an npm workspaces monorepo

## Status

Accepted

## Context

The client brief asks for a layered app: a client UI with a separate API layer behind it. The API and client need to share domain types and validation, and one person is building both.

## Decision

The API (`apps/api`, Express) and the web client (`apps/web`, React with Vite) are separate processes that talk over an HTTP contract. They live in one repository as npm workspaces alongside `packages/shared` and `e2e`. npm is the package manager.

## Consequences

- Either side could be replaced without touching the other, as long as the HTTP contract holds.
- Shared code can change in one commit, and one CI run covers everything.
- Two processes must run in development, which `npm run dev` handles with `concurrently`.
- The contract has to be kept in step by hand, which is what [ADR 0003](0003-share-types-and-validation-through-a-source-only-package.md) addresses.
