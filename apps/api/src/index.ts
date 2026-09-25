import { createApp } from './app.ts';
import { createDatabase } from './db/client.ts';

const port = Number(process.env['PORT'] ?? 4000);

// listen(NaN) silently binds a random port, so reject a bad value up front.
if (!Number.isInteger(port) || port < 0 || port > 65535) {
  throw new Error(`PORT must be an integer from 0 to 65535, got "${process.env['PORT']}"`);
}

// NOSH_DB_PATH lets the E2E suite run against a throwaway ':memory:' database.
const db = createDatabase(process.env['NOSH_DB_PATH'] || undefined);
const server = createApp(db).listen(port, () => {
  console.log(`[nosh-api] listening on http://localhost:${port}`);
});

for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.on(signal, () => {
    server.close(() => {
      db.close();
      process.exit(0);
    });
  });
}
