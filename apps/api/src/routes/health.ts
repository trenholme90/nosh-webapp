import { Router } from 'express';
import type { DatabaseSync } from 'node:sqlite';
import type { HealthResponse } from '@nosh/shared';
import { countRecipes } from '../db/seed.ts';

/**
 * Health check.
 *
 * Returns the recipe count as well as a status so the endpoint proves the
 * database is actually wired up, not just that Express is listening.
 */
export function createHealthRouter(db: DatabaseSync): Router {
  const router = Router();

  router.get('/health', (_req, res) => {
    const body: HealthResponse = { status: 'ok', recipeCount: countRecipes(db) };
    res.json(body);
  });

  return router;
}
