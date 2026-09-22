/**
 * Domain types shared by the Nosh web client and API.
 *
 * These mirror the shape of the client-supplied starter data in
 * `apps/api/data/project-nosh-sample-recipes.json`. Where the sample data is
 * loose, the types stay loose on purpose - see the notes below.
 */

/** Dietary filters the user can switch on. Closed: the brief drives the preferences UI off this list. */
export type DietaryPreference = 'vegetarian' | 'vegan' | 'dairy-free' | 'gluten-free';

/** Meal slots a recipe can fill. A recipe may suit more than one. */
export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'dessert';

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
  /**
   * Free-form labels used for browsing, e.g. "quick", "batch-cook",
   * "freezer-friendly", "kid-friendly".
   *
   * Genuinely open: user recipes may introduce labels the starter set does not
   * cover, so these stay `string`. A union ending in `(string & {})` was tried
   * and dropped - it collapses to `string` and checks nothing, while reading as
   * if it were closed.
   */
  tags: string[];
  serves: number;
  ingredients: Ingredient[];
  /** Ordered method steps. */
  method: string[];
  /** Mirrors the `is_custom` column: false for the starter recipes, true for anything the user added. */
  isCustom?: boolean;
}

/** Response shape of `GET /health`. */
export interface HealthResponse {
  status: 'ok';
  recipeCount: number;
}

/**
 * Runtime check for `HealthResponse`.
 *
 * Lives beside the type so both sides of the wire share one definition of the
 * contract: the client cannot assert the shape without also checking it.
 */
export function isHealthResponse(value: unknown): value is HealthResponse {
  if (typeof value !== 'object' || value === null) return false;
  const candidate = value as Partial<Record<keyof HealthResponse, unknown>>;
  return candidate.status === 'ok' && typeof candidate.recipeCount === 'number';
}
