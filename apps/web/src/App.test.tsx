import { render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { App } from './App.tsx';

const mockHealth = (body: unknown, ok = true) =>
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue({ ok, status: ok ? 200 : 500, json: async () => body }),
  );

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('App', () => {
  it('renders the Nosh wordmark and headline', async () => {
    mockHealth({ status: 'ok', recipeCount: 20 });

    render(<App />);

    // The wordmark carries the accessible name; the mark is decorative (alt="")
    // and so is deliberately absent from the accessibility tree.
    expect(screen.getByRole('img', { name: 'Nosh' })).toBeInTheDocument();
    expect(screen.getAllByRole('img')).toHaveLength(1);
    expect(
      screen.getByRole('heading', { name: /meal planning that fits your budget/i }),
    ).toBeInTheDocument();

    // Let the health check settle so its state update lands inside the test.
    await screen.findByText(/starter recipes ready/i);
  });

  it('reports the recipe count once the API answers', async () => {
    mockHealth({ status: 'ok', recipeCount: 20 });

    render(<App />);

    expect(await screen.findByText(/20 starter recipes ready/i)).toBeInTheDocument();
  });

  it('degrades to a helpful message when the API answers with the wrong shape', async () => {
    mockHealth({ status: 'ok' });

    render(<App />);

    expect(await screen.findByText(/api unavailable/i)).toBeInTheDocument();
  });

  it('degrades to a helpful message when the API is down', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('connection refused')));

    render(<App />);

    expect(await screen.findByText(/api unavailable/i)).toBeInTheDocument();
  });
});
