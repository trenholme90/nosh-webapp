import type { DietaryPreference } from '@nosh/shared';
import { useRef, useState } from 'react';
import { savePreferences } from './preferences-api.ts';

/**
 * The chosen diet, updated on screen at once and saved in the background.
 *
 * Saves go one at a time. A change made while a save is in flight waits, and
 * only the newest waiting change is sent, so the server always ends on the last
 * thing the user chose, however quickly they tick. If a save fails with nothing
 * newer waiting, the screen goes back to what the server last confirmed.
 */
export function useSavedDiet(savedDiet: DietaryPreference[]) {
  const [diet, setDiet] = useState(savedDiet);
  const [saveFailed, setSaveFailed] = useState(false);
  const confirmed = useRef(savedDiet);
  const waiting = useRef<DietaryPreference[] | undefined>(undefined);
  const saving = useRef(false);

  async function sendWaiting() {
    if (saving.current) return;
    saving.current = true;
    while (waiting.current) {
      const next = waiting.current;
      waiting.current = undefined;
      try {
        confirmed.current = (await savePreferences({ dietary: next })).dietary;
      } catch {
        if (!waiting.current) {
          setDiet(confirmed.current);
          setSaveFailed(true);
        }
      }
    }
    saving.current = false;
  }

  function changeDiet(next: DietaryPreference[]) {
    setDiet(next);
    setSaveFailed(false);
    waiting.current = next;
    void sendWaiting();
  }

  return { diet, changeDiet, saveFailed };
}
