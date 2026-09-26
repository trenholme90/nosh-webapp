import { Router, type Response } from 'express';
import type { DatabaseSync } from 'node:sqlite';
import { validateRecipeInput } from '@nosh/shared';
import {
  createCustomRecipe,
  deleteCustomRecipe,
  getRecipe,
  inTransaction,
  listRecipes,
  updateCustomRecipe,
  type WriteRefusal,
} from '../db/recipes.ts';
import { forgetUnneededTicks } from '../shopping/shopping-list.ts';
import { sendError } from './respond.ts';

/**
 * Recipe catalogue: the starter set is read-only, the user's own recipes are
 * full CRUD.
 */
export function createRecipesRouter(db: DatabaseSync): Router {
  const router = Router();

  router.get('/recipes', (_req, res) => {
    res.json(listRecipes(db));
  });

  router.get('/recipes/:id', (req, res) => {
    const recipe = getRecipe(db, req.params.id);
    if (!recipe) return sendError(res, 404, 'Recipe not found');
    res.json(recipe);
  });

  router.post('/recipes', (req, res) => {
    const result = validateRecipeInput(req.body);
    if (!result.ok) return sendError(res, 400, 'Recipe is not valid', result.errors);
    res.status(201).json(createCustomRecipe(db, result.value));
  });

  router.put('/recipes/:id', (req, res) => {
    const result = validateRecipeInput(req.body);
    if (!result.ok) return sendError(res, 400, 'Recipe is not valid', result.errors);

    // A planned recipe's ingredients feed the shopping list, so ticks are tidied with it.
    const outcome = inTransaction(db, () => {
      const updated = updateCustomRecipe(db, req.params.id, result.value);
      if (typeof updated !== 'string') forgetUnneededTicks(db);
      return updated;
    });
    if (typeof outcome === 'string') return sendRefusal(res, outcome);
    res.json(outcome);
  });

  router.delete('/recipes/:id', (req, res) => {
    // Deleting takes it off the plan, and so off the shopping list.
    const refusal = inTransaction(db, () => {
      const refused = deleteCustomRecipe(db, req.params.id);
      if (!refused) forgetUnneededTicks(db);
      return refused;
    });
    if (refusal) return sendRefusal(res, refusal);
    res.status(204).end();
  });

  return router;
}

function sendRefusal(res: Response, refusal: WriteRefusal): void {
  if (refusal === 'not-found') sendError(res, 404, 'Recipe not found');
  else sendError(res, 403, 'Starter recipes cannot be changed');
}
