import type { Point } from './nearest.ts';

/**
 * Turns a tidy UK postcode into a location: `undefined` when no such postcode
 * exists, and a thrown error when the lookup itself could not be made.
 */
export type Geocoder = (postcode: string) => Promise<Point | undefined>;

const DEFAULT_BASE_URL = 'https://api.postcodes.io';
const TIMEOUT_MS = 5000;

/** Looks postcodes up on postcodes.io, a free service that needs no key. */
export function createPostcodesIoGeocoder(
  baseUrl: string = process.env['POSTCODES_API_URL'] || DEFAULT_BASE_URL,
): Geocoder {
  return async (postcode) => {
    const response = await fetch(`${baseUrl}/postcodes/${encodeURIComponent(postcode)}`, {
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (response.status === 404) return undefined;
    if (!response.ok) throw new Error(`postcodes.io answered ${response.status}`);

    const body = (await response.json()) as { result?: Partial<Point> | null };
    const { latitude, longitude } = body.result ?? {};
    // Some valid postcodes (e.g. retired ones) are known but carry no coordinates.
    if (typeof latitude !== 'number' || typeof longitude !== 'number') return undefined;
    return { latitude, longitude };
  };
}
