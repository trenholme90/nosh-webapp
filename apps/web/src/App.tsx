import { useEffect, useState } from 'react';
import type { HealthResponse } from '@nosh/shared';
import { apiGet } from './lib/api.ts';
import './App.css';

type Connection =
  { status: 'checking' } | { status: 'connected'; recipeCount: number } | { status: 'unavailable' };

/**
 * Application shell.
 *
 * Deliberately feature-free at this stage - it establishes the brand, the layout
 * and the client-to-API round trip so feature work has somewhere to land.
 */
export function App() {
  const [connection, setConnection] = useState<Connection>({ status: 'checking' });

  useEffect(() => {
    let cancelled = false;

    apiGet<HealthResponse>('/health')
      .then((health) => {
        if (!cancelled) setConnection({ status: 'connected', recipeCount: health.recipeCount });
      })
      .catch(() => {
        if (!cancelled) setConnection({ status: 'unavailable' });
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="app">
      <header className="app__header">
        <div className="app__header-inner">
          <div className="brand">
            {/* The mark is decorative: the wordmark beside it carries the name. */}
            <img className="brand__mark" src="/brand/nosh-mark.svg" alt="" width="39" height="44" />
            <img
              className="brand__wordmark"
              src="/brand/nosh-wordmark.svg"
              alt="Nosh"
              width="91"
              height="24"
            />
          </div>
        </div>
      </header>

      <main className="app__main">
        <h1>Meal planning that fits your budget</h1>
        <p className="lede">
          Pick recipes you fancy, plan the week, and get one shopping list with everything added up.
        </p>

        <p className="scaffold-note">
          The groundwork is in place. Recipes, preferences, the weekly plan and the shopping list
          are next.
        </p>

        <ApiStatus connection={connection} />
      </main>
    </div>
  );
}

function ApiStatus({ connection }: { connection: Connection }) {
  return (
    <p className={`status status--${connection.status}`} role="status">
      {connection.status === 'checking' && 'Checking the kitchen…'}
      {connection.status === 'connected' &&
        `API connected — ${connection.recipeCount} starter recipes ready`}
      {connection.status === 'unavailable' &&
        'API unavailable — start it with npm run dev and reload'}
    </p>
  );
}
