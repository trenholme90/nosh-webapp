import type { DietaryPreference, Recipe } from '@nosh/shared';

/**
 * Does a recipe suit someone with these dietary needs? Only if it carries every
 * one of them: a vegan who avoids gluten needs a recipe that is both.
 */
export function suitsDiet(recipe: Recipe, dietary: DietaryPreference[]): boolean {
  return dietary.every((need) => recipe.dietary.includes(need));
}
