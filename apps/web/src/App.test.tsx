import { render, screen } from '@testing-library/react';
import type { Recipe } from '@nosh/shared';
import { MemoryRouter } from 'react-router';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { App } from './App.tsx';

const porridge: Recipe = {
  id: 'porridge',
  name: 'Porridge',
  cuisine: 'british',
  mealType: ['breakfast'],
  dietary: ['vegetarian'],
  tags: [],
  serves: 2,
  ingredients: [{ item: 'oats', quantity: 80, unit: 'g' }],
  method: ['Simmer the oats in milk.'],
  isCustom: false,
};

const mockApi = (body: unknown, status = 200) =>
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue({ ok: status < 400, status, url: '/api', json: async () => body }),
  );

const renderAt = (path: string) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>,
  );

afterEach(() => {
  vi.unstubAllGlobals();
});

/*
 * Journeys through the real browser and API live in the Playwright suite under
 * e2e/. These cover what is awkward to arrange there: shapes the API should
 * never send, and an API that is down.
 */
describe('App', () => {
  it('shows the brand, with the mark kept out of the accessibility tree', async () => {
    mockApi([porridge]);

    renderAt('/recipes');

    expect(screen.getByRole('img', { name: 'Nosh' })).toBeInTheDocument();
    expect(screen.getAllByRole('img')).toHaveLength(1);
    expect(await screen.findByRole('link', { name: 'Porridge' })).toBeInTheDocument();
  });

  it('redirects the home page to the recipe list', async () => {
    mockApi([porridge]);

    renderAt('/');

    expect(await screen.findByRole('heading', { level: 1, name: 'Recipes' })).toBeInTheDocument();
  });

  it('degrades to a helpful message when the API answers with the wrong shape', async () => {
    mockApi([{ id: 'half-a-recipe' }]);

    renderAt('/recipes');

    expect(await screen.findByRole('alert')).toHaveTextContent(/couldn’t load recipes/i);
  });

  it('degrades to a helpful message when the API is down', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('connection refused')));

    renderAt('/recipes');

    expect(await screen.findByRole('alert')).toHaveTextContent(/couldn’t load recipes/i);
  });

  it('shows a not-found page for an unknown recipe', async () => {
    mockApi({ error: 'Recipe not found' }, 404);

    renderAt('/recipes/nope');

    expect(await screen.findByRole('heading', { name: 'Nothing here' })).toBeInTheDocument();
  });
});
