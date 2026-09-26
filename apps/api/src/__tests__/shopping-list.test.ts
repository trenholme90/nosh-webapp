import request from 'supertest';
import { describe, expect, it } from 'vitest';
import type { ShoppingItem } from '@nosh/shared';
import { createApp } from '../app.ts';
import { useMemoryDb } from './memory-db.ts';

const PORRIDGE = 'porridge-with-berries-and-honey'; // serves 2, 500 ml milk
const EGGS = 'scrambled-eggs-on-toast'; // serves 2, 2 tbsp milk, salt and pepper
const SOUP = 'tomato-soup'; // serves 4, 1 onion
const CHILLI = 'chilli-con-carne'; // serves 4, 1 onion

describe('shopping list API', () => {
  const db = useMemoryDb();
  const api = () => request(createApp(db()));

  const plan = (day: string, slot: string, recipeId: string, servings: number) =>
    api().put(`/plan/${day}/${slot}`).send({ recipeId, servings });
  const list = async () => (await api().get('/shopping-list')).body.items as ShoppingItem[];
  const line = async (item: string) => (await list()).find((entry) => entry.item === item);
  const tick = (item: string, ticked: boolean) =>
    api()
      .put(`/shopping-list/items/${encodeURIComponent(item)}`)
      .send({ ticked });

  it('is empty when nothing is planned', async () => {
    const response = await api().get('/shopping-list');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ items: [] });
  });

  it('adds up what the planned meals need, across recipes and units', async () => {
    await plan('monday', 'breakfast', PORRIDGE, 2);
    await plan('tuesday', 'breakfast', EGGS, 2);
    await plan('monday', 'dinner', SOUP, 4);
    await plan('tuesday', 'dinner', CHILLI, 4);

    expect(await line('milk')).toEqual({
      item: 'milk',
      amounts: [{ quantity: 530, unit: 'ml' }],
      recipes: ['Porridge with Berries and Honey', 'Scrambled Eggs on Toast'],
      ticked: false,
    });
    expect((await line('onion'))?.amounts).toEqual([{ quantity: 2, unit: null }]);
    expect((await line('salt and pepper'))?.amounts).toEqual([{ quantity: null, unit: null }]);
  });

  it('ticks an item off and back on, including names with spaces', async () => {
    await plan('tuesday', 'breakfast', EGGS, 2);

    const ticked = await tick('salt and pepper', true);
    expect(ticked.status).toBe(200);
    expect(ticked.body).toMatchObject({ item: 'salt and pepper', ticked: true });
    expect((await line('salt and pepper'))?.ticked).toBe(true);

    await tick('salt and pepper', false);
    expect((await line('salt and pepper'))?.ticked).toBe(false);
  });

  it('unticks an item when the plan needs more of it', async () => {
    await plan('monday', 'dinner', SOUP, 4);
    await tick('onion', true);

    await plan('tuesday', 'dinner', CHILLI, 4);

    expect(await line('onion')).toMatchObject({
      amounts: [{ quantity: 2, unit: null }],
      ticked: false,
    });
  });

  it('forgets a tick once the item leaves the plan', async () => {
    await plan('monday', 'dinner', SOUP, 4);
    await tick('onion', true);
    await api().delete('/plan/monday/dinner');
    await list();

    await plan('monday', 'dinner', SOUP, 4);

    expect((await line('onion'))?.ticked).toBe(false);
  });

  it('starts a new week with no ticks', async () => {
    await plan('monday', 'dinner', SOUP, 4);
    await tick('onion', true);

    await api().delete('/plan');
    await plan('monday', 'dinner', SOUP, 4);

    expect((await line('onion'))?.ticked).toBe(false);
  });

  it('404s for an item that is not on the list', async () => {
    await plan('monday', 'dinner', SOUP, 4);

    expect((await tick('caviar', true)).status).toBe(404);
  });

  it('rejects a tick that is not true or false', async () => {
    await plan('monday', 'dinner', SOUP, 4);

    const response = await api().put('/shopping-list/items/onion').send({ ticked: 'yes' });

    expect(response.status).toBe(400);
    expect(response.body.fields).toEqual({ ticked: 'Ticked must be true or false' });
  });
});
