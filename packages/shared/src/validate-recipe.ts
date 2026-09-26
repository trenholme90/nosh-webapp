import type { PlannedMealInput } from './plan.ts';
import type { TickInput } from './shopping-list.ts';
import {
  DIETARY_PREFERENCES,
  MEAL_TYPES,
  type Ingredient,
  type Preferences,
  type RecipeInput,
} from './recipe.ts';

/**
 * Validation for recipes a person adds or edits.
 *
 * Shared so the form and the API apply one set of rules: the form checks before
 * sending so errors show instantly, and the API checks again because it cannot
 * trust what arrives over the wire.
 */

export const RECIPE_LIMITS = {
  nameLength: 100,
  cuisineLength: 50,
  textLength: 200,
  stepLength: 1000,
  minServes: 1,
  maxServes: 20,
} as const;

/**
 * Validation error messages keyed by field path, e.g. `name`, `ingredients.2.item`, `method.0`.
 * Paths index into the submitted arrays, so the form can put each message beside
 * the row that caused it.
 */
export type FieldErrors = Record<string, string>;

export type RecipeValidationResult =
  { ok: true; value: RecipeInput } | { ok: false; errors: FieldErrors };

/** Check an untrusted value and return a trimmed, normalised `RecipeInput` if it is valid. */
export function validateRecipeInput(value: unknown): RecipeValidationResult {
  const errors: FieldErrors = {};
  const input = isRecord(value) ? value : {};

  const name = requiredText(
    input['name'],
    'name',
    'Give your recipe a name',
    RECIPE_LIMITS.nameLength,
    errors,
  );
  const cuisine = requiredText(
    input['cuisine'],
    'cuisine',
    'Add a cuisine, such as British or Italian',
    RECIPE_LIMITS.cuisineLength,
    errors,
  );

  const serves = peopleCount(input['serves'], 'serves', 'Serves', errors);

  const mealType = choices(input['mealType'], MEAL_TYPES, 'mealType', errors);
  if (mealType.length === 0 && !errors['mealType']) {
    errors['mealType'] = 'Pick at least one meal this recipe suits';
  }

  const dietary = choices(input['dietary'], DIETARY_PREFERENCES, 'dietary', errors);

  const tags = input['tags'] ?? [];
  if (!isStringArray(tags)) errors['tags'] = 'Tags must be a list of words';

  const ingredients = validateIngredients(input['ingredients'], errors);
  const method = validateMethod(input['method'], errors);

  if (Object.keys(errors).length > 0) return { ok: false, errors };

  return {
    ok: true,
    value: {
      name,
      cuisine,
      mealType,
      dietary,
      tags: isStringArray(tags) ? tags.map((tag) => tag.trim()).filter(Boolean) : [],
      serves,
      ingredients,
      method,
    },
  };
}

export type PreferencesValidationResult =
  { ok: true; value: Preferences } | { ok: false; errors: FieldErrors };

/** Check an untrusted preferences body. Lives beside recipes to share the `choices` rules. */
export function validatePreferences(value: unknown): PreferencesValidationResult {
  const errors: FieldErrors = {};
  const input = isRecord(value) ? value : {};

  if (!Array.isArray(input['dietary'])) {
    return { ok: false, errors: { dietary: 'Dietary preferences must be a list' } };
  }
  const dietary = choices(input['dietary'], DIETARY_PREFERENCES, 'dietary', errors);

  return Object.keys(errors).length > 0 ? { ok: false, errors } : { ok: true, value: { dietary } };
}

export type PlannedMealValidationResult =
  { ok: true; value: PlannedMealInput } | { ok: false; errors: FieldErrors };

/**
 * Check an untrusted planned-meal body. Whether the recipe exists is the API's
 * to check: this only knows the shape.
 */
export function validatePlannedMeal(value: unknown): PlannedMealValidationResult {
  const errors: FieldErrors = {};
  const input = isRecord(value) ? value : {};

  const recipeId = typeof input['recipeId'] === 'string' ? input['recipeId'].trim() : '';
  if (recipeId === '') errors['recipeId'] = 'Pick a recipe';
  const servings = peopleCount(input['servings'], 'servings', 'Servings', errors);

  return Object.keys(errors).length > 0
    ? { ok: false, errors }
    : { ok: true, value: { recipeId, servings } };
}

