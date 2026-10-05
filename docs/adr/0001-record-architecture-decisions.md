# Record architecture decisions

## Status

Accepted

## Context

The README explains how Nosh is put together, and commit bodies explain some one-off choices, but neither is a place to find "why did we do it this way, and what did we turn down?". That reasoning is easy to lose, especially when the work is done across several sessions and machines.

## Decision

We record significant architectural decisions as short ADRs in `docs/adr/`, following [`template.md`](template.md). Files are numbered in order (`0001-…`) and never renumbered. An accepted ADR is not rewritten; if a decision changes, a new ADR supersedes it and the old one's status is updated to say so.

ADRs 0002–0014 were written after the fact, from the README, commit history, brief and configuration. Where the reasoning was not written down at the time it is marked as inferred.

## Consequences

- The reasoning behind a decision lives next to the code and goes through the same review.
- Writing one is a small extra step when a decision is made; skipping it means the reasoning is lost again.
- The README stays a description of how things work now. ADRs carry the history of why.
