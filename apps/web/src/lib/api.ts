import { isErrorResponse, type FieldErrors } from '@nosh/shared';

/**
 * Thin typed wrapper around fetch.
 *
 * In dev, requests go to same-origin `/api/*` and Vite proxies them to the API
 * process (see vite.config.ts), so there is no CORS setup and no hardcoded host.
 */

const BASE_URL: string = import.meta.env.VITE_API_BASE_URL ?? '/api';

/** A non-2xx answer from the API. `fields` carries per-field messages on a 400. */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
    readonly fields: FieldErrors = {},
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

type Guard<T> = (value: unknown) => value is T;

/*
 * Every call that returns data takes the guard for the shape it expects rather
 * than an unchecked type argument: a cast would make every downstream type a
 * promise the API is merely trusted to keep.
 */

export async function apiGet<T>(path: string, isExpectedShape: Guard<T>): Promise<T> {
  return parse(await send('GET', path), isExpectedShape);
}

export async function apiPost<T>(
  path: string,
  body: unknown,
  isExpectedShape: Guard<T>,
): Promise<T> {
  return parse(await send('POST', path, body), isExpectedShape);
}

export async function apiPut<T>(
  path: string,
  body: unknown,
  isExpectedShape: Guard<T>,
): Promise<T> {
  return parse(await send('PUT', path, body), isExpectedShape);
}

/** DELETE answers 204 with no body, so there is nothing to parse. */
export async function apiDelete(path: string): Promise<void> {
  await send('DELETE', path);
}

async function send(method: string, path: string, body?: unknown): Promise<Response> {
  const init: RequestInit = { method, headers: { Accept: 'application/json' } };
  if (body !== undefined) {
    init.headers = { ...init.headers, 'Content-Type': 'application/json' };
    init.body = JSON.stringify(body);
  }

  const response = await fetch(`${BASE_URL}${path}`, init);
  if (response.ok) return response;

  const errorBody: unknown = await response.json().catch(() => undefined);
  throw isErrorResponse(errorBody)
    ? new ApiError(response.status, errorBody.error, errorBody.fields)
    : new ApiError(response.status, `${method} ${path} failed with ${response.status}`);
}

async function parse<T>(response: Response, isExpectedShape: Guard<T>): Promise<T> {
  const data: unknown = await response.json();
  if (!isExpectedShape(data)) {
    throw new Error(`${response.url} returned an unexpected body shape`);
  }
  return data;
}
