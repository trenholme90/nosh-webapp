import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createApp } from '../app.ts';
import { useMemoryDb } from './memory-db.ts';

describe('GET /health', () => {
  const db = useMemoryDb();

  it('reports ok with the seeded recipe count', async () => {
    const response = await request(createApp(db())).get('/health');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ status: 'ok', recipeCount: 20 });
  });

  it('returns a JSON 404 for an unknown route', async () => {
    const response = await request(createApp(db())).get('/nope');

    expect(response.status).toBe(404);
    expect(response.body).toEqual({ error: 'Not found' });
  });
});
