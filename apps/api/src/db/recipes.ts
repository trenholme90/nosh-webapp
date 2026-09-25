import type { DatabaseSync } from 'node:sqlite';
import type { Ingredient, Recipe, RecipeInput } from '@nosh/shared';

/**
 * Everything that reads or writes the recipe tables.
 *
 * Rows store list fields as JSON text (see schema.sql); this module is the only
 * place that knows that, so routes and the seeder deal in `Recipe` objects.
 */

interface RecipeRow {
  id: string;
  name: string;
  cuisine: string;
  serves: number;
  meal_type: string;
  dietary: string;
  tags: string;
  method: string;
  is_custom: number;
}

interface IngredientRow {
  recipe_id: string;
  item: string;
  quantity: number | null;
  unit: string | null;
  prep: string | null;
}

/** Why a write to an existing recipe did not happen. Starter recipes are read-only. */
export type WriteRefusal = 'not-found' | 'starter';

export function countRecipes(db: DatabaseSync): number {
  const row = db.prepare('SELECT COUNT(*) AS count FROM recipes').get() as { count: number };
  return row.count;
}

export function countIngredients(db: DatabaseSync): number {
  const row = db.prepare('SELECT COUNT(*) AS count FROM ingredients').get() as { count: number };
  return row.count;
}

/** Custom recipes first, newest first, then the starter set alphabetically. */
export function listRecipes(db: DatabaseSync): Recipe[] {
  const rows = db
    .prepare(
      'SELECT * FROM recipes ORDER BY is_custom DESC, CASE WHEN is_custom = 1 THEN rowid END DESC, name',
    )
    .all() as unknown as RecipeRow[];

  // One query for every ingredient rather than one per recipe.
  const ingredientsByRecipe = new Map<string, Ingredient[]>();
  const ingredientRows = db
    .prepare('SELECT recipe_id, item, quantity, unit, prep FROM ingredients ORDER BY id')
    .all() as unknown as IngredientRow[];
  for (const row of ingredientRows) {
    const list = ingredientsByRecipe.get(row.recipe_id) ?? [];
    list.push(toIngredient(row));
    ingredientsByRecipe.set(row.recipe_id, list);
  }

  return rows.map((row) => toRecipe(row, ingredientsByRecipe.get(row.id) ?? []));
}

export function getRecipe(db: DatabaseSync, id: string): Recipe | undefined {
  const row = db.prepare('SELECT * FROM recipes WHERE id = ?').get(id) as RecipeRow | undefined;
  if (!row) return undefined;

  const ingredientRows = db
    .prepare(
      'SELECT recipe_id, item, quantity, unit, prep FROM ingredients WHERE recipe_id = ? ORDER BY id',
    )
    .all(id) as unknown as IngredientRow[];

  return toRecipe(row, ingredientRows.map(toIngredient));
}

/**
 * Insert a recipe with its ingredients. The caller supplies the id: the seeder
 * uses the starter data's slugs, `createCustomRecipe` generates one.
 */
export function insertRecipe(db: DatabaseSync, recipe: Recipe): void {
  db.prepare(
    `INSERT INTO recipes (id, name, cuisine, serves, meal_type, dietary, tags, method, is_custom)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(recipe.id, ...recipeColumns(recipe), recipe.isCustom ? 1 : 0);
  insertIngredients(db, recipe.id, recipe.ingredients);
}

/** Add a user's recipe under a slug derived from its name. */
export function createCustomRecipe(db: DatabaseSync, input: RecipeInput): Recipe {
  const recipe: Recipe = { ...input, id: uniqueSlug(db, input.name), isCustom: true };
  inTransaction(db, () => insertRecipe(db, recipe));
  return recipe;
}

export function updateCustomRecipe(
  db: DatabaseSync,
  id: string,
  input: RecipeInput,
): Recipe | WriteRefusal {
  const refusal = checkWritable(db, id);
  if (refusal) return refusal;

  inTransaction(db, () => {
    db.prepare(
      `UPDATE recipes SET name = ?, cuisine = ?, serves = ?, meal_type = ?, dietary = ?, tags = ?, method = ?
       WHERE id = ?`,
    ).run(...recipeColumns(input), id);
    // Ingredients are replaced wholesale: rows carry no identity worth preserving.
    db.prepare('DELETE FROM ingredients WHERE recipe_id = ?').run(id);
    insertIngredients(db, id, input.ingredients);
  });

  return { ...input, id, isCustom: true };
}

export function deleteCustomRecipe(db: DatabaseSync, id: string): WriteRefusal | undefined {
  const refusal = checkWritable(db, id);
  if (refusal) return refusal;

  // Ingredients go with it via ON DELETE CASCADE.
  db.prepare('DELETE FROM recipes WHERE id = ?').run(id);
  return undefined;
}

export function inTransaction(db: DatabaseSync, work: () => void): void {
  db.exec('BEGIN');
  try {
    work();
    db.exec('COMMIT');
  } catch (error) {
    db.exec('ROLLBACK');
    throw error;
  }
}

function checkWritable(db: DatabaseSync, id: string): WriteRefusal | undefined {
  const row = db.prepare('SELECT is_custom FROM recipes WHERE id = ?').get(id) as
    { is_custom: number } | undefined;
  if (!row) return 'not-found';
  if (row.is_custom !== 1) return 'starter';
  return undefined;
}

/** Column values in schema order after `id`: name, cuisine, serves, then the JSON lists. */
function recipeColumns(recipe: RecipeInput) {
  return [
    recipe.name,
    recipe.cuisine,
    recipe.serves,
    JSON.stringify(recipe.mealType),
    JSON.stringify(recipe.dietary),
    JSON.stringify(recipe.tags),
    JSON.stringify(recipe.method),
  ] as const;
}

function insertIngredients(db: DatabaseSync, recipeId: string, ingredients: Ingredient[]): void {
  const insert = db.prepare(
    'INSERT INTO ingredients (recipe_id, item, quantity, unit, prep) VALUES (?, ?, ?, ?, ?)',
  );
  for (const ingredient of ingredients) {
    // node:sqlite rejects `undefined`, so optional fields are normalised to null.
    insert.run(
      recipeId,
      ingredient.item,
      ingredient.quantity ?? null,
      ingredient.unit ?? null,
      ingredient.prep ?? null,
    );
  }
}

/** "Mum's Chilli!" -> "mums-chilli", then "-2", "-3"... if that is taken. */
function uniqueSlug(db: DatabaseSync, name: string): string {
  const base =
    name
      .normalize('NFKD')
      .replace(/[̀-ͯ]/g, '')
      .toLowerCase()
      .replace(/['’]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'recipe';

  const exists = db.prepare('SELECT 1 FROM recipes WHERE id = ?');
  let candidate = base;
  for (let suffix = 2; exists.get(candidate); suffix++) candidate = `${base}-${suffix}`;
  return candidate;
}

function toRecipe(row: RecipeRow, ingredients: Ingredient[]): Recipe {
  return {
    id: row.id,
    name: row.name,
    cuisine: row.cuisine,
    serves: row.serves,
    mealType: JSON.parse(row.meal_type) as Recipe['mealType'],
    dietary: JSON.parse(row.dietary) as Recipe['dietary'],
    tags: JSON.parse(row.tags) as string[],
    ingredients,
    method: JSON.parse(row.method) as string[],
    isCustom: row.is_custom === 1,
  };
}

function toIngredient(row: IngredientRow): Ingredient {
  return {
    item: row.item,
    quantity: row.quantity,
    unit: row.unit,
    ...(row.prep !== null ? { prep: row.prep } : {}),
  };
}
