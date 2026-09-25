import type { Page } from '@playwright/test';

/**
 * Drives the add/edit recipe form by its accessible labels, the way a person
 * using a screen reader would find each field.
 */

export interface FormIngredient {
  amount?: string;
  unit?: string;
  item: string;
  prep?: string;
}

export interface FormRecipe {
  name: string;
  cuisine: string;
  serves: string;
  meals: string[];
  diets?: string[];
  ingredients: FormIngredient[];
  steps: string[];
}

/** Fill an empty form, adding ingredient and step rows as needed. */
export async function fillRecipeForm(page: Page, recipe: FormRecipe): Promise<void> {
  await page.getByLabel('Recipe name').fill(recipe.name);
  await page.getByLabel('Cuisine').fill(recipe.cuisine);
  await page.getByLabel('Serves').fill(recipe.serves);

  for (const meal of recipe.meals) await page.getByRole('checkbox', { name: meal }).check();
  for (const diet of recipe.diets ?? []) await page.getByRole('checkbox', { name: diet }).check();

  for (const [index, ingredient] of recipe.ingredients.entries()) {
    const n = index + 1;
    if (index > 0) await page.getByRole('button', { name: 'Add another ingredient' }).click();
    await page.getByLabel(`Amount for ingredient ${n}`).fill(ingredient.amount ?? '');
    await page.getByLabel(`Unit for ingredient ${n}`).fill(ingredient.unit ?? '');
    await page.getByLabel(`Ingredient ${n}`, { exact: true }).fill(ingredient.item);
    await page.getByLabel(`Prep (optional) for ingredient ${n}`).fill(ingredient.prep ?? '');
  }

  for (const [index, step] of recipe.steps.entries()) {
    if (index > 0) await page.getByRole('button', { name: 'Add another step' }).click();
    await page.getByLabel(`Step ${index + 1}`, { exact: true }).fill(step);
  }
}
