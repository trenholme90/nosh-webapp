import { createApp } from './app.ts';
import { createDatabase } from './db/client.ts';

const port = Number(process.env['PORT'] ?? 4000);

const db = createDatabase();
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
