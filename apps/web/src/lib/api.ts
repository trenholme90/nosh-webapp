/**
 * Thin typed wrapper around fetch.
 *
 * In dev, requests go to same-origin `/api/*` and Vite proxies them to the API
 * process (see vite.config.ts), so there is no CORS setup and no hardcoded host.
 */

const BASE_URL: string = import.meta.env.VITE_API_BASE_URL ?? '/api';

export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export async function apiGet<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${BASE_URL}${path}`, {
    headers: { Accept: 'application/json' },
    ...init,
  });

  if (!response.ok) {
    throw new ApiError(response.status, `GET ${path} failed with ${response.status}`);
  }

  return (await response.json()) as T;
}
