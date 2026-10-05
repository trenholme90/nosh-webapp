/** A Nosh community food hub. */
export interface Hub {
  id: string;
  name: string;
  addressLine: string;
  town: string;
  postcode: string;
  latitude: number;
  longitude: number;
  /** When the hub is open, as it should be shown, e.g. "Tue and Thu, 10am to 2pm". */
  openingTimes: string;
}

/** A hub and how far it is from the postcode that was searched. */
export interface HubWithDistance extends Hub {
  distanceMiles: number;
}

/** Response shape of `GET /hubs/nearest`: the closest hubs, nearest first. */
export interface HubSearchResult {
  /** The postcode searched, tidied up (upper case, one space before the last three characters). */
  postcode: string;
  hubs: HubWithDistance[];
}

/** How many hubs a search returns. */
export const NEAREST_HUB_COUNT = 5;
