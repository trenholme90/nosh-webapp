import request from 'supertest';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { DatabaseSync } from 'node:sqlite';
import { createApp } from '../app.ts';
import { createDatabase } from '../db/client.ts';

describe('GET /health', () => {
  let db: DatabaseSync;

  beforeEach(() => {
    db = createDatabase(':memory:');
  });

  afterEach(() => {
    db.close();
  });

  it('reports ok with the seeded recipe count', async () => {
    const response = await request(createApp(db)).get('/health');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ status: 'ok', recipeCount: 20 });
  });

  it('returns a JSON 404 for an unknown route', async () => {
    const response = await request(createApp(db)).get('/nope');

    expect(response.status).toBe(404);
    expect(response.body).toEqual({ error: 'Not found' });
  });
});
