import type { Plan, Recipe, ShoppingAmount, ShoppingItem } from '@nosh/shared';

/** A line of the list before ticks are known. */
export type ShoppingNeed = Omit<ShoppingItem, 'ticked'>;

/**
 * Units that can be added together safely, each sized in its family's base unit.
 * Anything else (tins, cloves, handfuls, counted items) only adds to its own unit:
 * a tin and 200 ml stay side by side rather than guessing how big the tin is.
 */
const FAMILIES = [
  { base: 'g', large: 'kg', sizes: { g: 1, kg: 1000 } as Record<string, number> },
  { base: 'ml', large: 'l', sizes: { ml: 1, l: 1000, tbsp: 15, tsp: 5 } as Record<string, number> },
];

/** Running total for one family, or for one unit outside a family. */
interface Tally {
  family: (typeof FAMILIES)[number] | undefined;
  /** In the family's base unit when there is a family, otherwise in `unit`. */
  total: number;
  unitsSeen: Set<string | null>;
}

interface ItemTally {
  item: string;
  tallies: Map<string, Tally>;
  /** Some recipe gave no amount, e.g. "to taste". */
  unmeasured: boolean;
  recipes: string[];
}

/**
 * Everything the week's meals need, one line per ingredient. Each recipe is scaled
 * to its planned servings, amounts are added up within units that convert safely,
 * and only then rounded up to something you can buy.
 */
export function buildShoppingList(plan: Plan, recipes: Recipe[]): ShoppingNeed[] {
  const recipesById = new Map(recipes.map((recipe) => [recipe.id, recipe]));
  const planned = plan.meals.flatMap((meal) => {
    const recipe = recipesById.get(meal.recipeId);
    return recipe ? [{ recipe, scale: meal.servings / recipe.serves }] : [];
  });
  const lineFor = lineNames(
    planned.flatMap(({ recipe }) => recipe.ingredients.map((ingredient) => ingredient.item)),
  );
  const items = new Map<string, ItemTally>();

  for (const { recipe, scale } of planned) {
    for (const ingredient of recipe.ingredients) {
      const item = lineFor(ingredient.item);
      const tally: ItemTally = items.get(item) ?? {
        item,
        tallies: new Map(),
        unmeasured: false,
        recipes: [],
      };
      items.set(item, tally);
      if (!tally.recipes.includes(recipe.name)) tally.recipes.push(recipe.name);

      if (ingredient.quantity === null) {
        tally.unmeasured = true;
        continue;
      }
      addAmount(tally, ingredient.quantity * scale, ingredient.unit);
    }
  }

  return [...items.values()]
    .map(({ item, tallies, unmeasured, recipes: names }) => {
      const amounts = [...tallies.values()].map(toAmount);
      return {
        item,
        // "To taste" only matters when there is nothing else to buy.
        amounts: amounts.length === 0 && unmeasured ? [{ quantity: null, unit: null }] : amounts,
        recipes: names,
      };
    })
    .sort((a, b) => a.item.localeCompare(b.item));
}

/**
 * Which line each ingredient name goes on. Names are trimmed and lowercased, and a
 * plural shares its singular's line when the singular is on the list too, so a
 * week with "carrot" and "carrots" buys carrots once. A name on its own is left
 * alone rather than guessing at its singular.
 */
function lineNames(names: string[]): (name: string) => string {
  const tidy = (name: string) => name.trim().toLowerCase();
  const present = new Set(names.map(tidy));
  return (name) => {
    const tidied = tidy(name);
    // "potatoes" -> "potato", then "carrots" -> "carrot".
    for (const ending of ['es', 's']) {
      const singular = tidied.slice(0, -ending.length);
      if (tidied.endsWith(ending) && present.has(singular)) return singular;
    }
    return tidied;
  };
}

function addAmount(tally: ItemTally, quantity: number, rawUnit: string | null) {
  const unit = rawUnit?.trim().toLowerCase() || null;
  const family = FAMILIES.find((candidate) => unit !== null && unit in candidate.sizes);
  const key = family ? family.base : `unit:${unit}`;

  const current = tally.tallies.get(key) ?? { family, total: 0, unitsSeen: new Set() };
  current.total += family && unit ? quantity * (family.sizes[unit] ?? 1) : quantity;
  current.unitsSeen.add(unit);
  tally.tallies.set(key, current);
}

/** A family keeps its unit when only one was used (3 tbsp stays 3 tbsp); mixed units add up in the base. */
function toAmount({ family, total, unitsSeen }: Tally): ShoppingAmount {
  const [onlyUnit = null] = unitsSeen;
  if (!family) return roundUp(total, onlyUnit);
  if (unitsSeen.size === 1 && onlyUnit)
    return roundUp(total / (family.sizes[onlyUnit] ?? 1), onlyUnit);
  return roundUp(total, family.base);
}

/**
 * Round up to something you can buy: whole onions and tins, half spoons, and weights
 * and volumes to the next 5 (or 0.1 kg or l from 1000 up). Amounts already in kg
 * or l stay in them, to the next 0.1.
 */
function roundUp(quantity: number, unit: string | null): ShoppingAmount {
  const large = FAMILIES.find((candidate) => candidate.large === unit);
  if (large) return { quantity: ceilTo(quantity, 0.1), unit: large.large };
  const family = FAMILIES.find((candidate) => candidate.base === unit);
  if (family) {
    return quantity >= 1000
      ? { quantity: ceilTo(quantity / 1000, 0.1), unit: family.large }
      : { quantity: ceilTo(quantity, 5), unit: family.base };
  }
  if (unit === 'tbsp' || unit === 'tsp') return { quantity: ceilTo(quantity, 0.5), unit };
  return { quantity: ceilTo(quantity, 1), unit };
}

/**
 * An amount in terms that can be compared with another of the same item: g and kg
 * both become g, and ml, l, tbsp and tsp all become ml. Anything else only
 * compares with the same unit.
 */
export function inBaseUnit({ quantity, unit }: ShoppingAmount): {
  measure: string;
  quantity: number | null;
} {
  const family = FAMILIES.find((candidate) => unit !== null && unit in candidate.sizes);
  if (!family || !unit || quantity === null) return { measure: `unit:${unit}`, quantity };
  return { measure: family.base, quantity: quantity * (family.sizes[unit] ?? 1) };
}

/**
 * Round up to a multiple of `step`. Scaling leaves float noise (100 / 3 * 3 is
 * 100.00000000000001), which must not tip an exact amount up a whole step.
 */
function ceilTo(value: number, step: number): number {
  const steps = Math.ceil(value / step - 1e-9);
  return Math.round(steps * step * 100) / 100;
}
