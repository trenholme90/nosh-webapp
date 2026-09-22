import type { DatabaseSync } from 'node:sqlite';

/**
 * Read-only queries over the recipe tables.
 *
 * Kept apart from seeding: the seeder writes once at boot, these are read per
 * request. The split stops a route having to import the seeder to ask a question.
 */

export function countRecipes(db: DatabaseSync): number {
  const row = db.prepare('SELECT COUNT(*) AS count FROM recipes').get() as { count: number };
  return row.count;
}
