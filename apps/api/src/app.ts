import express, { type ErrorRequestHandler, type Express } from 'express';
import type { DatabaseSync } from 'node:sqlite';
import { createHealthRouter } from './routes/health.ts';
import { createRecipesRouter } from './routes/recipes.ts';

/**
 * Build the Express app.
 *
 * Kept separate from `index.ts` and given its database rather than importing a
 * singleton, so a test can construct an app over a throwaway database and never
 * bind a port.
 */
export function createApp(db: DatabaseSync): Express {
  const app = express();

  app.use(express.json());

  app.use(createHealthRouter(db));
  app.use(createRecipesRouter(db));

  app.use((_req, res) => {
    res.status(404).json({ error: 'Not found' });
  });

  const handleError: ErrorRequestHandler = (error, _req, res, _next) => {
    // express.json() flags a malformed body; that is the caller's mistake, not ours.
    if ((error as { type?: unknown }).type === 'entity.parse.failed') {
      res.status(400).json({ error: 'Request body is not valid JSON' });
      return;
    }
    console.error('[nosh-api]', error);
    res.status(500).json({ error: 'Internal server error' });
  };
  app.use(handleError);

  return app;
}
