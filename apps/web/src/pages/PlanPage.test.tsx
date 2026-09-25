import { act, fireEvent, render, screen, within } from '@testing-library/react';
import type { Plan, Recipe } from '@nosh/shared';
import { MemoryRouter } from 'react-router';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { PlanPage } from './PlanPage.tsx';

const recipe = (
  name: string,
  mealType: Recipe['mealType'],
  dietary: Recipe['dietary'],
): Recipe => ({
  id: name.toLowerCase(),
  name,
  cuisine: 'british',
  mealType,
  dietary,
  tags: [],
  serves: 4,
  ingredients: [],
  method: [],
  isCustom: false,
});

const RECIPES = [
  recipe('Soup', ['lunch'], ['vegan']),
  recipe('Dahl', ['dinner'], ['vegan']),
  recipe('Pie', ['lunch'], []),
];

const json = (body: unknown, status = 200) =>
  Promise.resolve({ ok: status < 400, status, url: '', json: async () => body });

/** Echo a PUT back as the saved meal, as the API does. */
const echoSave = (body: unknown, url: string) => {
  const [day, slot] = url.split('/').slice(-2);
  return json({ day, slot, ...(body as object) });
};

/**
 * Answer the page's three GETs with the given bodies, hand each PUT to `onSave`
 * so a test can decide how a save ends, and answer DELETEs with `deleteStatus`.
 */
