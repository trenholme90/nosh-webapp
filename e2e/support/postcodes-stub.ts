import { createServer } from 'node:http';

/**
 * A stand-in for postcodes.io, so the E2E suite never needs the internet.
 * It knows two postcodes and answers 404 for anything else, as the real one does.
 */

const KNOWN: Record<string, { latitude: number; longitude: number }> = {
  'M1 1AE': { latitude: 53.4794, longitude: -2.2453 },
  'TR1 2EP': { latitude: 50.2632, longitude: -5.051 },
};

const port = Number(process.env['PORT']);

createServer((req, res) => {
  const postcode = decodeURIComponent(req.url?.split('/postcodes/')[1] ?? '');
  const result = KNOWN[postcode];
  res.setHeader('Content-Type', 'application/json');
  if (!result) {
    res.statusCode = 404;
    res.end(JSON.stringify({ status: 404, error: 'Postcode not found' }));
    return;
  }
  res.end(JSON.stringify({ status: 200, result }));
}).listen(port, () => console.log(`[postcodes-stub] listening on http://localhost:${port}`));
