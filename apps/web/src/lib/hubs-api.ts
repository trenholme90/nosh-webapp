import { isHubSearchResult, type HubSearchResult } from '@nosh/shared';
import { apiGet } from './api.ts';

/** The hub locator endpoint. */

export function fetchNearestHubs(postcode: string): Promise<HubSearchResult> {
  return apiGet(`/hubs/nearest?postcode=${encodeURIComponent(postcode)}`, isHubSearchResult);
}
