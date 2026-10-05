# Add up only units that convert safely in the shopping list

## Status

Accepted

## Context

The sample recipes use inconsistent units for the same ingredient: `milk` in ml and tbsp, `coconut milk` in tins and ml, `salad leaves` in handfuls and g. Names are lowercased and mostly consistent, with a few differing only by plural. The brief wants one list with everything added up.

## Decision

The list in `apps/api/src/shopping/build-list.ts` groups items by name. A plural shares its singular's line when both are on the list; a name on its own is never re-spelt. It adds up only what converts safely: g with kg, and ml with l, tbsp and tsp. Anything else is shown side by side ("1 tin + 200 ml") rather than guessing how big a tin is. Each recipe is scaled to the servings planned, amounts are added up, and only then rounded up to what can be bought: whole onions and tins, half spoons, and weights and volumes to the next 5.

## Consequences

- The list never invents a conversion, so a quantity is never silently wrong.
- Some ingredients show as a sum of mixed units instead of a single number.
- Rounding after adding up avoids rounding error piling up, and the amounts match what a shopper buys.
- New units need a conscious decision about whether they convert.
