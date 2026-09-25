import type { Day, DietaryPreference, Ingredient, MealType } from '@nosh/shared';

/** Display helpers: turn stored recipe values into the words people read. */

export const DIETARY_LABELS: Record<DietaryPreference, string> = {
  vegetarian: 'Vegetarian',
  vegan: 'Vegan',
  'dairy-free': 'Dairy-free',
  'gluten-free': 'Gluten-free',
};

export const MEAL_TYPE_LABELS: Record<MealType, string> = {
  breakfast: 'Breakfast',
  lunch: 'Lunch',
  dinner: 'Dinner',
  dessert: 'Dessert',
};

export const DAY_LABELS: Record<Day, string> = {
  monday: 'Monday',
  tuesday: 'Tuesday',
  wednesday: 'Wednesday',
  thursday: 'Thursday',
  friday: 'Friday',
  saturday: 'Saturday',
  sunday: 'Sunday',
};

/** "For 1 person", "For 4 people". */
export function formatServings(servings: number): string {
  return `For ${servings} ${servings === 1 ? 'person' : 'people'}`;
}

export function capitalise(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

const FRACTIONS: Record<string, string> = { '0.25': '¼', '0.5': '½', '0.75': '¾' };

/** 1.5 -> "1½", 0.25 -> "¼", 2.3333 -> "2.33". */
export function formatQuantity(quantity: number): string {
  const whole = Math.floor(quantity);
  const fraction = FRACTIONS[String(quantity - whole)];
  if (fraction) return whole === 0 ? fraction : `${whole}${fraction}`;
  return String(Math.round(quantity * 100) / 100);
}

/**
 * Parse what someone typed as an amount: "2", "0.5", "1/2" or "1 1/2".
 * Blank means "no amount". Anything else is NaN, which validation rejects.
 */
export function parseQuantity(text: string): number | null {
  const trimmed = text.trim();
  if (trimmed === '') return null;

  const mixed = /^(?:(\d+)\s+)?(\d+)\/(\d+)$/.exec(trimmed);
  if (mixed) {
    const [, whole = '0', numerator = '0', denominator = '0'] = mixed;
    return Number(denominator) === 0
      ? Number.NaN
      : Number(whole) + Number(numerator) / Number(denominator);
  }

  return /^\d*\.?\d+$/.test(trimmed) ? Number(trimmed) : Number.NaN;
}

/** Abbreviated units never take a plural: "200 g", not "200 gs". */
const UNPLURALISED_UNITS = new Set(['g', 'kg', 'ml', 'l', 'tsp', 'tbsp', 'oz', 'lb']);

function pluraliseUnit(unit: string, quantity: number): string {
  if (quantity <= 1 || UNPLURALISED_UNITS.has(unit) || unit.endsWith('s')) return unit;
  return /(ch|sh|x)$/.test(unit) ? `${unit}es` : `${unit}s`;
}

/** "2 slices bread, toasted", "4 pork sausages", "salt". */
export function formatIngredient({ item, quantity, unit, prep }: Ingredient): string {
  const parts: string[] = [];
  if (quantity !== null) parts.push(formatQuantity(quantity));
  if (unit) parts.push(quantity !== null ? pluraliseUnit(unit, quantity) : unit);
  parts.push(item);
  return prep ? `${parts.join(' ')}, ${prep}` : parts.join(' ');
}
