import type { DatabaseSync } from 'node:sqlite';
import type { ShoppingAmount, ShoppingItem } from '@nosh/shared';
import { getPlan } from '../db/plan.ts';
import { listRecipes } from '../db/recipes.ts';
import { getTicks, removeTick } from '../db/shopping-ticks.ts';
import { buildShoppingList, type ShoppingNeed } from './build-list.ts';

/**
 * The shopping list as the person sees it: what the week needs, and which of it
 * they have ticked off.
 *
 * A tick means "I have got enough of this". It stays while the week needs no more
 * than was ticked (dropping a meal keeps it), is lifted if the week needs more,
 * and is forgotten once the item leaves the list, so an item that comes back
 * later starts unticked.
 */

export function currentNeeds(db: DatabaseSync): ShoppingNeed[] {
  return buildShoppingList(getPlan(db), listRecipes(db));
}

export function shoppingList(db: DatabaseSync): ShoppingItem[] {
  const ticks = getTicks(db);
  return currentNeeds(db).map((need) => {
    const ticked = ticks.get(need.item);
    return { ...need, ticked: ticked !== undefined && covers(ticked, need.amounts) };
  });
}

/** Call after anything that can change what the week needs: the plan, or a recipe in it. */
export function forgetUnneededTicks(db: DatabaseSync): void {
  const needed = new Set(currentNeeds(db).map((need) => need.item));
  for (const item of getTicks(db).keys()) {
    if (!needed.has(item)) removeTick(db, item);
  }
}

/** Whether what was ticked is enough for every amount needed now, unit by unit. */
function covers(ticked: ShoppingAmount[], needed: ShoppingAmount[]): boolean {
  return needed.every((need) =>
    ticked.some(
      (got) =>
        got.unit === need.unit &&
        (need.quantity === null
          ? got.quantity === null
          : got.quantity !== null && got.quantity >= need.quantity),
    ),
  );
}
