import { expect, test } from '../support/fixtures.ts';
import { clearWeek, planMeal } from '../support/plan.ts';

/*
 * Runs in the `plan` project, after the rest of the suite and one test at a time:
 * there is one week on the shared API, so every test starts and ends with it clear.
 */
test.describe.configure({ mode: 'serial' });

test.describe('Planning your week', () => {
  test.beforeEach(async ({ request }) => {
    await clearWeek(request);
  });

  test.afterEach(async ({ request }) => {
    await clearWeek(request);
  });

  test('plan a meal, change how many it is for, then take it off', async ({
    page,
    createRecipe,
    uniqueName,
    expectNoA11yViolations,
  }) => {
    const recipe = await createRecipe({
      name: uniqueName('Veg Chilli'),
      mealType: ['dinner'],
      serves: 4,
    });

    await page.goto('/recipes');
    await page
      .getByRole('navigation', { name: 'Main' })
      .getByRole('link', { name: 'Your week' })
      .click();
    await expect(page).toHaveURL('/plan');
    await expect(page).toHaveTitle('Your week · Nosh');
    await expectNoA11yViolations(page);

    const monday = page.getByRole('region', { name: 'Monday' });
    await monday.getByRole('button', { name: 'Add dinner on Monday' }).click();
    const picker = monday.getByLabel('Recipe for Monday dinner');
    await expect(picker).toBeFocused();
    await picker.selectOption({ label: recipe.name });
    // Servings start at what the recipe serves.
    await expect(monday.getByLabel('How many people?')).toHaveValue('4');
    await expectNoA11yViolations(page);
    await monday.getByRole('button', { name: 'Save' }).click();

    await expect(page.getByRole('status')).toHaveText(
      `${recipe.name} is planned for Monday dinner.`,
    );
    await expect(monday.getByRole('link', { name: recipe.name })).toBeVisible();
    await expect(monday.getByText('For 4 people')).toBeVisible();
    await expect(monday.getByRole('heading', { name: 'Dinner' })).toBeFocused();
    await expectNoA11yViolations(page);

    // It was saved, not just shown.
    await page.reload();
    await expect(monday.getByRole('link', { name: recipe.name })).toBeVisible();

    await monday.getByRole('button', { name: 'Change Monday dinner' }).click();
    await monday.getByLabel('How many people?').fill('2');
    await monday.getByRole('button', { name: 'Save' }).click();
    await expect(monday.getByText('For 2 people')).toBeVisible();

    await monday.getByRole('button', { name: 'Remove Monday dinner' }).click();
    await expect(page.getByRole('status')).toHaveText('Monday dinner is empty again.');
    await expect(monday.getByRole('link', { name: recipe.name })).toHaveCount(0);
    await expect(monday.getByRole('button', { name: 'Add dinner on Monday' })).toBeVisible();
  });

  test('“Start a new week” asks first, then clears every meal', async ({
    page,
    request,
    createRecipe,
    expectNoA11yViolations,
  }) => {
    const monday = { day: 'monday', slot: 'breakfast' } as const;
    const sunday = { day: 'sunday', slot: 'breakfast' } as const;
    await planMeal(request, monday, { recipeId: (await createRecipe()).id, servings: 2 });
    await planMeal(request, sunday, { recipeId: (await createRecipe()).id, servings: 2 });

    await page.goto('/plan');
    const planned = page.getByRole('region').getByRole('link');
    await expect(planned).toHaveCount(2);

    await page.getByRole('button', { name: 'Start a new week' }).click();
    const confirm = page.getByRole('group', { name: 'Clear every meal from your week?' });
    await expect(confirm).toBeVisible();
    await expectNoA11yViolations(page);

    await confirm.getByRole('button', { name: 'Keep my week' }).click();
    await expect(planned).toHaveCount(2);

    await page.getByRole('button', { name: 'Start a new week' }).click();
    await confirm.getByRole('button', { name: 'Yes, clear it' }).click();

    await expect(page.getByRole('status')).toHaveText(
      'Your week is clear. Time to plan a new one.',
    );
    await expect(planned).toHaveCount(0);
    await page.reload();
    await expect(page.getByRole('region', { name: 'Monday' })).toBeVisible();
    await expect(planned).toHaveCount(0);
  });

  test('deleting your own recipe warns that it is planned, then takes it off the week', async ({
    page,
    request,
    createRecipe,
    expectNoA11yViolations,
  }) => {
    const recipe = await createRecipe();
    await planMeal(
      request,
      { day: 'wednesday', slot: 'lunch' },
      { recipeId: recipe.id, servings: 2 },
    );

    await page.goto(`/recipes/${recipe.id}`);
    await page.getByRole('button', { name: 'Delete' }).click();
    const confirm = page.getByRole('group', {
      name: `Delete “${recipe.name}”? This can’t be undone.`,
    });
    await expect(confirm).toHaveAccessibleDescription(
      'It’s in your week, so it will come out of your plan too.',
    );
    await expectNoA11yViolations(page);
    await confirm.getByRole('button', { name: 'Yes, delete it' }).click();
    await expect(page).toHaveURL('/recipes');

    await page.goto('/plan');
    const wednesday = page.getByRole('region', { name: 'Wednesday' });
    await expect(wednesday.getByRole('button', { name: 'Add lunch on Wednesday' })).toBeVisible();
    await expect(wednesday.getByRole('link')).toHaveCount(0);
  });
});
