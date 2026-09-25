import { expect, test } from '../support/fixtures.ts';
import { fillRecipeForm } from '../support/recipe-form.ts';

test.describe('Adding your own recipe', () => {
  test('a new recipe is saved with its ingredients and method', async ({
    page,
    request,
    uniqueName,
    expectNoA11yViolations,
  }) => {
    const name = uniqueName('Nan’s Lentil Soup');

    await page.goto('/recipes');
    await page.getByRole('link', { name: 'Add your own recipe' }).click();
    await expect(
      page.getByRole('heading', { level: 1, name: 'Add your own recipe' }),
    ).toBeVisible();

    await fillRecipeForm(page, {
      name,
      cuisine: 'British',
      serves: '4',
      meals: ['Lunch', 'Dinner'],
      diets: ['Vegan', 'Vegetarian'],
      ingredients: [
        { amount: '200', unit: 'g', item: 'red lentils' },
        { amount: '1 1/2', item: 'onions', prep: 'chopped' },
        { item: 'salt' },
      ],
      steps: ['Soften the onions.', 'Add the lentils and simmer for 20 minutes.'],
    });
    await page.getByRole('button', { name: 'Save recipe' }).click();

    // Lands on the new recipe, showing exactly what was entered.
    await expect(page.getByRole('heading', { level: 1, name })).toBeVisible();
    await expect(page.getByText('Serves 4 · British · Lunch, Dinner')).toBeVisible();
    await expect(page.getByRole('list', { name: 'Dietary' }).getByRole('listitem')).toHaveText([
      'Vegetarian',
      'Vegan',
    ]);
    await expect(
      page.getByRole('region', { name: 'Ingredients' }).getByRole('listitem'),
    ).toHaveText(['200 g red lentils', '1½ onions, chopped', 'salt']);
    await expect(page.getByRole('region', { name: 'Method' }).getByRole('listitem')).toHaveText([
      'Soften the onions.',
      'Add the lentils and simmer for 20 minutes.',
    ]);
    await expectNoA11yViolations(page);

    // It survives a reload, so it really was stored.
    await page.reload();
    await expect(page.getByRole('heading', { level: 1, name })).toBeVisible();

    const id = new URL(page.url()).pathname.split('/').pop();

    // And it appears under "Your recipes" on the list.
    await page.getByRole('link', { name: '← All recipes' }).click();
    await expect(
      page.getByRole('region', { name: /your recipes/i }).getByRole('link', { name }),
    ).toBeVisible();
    // With a custom recipe listed, both sections of the list are checked.
    await expectNoA11yViolations(page);

    await request.delete(`/api/recipes/${id}`);
  });

  test('an incomplete form explains what to fix and saves nothing', async ({
    page,
    expectNoA11yViolations,
  }) => {
    await page.goto('/recipes/new');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await expectNoA11yViolations(page);

    await page.getByLabel('Serves').fill('0');
    await page.getByLabel('Amount for ingredient 1').fill('lots');
    await page.getByRole('button', { name: 'Save recipe' }).click();

    const summary = page.getByRole('alert').filter({ hasText: 'A few things need fixing' });
    await expect(summary).toBeFocused();
    await expect(summary.getByRole('listitem')).toHaveText([
      'Give your recipe a name',
      'Add a cuisine, such as British or Italian',
      'Serves must be a whole number from 1 to 20',
      'Pick at least one meal this recipe suits',
      'Ingredient 1: Name the ingredient',
      'Ingredient 1: Amount must be a number above 0, or left blank',
      'Step 1: Write this step, or remove it',
    ]);
    await expectNoA11yViolations(page);

    // Each message links to its field, and the field is marked invalid.
    await summary.getByRole('link', { name: 'Give your recipe a name' }).click();
    await expect(page.getByLabel('Recipe name')).toBeFocused();
    await expect(page.getByLabel('Recipe name')).toHaveAttribute('aria-invalid', 'true');
    await expect(page.getByLabel('Recipe name')).toHaveAccessibleDescription(
      'Give your recipe a name',
    );

    // Still on the form: nothing was sent, so nothing was saved.
    await expect(page).toHaveURL('/recipes/new');
  });

  test('ingredient and step rows can be added and removed', async ({ page }) => {
    await page.goto('/recipes/new');

    await page.getByRole('button', { name: 'Add another ingredient' }).click();
    await expect(page.getByLabel('Ingredient 2', { exact: true })).toBeFocused();
    await page.getByLabel('Ingredient 2', { exact: true }).fill('carrots');

    await page.getByRole('button', { name: 'Remove ingredient 1' }).click();
    // The remaining row renumbers and keeps what was typed into it.
    await expect(page.getByLabel('Ingredient 1', { exact: true })).toHaveValue('carrots');
    await expect(page.getByLabel('Ingredient 2', { exact: true })).toHaveCount(0);
    // The last row cannot be removed.
    await expect(page.getByRole('button', { name: /Remove ingredient/ })).toHaveCount(0);

    await page.getByRole('button', { name: 'Add another step' }).click();
    await expect(page.getByLabel('Step 2', { exact: true })).toBeFocused();
    await page.getByRole('button', { name: 'Remove step 2' }).click();
    await expect(page.getByLabel('Step 2', { exact: true })).toHaveCount(0);
  });

  test('cancel leaves without saving', async ({ page }) => {
    await page.goto('/recipes/new');
    await page.getByLabel('Recipe name').fill('Never saved');

    await page.getByRole('link', { name: 'Cancel' }).click();

    await expect(page).toHaveURL('/recipes');
    await expect(page.getByRole('link', { name: 'Never saved' })).toHaveCount(0);
  });
});

