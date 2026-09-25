import { act, fireEvent, render, screen } from '@testing-library/react';
import type { Recipe } from '@nosh/shared';
import { MemoryRouter } from 'react-router';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { RecipeListPage } from './RecipeListPage.tsx';

const recipe = (name: string, dietary: Recipe['dietary']): Recipe => ({
  id: name.toLowerCase(),
  name,
  cuisine: 'british',
  mealType: ['dinner'],
  dietary,
  tags: [],
  serves: 2,
  ingredients: [],
  method: [],
  isCustom: false,
});

const RECIPES = [recipe('Dahl', ['vegetarian', 'vegan']), recipe('Pie', [])];

const json = (body: unknown, status = 200) =>
  Promise.resolve({ ok: status < 400, status, url: '', json: async () => body });

/**
 * Answer GET /recipes with `recipes` and GET /preferences with `preferences`, and
 * hand each PUT /preferences to `onSave` so a test can control when and how saves finish.
 */
function mockApi({
  recipes = RECIPES,
  preferences = { dietary: [] } as unknown,
  preferencesStatus = 200,
  onSave = (body: unknown) => json(body),
}: {
  recipes?: Recipe[];
  preferences?: unknown;
  preferencesStatus?: number;
  onSave?: (body: unknown) => Promise<unknown>;
} = {}) {
  const fetchMock = vi.fn((url: string, init?: RequestInit) => {
    if (url.endsWith('/recipes')) return json(recipes);
    if (init?.method === 'PUT') return onSave(JSON.parse(String(init.body)));
    return json(preferences, preferencesStatus);
  });
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

const renderPage = () =>
  render(
    <MemoryRouter>
      <RecipeListPage />
    </MemoryRouter>,
  );

const savedBodies = (fetchMock: ReturnType<typeof mockApi>) =>
  fetchMock.mock.calls
    .filter(([, init]) => init?.method === 'PUT')
    .map(([, init]) => JSON.parse(String(init?.body)) as unknown);

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('RecipeListPage diet panel', () => {
  it('still shows every recipe if the saved diet cannot be loaded, without letting it be overwritten', async () => {
    mockApi({ preferences: { error: 'boom' }, preferencesStatus: 500 });

    renderPage();

    expect(await screen.findByRole('link', { name: 'Pie' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Dahl' })).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent(/couldn’t load your saved diet/i);
    expect(screen.getByRole('checkbox', { name: 'Vegan' })).toBeDisabled();
  });

  it('puts the diet back and says so when a save fails', async () => {
    mockApi({ onSave: () => json({ error: 'Nope' }, 500) });
    renderPage();

    fireEvent.click(await screen.findByRole('checkbox', { name: 'Vegan' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(/couldn’t save that change/i);
    expect(screen.getByRole('checkbox', { name: 'Vegan' })).not.toBeChecked();
    expect(screen.getByRole('link', { name: 'Pie' })).toBeInTheDocument();
  });

  it('sends one save at a time and ends on the latest choice', async () => {
    const pending: Array<() => void> = [];
    const fetchMock = mockApi({
      onSave: (body) => new Promise((resolve) => pending.push(() => resolve(json(body)))),
    });
    renderPage();

    // Three quick changes while the first save is still in flight.
    fireEvent.click(await screen.findByRole('checkbox', { name: 'Vegetarian' }));
    fireEvent.click(screen.getByRole('checkbox', { name: 'Vegan' }));
    fireEvent.click(screen.getByRole('checkbox', { name: 'Vegetarian' }));
    expect(savedBodies(fetchMock)).toEqual([{ dietary: ['vegetarian'] }]);

    // When it finishes, only the newest waiting choice is sent.
    await act(async () => pending.shift()?.());
    expect(savedBodies(fetchMock)).toEqual([{ dietary: ['vegetarian'] }, { dietary: ['vegan'] }]);

    await act(async () => pending.shift()?.());
    expect(savedBodies(fetchMock)).toHaveLength(2);
    expect(screen.getByRole('checkbox', { name: 'Vegan' })).toBeChecked();
  });

  it('turns "Show all" off when the diet changes, so the new choice takes effect', async () => {
    mockApi({ preferences: { dietary: ['vegan'] } });
    renderPage();

    fireEvent.click(await screen.findByRole('button', { name: 'Show all' }));
    expect(screen.getByRole('link', { name: 'Pie' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('checkbox', { name: 'Vegetarian' }));

    expect(screen.queryByRole('link', { name: 'Pie' })).not.toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('Showing 1 of 2 recipes that suit you.');
  });

  it('says so when no recipe suits the diet, and points to adding one', async () => {
    mockApi({ preferences: { dietary: ['dairy-free'] } });
    renderPage();

    expect(await screen.findByText(/None of our recipes suit all of those/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'add a recipe of your own' })).toHaveAttribute(
      'href',
      '/recipes/new',
    );
    expect(screen.queryByRole('link', { name: 'Dahl' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Pie' })).not.toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('Showing 0 of 2 recipes that suit you.');
  });

  it('says every recipe suits you when the diet hides none, with nothing to show or hide', async () => {
    mockApi({
      recipes: [recipe('Dahl', ['vegetarian', 'vegan']), recipe('Salad', ['vegan'])],
      preferences: { dietary: ['vegan'] },
    });
    renderPage();

    expect(await screen.findByRole('link', { name: 'Dahl' })).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('All 2 recipes suit you.');
    expect(screen.getByRole('link', { name: 'Salad' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Show all' })).not.toBeInTheDocument();
  });
});
