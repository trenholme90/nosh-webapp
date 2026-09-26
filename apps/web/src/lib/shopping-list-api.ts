import { isShoppingItem, isShoppingList, type ShoppingItem, type ShoppingList } from '@nosh/shared';
import { apiGet, apiPut } from './api.ts';

/** The shopping list endpoints. */

export function fetchShoppingList(): Promise<ShoppingList> {
  return apiGet('/shopping-list', isShoppingList);
}

export function setTicked(item: string, ticked: boolean): Promise<ShoppingItem> {
  return apiPut(`/shopping-list/items/${encodeURIComponent(item)}`, { ticked }, isShoppingItem);
}
