import { Router } from 'express';
import type { DatabaseSync } from 'node:sqlite';
import { isDeepStrictEqual } from 'node:util';
import { validateTick, type ShoppingItem } from '@nosh/shared';
import { getPlan } from '../db/plan.ts';
import { listRecipes } from '../db/recipes.ts';
import { getTicks, removeTick, setTick } from '../db/shopping-ticks.ts';
import { buildShoppingList, type ShoppingNeed } from '../shopping/build-list.ts';
import { sendError } from './respond.ts';

/** The week's shopping list, worked out from the plan, and ticking items off it. */
export function createShoppingListRouter(db: DatabaseSync): Router {
  const router = Router();
  const currentNeeds = () => buildShoppingList(getPlan(db), listRecipes(db));

  router.get('/shopping-list', (_req, res) => {
    const needs = currentNeeds();
    const ticks = getTicks(db);

    // Forget ticks for items the plan no longer needs, so one coming back later starts unticked.
    for (const item of ticks.keys()) {
      if (!needs.some((need) => need.item === item)) removeTick(db, item);
    }

    res.json({ items: needs.map((need) => withTick(need, ticks.get(need.item))) });
  });

  router.put('/shopping-list/items/:item', (req, res) => {
    const need = currentNeeds().find((candidate) => candidate.item === req.params.item);
    if (!need) return sendError(res, 404, 'That isn’t on the shopping list');

    const result = validateTick(req.body);
    if (!result.ok) return sendError(res, 400, 'Tick is not valid', result.errors);

    if (result.value.ticked) setTick(db, need.item, need.amounts);
    else removeTick(db, need.item);
    res.json({ ...need, ticked: result.value.ticked });
  });

  return router;
}

/** Ticked only if the tick was for exactly the amounts needed now. */
function withTick(
  need: ShoppingNeed,
  tickedAmounts: ShoppingNeed['amounts'] | undefined,
): ShoppingItem {
  return {
    ...need,
    ticked: tickedAmounts !== undefined && isDeepStrictEqual(tickedAmounts, need.amounts),
  };
}
