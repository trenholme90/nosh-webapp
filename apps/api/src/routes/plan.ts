import { Router, type Request, type Response } from 'express';
import type { DatabaseSync } from 'node:sqlite';
import { isDay, isPlanSlot, validatePlannedMeal, type PlanSlotRef } from '@nosh/shared';
import { clearPlan, getPlan, removePlannedMeal, setPlannedMeal } from '../db/plan.ts';
import { getRecipe, inTransaction } from '../db/recipes.ts';
import { clearTicks } from '../db/shopping-ticks.ts';
import { sendError } from './respond.ts';

/** The weekly plan: read it, fill or empty one slot, or clear the whole week. */
export function createPlanRouter(db: DatabaseSync): Router {
  const router = Router();

  router.get('/plan', (_req, res) => {
    res.json(getPlan(db));
  });

  router.delete('/plan', (_req, res) => {
    // A new week starts with a fresh list, not last week's ticks.
    inTransaction(db, () => {
      clearPlan(db);
      clearTicks(db);
    });
    res.status(204).end();
  });

  router.put('/plan/:day/:slot', (req, res) => {
    const at = slotFromUrl(req, res);
    if (!at) return;

    const result = validatePlannedMeal(req.body);
    if (!result.ok) return sendError(res, 400, 'Planned meal is not valid', result.errors);
    // A missing recipe is a bad value in the body, not a missing resource at this URL.
    if (!getRecipe(db, result.value.recipeId)) {
      return sendError(res, 400, 'Planned meal is not valid', {
        recipeId: 'That recipe no longer exists',
      });
    }

    res.json(setPlannedMeal(db, at, result.value));
  });

  router.delete('/plan/:day/:slot', (req, res) => {
    const at = slotFromUrl(req, res);
    if (!at) return;

    removePlannedMeal(db, at);
    res.status(204).end();
  });

  return router;
}

/** Read the day and slot from the URL, answering 404 when either is not one we plan by. */
function slotFromUrl(req: Request, res: Response): PlanSlotRef | undefined {
  const { day, slot } = req.params;
  if (!isDay(day) || !isPlanSlot(slot)) {
    sendError(res, 404, 'Not a day and meal in the plan');
    return undefined;
  }
  return { day, slot };
}
