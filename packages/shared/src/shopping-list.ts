/**
 * The shopping list: every ingredient the week's plan needs, added up.
 * It is built from the plan on each request; only ticks are stored.
 */

/** One amount of an item. Amounts that can't be added together sit side by side, e.g. a tin and 200 ml. */
export interface ShoppingAmount {
  /** Null when the recipes give no amount, e.g. "salt and pepper, to taste". */
  quantity: number | null;
  /** Null for counted items, e.g. 3 onions. */
  unit: string | null;
}

export interface ShoppingItem {
  /** Lowercased ingredient name; one line per item. */
  item: string;
  amounts: ShoppingAmount[];
  /** Names of the planned recipes that need it, in week order. */
  recipes: string[];
  ticked: boolean;
}

/** Items in alphabetical order. Empty when nothing is planned. */
export interface ShoppingList {
  items: ShoppingItem[];
}

/** Body of a tick or untick. */
export interface TickInput {
  ticked: boolean;
}
