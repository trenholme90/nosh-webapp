import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createApp } from '../app.ts';
import { useMemoryDb } from './memory-db.ts';

describe('preferences API', () => {
  const db = useMemoryDb();
  const api = () => request(createApp(db()));

  it('starts with no dietary preferences', async () => {
    const response = await api().get('/preferences');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ dietary: [] });
  });

  it('saves preferences in canonical order, without duplicates', async () => {
    const saved = await api()
      .put('/preferences')
      .send({ dietary: ['gluten-free', 'vegan', 'vegan'] });

    expect(saved.status).toBe(200);
    expect(saved.body).toEqual({ dietary: ['vegan', 'gluten-free'] });
    expect((await api().get('/preferences')).body).toEqual({ dietary: ['vegan', 'gluten-free'] });
  });

  it('can clear every preference', async () => {
    await api()
      .put('/preferences')
      .send({ dietary: ['vegan'] });

    await api().put('/preferences').send({ dietary: [] });

    expect((await api().get('/preferences')).body).toEqual({ dietary: [] });
  });

  it.each([
    ['an unknown preference', { dietary: ['keto'] }],
    ['a dietary value that is not a list', { dietary: 'vegan' }],
    ['a body with no dietary field', {}],
  ])('rejects %s and keeps what was saved', async (_label, body) => {
    await api()
      .put('/preferences')
      .send({ dietary: ['vegan'] });

    const response = await api().put('/preferences').send(body);

    expect(response.status).toBe(400);
    expect(response.body.fields).toHaveProperty('dietary');
    expect((await api().get('/preferences')).body).toEqual({ dietary: ['vegan'] });
  });

  it('answers malformed JSON with a 400', async () => {
    const response = await api()
      .put('/preferences')
      .set('Content-Type', 'application/json')
      .send('{"dietary":');

    expect(response.status).toBe(400);
  });
});
