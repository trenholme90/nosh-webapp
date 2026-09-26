import type { FieldErrors } from './validate-recipe.ts';
import { isDay, isPlanSlot, type Plan, type PlannedMeal } from './plan.ts';
import { isDietaryPreference, type Preferences, type Recipe } from './recipe.ts';
import type { ShoppingAmount, ShoppingItem, ShoppingList } from './shopping-list.ts';

/**
 * The HTTP contract between the client and the API: response shapes, plus runtime
 * guards so the client cannot assert a shape without also checking it.
 */

/** Response shape of `GET /health`. */
export interface HealthResponse {
  status: 'ok';
  recipeCount: number;
}

/** Body of every non-2xx response. `fields` is present when a recipe failed validation. */
export interface ErrorResponse {
  error: string;
  fields?: FieldErrors;
}

export function isHealthResponse(value: unknown): value is HealthResponse {
  if (!isObject(value)) return false;
  return value['status'] === 'ok' && typeof value['recipeCount'] === 'number';
}

/**
 * Checks the fields the client renders from. It does not re-validate every
 * ingredient's contents: the API validated those on the way in.
 */
export function isRecipe(value: unknown): value is Recipe {
  if (!isObject(value)) return false;
  return (
    typeof value['id'] === 'string' &&
    typeof value['name'] === 'string' &&
    typeof value['cuisine'] === 'string' &&
    typeof value['serves'] === 'number' &&
    typeof value['isCustom'] === 'boolean' &&
    Array.isArray(value['mealType']) &&
    Array.isArray(value['dietary']) &&
    Array.isArray(value['tags']) &&
    Array.isArray(value['ingredients']) &&
    Array.isArray(value['method'])
  );
}

export function isRecipeList(value: unknown): value is Recipe[] {
  return Array.isArray(value) && value.every(isRecipe);
}

export function isPreferences(value: unknown): value is Preferences {
  if (!isObject(value)) return false;
  const dietary = value['dietary'];
  return Array.isArray(dietary) && dietary.every(isDietaryPreference);
}

export function isPlannedMeal(value: unknown): value is PlannedMeal {
  if (!isObject(value)) return false;
  return (
    isDay(value['day']) &&
    isPlanSlot(value['slot']) &&
    typeof value['recipeId'] === 'string' &&
    typeof value['servings'] === 'number'
  );
}

export function isPlan(value: unknown): value is Plan {
  return isObject(value) && Array.isArray(value['meals']) && value['meals'].every(isPlannedMeal);
}

function isShoppingAmount(value: unknown): value is ShoppingAmount {
  if (!isObject(value)) return false;
  const { quantity, unit } = value;
  return (
    (quantity === null || typeof quantity === 'number') &&
    (unit === null || typeof unit === 'string')
  );
}

export function isShoppingItem(value: unknown): value is ShoppingItem {
  if (!isObject(value)) return false;
  return (
    typeof value['item'] === 'string' &&
    typeof value['ticked'] === 'boolean' &&
    Array.isArray(value['amounts']) &&
    value['amounts'].every(isShoppingAmount) &&
    Array.isArray(value['recipes']) &&
    value['recipes'].every((name) => typeof name === 'string')
  );
}

export function isShoppingList(value: unknown): value is ShoppingList {
  return isObject(value) && Array.isArray(value['items']) && value['items'].every(isShoppingItem);
}

export function isErrorResponse(value: unknown): value is ErrorResponse {
  return isObject(value) && typeof value['error'] === 'string';
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}
