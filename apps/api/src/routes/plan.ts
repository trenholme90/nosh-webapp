import { Router, type Request, type Response } from 'express';
import type { DatabaseSync } from 'node:sqlite';
import { isDay, isPlanSlot, validatePlannedMeal, type Day, type PlanSlot } from '@nosh/shared';
import { clearPlan, getPlan, removePlannedMeal, setPlannedMeal } from '../db/plan.ts';
import { getRecipe } from '../db/recipes.ts';
import { sendError } from './respond.ts';

/** The weekly plan: read it, fill or empty one slot, or clear the whole week. */
export function createPlanRouter(db: DatabaseSync): Router {
  const router = Router();

  router.get('/plan', (_req, res) => {
    res.json(getPlan(db));
  });

  router.delete('/plan', (_req, res) => {
    clearPlan(db);
    res.status(204).end();
  });

  router.put('/plan/:day/:slot', (req, res) => {
    const slot = findSlot(req, res);
    if (!slot) return;

    const result = validatePlannedMeal(req.body);
    if (!result.ok) return sendError(res, 400, 'Planned meal is not valid', result.errors);
    // A missing recipe is a bad value in the body, not a missing resource at this URL.
    if (!getRecipe(db, result.value.recipeId)) {
      return sendError(res, 400, 'Planned meal is not valid', {
        recipeId: 'That recipe no longer exists',
      });
    }

    res.json(setPlannedMeal(db, slot.day, slot.slot, result.value));
  });

  router.delete('/plan/:day/:slot', (req, res) => {
    const slot = findSlot(req, res);
    if (!slot) return;

    removePlannedMeal(db, slot.day, slot.slot);
    res.status(204).end();
  });

  return router;
}

/** Read the day and slot from the URL, answering 404 when either is not one we plan by. */
function findSlot(req: Request, res: Response): { day: Day; slot: PlanSlot } | undefined {
  const { day, slot } = req.params;
  if (!isDay(day) || !isPlanSlot(slot)) {
    sendError(res, 404, 'Not a day and meal in the plan');
    return undefined;
  }
  return { day, slot };
}
