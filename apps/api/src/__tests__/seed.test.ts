import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { DatabaseSync } from 'node:sqlite';
import { createDatabase } from '../db/client.ts';
import { countIngredients, countRecipes } from '../db/queries.ts';
import { loadSampleRecipes, seedRecipes } from '../db/seed.ts';

describe('seedRecipes', () => {
  let db: DatabaseSync;

  beforeEach(() => {
    // createDatabase already seeds on open, which is the path production uses.
    db = createDatabase(':memory:');
  });

  afterEach(() => {
    db.close();
  });

  it('loads every starter recipe and its ingredients', () => {
    expect(countRecipes(db)).toBe(20);
    expect(countIngredients(db)).toBe(132);
  });

  it('is a no-op when the database already holds recipes', () => {
    const inserted = seedRecipes(db);

    expect(inserted).toBe(0);
    expect(countRecipes(db)).toBe(20);
    expect(countIngredients(db)).toBe(132);
  });

  it('marks the starter recipes as built-in rather than user-added', () => {
    const { count } = db
      .prepare('SELECT COUNT(*) AS count FROM recipes WHERE is_custom = 0')
      .get() as {
      count: number;
    };

    expect(count).toBe(20);
  });

  it('preserves nullable quantities and units from the source data', () => {
    const source = loadSampleRecipes();
    const nullQuantities = source
      .flatMap((r) => r.ingredients)
      .filter((i) => i.quantity === null).length;
    const nullUnits = source.flatMap((r) => r.ingredients).filter((i) => i.unit === null).length;

    const stored = db
      .prepare(
        'SELECT (SELECT COUNT(*) FROM ingredients WHERE quantity IS NULL) AS q, (SELECT COUNT(*) FROM ingredients WHERE unit IS NULL) AS u',
      )
      .get() as { q: number; u: number };

    expect(stored.q).toBe(nullQuantities);
    expect(stored.u).toBe(nullUnits);
  });
});
