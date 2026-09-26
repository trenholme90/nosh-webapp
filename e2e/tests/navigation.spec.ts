import { expect, test } from '../support/fixtures.ts';

test.describe('Getting around', () => {
  test('on a phone the links fold behind a Menu button', async ({
    page,
    expectNoA11yViolations,
  }) => {
    await page.setViewportSize({ width: 360, height: 740 });
    await page.goto('/recipes');
    const nav = page.getByRole('navigation', { name: 'Main' });
    const menu = nav.getByRole('button', { name: 'Menu' });

    await expect(menu).toBeVisible();
    await expect(menu).toHaveAttribute('aria-expanded', 'false');
    await expect(nav.getByRole('link', { name: 'Your week' })).toBeHidden();
    await expectNoA11yViolations(page);

    await menu.click();
    await expect(menu).toHaveAttribute('aria-expanded', 'true');
    await expect(nav.getByRole('link', { name: 'Recipes' })).toBeVisible();
    await expect(nav.getByRole('link', { name: 'Shopping list' })).toBeVisible();
    await expectNoA11yViolations(page);

    await nav.getByRole('link', { name: 'Your week' }).click();
    await expect(page).toHaveURL('/plan');
    await expect(menu).toHaveAttribute('aria-expanded', 'false');
    await expect(nav.getByRole('link', { name: 'Your week' })).toBeHidden();

    // Escape closes it again and leaves focus on the button.
    await menu.click();
    await page.keyboard.press('Escape');
    await expect(menu).toHaveAttribute('aria-expanded', 'false');
    await expect(menu).toBeFocused();
  });

  test('on a wider screen the links sit in the header, with no menu button', async ({ page }) => {
    await page.setViewportSize({ width: 1024, height: 768 });
    await page.goto('/recipes');
    const nav = page.getByRole('navigation', { name: 'Main' });

    await expect(nav.getByRole('button', { name: 'Menu' })).toBeHidden();
    await expect(nav.getByRole('link', { name: 'Recipes' })).toBeVisible();
    await expect(nav.getByRole('link', { name: 'Your week' })).toBeVisible();
    await expect(nav.getByRole('link', { name: 'Shopping list' })).toBeVisible();
  });
});
