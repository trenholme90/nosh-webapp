import { readFileSync } from 'node:fs';
import type { DatabaseSync } from 'node:sqlite';
import type { Hub } from '@nosh/shared';
import { SAMPLE_HUBS_PATH } from './paths.ts';

interface HubRow {
  id: string;
  name: string;
  address_line: string;
  town: string;
  postcode: string;
  latitude: number;
  longitude: number;
  opening_times: string;
}

export function loadSampleHubs(): Hub[] {
  return JSON.parse(readFileSync(SAMPLE_HUBS_PATH, 'utf8')) as Hub[];
}

export function listHubs(db: DatabaseSync): Hub[] {
  const rows = db.prepare('SELECT * FROM hubs ORDER BY name').all() as unknown as HubRow[];
  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    addressLine: row.address_line,
    town: row.town,
    postcode: row.postcode,
    latitude: row.latitude,
    longitude: row.longitude,
    openingTimes: row.opening_times,
  }));
}

/**
 * Load the sample hubs into an empty table.
 *
 * Idempotent like `seedRecipes`: anything already there makes this a no-op.
 * Returns the number of hubs inserted.
 */
export function seedHubs(db: DatabaseSync): number {
  const existing = db.prepare('SELECT COUNT(*) AS count FROM hubs').get() as { count: number };
  if (existing.count > 0) return 0;

  const hubs = loadSampleHubs();
  const insert = db.prepare(
    `INSERT INTO hubs (id, name, address_line, town, postcode, latitude, longitude, opening_times)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
  );
  for (const hub of hubs) {
    insert.run(
      hub.id,
      hub.name,
      hub.addressLine,
      hub.town,
      hub.postcode,
      hub.latitude,
      hub.longitude,
      hub.openingTimes,
    );
  }
  return hubs.length;
}
