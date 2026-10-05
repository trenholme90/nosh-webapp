import { expect, test } from '../support/fixtures.ts';

test.describe('Hub locator', () => {
  test('a postcode lists the five closest hubs, nearest first', async ({
    page,
    expectNoA11yViolations,
  }) => {
    await page.goto('/recipes');
    await page
      .getByRole('navigation', { name: 'Main' })
      .getByRole('link', { name: 'Find a hub' })
      .click();

    await expect(page).toHaveURL('/hubs');
    await expect(page).toHaveTitle('Find a hub · Nosh');
    await expectNoA11yViolations(page);

    await page.getByLabel('Your postcode').fill('m11ae');
    await page.getByRole('button', { name: 'Find hubs' }).click();

    await expect(page.getByRole('heading', { name: 'Closest to M1 1AE' })).toBeVisible();
    const hubs = page
      .getByRole('listitem')
      .filter({ has: page.getByRole('heading', { level: 3 }) });
    await expect(hubs).toHaveCount(5);
    await expect(hubs.first()).toContainText('Northern Quarter Larder');
    await expect(hubs.first()).toContainText('miles away');
    await expect(hubs.first()).toContainText('44 Oldham Street, Manchester M1 1AE');
    await expect(hubs.first()).toContainText('Open ');
    await expectNoA11yViolations(page);
  });

  test('a postcode far from every hub still finds the closest five', async ({ page }) => {
    await page.goto('/hubs');

    await page.getByLabel('Your postcode').fill('TR1 2EP');
    await page.getByRole('button', { name: 'Find hubs' }).click();

    await expect(page.getByRole('heading', { name: 'Closest to TR1 2EP' })).toBeVisible();
    await expect(page.getByRole('heading', { level: 3 })).toHaveCount(5);
    await expect(page.getByRole('heading', { level: 3 }).first()).toHaveText(
      'Cornwall Kitchen Table',
    );
  });

  test('a mistyped postcode is explained next to the field', async ({
    page,
    expectNoA11yViolations,
  }) => {
    await page.goto('/hubs');

    await page.getByLabel('Your postcode').fill('banana');
    await page.getByRole('button', { name: 'Find hubs' }).click();

    await expect(page.getByRole('alert')).toHaveText('Enter a full UK postcode, like M1 1AE');
    await expect(page.getByLabel('Your postcode')).toHaveAttribute('aria-invalid', 'true');
    await expectNoA11yViolations(page);
  });

  test('a postcode that does not exist says so', async ({ page }) => {
    await page.goto('/hubs');

    await page.getByLabel('Your postcode').fill('ZZ99 9ZZ');
    await page.getByRole('button', { name: 'Find hubs' }).click();

    await expect(page.getByRole('alert')).toHaveText('We couldn’t find that postcode');
  });
});
