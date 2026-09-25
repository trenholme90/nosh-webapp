import { isPreferences, type Preferences } from '@nosh/shared';
import { apiGet, apiPut } from './api.ts';

export function fetchPreferences(): Promise<Preferences> {
  return apiGet('/preferences', isPreferences);
}

export function savePreferences(preferences: Preferences): Promise<Preferences> {
  return apiPut('/preferences', preferences, isPreferences);
}
