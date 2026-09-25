import { expect, test } from '../support/fixtures.ts';

/**
 * Automated WCAG 2.2 AA checks with axe on every page, in the states people
 * actually see. axe catches contrast, labelling and structure problems; it
 * cannot judge everything, so keyboard behaviour is covered in the journey tests.
 */
test.describe('Accessibility', () => {
  test('recipe list', async ({ page, createRecipe, expectNoA11yViolations }) => {
    // With a custom recipe too, so both sections are checked.
    await createRecipe();
    await page.goto('/recipes');
    await expect(page.getByRole('region', { name: /your recipes/i })).toBeVisible();

    await expectNoA11yViolations(page);
  });

  test('starter recipe', async ({ page, expectNoA11yViolations }) => {
    await page.goto('/recipes/full-english-breakfast');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();

    await expectNoA11yViolations(page);
  });

  test('custom recipe, including the delete confirmation', async ({
    page,
    createRecipe,
    expectNoA11yViolations,
  }) => {
    const recipe = await createRecipe();
    await page.goto(`/recipes/${recipe.id}`);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await expectNoA11yViolations(page);

    await page.getByRole('button', { name: 'Delete' }).click();
    await expect(page.getByRole('button', { name: 'Yes, delete it' })).toBeVisible();
    await expectNoA11yViolations(page);
  });

  test('empty form, and the form showing errors', async ({ page, expectNoA11yViolations }) => {
    await page.goto('/recipes/new');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await expectNoA11yViolations(page);

    await page.getByRole('button', { name: 'Save recipe' }).click();
    await expect(page.getByRole('alert')).toBeVisible();
    await expectNoA11yViolations(page);
  });

  test('not-found page', async ({ page, expectNoA11yViolations }) => {
    await page.goto('/recipes/no-such-recipe');
    await expect(page.getByRole('heading', { name: 'Nothing here' })).toBeVisible();

    await expectNoA11yViolations(page);
  });
});
