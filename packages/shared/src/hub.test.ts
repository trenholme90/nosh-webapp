import { describe, expect, it } from 'vitest';
import { isHub, isHubSearchResult, isHubWithDistance } from './api-contract.ts';
import type { Hub, HubWithDistance } from './hub.ts';
import { validatePostcode } from './validate-recipe.ts';

const HUB: Hub = {
  id: 'hub-1',
  name: 'Hub One',
  addressLine: '1 High Street',
  town: 'Leeds',
  postcode: 'LS1 4AP',
  latitude: 53.8,
  longitude: -1.5,
  openingTimes: 'Tue, 10am to 2pm',
};
const WITH_DISTANCE: HubWithDistance = { ...HUB, distanceMiles: 1.2 };

describe('validatePostcode', () => {
  it.each([
    ['M1 1AE', 'M1 1AE'],
    ['m11ae', 'M1 1AE'],
    ['  sw1a   1aa ', 'SW1A 1AA'],
    ['EC1A1BB', 'EC1A 1BB'],
    ['B33 8TH', 'B33 8TH'],
    ['CR2 6XH', 'CR2 6XH'],
    ['DN55 1PT', 'DN55 1PT'],
  ])('accepts %j as %j', (typed, tidy) => {
    expect(validatePostcode(typed)).toEqual({ ok: true, value: tidy });
  });

  it.each([
    undefined,
    null,
    42,
    {},
    '',
    'M1',
    'banana',
    '1AA 1AA',
    'M1 1A',
    'M1 1AEE',
    'ABC1 1AA',
    'M1 1AE!',
    'M1-1AE',
    'M1 1AE M1 1AE',
  ])('rejects %j', (typed) => {
    expect(validatePostcode(typed)).toEqual({
      ok: false,
      errors: { postcode: 'Enter a full UK postcode, like M1 1AE' },
    });
  });
});

describe('hub guards', () => {
  it('accept a hub, and a hub with a distance', () => {
    expect(isHub(HUB)).toBe(true);
    expect(isHubWithDistance(WITH_DISTANCE)).toBe(true);
  });

  it.each(Object.keys(HUB))('reject a hub with %s missing', (field) => {
    const { [field as keyof Hub]: _removed, ...rest } = HUB;

    expect(isHub(rest)).toBe(false);
  });

  it.each([
    ['id', 7],
    ['name', 7],
    ['addressLine', 7],
    ['town', 7],
    ['postcode', 7],
    ['latitude', '53.8'],
    ['longitude', '-1.5'],
    ['openingTimes', 7],
  ])('reject a hub whose %s is the wrong type', (field, value) => {
    expect(isHub({ ...HUB, [field]: value })).toBe(false);
  });

  it.each([undefined, null, 'hub', 7])('reject %j as a hub', (value) => {
    expect(isHub(value)).toBe(false);
  });

  it('reject a hub with no distance, or a distance that is not a number', () => {
    expect(isHubWithDistance(HUB)).toBe(false);
    expect(isHubWithDistance({ ...HUB, distanceMiles: '1.2' })).toBe(false);
  });

  it('accept a search result, including one with no hubs', () => {
    expect(isHubSearchResult({ postcode: 'LS1 4AP', hubs: [WITH_DISTANCE] })).toBe(true);
    expect(isHubSearchResult({ postcode: 'LS1 4AP', hubs: [] })).toBe(true);
  });

  it.each([
    ['not an object', 'nope'],
    ['null', null],
    ['no postcode', { hubs: [WITH_DISTANCE] }],
    ['a postcode that is not a string', { postcode: 7, hubs: [WITH_DISTANCE] }],
    ['no hubs', { postcode: 'LS1 4AP' }],
    ['hubs that are not a list', { postcode: 'LS1 4AP', hubs: WITH_DISTANCE }],
    ['a hub with no distance', { postcode: 'LS1 4AP', hubs: [WITH_DISTANCE, HUB] }],
  ])('reject a search result that is %s', (_name, value) => {
    expect(isHubSearchResult(value)).toBe(false);
  });
});