function mockApi({
  plan = { meals: [] } as unknown,
  planStatus = 200,
  recipes = RECIPES,
  preferences = { dietary: [] } as unknown,
  preferencesStatus = 200,
  onSave = echoSave,
  deleteStatus = 204,
}: {
  plan?: unknown;
  planStatus?: number;
  recipes?: Recipe[];
  preferences?: unknown;
  preferencesStatus?: number;
  onSave?: (body: unknown, url: string) => Promise<unknown>;
  deleteStatus?: number;
} = {}) {
  const fetchMock = vi.fn((url: string, init?: RequestInit) => {
    if (init?.method === 'PUT') return onSave(JSON.parse(String(init.body)), url);
    if (init?.method === 'DELETE') return json({ error: 'Nope' }, deleteStatus);
    if (url.endsWith('/recipes')) return json(recipes);
    if (url.endsWith('/preferences')) return json(preferences, preferencesStatus);
    return json(plan, planStatus);
  });
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

const renderPage = () =>
  render(
    <MemoryRouter>
      <PlanPage />
    </MemoryRouter>,
  );

const optionsIn = (group: string) =>
  within(screen.getByRole('group', { name: group }))
    .getAllByRole('option')
    .map((option) => option.textContent);

/** Open Monday lunch's editor. Queries stay inside Monday: role queries over the whole week are slow. */
async function openMondayLunch() {
  const monday = await screen.findByRole('region', { name: 'Monday' });
  fireEvent.click(within(monday).getByRole('button', { name: 'Add lunch on Monday' }));
}

async function chooseForMondayLunch(recipeId: string) {
  await openMondayLunch();
  fireEvent.change(screen.getByLabelText('Recipe for Monday lunch'), {
    target: { value: recipeId },
  });
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('PlanPage', () => {
  it('says so when the week cannot be loaded', async () => {
    mockApi({ plan: { error: 'boom' }, planStatus: 500 });

    renderPage();

    expect(await screen.findByRole('alert')).toHaveTextContent(/couldn’t load/i);
  });

  it('shows what is already planned', async () => {
    const plan: Plan = {
      meals: [{ day: 'friday', slot: 'dinner', recipeId: 'dahl', servings: 1 }],
    };
    mockApi({ plan });

    renderPage();

    const friday = await screen.findByRole('region', { name: 'Friday' });
    expect(within(friday).getByRole('link', { name: 'Dahl' })).toBeInTheDocument();
    expect(within(friday).getByText('For 1 person')).toBeInTheDocument();
  });

  it('offers recipes that suit your diet, those made for the meal first', async () => {
    mockApi({ preferences: { dietary: ['vegan'] } });
    renderPage();

    await openMondayLunch();

    expect(optionsIn('Good for lunch')).toEqual(['Soup']);
    expect(optionsIn('Other recipes')).toEqual(['Dahl']);
    expect(screen.queryByRole('option', { name: 'Pie' })).not.toBeInTheDocument();
  });

  it('offers every recipe, and says why, if your diet cannot be loaded', async () => {
    mockApi({ preferences: { error: 'boom' }, preferencesStatus: 500 });
    renderPage();

    await openMondayLunch();

    expect(screen.getByText(/couldn’t load your saved diet/i)).toBeInTheDocument();
    expect(optionsIn('Good for lunch')).toEqual(['Soup', 'Pie']);
  });

  it('sets servings from the recipe until you change them yourself', async () => {
    mockApi({
      recipes: [recipe('Soup', ['lunch'], []), { ...recipe('Stew', ['lunch'], []), serves: 6 }],
    });
    renderPage();
    await chooseForMondayLunch('soup');
    const servings = screen.getByLabelText('How many people?');
    expect(servings).toHaveValue(4);

    fireEvent.change(screen.getByLabelText('Recipe for Monday lunch'), {
      target: { value: 'stew' },
    });
    expect(servings).toHaveValue(6);

    fireEvent.change(servings, { target: { value: '2' } });
    fireEvent.change(screen.getByLabelText('Recipe for Monday lunch'), {
      target: { value: 'soup' },
    });
    expect(servings).toHaveValue(2);
  });

  it('saves a meal and shows it in its slot', async () => {
    const fetchMock = mockApi();
    renderPage();

    await chooseForMondayLunch('soup');
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    const monday = screen.getByRole('region', { name: 'Monday' });
    expect(await within(monday).findByRole('link', { name: 'Soup' })).toBeInTheDocument();
    expect(within(monday).getByText('For 4 people')).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('Soup is planned for Monday lunch.');
    const put = fetchMock.mock.calls.find(([, init]) => init?.method === 'PUT');
    expect(put?.[0]).toMatch(/\/plan\/monday\/lunch$/);
    expect(JSON.parse(String(put?.[1]?.body))).toEqual({ recipeId: 'soup', servings: 4 });
  });

  it('explains what to fix before sending anything', async () => {
    const fetchMock = mockApi();
    renderPage();

    await openMondayLunch();
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    expect(screen.getByText('Pick a recipe')).toBeInTheDocument();
    expect(screen.getByLabelText('Recipe for Monday lunch')).toHaveAttribute(
      'aria-invalid',
      'true',
    );
    expect(fetchMock.mock.calls.some(([, init]) => init?.method === 'PUT')).toBe(false);
  });

  it('shows the API’s reason beside the field it is about', async () => {
    mockApi({
      onSave: () =>
        json(
          {
            error: 'Planned meal is not valid',
            fields: { recipeId: 'That recipe no longer exists' },
          },
          400,
        ),
    });
    renderPage();

    await chooseForMondayLunch('soup');
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    expect(await screen.findByText('That recipe no longer exists')).toBeInTheDocument();
  });

  it('keeps the week as it was when a save fails', async () => {
    mockApi({ onSave: () => json({ error: 'Nope' }, 500) });
    renderPage();

    await chooseForMondayLunch('soup');
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(/couldn’t save that/i);
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(screen.queryByText('Soup')).not.toBeInTheDocument();
    expect(
      within(screen.getByRole('region', { name: 'Monday' })).getByRole('button', {
        name: 'Add lunch on Monday',
      }),
    ).toBeInTheDocument();
  });

  it('resets servings to the new recipe when you change a planned meal', async () => {
    mockApi({
      plan: { meals: [{ day: 'monday', slot: 'lunch', recipeId: 'soup', servings: 2 }] },
      recipes: [recipe('Soup', ['lunch'], []), { ...recipe('Pie', ['lunch'], []), serves: 6 }],
    });
    renderPage();
    const monday = await screen.findByRole('region', { name: 'Monday' });

    fireEvent.click(within(monday).getByRole('button', { name: 'Change Monday lunch' }));
    const servings = within(monday).getByLabelText('How many people?');
    expect(servings).toHaveValue(2);

    fireEvent.change(within(monday).getByLabelText('Recipe for Monday lunch'), {
      target: { value: 'pie' },
    });
    expect(servings).toHaveValue(6);
  });

  it('locks the rest of the week while a save is on its way', async () => {
    let finishSave = () => {};
    mockApi({
      plan: { meals: [{ day: 'tuesday', slot: 'dinner', recipeId: 'dahl', servings: 2 }] },
      onSave: (body, url) =>
        new Promise((resolve) => {
          finishSave = () => resolve(echoSave(body, url));
        }),
    });
    renderPage();
    await chooseForMondayLunch('soup');

    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    const tuesday = screen.getByRole('region', { name: 'Tuesday' });
    expect(within(tuesday).getByRole('button', { name: 'Remove Tuesday dinner' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Start a new week' })).toBeDisabled();

    await act(async () => finishSave());
    expect(within(tuesday).getByRole('button', { name: 'Remove Tuesday dinner' })).toBeEnabled();
  });

  it('keeps a meal and says so when taking it off fails', async () => {
    mockApi({
      plan: { meals: [{ day: 'monday', slot: 'lunch', recipeId: 'soup', servings: 2 }] },
      deleteStatus: 500,
    });
    renderPage();
    const monday = await screen.findByRole('region', { name: 'Monday' });

    fireEvent.click(within(monday).getByRole('button', { name: 'Remove Monday lunch' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(/couldn’t change your week/i);
    expect(within(monday).getByRole('link', { name: 'Soup' })).toBeInTheDocument();
  });

  it('keeps the week and says so when clearing it fails', async () => {
    mockApi({
      plan: { meals: [{ day: 'monday', slot: 'lunch', recipeId: 'soup', servings: 2 }] },
      deleteStatus: 500,
    });
    renderPage();
    const monday = await screen.findByRole('region', { name: 'Monday' });

    fireEvent.click(screen.getByRole('button', { name: 'Start a new week' }));
    fireEvent.click(screen.getByRole('button', { name: 'Yes, clear it' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(/couldn’t change your week/i);
    expect(within(monday).getByRole('link', { name: 'Soup' })).toBeInTheDocument();
  });
});
