import { Router } from 'express';
import type { DatabaseSync } from 'node:sqlite';
import type { HubSearchResult } from '@nosh/shared';
import { validatePostcode } from '@nosh/shared';
import { listHubs } from '../db/hubs.ts';
import type { Geocoder } from '../hubs/geocode.ts';
import { nearestHubs } from '../hubs/nearest.ts';
import { sendError } from './respond.ts';

/** Finding the Nosh food hubs closest to a postcode. */
export function createHubsRouter(db: DatabaseSync, geocode: Geocoder): Router {
  const router = Router();

  router.get('/hubs/nearest', async (req, res) => {
    const result = validatePostcode(req.query['postcode']);
    if (!result.ok) return sendError(res, 400, 'Postcode is not valid', result.errors);

    let location;
    try {
      location = await geocode(result.value);
    } catch (error) {
      console.error('[nosh-api] postcode lookup failed', error);
      return sendError(res, 502, 'We couldn’t look up that postcode just now. Please try again.');
    }
    if (!location) return sendError(res, 404, 'We couldn’t find that postcode');

    const body: HubSearchResult = {
      postcode: result.value,
      hubs: nearestHubs(listHubs(db), location),
    };
    res.json(body);
  });

  return router;
}
