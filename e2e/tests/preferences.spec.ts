import type { APIRequestContext, Page } from '@playwright/test';
import type { DietaryPreference, Recipe } from '@nosh/shared';
import { expect, test } from '../support/fixtures.ts';

/*
 * Runs in the `preferences` project, after the rest of the suite and one test at a
 * time: preferences are global, so changing them would move other tests' lists.
 * Expected recipes are worked out from the API's data rather than hard-coded, so
 * the tests keep up if the starter set changes.
 */
test.describe.configure({ mode: 'serial' });

const resetDiet = (request: APIRequestContext) =>
  request.put('/api/preferences', { data: { dietary: [] } });

async function recipesSuiting(request: APIRequestContext, diet: DietaryPreference[]) {
  const recipes = (await (await request.get('/api/recipes')).json()) as Recipe[];
  const suitable = recipes.filter((recipe) => diet.every((need) => recipe.dietary.includes(need)));
  return { total: recipes.length, suitable: suitable.map((recipe) => recipe.name).sort() };
}

async function recipeNamesShown(page: Page) {
  const names = await page.getByRole('heading', { level: 3 }).allTextContents();
  return names.sort();
}

test.describe('Dietary preferences', () => {
  test.beforeEach(async ({ request }) => {
    await resetDiet(request);
  });

  test.afterEach(async ({ request }) => {
    await resetDiet(request);
  });

  test('ticking a preference shows only recipes that suit it', async ({
    page,
    request,
    expectNoA11yViolations,
  }) => {
    const { total, suitable } = await recipesSuiting(request, ['vegetarian']);

    await page.goto('/recipes');
    const diet = page.getByRole('group', { name: 'Your diet' });
    await expect(diet).toHaveAccessibleDescription(
      'We’ll only show recipes that suit all of these.',
    );
    // Nothing chosen: nothing hidden.
    await expect.poll(() => recipeNamesShown(page)).toHaveLength(total);
    await expect(page.getByRole('button', { name: 'Show all' })).toHaveCount(0);

    await diet.getByRole('checkbox', { name: 'Vegetarian' }).check();

    await expect(page.getByRole('status')).toHaveText(
      `Showing ${suitable.length} of ${total} recipes that suit you.`,
    );
    await expect.poll(() => recipeNamesShown(page)).toEqual(suitable);
    await expectNoA11yViolations(page);
  });

  test('the choice is saved, so it survives a reload', async ({ page }) => {
    await page.goto('/recipes');
    await page.getByRole('checkbox', { name: 'Dairy-free' }).check();
    await expect(page.getByRole('status')).toContainText('that suit you');

    await page.reload();

    await expect(page.getByRole('checkbox', { name: 'Dairy-free' })).toBeChecked();
    await expect(page.getByRole('status')).toContainText('that suit you');
  });

  test('several preferences show only recipes that suit all of them', async ({ page, request }) => {
    const { suitable } = await recipesSuiting(request, ['vegan', 'gluten-free']);
    const { suitable: veganOnly } = await recipesSuiting(request, ['vegan']);
    const { suitable: glutenFreeOnly } = await recipesSuiting(request, ['gluten-free']);
    // Guard the premise: the pair must be narrower than gluten-free on its own.
    expect(suitable.length).toBeLessThan(glutenFreeOnly.length);

    await page.goto('/recipes');
    await page.getByRole('checkbox', { name: 'Gluten-free' }).check();
    await expect.poll(() => recipeNamesShown(page)).toEqual(glutenFreeOnly);
    await page.getByRole('checkbox', { name: 'Vegan' }).check();

    await expect.poll(() => recipeNamesShown(page)).toEqual(suitable);
    expect(suitable.every((name) => veganOnly.includes(name))).toBe(true);
  });

  test('“Show all” brings hidden recipes back, and can be undone', async ({
    page,
    request,
    expectNoA11yViolations,
  }) => {
    const { total, suitable } = await recipesSuiting(request, ['gluten-free']);
    const hidden = total - suitable.length;

    await page.goto('/recipes');
    await page.getByRole('checkbox', { name: 'Gluten-free' }).check();
    await page.getByRole('button', { name: 'Show all' }).click();

    await expect(page.getByRole('status')).toHaveText(
      `Showing all ${total} recipes, including ${hidden} that don’t suit you.`,
    );
    await expect.poll(() => recipeNamesShown(page)).toHaveLength(total);
    await expectNoA11yViolations(page);

    await page.getByRole('button', { name: 'Only show recipes that suit me' }).click();
    await expect.poll(() => recipeNamesShown(page)).toEqual(suitable);
  });

  test('your own recipes follow the same rule', async ({ page, createRecipe, uniqueName }) => {
    const suits = await createRecipe({
      name: uniqueName('Dairy-free Curry'),
      dietary: ['dairy-free'],
    });
    const doesNotSuit = await createRecipe({ name: uniqueName('Cheese Pie'), dietary: [] });

    await page.goto('/recipes');
    const yours = page.getByRole('region', { name: /your recipes/i });
    await expect(yours.getByRole('link', { name: doesNotSuit.name })).toBeVisible();

    await page.getByRole('checkbox', { name: 'Dairy-free' }).check();

    await expect(yours.getByRole('link', { name: suits.name })).toBeVisible();
    await expect(page.getByRole('link', { name: doesNotSuit.name })).toHaveCount(0);
  });

  test('“Your recipes” goes when none of them suit you', async ({
    page,
    request,
    createRecipe,
  }) => {
    const recipe = await createRecipe({ dietary: [] });
    // Guard the premise: no custom recipe left on the API may suit dairy-free.
    const recipes = (await (await request.get('/api/recipes')).json()) as Recipe[];
    const customSuiting = recipes.filter(
      (other) => other.isCustom && other.dietary.includes('dairy-free'),
    );
    expect(customSuiting.map((other) => other.name)).toEqual([]);

    await page.goto('/recipes');
    const yours = page.getByRole('region', { name: /your recipes/i });
    await expect(yours.getByRole('link', { name: recipe.name })).toBeVisible();

    await page.getByRole('checkbox', { name: 'Dairy-free' }).check();

    await expect(yours).toHaveCount(0);
    await expect(page.getByRole('region', { name: /starter recipes/i })).toBeVisible();
  });
});
