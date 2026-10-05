# A tick means "got enough"

## Status

Accepted

## Context

Shoppers tick items off the list, but the list is derived from the plan, which can change afterwards. A tick that ignores later changes would be wrong in two directions: needing more of an item should not stay ticked, and needing less should not quietly untick it.

## Decision

A tick stores the amount that was ticked. It stays valid while the week needs that amount or less, and the comparison works across convertible units, so a tick for 530 ml of milk still covers 2 tbsp. Needing more of the item unticks it. A tick is forgotten when any plan or recipe change drops the item, not only when the list is next read. Writes and their tick clean-up share one transaction.

## Consequences

- Ticks follow what the shopper actually has, not just whether a line exists.
- The tick logic depends on the unit conversions in [ADR 0008](0008-add-up-only-units-that-convert-safely-in-the-shopping-list.md).
- Plan and recipe writes carry extra clean-up work and must stay transactional.
