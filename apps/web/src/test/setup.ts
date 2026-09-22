import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

// Vitest is configured without globals, so auto-cleanup is wired up explicitly.
afterEach(cleanup);
