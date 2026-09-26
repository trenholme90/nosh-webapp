import { fireEvent, render, screen } from '@testing-library/react';
import type { ShoppingItem } from '@nosh/shared';
import { MemoryRouter } from 'react-router';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ShoppingListPage } from './ShoppingListPage.tsx';

const ITEMS: ShoppingItem[] = [
  {
    item: 'milk',
    amounts: [{ quantity: 530, unit: 'ml' }],
    recipes: ['Porridge', 'Scrambled Eggs'],
    ticked: false,
  },
  { item: 'onion', amounts: [{ quantity: 2, unit: null }], recipes: ['Soup'], ticked: true },
  {
    item: 'salt and pepper',
    amounts: [{ quantity: null, unit: null }],
    recipes: ['Scrambled Eggs'],
    ticked: false,
  },
];

const json = (body: unknown, status = 200) =>
  Promise.resolve({ ok: status < 400, status, url: '', json: async () => body });

/** Echo a tick back as the updated item, as the API does. */
const echoTick = (body: unknown, url: string) => {
  const item = decodeURIComponent(url.split('/').pop() ?? '');
  const found = ITEMS.find((entry) => entry.item === item);
  return json({ ...found, ...(body as object) });
};

/**
 * Answer GET /shopping-list with `list` (and `listStatus`), and hand each PUT to
 * `onTick` so a test can decide how a tick ends.
 */
function mockApi({
  list = { items: ITEMS } as unknown,
  listStatus = 200,
  onTick = echoTick,
}: {
  list?: unknown;
  listStatus?: number;
  onTick?: (body: unknown, url: string) => Promise<unknown>;
} = {}) {
  const fetchMock = vi.fn((url: string, init?: RequestInit) =>
    init?.method === 'PUT' ? onTick(JSON.parse(String(init.body)), url) : json(list, listStatus),
  );
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

const renderPage = () =>
  render(
    <MemoryRouter>
      <ShoppingListPage />
    </MemoryRouter>,
  );

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('ShoppingListPage', () => {
  it('says so when the list cannot be loaded', async () => {
    mockApi({ list: { error: 'boom' }, listStatus: 500 });

    renderPage();

    expect(await screen.findByRole('alert')).toHaveTextContent(/couldn’t load/i);
  });

  it('points to the planner when nothing is planned', async () => {
    mockApi({ list: { items: [] } });

    renderPage();

    expect(await screen.findByText(/Nothing to buy yet/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Plan some meals for your week' })).toHaveAttribute(
      'href',
      '/plan',
    );
  });

  it('lists each item with its amount, what it is for, and whether it is ticked', async () => {
    mockApi();

    renderPage();

    const milk = await screen.findByRole('checkbox', { name: 'Milk 530 ml' });
    expect(milk).not.toBeChecked();
    expect(milk).toHaveAccessibleDescription('For Porridge, Scrambled Eggs');
    expect(screen.getByRole('checkbox', { name: 'Onion 2' })).toBeChecked();
    expect(screen.getByRole('checkbox', { name: 'Salt and pepper' })).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('1 of 3 ticked');
  });

  it('saves a tick and updates the count', async () => {
    const fetchMock = mockApi();
    renderPage();

    fireEvent.click(await screen.findByRole('checkbox', { name: 'Salt and pepper' }));

    expect(screen.getByRole('checkbox', { name: 'Salt and pepper' })).toBeChecked();
    expect(screen.getByRole('status')).toHaveTextContent('2 of 3 ticked');
    const put = fetchMock.mock.calls.find(([, init]) => init?.method === 'PUT');
    expect(put?.[0]).toMatch(/\/shopping-list\/items\/salt%20and%20pepper$/);
    expect(JSON.parse(String(put?.[1]?.body))).toEqual({ ticked: true });
  });

  it('puts a tick back and says so when it cannot be saved', async () => {
    mockApi({ onTick: () => json({ error: 'Nope' }, 500) });
    renderPage();

    fireEvent.click(await screen.findByRole('checkbox', { name: 'Milk 530 ml' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Sorry, we couldn’t save that change to milk. Please try again.',
    );
    expect(screen.getByRole('checkbox', { name: 'Milk 530 ml' })).not.toBeChecked();
    expect(screen.getByRole('status')).toHaveTextContent('1 of 3 ticked');
  });

  it('ignores a second tap on an item while its save is on the way', async () => {
    const fetchMock = mockApi({ onTick: () => new Promise(() => {}) });
    renderPage();
    const milk = await screen.findByRole('checkbox', { name: 'Milk 530 ml' });

    fireEvent.click(milk);
    fireEvent.click(milk);

    expect(fetchMock.mock.calls.filter(([, init]) => init?.method === 'PUT')).toHaveLength(1);
    expect(milk).toBeChecked();
  });
});
