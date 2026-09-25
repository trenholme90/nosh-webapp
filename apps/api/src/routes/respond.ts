import type { Response } from 'express';
import type { ErrorResponse } from '@nosh/shared';

/** Send the shared `ErrorResponse` shape, with per-field messages when validation failed. */
export function sendError(
  res: Response,
  status: number,
  error: string,
  fields?: ErrorResponse['fields'],
): void {
  const body: ErrorResponse = fields ? { error, fields } : { error };
  res.status(status).json(body);
}
