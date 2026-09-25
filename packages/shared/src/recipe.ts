/**
 * Recipe domain types.
 *
 * These mirror the shape of the client-supplied starter data in
 * `apps/api/data/project-nosh-sample-recipes.json`. Where the sample data is
 * loose, the types stay loose on purpose - see the notes below.
 */

/** Dietary filters the user can switch on. Closed: the brief drives the preferences UI off this list. */
export const DIETARY_PREFERENCES = ['vegetarian', 'vegan', 'dairy-free', 'gluten-free'] as const;
export type DietaryPreference = (typeof DIETARY_PREFERENCES)[number];

/** Meal slots a recipe can fill. A recipe may suit more than one. */
export const MEAL_TYPES = ['breakfast', 'lunch', 'dinner', 'dessert'] as const;
export type MealType = (typeof MEAL_TYPES)[number];

export interface Ingredient {
  item: string;
  /** Null for uncountable entries such as "salt, to taste". */
  quantity: number | null;
  /** Null when the item is counted rather than measured, e.g. "2 eggs". */
  unit: string | null;
  /** Optional preparation note, e.g. "finely chopped". */
  prep?: string;
}

/** Everything a person supplies when they add or edit a recipe of their own. */
export interface RecipeInput {
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
}

export interface Recipe extends RecipeInput {
  /** Stable slug, e.g. "porridge-with-berries-and-honey". */
  id: string;
  /** False for the starter recipes, true for anything the user added. Only custom recipes can be edited or deleted. */
  isCustom: boolean;
}
