import request from 'supertest';
import { describe, expect, it } from 'vitest';
import type { RecipeInput } from '@nosh/shared';
import { createApp } from '../app.ts';
import { useMemoryDb } from './memory-db.ts';

const PORRIDGE = 'porridge-with-berries-and-honey';
const BREAKFAST = 'full-english-breakfast';

const stew: RecipeInput = {
  name: 'Bean Stew',
  cuisine: 'british',
  mealType: ['dinner'],
  dietary: ['vegan'],
  tags: [],
  serves: 4,
  ingredients: [{ item: 'butter beans', quantity: 400, unit: 'g' }],
  method: ['Simmer everything for 30 minutes.'],
};

describe('plan API', () => {
  const db = useMemoryDb();
  const api = () => request(createApp(db()));

  it('starts with an empty week', async () => {
    const response = await api().get('/plan');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ meals: [] });
  });

  it('fills a slot with a starter recipe and returns it', async () => {
    const response = await api()
      .put('/plan/monday/breakfast')
      .send({ recipeId: PORRIDGE, servings: 2 });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      day: 'monday',
      slot: 'breakfast',
      recipeId: PORRIDGE,
      servings: 2,
    });
    expect((await api().get('/plan')).body.meals).toEqual([response.body]);
  });

  it('lists planned meals in week order, then breakfast, lunch and dinner', async () => {
    // Filled out of order, with days whose names sort differently from the week.
    await api().put('/plan/sunday/lunch').send({ recipeId: PORRIDGE, servings: 1 });
    await api().put('/plan/friday/dinner').send({ recipeId: PORRIDGE, servings: 1 });
    await api().put('/plan/friday/breakfast').send({ recipeId: PORRIDGE, servings: 1 });
    await api().put('/plan/monday/dinner').send({ recipeId: PORRIDGE, servings: 1 });

    const { body } = await api().get('/plan');

    expect(
      body.meals.map((meal: { day: string; slot: string }) => `${meal.day} ${meal.slot}`),
    ).toEqual(['monday dinner', 'friday breakfast', 'friday dinner', 'sunday lunch']);
  });

  it('replaces what was in a slot rather than adding a second meal', async () => {
    await api().put('/plan/tuesday/dinner').send({ recipeId: PORRIDGE, servings: 2 });

    await api().put('/plan/tuesday/dinner').send({ recipeId: BREAKFAST, servings: 5 });

    expect((await api().get('/plan')).body.meals).toEqual([
      { day: 'tuesday', slot: 'dinner', recipeId: BREAKFAST, servings: 5 },
    ]);
  });

  it('plans your own recipes too', async () => {
    const { body: created } = await api().post('/recipes').send(stew);

    const response = await api()
      .put('/plan/wednesday/dinner')
      .send({ recipeId: created.id, servings: 4 });

    expect(response.status).toBe(200);
  });

  it('empties one slot and leaves the rest', async () => {
    await api().put('/plan/monday/lunch').send({ recipeId: PORRIDGE, servings: 2 });
    await api().put('/plan/monday/dinner').send({ recipeId: BREAKFAST, servings: 2 });

    const response = await api().delete('/plan/monday/lunch');

    expect(response.status).toBe(204);
    expect((await api().get('/plan')).body.meals).toEqual([
      { day: 'monday', slot: 'dinner', recipeId: BREAKFAST, servings: 2 },
    ]);
  });

  it('treats emptying an empty slot as done', async () => {
    expect((await api().delete('/plan/monday/lunch')).status).toBe(204);
  });

  it('clears the whole week', async () => {
    await api().put('/plan/monday/lunch').send({ recipeId: PORRIDGE, servings: 2 });
    await api().put('/plan/sunday/dinner').send({ recipeId: BREAKFAST, servings: 2 });

    const response = await api().delete('/plan');

    expect(response.status).toBe(204);
    expect((await api().get('/plan')).body).toEqual({ meals: [] });
  });

  it('takes a deleted recipe off the plan', async () => {
    const { body: created } = await api().post('/recipes').send(stew);
    await api().put('/plan/monday/dinner').send({ recipeId: created.id, servings: 4 });
    await api().put('/plan/tuesday/dinner').send({ recipeId: PORRIDGE, servings: 2 });

    await api().delete(`/recipes/${created.id}`);

    expect((await api().get('/plan')).body.meals).toEqual([
      { day: 'tuesday', slot: 'dinner', recipeId: PORRIDGE, servings: 2 },
    ]);
  });

  it('404s for a day or meal the plan does not have', async () => {
    const meal = { recipeId: PORRIDGE, servings: 2 };

    expect((await api().put('/plan/someday/lunch').send(meal)).status).toBe(404);
    expect((await api().put('/plan/monday/dessert').send(meal)).status).toBe(404);
    expect((await api().delete('/plan/monday/elevenses')).status).toBe(404);
  });

  it('rejects a planned meal with a message per field', async () => {
    const response = await api().put('/plan/monday/lunch').send({ recipeId: ' ', servings: 21 });

    expect(response.status).toBe(400);
    expect(response.body.fields).toEqual({
      recipeId: 'Pick a recipe',
      servings: 'Servings must be a whole number from 1 to 20',
    });
    expect((await api().get('/plan')).body.meals).toEqual([]);
  });

  it('rejects servings that are not a whole number', async () => {
    const response = await api()
      .put('/plan/monday/lunch')
      .send({ recipeId: PORRIDGE, servings: 1.5 });

    expect(response.status).toBe(400);
    expect(response.body.fields).toHaveProperty('servings');
  });

  it('rejects a recipe that does not exist', async () => {
    const response = await api()
      .put('/plan/monday/lunch')
      .send({ recipeId: 'no-such-recipe', servings: 2 });

    expect(response.status).toBe(400);
    expect(response.body.fields).toEqual({ recipeId: 'That recipe no longer exists' });
    expect((await api().get('/plan')).body.meals).toEqual([]);
  });

  it('answers malformed JSON with a 400', async () => {
    const response = await api()
      .put('/plan/monday/lunch')
      .set('Content-Type', 'application/json')
      .send('{"recipeId":');

    expect(response.status).toBe(400);
  });
});
