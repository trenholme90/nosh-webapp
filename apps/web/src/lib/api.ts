/**
 * Thin typed wrapper around fetch.
 *
 * In dev, requests go to same-origin `/api/*` and Vite proxies them to the API
 * process (see vite.config.ts), so there is no CORS setup and no hardcoded host.
 */

const BASE_URL: string = import.meta.env.VITE_API_BASE_URL ?? '/api';

/**
 * Fetch and validate a JSON body.
 *
 * The caller passes the guard for the shape it expects rather than an unchecked
 * type argument: a cast would make every downstream type a promise the API is
 * merely trusted to keep.
 */
export async function apiGet<T>(
  path: string,
  isExpectedShape: (value: unknown) => value is T,
): Promise<T> {
  const response = await fetch(`${BASE_URL}${path}`, {
    headers: { Accept: 'application/json' },
  });

  if (!response.ok) {
    throw new Error(`GET ${path} failed with ${response.status}`);
  }

  const body: unknown = await response.json();

  if (!isExpectedShape(body)) {
    throw new Error(`GET ${path} returned an unexpected body shape`);
  }

  return body;
}
