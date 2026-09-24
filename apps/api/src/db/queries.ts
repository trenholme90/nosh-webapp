import type { DatabaseSync } from 'node:sqlite';

/**
 * Read-only queries over the recipe tables.
 *
 * Kept apart from seeding: the seeder writes once at boot, these are read per
 * request. The split stops a route having to import the seeder to ask a question.
 */

function countRows(db: DatabaseSync, table: string): number {
  const row = db.prepare(`SELECT COUNT(*) AS count FROM ${table}`).get() as { count: number };
  return row.count;
}

export function countRecipes(db: DatabaseSync): number {
  return countRows(db, 'recipes');
}

export function countIngredients(db: DatabaseSync): number {
  return countRows(db, 'ingredients');
}
