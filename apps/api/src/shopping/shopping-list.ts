import type { DatabaseSync } from 'node:sqlite';
import type { ShoppingAmount, ShoppingItem } from '@nosh/shared';
import { getPlan } from '../db/plan.ts';
import { listRecipes } from '../db/recipes.ts';
import { getTicks, removeTick } from '../db/shopping-ticks.ts';
import { buildShoppingList, inBaseUnit, type ShoppingNeed } from './build-list.ts';

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

/**
 * Whether what was ticked is enough for every amount needed now. Amounts compare
 * across units that convert, so 530 ml ticked covers 2 tbsp needed later.
 */
function covers(ticked: ShoppingAmount[], needed: ShoppingAmount[]): boolean {
  const got = ticked.map(inBaseUnit);
  return needed
    .map(inBaseUnit)
    .every((need) =>
      got.some(
        (have) =>
          have.measure === need.measure &&
          (need.quantity === null
            ? have.quantity === null
            : have.quantity !== null && have.quantity >= need.quantity),
      ),
    );
}
