import { Router, type Response } from 'express';
import type { DatabaseSync } from 'node:sqlite';
import { validateRecipeInput } from '@nosh/shared';
import {
  createCustomRecipe,
  deleteCustomRecipe,
  getRecipe,
  listRecipes,
  updateCustomRecipe,
  type WriteRefusal,
} from '../db/recipes.ts';
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

    const outcome = updateCustomRecipe(db, req.params.id, result.value);
    if (typeof outcome === 'string') return sendRefusal(res, outcome);
    res.json(outcome);
  });

  router.delete('/recipes/:id', (req, res) => {
    const refusal = deleteCustomRecipe(db, req.params.id);
    if (refusal) return sendRefusal(res, refusal);
    res.status(204).end();
  });

  return router;
}

function sendRefusal(res: Response, refusal: WriteRefusal): void {
  if (refusal === 'not-found') sendError(res, 404, 'Recipe not found');
  else sendError(res, 403, 'Starter recipes cannot be changed');
}
