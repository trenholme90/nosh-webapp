import type { MealType } from './recipe.ts';

/**
 * The weekly plan: one rolling Monday-to-Sunday week, with no dates. A person
 * shops once a week, so the plan is simply changed each week rather than kept.
 */

export const DAYS = [
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday',
] as const;
export type Day = (typeof DAYS)[number];

/** The meals a day is planned by. Dessert is a meal type a recipe can suit, but not a slot. */
export const PLAN_SLOTS = ['breakfast', 'lunch', 'dinner'] as const satisfies readonly MealType[];
export type PlanSlot = (typeof PLAN_SLOTS)[number];

export function isDay(value: unknown): value is Day {
  return (DAYS as readonly unknown[]).includes(value);
}

export function isPlanSlot(value: unknown): value is PlanSlot {
  return (PLAN_SLOTS as readonly unknown[]).includes(value);
}

/** What a person chooses for a slot. */
export interface PlannedMealInput {
  recipeId: string;
  /** How many people it is cooked for; the shopping list scales quantities by it. */
  servings: number;
}

export interface PlannedMeal extends PlannedMealInput {
  day: Day;
  slot: PlanSlot;
}

/** Filled slots only, in day then slot order. An empty slot is simply absent. */
export interface Plan {
  meals: PlannedMeal[];
}
