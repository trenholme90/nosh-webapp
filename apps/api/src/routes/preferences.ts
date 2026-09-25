import { Router } from 'express';
import type { DatabaseSync } from 'node:sqlite';
import { validatePreferences } from '@nosh/shared';
import { getPreferences, savePreferences } from '../db/preferences.ts';
import { sendError } from './respond.ts';

/** The user's dietary preferences: read, and replaced wholesale on save. */
export function createPreferencesRouter(db: DatabaseSync): Router {
  const router = Router();

  router.get('/preferences', (_req, res) => {
    res.json(getPreferences(db));
  });

  router.put('/preferences', (req, res) => {
    const result = validatePreferences(req.body);
    if (!result.ok) return sendError(res, 400, 'Preferences are not valid', result.errors);

    savePreferences(db, result.value);
    res.json(result.value);
  });

  return router;
}
