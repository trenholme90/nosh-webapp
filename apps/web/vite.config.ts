import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    // The client talks to same-origin `/api/*` paths and Vite forwards them to the
    // API process. That keeps the browser on one origin in dev, so no CORS handling
    // is needed on the API at all.
    proxy: {
      '/api': {
        // Overridable so the E2E suite can point at its own throwaway API.
        target: process.env['NOSH_API_URL'] ?? 'http://localhost:4000',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
  },
});
