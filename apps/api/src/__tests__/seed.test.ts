import { describe, expect, it } from 'vitest';
import { countIngredients, countRecipes } from '../db/recipes.ts';
import { loadSampleRecipes, seedRecipes } from '../db/seed.ts';
import { useMemoryDb } from './memory-db.ts';

describe('seedRecipes', () => {
  const db = useMemoryDb();

  it('loads every starter recipe and its ingredients', () => {
    expect(countRecipes(db())).toBe(20);
    expect(countIngredients(db())).toBe(132);
  });

  it('is a no-op when the database already holds recipes', () => {
    const inserted = seedRecipes(db());

    expect(inserted).toBe(0);
    expect(countRecipes(db())).toBe(20);
    expect(countIngredients(db())).toBe(132);
  });

  it('marks the starter recipes as built-in rather than user-added', () => {
    const { count } = db()
      .prepare('SELECT COUNT(*) AS count FROM recipes WHERE is_custom = 0')
      .get() as { count: number };

    expect(count).toBe(20);
  });

  it('preserves nullable quantities and units from the source data', () => {
    const ingredients = loadSampleRecipes().flatMap((r) => r.ingredients);
    const nullQuantities = ingredients.filter((i) => i.quantity === null).length;
    const nullUnits = ingredients.filter((i) => i.unit === null).length;

    const stored = db()
      .prepare(
        'SELECT (SELECT COUNT(*) FROM ingredients WHERE quantity IS NULL) AS q, (SELECT COUNT(*) FROM ingredients WHERE unit IS NULL) AS u',
      )
      .get() as { q: number; u: number };

    expect(stored.q).toBe(nullQuantities);
    expect(stored.u).toBe(nullUnits);
  });
});
