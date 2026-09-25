import type { DatabaseSync } from 'node:sqlite';
import type { Preferences } from '@nosh/shared';

/** The single preferences row. schema.sql creates it, so it always exists. */

export function getPreferences(db: DatabaseSync): Preferences {
  const row = db.prepare('SELECT dietary FROM preferences WHERE id = 1').get() as {
    dietary: string;
  };
  return { dietary: JSON.parse(row.dietary) as Preferences['dietary'] };
}

export function savePreferences(db: DatabaseSync, preferences: Preferences): void {
  db.prepare('UPDATE preferences SET dietary = ? WHERE id = 1').run(
    JSON.stringify(preferences.dietary),
  );
}
