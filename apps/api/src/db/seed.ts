import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import type { DatabaseSync } from 'node:sqlite';
import { fileURLToPath } from 'node:url';
import type { Recipe } from '@nosh/shared';

const here = dirname(fileURLToPath(import.meta.url));

/** The starter recipes supplied by the client. */
export const SAMPLE_RECIPES_PATH = join(
  here,
  '..',
  '..',
  'data',
  'project-nosh-sample-recipes.json',
);

export function loadSampleRecipes(path: string = SAMPLE_RECIPES_PATH): Recipe[] {
  return JSON.parse(readFileSync(path, 'utf8')) as Recipe[];
}

export function countRecipes(db: DatabaseSync): number {
  const row = db.prepare('SELECT COUNT(*) AS count FROM recipes').get() as { count: number };
  return row.count;
}

/**
 * Load the starter recipes into an empty database.
 *
 * Idempotent: if anything is already there this is a no-op, so it is safe to
 * call on every boot. Returns the number of recipes inserted.
 */
export function seedRecipes(db: DatabaseSync, recipes: Recipe[] = loadSampleRecipes()): number {
  if (countRecipes(db) > 0) return 0;

  const insertRecipe = db.prepare(
    `INSERT INTO recipes (id, name, cuisine, serves, meal_type, dietary, tags, method, is_custom)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0)`,
  );
  const insertIngredient = db.prepare(
    `INSERT INTO ingredients (recipe_id, item, quantity, unit, prep) VALUES (?, ?, ?, ?, ?)`,
  );

  db.exec('BEGIN');
  try {
    for (const recipe of recipes) {
      insertRecipe.run(
        recipe.id,
        recipe.name,
        recipe.cuisine,
        recipe.serves,
        JSON.stringify(recipe.mealType),
        JSON.stringify(recipe.dietary),
        JSON.stringify(recipe.tags),
        JSON.stringify(recipe.method),
      );
      for (const ingredient of recipe.ingredients) {
        // node:sqlite rejects `undefined`, so optional fields are normalised to null.
        insertIngredient.run(
          recipe.id,
          ingredient.item,
          ingredient.quantity ?? null,
          ingredient.unit ?? null,
          ingredient.prep ?? null,
        );
      }
    }
    db.exec('COMMIT');
  } catch (error) {
    db.exec('ROLLBACK');
    throw error;
  }

  return recipes.length;
}
