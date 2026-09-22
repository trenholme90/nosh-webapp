/**
 * Domain types shared by the Nosh web client and API.
 *
 * These mirror the shape of the client-supplied starter data in
 * `apps/api/data/project-nosh-sample-recipes.json`. Where the sample data is
 * loose, the types stay loose on purpose - see the notes below.
 */

/** Dietary filters the user can switch on. Closed: the brief drives the preferences UI off this list. */
export type DietaryPreference = 'vegetarian' | 'vegan' | 'dairy-free' | 'gluten-free';

export const DIETARY_PREFERENCES: readonly DietaryPreference[] = [
  'vegetarian',
  'vegan',
  'dairy-free',
  'gluten-free',
] as const;

/** Meal slots a recipe can fill. A recipe may suit more than one. */
export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'dessert';

export const MEAL_TYPES: readonly MealType[] = ['breakfast', 'lunch', 'dinner', 'dessert'] as const;

/** Free-form labels used for browsing. Open-ended: user recipes may introduce new ones. */
export type RecipeTag =
  'quick' | 'batch-cook' | 'freezer-friendly' | 'kid-friendly' | (string & {});

export interface Ingredient {
  item: string;
  /** Null for uncountable entries such as "salt, to taste". */
  quantity: number | null;
  /** Null when the item is counted rather than measured, e.g. "2 eggs". */
  unit: string | null;
  /** Optional preparation note, e.g. "finely chopped". */
  prep?: string;
}

export interface Recipe {
  /** Stable slug, e.g. "porridge-with-berries-and-honey". */
  id: string;
  name: string;
  /** Open string: custom recipes may bring cuisines the starter set does not cover. */
  cuisine: string;
  mealType: MealType[];
  dietary: DietaryPreference[];
  tags: RecipeTag[];
  serves: number;
  ingredients: Ingredient[];
  /** Ordered method steps. */
  method: string[];
  /** False for the built-in starter recipes, true for anything the user added. */
  isCustom?: boolean;
}

/** Response shape of `GET /health`. */
export interface HealthResponse {
  status: 'ok';
  recipeCount: number;
}
