import { defineConfig, devices } from '@playwright/test';

/**
 * End-to-end suite: drives the real web client against the real API.
 *
 * It starts its own pair of servers on ports of its own, with the API on an
 * in-memory database. Every run therefore starts from the 20 starter recipes,
 * and it never touches the dev database or clashes with `npm run dev`.
 */

const API_PORT = 4100;
const WEB_PORT = 5174;
const isCI = Boolean(process.env['CI']);

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: isCI,
  retries: isCI ? 1 : 0,
  reporter: isCI ? [['list'], ['html', { open: 'never' }]] : 'list',

  use: {
    baseURL: `http://localhost:${WEB_PORT}`,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },

  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],

  webServer: [
    {
      command: 'npm run start --workspace=apps/api',
      cwd: '..',
      url: `http://localhost:${API_PORT}/health`,
      env: { PORT: String(API_PORT), NOSH_DB_PATH: ':memory:' },
      // Never reuse: a leftover server would carry recipes from an earlier run.
      reuseExistingServer: false,
    },
    {
      command: `npm run dev --workspace=apps/web -- --port ${WEB_PORT} --strictPort`,
      cwd: '..',
      url: `http://localhost:${WEB_PORT}`,
      env: { NOSH_API_URL: `http://localhost:${API_PORT}` },
      reuseExistingServer: false,
    },
  ],
});
