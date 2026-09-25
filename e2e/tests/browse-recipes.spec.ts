import { expect, test } from '../support/fixtures.ts';

test.describe('Browsing recipes', () => {
  test('the home page lists every starter recipe', async ({ page, expectNoA11yViolations }) => {
    await page.goto('/');

    await expect(page).toHaveURL('/recipes');
    await expect(page.getByRole('heading', { level: 1, name: 'Recipes' })).toBeVisible();

    const starters = page.getByRole('region', { name: /starter recipes/i });
    await expect(starters.getByRole('heading', { name: /\(20\)/ })).toBeVisible();
    await expect(
      starters.getByRole('listitem').filter({ has: page.getByRole('heading') }),
    ).toHaveCount(20);

    await expectNoA11yViolations(page);
  });

  test('a recipe card shows what it suits at a glance', async ({ page }) => {
    await page.goto('/recipes');

    const card = page
      .getByRole('listitem')
      .filter({ has: page.getByRole('link', { name: 'Full English Breakfast' }) });
    await expect(card).toContainText('Serves 2 · British · Breakfast');
  });

  test('opening a recipe shows its ingredients and method', async ({
    page,
    expectNoA11yViolations,
  }) => {
    await page.goto('/recipes');

    await page.getByRole('link', { name: 'Full English Breakfast' }).click();

    await expect(page).toHaveURL('/recipes/full-english-breakfast');
    await expect(page).toHaveTitle('Full English Breakfast · Nosh');
    await expect(
      page.getByRole('heading', { level: 1, name: 'Full English Breakfast' }),
    ).toBeVisible();

    const ingredients = page.getByRole('region', { name: 'Ingredients' }).getByRole('listitem');
    await expect(ingredients).toHaveCount(7);
    await expect(ingredients).toContainText([
      '4 pork sausages',
      '4 rashers back bacon',
      '2 tomatoes, halved',
    ]);

    const steps = page.getByRole('region', { name: 'Method' }).getByRole('listitem');
    await expect(steps.first()).toContainText('Heat a little oil');

    await expectNoA11yViolations(page);
  });

  test('dietary badges show on vegetarian recipes', async ({ page, request }) => {
    const recipes = (await (await request.get('/api/recipes')).json()) as {
      id: string;
      name: string;
      dietary: string[];
    }[];
    const vegetarian = recipes.find((recipe) => recipe.dietary.includes('vegetarian'));
    expect(vegetarian, 'starter data should include a vegetarian recipe').toBeDefined();

    await page.goto(`/recipes/${vegetarian!.id}`);

    await expect(page.getByRole('list', { name: 'Dietary' })).toContainText('Vegetarian');
  });

  test('starter recipes cannot be edited or deleted', async ({ page }) => {
    await page.goto('/recipes/full-english-breakfast');

    await expect(page.getByText('A Nosh starter recipe.')).toBeVisible();
    await expect(page.getByRole('link', { name: 'Edit' })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Delete' })).toHaveCount(0);

    // Going straight to the edit URL is refused too.
    await page.goto('/recipes/full-english-breakfast/edit');
    await expect(page.getByText('Starter recipes can’t be edited')).toBeVisible();
  });

  test('back and forward work between the list and a recipe', async ({ page }) => {
    await page.goto('/recipes');
    await page.getByRole('link', { name: 'Full English Breakfast' }).click();
    await expect(
      page.getByRole('heading', { level: 1, name: 'Full English Breakfast' }),
    ).toBeVisible();

    await page.goBack();
    await expect(page.getByRole('heading', { level: 1, name: 'Recipes' })).toBeVisible();

    await page.goForward();
    await expect(
      page.getByRole('heading', { level: 1, name: 'Full English Breakfast' }),
    ).toBeVisible();
  });

  test('an unknown recipe shows a friendly not-found page', async ({
    page,
    expectNoA11yViolations,
  }) => {
    await page.goto('/recipes/no-such-recipe');

    await expect(page.getByRole('heading', { name: 'Nothing here' })).toBeVisible();
    await expectNoA11yViolations(page);

    await page.getByRole('link', { name: 'Browse recipes' }).click();
    await expect(page).toHaveURL('/recipes');
  });
});
