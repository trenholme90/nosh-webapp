import { Router } from 'express';
import type { DatabaseSync } from 'node:sqlite';
import { validateTick } from '@nosh/shared';
import { removeTick, setTick } from '../db/shopping-ticks.ts';
import { currentNeeds, shoppingList } from '../shopping/shopping-list.ts';
import { sendError } from './respond.ts';

/** The week's shopping list, worked out from the plan, and ticking items off it. */
export function createShoppingListRouter(db: DatabaseSync): Router {
  const router = Router();

  router.get('/shopping-list', (_req, res) => {
    res.json({ items: shoppingList(db) });
  });

  router.put('/shopping-list/items/:item', (req, res) => {
    const need = currentNeeds(db).find((candidate) => candidate.item === req.params.item);
    if (!need) return sendError(res, 404, 'That isn’t on the shopping list');

    const result = validateTick(req.body);
    if (!result.ok) return sendError(res, 400, 'Tick is not valid', result.errors);

    if (result.value.ticked) setTick(db, need.item, need.amounts);
    else removeTick(db, need.item);
    res.json({ ...need, ticked: result.value.ticked });
  });

  return router;
}
