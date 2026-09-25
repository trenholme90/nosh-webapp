import { useEffect, useEffectEvent, useState } from 'react';

export type LoadState<T> =
  { status: 'loading' } | { status: 'ready'; data: T } | { status: 'error'; error: unknown };

/**
 * Run `load` whenever `key` changes and track the result.
 *
 * The settled result remembers which key it belongs to, so a key change reads
 * as 'loading' straight away without resetting state inside the effect, and a
 * slow answer for an old key can never overwrite the current one.
 */
export function useLoad<T>(key: string, load: () => Promise<T>): LoadState<T> {
  const [settled, setSettled] = useState<{ key: string; state: LoadState<T> }>();
  const runLoad = useEffectEvent(load);

  useEffect(() => {
    let cancelled = false;

    runLoad().then(
      (data) => {
        if (!cancelled) setSettled({ key, state: { status: 'ready', data } });
      },
      (error: unknown) => {
        if (!cancelled) setSettled({ key, state: { status: 'error', error } });
      },
    );

    return () => {
      cancelled = true;
    };
  }, [key]);

  return settled?.key === key ? settled.state : { status: 'loading' };
}
