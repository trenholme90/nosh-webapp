import AxeBuilder from '@axe-core/playwright';
import { test as base, expect, type Page } from '@playwright/test';
import type { Recipe, RecipeInput } from '@nosh/shared';

/**
 * Shared fixtures for the E2E suite.
 *
 * Tests run in parallel against one API, so anything a test creates gets a
 * unique name and is deleted afterwards. Tests must never assume the custom
 * recipe list is empty.
 */

export const baseRecipe: RecipeInput = {
  name: 'Test Recipe',
  cuisine: 'british',
  mealType: ['dinner'],
  dietary: ['vegetarian'],
  tags: [],
  serves: 4,
  ingredients: [
    { item: 'red lentils', quantity: 200, unit: 'g' },
    { item: 'onion', quantity: 1, unit: null, prep: 'chopped' },
  ],
  method: ['Soften the onion.', 'Add the lentils and simmer for 20 minutes.'],
};

interface Fixtures {
  /** A name no other test will use, e.g. "Lentil Soup 3f9a1c2e". */
  uniqueName: (base: string) => string;
  /** Create a custom recipe through the API, deleted again when the test ends. */
  createRecipe: (overrides?: Partial<RecipeInput>) => Promise<Recipe>;
  /** Fail the test on any WCAG 2.2 A or AA violation axe finds on the page as it stands. */
  expectNoA11yViolations: (page: Page) => Promise<void>;
}

export const test = base.extend<Fixtures>({
  uniqueName: async ({}, use) => {
    await use((name) => `${name} ${crypto.randomUUID().slice(0, 8)}`);
  },

  createRecipe: async ({ request, uniqueName }, use) => {
    const created: string[] = [];

    await use(async (overrides = {}) => {
      const response = await request.post('/api/recipes', {
        data: { ...baseRecipe, name: uniqueName(baseRecipe.name), ...overrides },
      });
      expect(response.status(), await response.text()).toBe(201);
      const recipe = (await response.json()) as Recipe;
      created.push(recipe.id);
      return recipe;
    });

    // A test may already have deleted it, so a 404 here is fine.
    for (const id of created) await request.delete(`/api/recipes/${id}`);
  },

  expectNoA11yViolations: async ({}, use) => {
    await use(async (page) => {
      const results = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
        .analyze();
      // Report the rule ids and offending selectors, which is what you need to fix it.
      const summary = results.violations.map((violation) => ({
        rule: violation.id,
        impact: violation.impact,
        targets: violation.nodes.map((node) => node.target.join(' ')),
      }));
      expect(summary).toEqual([]);
    });
  },
});

export { expect };
