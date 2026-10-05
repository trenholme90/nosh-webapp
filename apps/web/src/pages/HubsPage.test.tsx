import { fireEvent, render, screen } from '@testing-library/react';
import type { HubSearchResult, HubWithDistance } from '@nosh/shared';
import { MemoryRouter } from 'react-router';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { HubsPage } from './HubsPage.tsx';

const hub = (n: number): HubWithDistance => ({
  id: `hub-${n}`,
  name: `Hub ${n}`,
  addressLine: `${n} High Street`,
  town: 'Leeds',
  postcode: 'LS1 4AP',
  latitude: 53.8,
  longitude: -1.5,
  openingTimes: 'Tue and Thu, 10am to 2pm',
  distanceMiles: n + 0.5,
});

const RESULT: HubSearchResult = { postcode: 'LS1 4AP', hubs: [1, 2, 3, 4, 5].map(hub) };

const json = (body: unknown, status = 200) =>
  Promise.resolve({ ok: status < 400, status, url: '', json: async () => body });

const renderPage = () =>
  render(
    <MemoryRouter>
      <HubsPage />
    </MemoryRouter>,
  );

function search(postcode: string) {
  fireEvent.change(screen.getByLabelText('Your postcode'), { target: { value: postcode } });
  fireEvent.click(screen.getByRole('button', { name: 'Find hubs' }));
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('HubsPage', () => {
  it('shows nothing but the form until a search is made', () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    renderPage();

    expect(screen.getByRole('heading', { name: 'Find a food hub' })).toBeInTheDocument();
    expect(screen.queryByRole('list')).not.toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('lists the hubs found, nearest first, with distance, address and times', async () => {
    const fetchMock = vi.fn(() => json(RESULT));
    vi.stubGlobal('fetch', fetchMock);
    renderPage();

    search('ls14ap');

    expect(await screen.findByRole('heading', { name: 'Closest to LS1 4AP' })).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith('/api/hubs/nearest?postcode=ls14ap', expect.anything());
    const items = screen.getAllByRole('listitem');
    expect(items).toHaveLength(5);
    expect(items[0]).toHaveTextContent('Hub 1');
    expect(items[0]).toHaveTextContent('1.5 miles away');
    expect(items[0]).toHaveTextContent('1 High Street, Leeds LS1 4AP');
    expect(items[0]).toHaveTextContent('Open Tue and Thu, 10am to 2pm');
  });

  it('says so when a search finds no hubs', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => json({ postcode: 'LS1 4AP', hubs: [] })),
    );
    renderPage();

    search('LS1 4AP');

    expect(await screen.findByText(/couldn’t find any hubs near LS1 4AP/)).toBeInTheDocument();
  });

  it('shows the postcode problem next to the field', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() =>
        json(
          {
            error: 'Postcode is not valid',
            fields: { postcode: 'Enter a full UK postcode, like M1 1AE' },
          },
          400,
        ),
      ),
    );
    renderPage();

    search('banana');

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('Enter a full UK postcode, like M1 1AE');
    expect(screen.getByLabelText('Your postcode')).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByLabelText('Your postcode')).toHaveAccessibleDescription(
      'Enter a full UK postcode, like M1 1AE',
    );
  });

  it('shows the API’s message for an unknown postcode', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => json({ error: 'We couldn’t find that postcode' }, 404)),
    );
    renderPage();

    search('ZZ99 9ZZ');

    expect(await screen.findByRole('alert')).toHaveTextContent('We couldn’t find that postcode');
  });

  it('shows a plain message when the API cannot be reached, and clears it on the next search', async () => {
    const fetchMock = vi
      .fn()
      .mockRejectedValueOnce(new TypeError('Failed to fetch'))
      .mockImplementationOnce(() => json(RESULT));
    vi.stubGlobal('fetch', fetchMock);
    renderPage();

    search('LS1 4AP');
    expect(await screen.findByRole('alert')).toHaveTextContent('Please try again');

    search('LS1 4AP');
    expect(await screen.findByRole('heading', { name: 'Closest to LS1 4AP' })).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('turns the button off while it searches', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => new Promise(() => undefined)),
    );
    renderPage();

    search('LS1 4AP');

    expect(await screen.findByRole('status')).toHaveTextContent('Looking for hubs');
    expect(screen.getByRole('button', { name: 'Find hubs' })).toBeDisabled();
  });

  it('starts with an empty postcode field', () => {
    renderPage();

    expect(screen.getByLabelText('Your postcode')).toHaveValue('');
  });

  it('sets the page title', () => {
    renderPage();

    expect(document.title).toBe('Find a hub · Nosh');
  });

  it('handles the submit itself rather than letting the browser reload the page', () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => new Promise(() => undefined)),
    );
    renderPage();

    const notCancelled = fireEvent.submit(screen.getByRole('button', { name: 'Find hubs' }));

    expect(notCancelled).toBe(false);
  });
});
