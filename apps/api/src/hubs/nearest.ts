import { NEAREST_HUB_COUNT, type Hub, type HubWithDistance } from '@nosh/shared';

export interface Point {
  latitude: number;
  longitude: number;
}

const EARTH_RADIUS_MILES = 3958.8;

/** Straight-line distance between two points on the earth, in miles (haversine). */
export function distanceMiles(from: Point, to: Point): number {
  const radians = (degrees: number) => (degrees * Math.PI) / 180;
  const dLat = radians(to.latitude - from.latitude);
  const dLon = radians(to.longitude - from.longitude);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(radians(from.latitude)) * Math.cos(radians(to.latitude)) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_RADIUS_MILES * Math.asin(Math.sqrt(a));
}

/** The closest hubs to a point, nearest first, with distances rounded to a tenth of a mile. */
export function nearestHubs(
  hubs: Hub[],
  from: Point,
  count: number = NEAREST_HUB_COUNT,
): HubWithDistance[] {
  return hubs
    .map((hub) => ({ ...hub, distanceMiles: distanceMiles(from, hub) }))
    .sort((a, b) => a.distanceMiles - b.distanceMiles)
    .slice(0, count)
    .map((hub) => ({ ...hub, distanceMiles: Math.round(hub.distanceMiles * 10) / 10 }));
}
