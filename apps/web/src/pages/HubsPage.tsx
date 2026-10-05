import type { HubSearchResult } from '@nosh/shared';
import { useState, type FormEvent } from 'react';
import { ApiError } from '../lib/api.ts';
import { fetchNearestHubs } from '../lib/hubs-api.ts';
import { useDocumentTitle } from '../lib/use-document-title.ts';

type Search =
  | { status: 'idle' }
  | { status: 'searching' }
  | { status: 'found'; result: HubSearchResult }
  | { status: 'failed'; message: string };

const GENERIC_FAILURE = 'Sorry, something went wrong looking for hubs. Please try again.';

/** Find the Nosh food hubs closest to a postcode. */
export function HubsPage() {
  useDocumentTitle('Find a hub');
  const [postcode, setPostcode] = useState('');
  const [search, setSearch] = useState<Search>({ status: 'idle' });

  async function submit(event: FormEvent) {
    event.preventDefault();
    setSearch({ status: 'searching' });
    try {
      setSearch({ status: 'found', result: await fetchNearestHubs(postcode) });
    } catch (error) {
      setSearch({
        status: 'failed',
        message:
          error instanceof ApiError ? (error.fields['postcode'] ?? error.message) : GENERIC_FAILURE,
      });
    }
  }

  const failed = search.status === 'failed';

  return (
    <>
      <h1>Find a food hub</h1>
      <p className="lede">
        Nosh food hubs run free cooking sessions and meal-planning help. Pop in your postcode to see
        the five closest to you.
      </p>

      <form className="hub-search" onSubmit={submit} noValidate>
        <div className="field">
          <label htmlFor="hub-postcode">Your postcode</label>
          <input
            id="hub-postcode"
            name="postcode"
            type="text"
            autoComplete="postal-code"
            autoCapitalize="characters"
            spellCheck={false}
            value={postcode}
            onChange={(event) => setPostcode(event.target.value)}
            aria-invalid={failed}
            aria-describedby={failed ? 'hub-postcode-error' : undefined}
          />
          {failed && (
            <p className="field-error" id="hub-postcode-error" role="alert">
              {search.message}
            </p>
          )}
        </div>
        <button
          type="submit"
          className="button button--primary"
          disabled={search.status === 'searching'}
        >
          Find hubs
        </button>
      </form>

      {search.status === 'searching' && <p role="status">Looking for hubs near you…</p>}
      {search.status === 'found' && <Results result={search.result} />}
    </>
  );
}

function Results({ result }: { result: HubSearchResult }) {
  if (result.hubs.length === 0) {
    return (
      <p className="notice" role="status">
        We couldn’t find any hubs near {result.postcode}.
      </p>
    );
  }

  return (
    <section aria-labelledby="hub-results-heading">
      <h2 id="hub-results-heading" className="hub-results__heading">
        Closest to {result.postcode}
      </h2>
      <ol className="hub-list">
        {result.hubs.map((hub) => (
          <li key={hub.id} className="hub-card">
            <h3 className="hub-card__name">{hub.name}</h3>
            <p className="hub-card__distance">{hub.distanceMiles} miles away</p>
            <p className="hub-card__address">
              {hub.addressLine}, {hub.town} {hub.postcode}
            </p>
            <p className="hub-card__times">Open {hub.openingTimes}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}
