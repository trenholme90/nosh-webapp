import { act, fireEvent, render, screen } from '@testing-library/react';
import type { Plan, Recipe } from '@nosh/shared';
import { MemoryRouter, Route, Routes } from 'react-router';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { RecipeDetailPage } from './RecipeDetailPage.tsx';

const stew: Recipe = {
  id: 'stew',
  name: 'Stew',
  cuisine: 'british',
  mealType: ['dinner'],
  dietary: [],
  tags: [],
  serves: 4,
  ingredients: [{ item: 'beans', quantity: 400, unit: 'g' }],
  method: ['Simmer.'],
  isCustom: true,
};

const json = (body: unknown) =>
  Promise.resolve({ ok: true, status: 200, url: '', json: async () => body });

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('RecipeDetailPage delete', () => {
  it('waits to know whether the recipe is planned before it can be deleted', async () => {
    let answerPlan = (_plan: Plan) => {};
    const plan = new Promise<Plan>((resolve) => {
      answerPlan = resolve;
    });
    vi.stubGlobal(
      'fetch',
      vi.fn((url: string) => (url.endsWith('/plan') ? plan.then(json) : json(stew))),
    );
    render(
      <MemoryRouter initialEntries={['/recipes/stew']}>
        <Routes>
          <Route path="/recipes/:id" element={<RecipeDetailPage />} />
        </Routes>
      </MemoryRouter>,
    );

    fireEvent.click(await screen.findByRole('button', { name: 'Delete' }));
    expect(screen.getByRole('button', { name: 'Yes, delete it' })).toBeDisabled();

    await act(async () =>
      answerPlan({ meals: [{ day: 'monday', slot: 'dinner', recipeId: 'stew', servings: 4 }] }),
    );

    expect(screen.getByRole('button', { name: 'Yes, delete it' })).toBeEnabled();
    expect(screen.getByRole('group')).toHaveAccessibleDescription(
      'It’s in your week, so it will come out of your plan too.',
    );
  });
});