export type TickValidationResult =
  { ok: true; value: TickInput } | { ok: false; errors: FieldErrors };

/** Check an untrusted tick body: `{ ticked: true }` or `{ ticked: false }`. */
export function validateTick(value: unknown): TickValidationResult {
  const ticked = isRecord(value) ? value['ticked'] : undefined;
  return typeof ticked === 'boolean'
    ? { ok: true, value: { ticked } }
    : { ok: false, errors: { ticked: 'Ticked must be true or false' } };
}

/** How many people a recipe or planned meal is for: the same range for both. */
function peopleCount(value: unknown, path: string, label: string, errors: FieldErrors): number {
  if (
    typeof value !== 'number' ||
    !Number.isInteger(value) ||
    value < RECIPE_LIMITS.minServes ||
    value > RECIPE_LIMITS.maxServes
  ) {
    errors[path] =
      `${label} must be a whole number from ${RECIPE_LIMITS.minServes} to ${RECIPE_LIMITS.maxServes}`;
    return 0;
  }
  return value;
}

function validateIngredients(value: unknown, errors: FieldErrors): Ingredient[] {
  if (!Array.isArray(value) || value.length === 0) {
    errors['ingredients'] = 'Add at least one ingredient';
    return [];
  }

  return value.map((raw: unknown, index): Ingredient => {
    const row = isRecord(raw) ? raw : {};
    const path = `ingredients.${index}`;

    const item = requiredText(
      row['item'],
      `${path}.item`,
      'Name the ingredient',
      RECIPE_LIMITS.textLength,
      errors,
    );

    const quantity = row['quantity'] ?? null;
    if (
      quantity !== null &&
      (typeof quantity !== 'number' || !Number.isFinite(quantity) || quantity <= 0)
    ) {
      errors[`${path}.quantity`] = 'Amount must be a number above 0, or left blank';
    }

    const unit = optionalText(row['unit'], `${path}.unit`, RECIPE_LIMITS.textLength, errors);
    const prep = optionalText(row['prep'], `${path}.prep`, RECIPE_LIMITS.textLength, errors);

    return {
      item,
      quantity: typeof quantity === 'number' ? quantity : null,
      unit,
      ...(prep ? { prep } : {}),
    };
  });
}

function validateMethod(value: unknown, errors: FieldErrors): string[] {
  if (!Array.isArray(value) || value.length === 0) {
    errors['method'] = 'Add at least one step to the method';
    return [];
  }

  return value.map((step: unknown, index) =>
    requiredText(
      step,
      `method.${index}`,
      'Write this step, or remove it',
      RECIPE_LIMITS.stepLength,
      errors,
    ),
  );
}

function requiredText(
  value: unknown,
  path: string,
  missingMessage: string,
  maxLength: number,
  errors: FieldErrors,
): string {
  const text = typeof value === 'string' ? value.trim() : '';
  if (text === '') errors[path] = missingMessage;
  else if (text.length > maxLength) errors[path] = `Keep this to ${maxLength} characters or fewer`;
  return text;
}

/** Blank or missing becomes null, so "no unit" has one representation. */
function optionalText(
  value: unknown,
  path: string,
  maxLength: number,
  errors: FieldErrors,
): string | null {
  if (value === undefined || value === null) return null;
  if (typeof value !== 'string') {
    errors[path] = 'Must be text';
    return null;
  }
  const text = value.trim();
  if (text.length > maxLength) errors[path] = `Keep this to ${maxLength} characters or fewer`;
  return text === '' ? null : text;
}

function choices<T extends string>(
  value: unknown,
  allowed: readonly T[],
  path: string,
  errors: FieldErrors,
): T[] {
  if (value === undefined) return [];
  if (!Array.isArray(value) || !value.every((entry) => allowed.includes(entry as T))) {
    errors[path] = `Choose from: ${allowed.join(', ')}`;
    return [];
  }
  // Deduplicate and keep the canonical order, so the same choices always store the same way.
  return allowed.filter((option) => value.includes(option));
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((entry) => typeof entry === 'string');
}
