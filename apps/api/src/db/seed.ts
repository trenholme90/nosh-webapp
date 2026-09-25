import { readFileSync } from 'node:fs';
import type { DatabaseSync } from 'node:sqlite';
import type { Recipe } from '@nosh/shared';
import { SAMPLE_RECIPES_PATH } from './paths.ts';
import { countRecipes, inTransaction, insertRecipe } from './recipes.ts';

/** A starter recipe as supplied: it has no `isCustom` flag because none of them are. */
export type StarterRecipe = Omit<Recipe, 'isCustom'>;

export function loadSampleRecipes(): StarterRecipe[] {
  return JSON.parse(readFileSync(SAMPLE_RECIPES_PATH, 'utf8')) as StarterRecipe[];
}

/**
 * Load the starter recipes into an empty database.
 *
 * Idempotent: if anything is already there this is a no-op, so it is safe to
 * call on every boot. Returns the number of recipes inserted.
 */
export function seedRecipes(db: DatabaseSync): number {
  if (countRecipes(db) > 0) return 0;

  const recipes = loadSampleRecipes();
  inTransaction(db, () => {
    for (const recipe of recipes) insertRecipe(db, { ...recipe, isCustom: false });
  });

  return recipes.length;
}