test.describe('Editing your own recipe', () => {
  test('changes are saved and shown', async ({ page, createRecipe, uniqueName }) => {
    const recipe = await createRecipe();
    const newName = uniqueName('Lentil Stew');

    await page.goto(`/recipes/${recipe.id}`);
    await page.getByRole('link', { name: 'Edit' }).click();

    await expect(
      page.getByRole('heading', { level: 1, name: `Edit ${recipe.name}` }),
    ).toBeVisible();
    // The form opens with the saved values in place.
    await expect(page.getByLabel('Recipe name')).toHaveValue(recipe.name);
    await expect(page.getByLabel('Ingredient 2', { exact: true })).toHaveValue('onion');
    await expect(page.getByRole('checkbox', { name: 'Vegetarian' })).toBeChecked();

    await page.getByLabel('Recipe name').fill(newName);
    await page.getByLabel('Serves').fill('6');
    await page.getByRole('button', { name: 'Remove ingredient 2' }).click();
    await page.getByRole('button', { name: 'Save changes' }).click();

    // Same URL: the id is stable across a rename, so links keep working.
    await expect(page).toHaveURL(`/recipes/${recipe.id}`);
    await expect(page.getByRole('heading', { level: 1, name: newName })).toBeVisible();
    await expect(page.getByText(/^Serves 6/)).toBeVisible();
    await expect(
      page.getByRole('region', { name: 'Ingredients' }).getByRole('listitem'),
    ).toHaveText(['200 g red lentils']);
  });

  test('an edit that breaks the rules is not saved', async ({ page, createRecipe }) => {
    const recipe = await createRecipe();

    await page.goto(`/recipes/${recipe.id}/edit`);
    await page.getByLabel('Recipe name').fill('   ');
    await page.getByRole('button', { name: 'Save changes' }).click();

    await expect(
      page.getByRole('alert').filter({ hasText: 'Give your recipe a name' }),
    ).toBeVisible();

    await page.goto(`/recipes/${recipe.id}`);
    await expect(page.getByRole('heading', { level: 1, name: recipe.name })).toBeVisible();
  });
});

test.describe('Deleting your own recipe', () => {
  test('asks first, then removes it', async ({ page, createRecipe, expectNoA11yViolations }) => {
    const recipe = await createRecipe();

    await page.goto(`/recipes/${recipe.id}`);
    await expect(page.getByRole('heading', { level: 1, name: recipe.name })).toBeVisible();
    await expectNoA11yViolations(page);

    await page.getByRole('button', { name: 'Delete' }).click();

    const confirm = page.getByRole('group', {
      name: `Delete “${recipe.name}”? This can’t be undone.`,
    });
    await expect(confirm).toBeVisible();
    await expectNoA11yViolations(page);
    await confirm.getByRole('button', { name: 'Yes, delete it' }).click();

    await expect(page).toHaveURL('/recipes');
    await expect(
      page.getByRole('status').filter({ hasText: `“${recipe.name}” has been deleted.` }),
    ).toBeVisible();
    await expect(page.getByRole('link', { name: recipe.name })).toHaveCount(0);

    await page.goto(`/recipes/${recipe.id}`);
    await expect(page.getByRole('heading', { name: 'Nothing here' })).toBeVisible();
  });

  test('“Keep it” backs out without deleting', async ({ page, createRecipe }) => {
    const recipe = await createRecipe();

    await page.goto(`/recipes/${recipe.id}`);
    await page.getByRole('button', { name: 'Delete' }).click();
    await page.getByRole('button', { name: 'Keep it' }).click();

    await expect(page.getByRole('button', { name: 'Delete' })).toBeVisible();
    await page.reload();
    await expect(page.getByRole('heading', { level: 1, name: recipe.name })).toBeVisible();
  });
});
