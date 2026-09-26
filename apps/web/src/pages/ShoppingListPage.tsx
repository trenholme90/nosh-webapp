import type { ShoppingItem } from '@nosh/shared';
import { useRef, useState } from 'react';
import { Link } from 'react-router';
import { LoadError } from '../components/LoadError.tsx';
import { capitalise, formatAmounts } from '../lib/format.ts';
import { fetchShoppingList, setTicked } from '../lib/shopping-list-api.ts';
import { useDocumentTitle } from '../lib/use-document-title.ts';
import { useLoad } from '../lib/use-load.ts';

export function ShoppingListPage() {
  useDocumentTitle('Shopping list');
  const list = useLoad('shopping-list', fetchShoppingList);

  return (
    <>
      <h1>Shopping list</h1>
      <p className="lede">
        Everything your week’s meals need, added up. Tick things off as you shop, or if you already
        have them.
      </p>

      {list.status === 'error' && <LoadError />}
      {list.status === 'loading' && <p role="status">Loading your list…</p>}
      {list.status === 'ready' &&
        (list.data.items.length === 0 ? (
          <p className="notice">
            Nothing to buy yet. <Link to="/plan">Plan some meals for your week</Link> and everything
            they need will show up here.
          </p>
        ) : (
          <Checklist savedItems={list.data.items} />
        ))}
    </>
  );
}

/**
 * The items as checkboxes. A tick shows at once and saves in the background;
 * items are independent, so each saves on its own and only a failure is undone.
 */
function Checklist({ savedItems }: { savedItems: ShoppingItem[] }) {
  const [items, setItems] = useState(savedItems);
  const [failedItem, setFailedItem] = useState<string>();
  // A second tap on an item whose save is still out is ignored, so saves can't cross.
  const saving = useRef(new Set<string>());

  const markTicked = (item: string, ticked: boolean) =>
    setItems((current) =>
      current.map((entry) => (entry.item === item ? { ...entry, ticked } : entry)),
    );

  async function toggle(item: string, ticked: boolean) {
    if (saving.current.has(item)) return;
    saving.current.add(item);
    markTicked(item, ticked);
    setFailedItem(undefined);
    try {
      await setTicked(item, ticked);
    } catch {
      markTicked(item, !ticked);
      setFailedItem(item);
    } finally {
      saving.current.delete(item);
    }
  }

  const tickedCount = items.filter((entry) => entry.ticked).length;

  return (
    <>
      <p role="status" className="shopping-summary">
        {tickedCount} of {items.length} ticked
      </p>
      {failedItem && (
        <p className="notice notice--warning" role="alert">
          Sorry, we couldn’t save that change to {capitalise(failedItem)}. Please try again.
        </p>
      )}

      <ul className="shopping-list">
        {items.map((entry, index) => {
          const amount = formatAmounts(entry.amounts);
          const forId = `shopping-item-${index}-for`;

          return (
            <li
              key={entry.item}
              className={`shopping-item${entry.ticked ? ' shopping-item--ticked' : ''}`}
            >
              <label className="shopping-item__label">
                <input
                  type="checkbox"
                  checked={entry.ticked}
                  onChange={(event) => toggle(entry.item, event.target.checked)}
                  aria-describedby={forId}
                />
                <span className="shopping-item__name">{capitalise(entry.item)}</span>{' '}
                {amount && <span className="shopping-item__amount">{amount}</span>}
              </label>
              <p className="shopping-item__for" id={forId}>
                For {entry.recipes.join(', ')}
              </p>
            </li>
          );
        })}
      </ul>
    </>
  );
}
