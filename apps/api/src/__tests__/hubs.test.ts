import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';
import { isHubSearchResult, validatePostcode } from '@nosh/shared';
import { createApp } from '../app.ts';
import { listHubs, loadSampleHubs, seedHubs } from '../db/hubs.ts';
import type { Geocoder } from '../hubs/geocode.ts';
import { useMemoryDb } from './memory-db.ts';

const MANCHESTER = { latitude: 53.4794, longitude: -2.2453 };
const PENZANCE = { latitude: 50.1186, longitude: -5.5373 };

describe('sample hubs', () => {
  const db = useMemoryDb();

  it('are 40 hubs, seeded on open, with unique ids and England-sized coordinates', () => {
    const hubs = listHubs(db());

    expect(hubs).toHaveLength(40);
    expect(new Set(hubs.map((hub) => hub.id)).size).toBe(40);
    for (const hub of hubs) {
      expect(hub.latitude).toBeGreaterThan(49.9);
      expect(hub.latitude).toBeLessThan(55.9);
      expect(hub.longitude).toBeGreaterThan(-6);
      expect(hub.longitude).toBeLessThan(1.8);
      expect(validatePostcode(hub.postcode)).toEqual({ ok: true, value: hub.postcode });
    }
  });

  it('are not loaded twice', () => {
    expect(seedHubs(db())).toBe(0);
    expect(listHubs(db())).toHaveLength(loadSampleHubs().length);
  });
});

describe('hub search API', () => {
  const db = useMemoryDb();
  const geocode = vi.fn<Geocoder>();
  const search = (postcode?: string) =>
    request(createApp(db(), geocode))
      .get('/hubs/nearest')
      .query(postcode === undefined ? {} : { postcode });

  it('returns the five nearest hubs, nearest first', async () => {
    geocode.mockResolvedValue(MANCHESTER);

    const response = await search('M1 1AE');

    expect(response.status).toBe(200);
    expect(isHubSearchResult(response.body)).toBe(true);
    expect(response.body.hubs).toHaveLength(5);
    expect(response.body.hubs[0].town).toBe('Manchester');
    const distances = response.body.hubs.map((hub: { distanceMiles: number }) => hub.distanceMiles);
    expect(distances).toEqual([...distances].sort((a, b) => a - b));
  });

  it('tidies the postcode before looking it up', async () => {
    geocode.mockResolvedValue(MANCHESTER);

    const response = await search('  m11ae ');

    expect(geocode).toHaveBeenLastCalledWith('M1 1AE');
    expect(response.body.postcode).toBe('M1 1AE');
  });

  it('finds hubs a long way off rather than nothing', async () => {
    geocode.mockResolvedValue(PENZANCE);

    const response = await search('TR18 2QR');

    expect(response.body.hubs[0].town).toBe('Truro');
    expect(response.body.hubs[0].distanceMiles).toBeGreaterThan(20);
  });

  it.each([undefined, '', 'banana', 'M1', 'ZZZZ 9ZZZ'])(
    'rejects %j as not a postcode, without looking it up',
    async (postcode) => {
      geocode.mockClear();

      const response = await search(postcode);

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Postcode is not valid');
      expect(response.body.fields.postcode).toMatch(/postcode/i);
      expect(geocode).not.toHaveBeenCalled();
    },
  );

  it('answers 404 for a postcode that does not exist', async () => {
    geocode.mockResolvedValue(undefined);

    const response = await search('ZZ99 9ZZ');

    expect(response.status).toBe(404);
    expect(response.body.error).toMatch(/couldn’t find/);
  });

  it('answers 502 when the postcode lookup is down', async () => {
    geocode.mockRejectedValue(new Error('network down'));
    const log = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    const response = await search('M1 1AE');

    expect(response.status).toBe(502);
    expect(response.body.error).toMatch(/try again/);
    expect(log).toHaveBeenCalledWith('[nosh-api] postcode lookup failed', expect.any(Error));
  });
});
