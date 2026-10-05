import { afterEach, describe, expect, it, vi } from 'vitest';
import { createPostcodesIoGeocoder } from '../hubs/geocode.ts';

const reply = (status: number, body: unknown = {}) =>
  Promise.resolve({ ok: status < 400, status, json: async () => body });

const stubFetch = (response: Promise<unknown>) => {
  const fetchMock = vi.fn(() => response);
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
};

const geocode = createPostcodesIoGeocoder('http://postcodes.test');

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe('postcodes.io geocoder', () => {
  it('asks the service for the postcode, encoded, and returns its coordinates', async () => {
    const fetchMock = stubFetch(
      reply(200, { result: { latitude: 53.4794, longitude: -2.2453, country: 'England' } }),
    );

    const location = await geocode('M1 1AE');

    expect(location).toEqual({ latitude: 53.4794, longitude: -2.2453 });
    expect(fetchMock).toHaveBeenCalledWith(
      'http://postcodes.test/postcodes/M1%201AE',
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    );
  });

  it('returns nothing for a postcode the service does not know', async () => {
    stubFetch(reply(404, { status: 404, error: 'Postcode not found' }));

    expect(await geocode('ZZ99 9ZZ')).toBeUndefined();
  });

  it.each([
    ['no result', {}],
    ['a null result', { result: null }],
    ['a result with no latitude', { result: { latitude: null, longitude: -2.2 } }],
    ['a result with no longitude', { result: { latitude: 53.4, longitude: null } }],
  ])('returns nothing for %s', async (_name, body) => {
    stubFetch(reply(200, body));

    expect(await geocode('M1 1AE')).toBeUndefined();
  });

  it('throws when the service fails, so the caller can tell it from "not found"', async () => {
    stubFetch(reply(500));

    await expect(geocode('M1 1AE')).rejects.toThrow('postcodes.io answered 500');
  });

  it('throws when the service cannot be reached', async () => {
    stubFetch(Promise.reject(new TypeError('fetch failed')));

    await expect(geocode('M1 1AE')).rejects.toThrow('fetch failed');
  });

  it('uses postcodes.io unless told otherwise', async () => {
    vi.stubEnv('POSTCODES_API_URL', '');
    const fetchMock = stubFetch(reply(404));

    await createPostcodesIoGeocoder()('M1 1AE');

    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.postcodes.io/postcodes/M1%201AE',
      expect.anything(),
    );
  });

  it('uses the address in POSTCODES_API_URL when it is set', async () => {
    vi.stubEnv('POSTCODES_API_URL', 'http://stub.test');
    const fetchMock = stubFetch(reply(404));

    await createPostcodesIoGeocoder()('M1 1AE');

    expect(fetchMock).toHaveBeenCalledWith(
      'http://stub.test/postcodes/M1%201AE',
      expect.anything(),
    );
  });
});
