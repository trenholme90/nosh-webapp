import { expect, test } from '../support/fixtures.ts';
import { clearWeek, planMeal } from '../support/plan.ts';

/*
 * Runs in the `shopping-list` project, after the plan tests and one test at a time:
 * the list is worked out from the one week on the shared API.
 */
test.describe.configure({ mode: 'serial' });

test.describe('Shopping list', () => {
  test.beforeEach(async ({ request }) => {
    await clearWeek(request);
  });

  test.afterEach(async ({ request }) => {
    await clearWeek(request);
  });

  test('there is nothing to buy until a meal is planned', async ({
    page,
    expectNoA11yViolations,
  }) => {
    await page.goto('/recipes');
    await page
      .getByRole('navigation', { name: 'Main' })
      .getByRole('link', { name: 'Shopping list' })
      .click();

    await expect(page).toHaveTitle('Shopping list · Nosh');
    await expect(page.getByText(/Nothing to buy yet/)).toBeVisible();
    await expectNoA11yViolations(page);

    await page.getByRole('link', { name: 'Plan some meals for your week' }).click();
    await expect(page).toHaveURL('/plan');
  });

  test('the week’s meals add up into one list you can tick off', async ({
    page,
    request,
    createRecipe,
    expectNoA11yViolations,
  }) => {
    // The same ingredient in two recipes, in units that convert: 300 ml + 2 tbsp.
    const porridge = await createRecipe({
      mealType: ['breakfast'],
      serves: 2,
      ingredients: [{ item: 'oat milk', quantity: 300, unit: 'ml' }],
    });
    const pancakes = await createRecipe({
      mealType: ['breakfast'],
      serves: 4,
      ingredients: [{ item: 'oat milk', quantity: 4, unit: 'tbsp' }],
    });
    await planMeal(
      request,
      { day: 'monday', slot: 'breakfast' },
      { recipeId: porridge.id, servings: 2 },
    );
    // Pancakes planned for 2, so half the recipe: 2 tbsp.
    await planMeal(
      request,
      { day: 'tuesday', slot: 'breakfast' },
      { recipeId: pancakes.id, servings: 2 },
    );

    await page.goto('/plan');
    await page.getByRole('link', { name: 'See your shopping list' }).click();
    await expect(page).toHaveURL('/shopping-list');

    const oatMilk = page.getByRole('checkbox', { name: 'Oat milk 330 ml' });
    await expect(oatMilk).toBeVisible();
    await expect(oatMilk).toHaveAccessibleDescription(`For ${porridge.name}, ${pancakes.name}`);
    await expectNoA11yViolations(page);

    await oatMilk.check();
    await expect(page.getByRole('status')).toHaveText(/^1 of \d+ ticked$/);

    // The tick was saved, not just shown.
    await page.reload();
    await expect(oatMilk).toBeChecked();

    // A new week starts with an empty list.
    await page.goto('/plan');
    await page.getByRole('button', { name: 'Start a new week' }).click();
    await page.getByRole('button', { name: 'Yes, clear it' }).click();
    await expect(page.getByRole('status')).toHaveText(
      'Your week is clear. Time to plan a new one.',
    );
    await page.goto('/shopping-list');
    await expect(page.getByText(/Nothing to buy yet/)).toBeVisible();
  });
});
