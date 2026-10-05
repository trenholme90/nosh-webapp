import { describe, expect, it } from 'vitest';
import type { Hub } from '@nosh/shared';
import { distanceMiles, nearestHubs } from '../hubs/nearest.ts';

const hub = (id: string, latitude: number, longitude: number): Hub => ({
  id,
  name: id,
  addressLine: '1 High Street',
  town: 'Town',
  postcode: 'AB1 2CD',
  latitude,
  longitude,
  openingTimes: 'Mon, 9am to 1pm',
});

const LONDON = { latitude: 51.5074, longitude: -0.1278 };
const MANCHESTER = { latitude: 53.4808, longitude: -2.2426 };

describe('distanceMiles', () => {
  it('is zero for the same point', () => {
    expect(distanceMiles(LONDON, LONDON)).toBe(0);
  });

  it('measures London to Manchester at about 162.8 miles, in either direction', () => {
    expect(distanceMiles(LONDON, MANCHESTER)).toBeCloseTo(162.8, 0);
    expect(distanceMiles(MANCHESTER, LONDON)).toBeCloseTo(distanceMiles(LONDON, MANCHESTER), 6);
  });
});

describe('nearestHubs', () => {
  const hubs = [
    hub('far', 55, -3),
    hub('near', 51.51, -0.13),
    hub('middle', 52.5, -1.9),
    hub('next', 51.6, -0.2),
  ];

  it('returns the closest hubs, nearest first', () => {
    const result = nearestHubs(hubs, LONDON, 3);

    expect(result.map((entry) => entry.id)).toEqual(['near', 'next', 'middle']);
  });

  it('returns five by default', () => {
    const many = Array.from({ length: 12 }, (_, index) => hub(`h${index}`, 51 + index / 10, -0.1));

    expect(nearestHubs(many, LONDON)).toHaveLength(5);
  });

  it('returns every hub when there are fewer than asked for', () => {
    expect(nearestHubs(hubs.slice(0, 2), LONDON)).toHaveLength(2);
  });

  it('rounds distances to a tenth of a mile', () => {
    const [first] = nearestHubs(hubs, LONDON, 1);

    expect(first?.distanceMiles).toBe(0.2);
  });

  it('does not change the list it was given', () => {
    const before = hubs.map((entry) => entry.id);
    nearestHubs(hubs, LONDON);

    expect(hubs.map((entry) => entry.id)).toEqual(before);
  });
});
