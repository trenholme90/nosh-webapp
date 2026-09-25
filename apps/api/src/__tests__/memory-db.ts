import type { DatabaseSync } from 'node:sqlite';
import { afterEach, beforeEach } from 'vitest';
import { createDatabase } from '../db/client.ts';

/**
 * Give each test in the calling suite a fresh, seeded in-memory database.
 *
 * Call it inside a `describe`; read the database through the returned getter,
 * since a new one is opened before every test.
 */
export function useMemoryDb(): () => DatabaseSync {
  let db: DatabaseSync | undefined;

  beforeEach(() => {
    // createDatabase seeds on open, which is the path production uses.
    db = createDatabase(':memory:');
  });

  afterEach(() => {
    db?.close();
  });

  return () => {
    if (!db) throw new Error('useMemoryDb: database read outside a test');
    return db;
  };
}
