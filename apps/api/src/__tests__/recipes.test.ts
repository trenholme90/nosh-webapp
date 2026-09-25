import request from 'supertest';
import { describe, expect, it } from 'vitest';
import type { Recipe, RecipeInput } from '@nosh/shared';
import { createApp } from '../app.ts';
import { useMemoryDb } from './memory-db.ts';

const STARTER_ID = 'full-english-breakfast';

const soup: RecipeInput = {
  name: "  Nan's Lentil Soup ",
  cuisine: 'British',
  mealType: ['lunch', 'dinner'],
  dietary: ['vegan', 'vegetarian'],
  tags: [],
  serves: 4,
  ingredients: [
    { item: 'red lentils', quantity: 200, unit: 'g' },
    { item: 'onion', quantity: 1, unit: null, prep: 'chopped' },
    { item: 'salt', quantity: null, unit: '' },
  ],
  method: ['Soften the onion.', 'Add the lentils and simmer for 20 minutes.'],
};

describe('recipes API', () => {
  const db = useMemoryDb();
  const api = () => request(createApp(db()));

  describe('reading', () => {
    it('lists every starter recipe with its ingredients and method', async () => {
      const response = await api().get('/recipes');

      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(20);
      const breakfast = (response.body as Recipe[]).find((r) => r.id === STARTER_ID);
      expect(breakfast?.isCustom).toBe(false);
      expect(breakfast?.ingredients).toContainEqual({
        item: 'tomatoes',
        quantity: 2,
        unit: null,
        prep: 'halved',
      });
      expect(breakfast?.method.length).toBeGreaterThan(0);
    });

    it('returns one recipe by id', async () => {
      const response = await api().get(`/recipes/${STARTER_ID}`);

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({ id: STARTER_ID, name: 'Full English Breakfast' });
    });

    it('404s for an unknown recipe', async () => {
      const response = await api().get('/recipes/nope');

      expect(response.status).toBe(404);
      expect(response.body).toEqual({ error: 'Recipe not found' });
    });
  });

  describe('adding', () => {
    it('stores a custom recipe under a slug of its name, trimmed and normalised', async () => {
      const created = await api().post('/recipes').send(soup);

      expect(created.status).toBe(201);
      expect(created.body).toMatchObject({
        id: 'nans-lentil-soup',
        name: "Nan's Lentil Soup",
        isCustom: true,
        // Canonical order regardless of the order submitted.
        dietary: ['vegetarian', 'vegan'],
      });
      // A blank unit is stored as null so "no unit" has one representation.
      expect(created.body.ingredients[2]).toEqual({ item: 'salt', quantity: null, unit: null });

      const fetched = await api().get('/recipes/nans-lentil-soup');
      expect(fetched.body).toEqual(created.body);
    });

    it('lists custom recipes ahead of the starter set', async () => {
      await api().post('/recipes').send(soup);

      const response = await api().get('/recipes');

      expect(response.body).toHaveLength(21);
      expect(response.body[0].id).toBe('nans-lentil-soup');
    });

    it('gives a clashing name a unique slug', async () => {
      await api().post('/recipes').send(soup);
      const second = await api().post('/recipes').send(soup);
      const clashesWithStarter = await api()
        .post('/recipes')
        .send({ ...soup, name: 'Full English Breakfast' });

      expect(second.body.id).toBe('nans-lentil-soup-2');
      expect(clashesWithStarter.body.id).toBe('full-english-breakfast-2');
    });

    it('rejects an invalid recipe with a message per field', async () => {
      const response = await api()
        .post('/recipes')
        .send({
          ...soup,
          name: ' ',
          serves: 0,
          mealType: [],
          ingredients: [{ item: '', quantity: -1 }],
          method: [],
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Recipe is not valid');
      expect(Object.keys(response.body.fields).sort()).toEqual([
        'ingredients.0.item',
        'ingredients.0.quantity',
        'mealType',
        'method',
        'name',
        'serves',
      ]);
    });

    it('rejects a dietary value outside the known list', async () => {
      const response = await api()
        .post('/recipes')
        .send({ ...soup, dietary: ['keto'] });

      expect(response.status).toBe(400);
      expect(response.body.fields).toHaveProperty('dietary');
    });

    it('answers malformed JSON with a 400, not a 500', async () => {
      const response = await api()
        .post('/recipes')
        .set('Content-Type', 'application/json')
        .send('{"name":');

      expect(response.status).toBe(400);
    });
  });

  describe('editing', () => {
    it('replaces a custom recipe, ingredients included', async () => {
      const { body: created } = await api().post('/recipes').send(soup);

      const response = await api()
        .put(`/recipes/${created.id}`)
        .send({
          ...soup,
          name: 'Lentil Soup',
          ingredients: [{ item: 'lentils', quantity: 250, unit: 'g' }],
        });

      expect(response.status).toBe(200);
      // The id is stable across renames so links keep working.
      expect(response.body).toMatchObject({ id: created.id, name: 'Lentil Soup' });

      const fetched = await api().get(`/recipes/${created.id}`);
      expect(fetched.body.ingredients).toEqual([{ item: 'lentils', quantity: 250, unit: 'g' }]);
    });

    it('refuses to change a starter recipe', async () => {
      const response = await api().put(`/recipes/${STARTER_ID}`).send(soup);

      expect(response.status).toBe(403);
      const fetched = await api().get(`/recipes/${STARTER_ID}`);
      expect(fetched.body.name).toBe('Full English Breakfast');
    });

    it('404s for an unknown recipe', async () => {
      const response = await api().put('/recipes/nope').send(soup);

      expect(response.status).toBe(404);
    });

    it('validates before looking the recipe up', async () => {
      const response = await api()
        .put(`/recipes/${STARTER_ID}`)
        .send({ ...soup, name: '' });

      expect(response.status).toBe(400);
    });
  });

  describe('deleting', () => {
    it('removes a custom recipe and its ingredients', async () => {
      const { body: created } = await api().post('/recipes').send(soup);

      const response = await api().delete(`/recipes/${created.id}`);

      expect(response.status).toBe(204);
      expect((await api().get(`/recipes/${created.id}`)).status).toBe(404);
      const orphans = db()
        .prepare('SELECT COUNT(*) AS count FROM ingredients WHERE recipe_id = ?')
        .get(created.id) as { count: number };
      expect(orphans.count).toBe(0);
    });

    it('refuses to delete a starter recipe', async () => {
      const response = await api().delete(`/recipes/${STARTER_ID}`);

      expect(response.status).toBe(403);
      expect((await api().get(`/recipes/${STARTER_ID}`)).status).toBe(200);
    });

    it('404s for an unknown recipe', async () => {
      expect((await api().delete('/recipes/nope')).status).toBe(404);
    });
  });
});
