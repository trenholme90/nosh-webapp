import { readFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { DEFAULT_DB_PATH, SCHEMA_PATH } from './paths.ts';
import { seedRecipes } from './seed.ts';

/**
 * Open a database, apply the schema and seed the starter recipes if it is empty.
 *
 * The path is a parameter rather than a module constant so tests can run against
 * ':memory:' - the same code path as production, without touching the real file.
 */
export function createDatabase(path: string = DEFAULT_DB_PATH): DatabaseSync {
  const db = new DatabaseSync(path);
  db.exec('PRAGMA foreign_keys = ON');
  db.exec(readFileSync(SCHEMA_PATH, 'utf8'));
  seedRecipes(db);
  return db;
}
