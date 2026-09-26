import { describe, expect, it } from 'vitest';
import type { Ingredient, PlannedMeal, Recipe } from '@nosh/shared';
import { buildShoppingList } from '../shopping/build-list.ts';

const recipe = (name: string, serves: number, ingredients: Ingredient[]): Recipe => ({
  id: name.toLowerCase(),
  name,
  cuisine: 'british',
  mealType: ['dinner'],
  dietary: [],
  tags: [],
  serves,
  ingredients,
  method: ['Cook.'],
  isCustom: true,
});

const meal = (
  recipeId: string,
  servings: number,
  day: PlannedMeal['day'] = 'monday',
): PlannedMeal => ({
  day,
  slot: 'dinner',
  recipeId,
  servings,
});

/** Build a list for these meals and return the amounts for one item. */
function amountsOf(item: string, recipes: Recipe[], meals: PlannedMeal[]) {
  return buildShoppingList({ meals }, recipes).find((line) => line.item === item)?.amounts;
}

describe('buildShoppingList', () => {
  it('is empty when nothing is planned', () => {
    expect(buildShoppingList({ meals: [] }, [recipe('Stew', 4, [])])).toEqual([]);
  });

  it('adds up the same ingredient from different recipes', () => {
    const recipes = [
      recipe('Stew', 4, [{ item: 'onion', quantity: 1, unit: null }]),
      recipe('Chilli', 4, [{ item: 'onion', quantity: 2, unit: null }]),
    ];

    const list = buildShoppingList(
      { meals: [meal('stew', 4), meal('chilli', 4, 'tuesday')] },
      recipes,
    );

    expect(list).toEqual([
      { item: 'onion', amounts: [{ quantity: 3, unit: null }], recipes: ['Stew', 'Chilli'] },
    ]);
  });

  it('scales each recipe to the servings planned', () => {
    const recipes = [recipe('Stew', 4, [{ item: 'beans', quantity: 400, unit: 'g' }])];

    expect(amountsOf('beans', recipes, [meal('stew', 2)])).toEqual([{ quantity: 200, unit: 'g' }]);
    expect(amountsOf('beans', recipes, [meal('stew', 6)])).toEqual([{ quantity: 600, unit: 'g' }]);
  });

  it('rounds up only after adding, so two three-quarter onions make two', () => {
    const recipes = [recipe('Stew', 4, [{ item: 'onion', quantity: 1, unit: null }])];

    const amounts = amountsOf('onion', recipes, [meal('stew', 3), meal('stew', 3, 'tuesday')]);

    expect(amounts).toEqual([{ quantity: 2, unit: null }]);
  });

  it('rounds counted things up to a whole one', () => {
    const recipes = [recipe('Stew', 4, [{ item: 'chopped tomatoes', quantity: 1, unit: 'tin' }])];

    expect(amountsOf('chopped tomatoes', recipes, [meal('stew', 1)])).toEqual([
      { quantity: 1, unit: 'tin' },
    ]);
  });

  it('keeps a single unit as it is, rounding spoons up to the half', () => {
    const recipes = [
      recipe('Stew', 4, [{ item: 'olive oil', quantity: 1, unit: 'tbsp' }]),
      recipe('Soup', 2, [{ item: 'olive oil', quantity: 1, unit: 'tbsp' }]),
    ];

    const amounts = amountsOf('olive oil', recipes, [meal('stew', 2), meal('soup', 2, 'tuesday')]);

    expect(amounts).toEqual([{ quantity: 1.5, unit: 'tbsp' }]);
  });

  it('converts mixed spoons and millilitres to millilitres', () => {
    const recipes = [
      recipe('Porridge', 2, [{ item: 'milk', quantity: 300, unit: 'ml' }]),
      recipe('Mash', 2, [{ item: 'milk', quantity: 2, unit: 'tbsp' }]),
    ];

    const amounts = amountsOf('milk', recipes, [meal('porridge', 2), meal('mash', 2, 'tuesday')]);

    expect(amounts).toEqual([{ quantity: 330, unit: 'ml' }]);
  });

  it('rounds weights and volumes up to the next 5', () => {
    const recipes = [recipe('Stew', 3, [{ item: 'beans', quantity: 250, unit: 'g' }])];

    expect(amountsOf('beans', recipes, [meal('stew', 1)])).toEqual([{ quantity: 85, unit: 'g' }]);
  });

  it('does not tip an exact amount up a step through rounding noise', () => {
    // 50 g for 3, cooked for 5 on three days, adds up to 250.00000000000003 in floats.
    const recipes = [recipe('Stew', 3, [{ item: 'beans', quantity: 50, unit: 'g' }])];
    const meals = [meal('stew', 5), meal('stew', 5, 'tuesday'), meal('stew', 5, 'wednesday')];

    expect(amountsOf('beans', recipes, meals)).toEqual([{ quantity: 250, unit: 'g' }]);
  });

  it('switches to kilograms from 1000 g, rounded up to the tenth', () => {
    const recipes = [
      recipe('Roast', 4, [{ item: 'potatoes', quantity: 800, unit: 'g' }]),
      recipe('Mash', 4, [{ item: 'potatoes', quantity: 0.45, unit: 'kg' }]),
    ];

    const amounts = amountsOf('potatoes', recipes, [meal('roast', 4), meal('mash', 4, 'tuesday')]);

    expect(amounts).toEqual([{ quantity: 1.3, unit: 'kg' }]);
  });

  it('keeps amounts that cannot be converted side by side', () => {
    const recipes = [
      recipe('Curry', 4, [{ item: 'coconut milk', quantity: 1, unit: 'tin' }]),
      recipe('Soup', 4, [{ item: 'coconut milk', quantity: 200, unit: 'ml' }]),
    ];

    const amounts = amountsOf('coconut milk', recipes, [
      meal('curry', 4),
      meal('soup', 4, 'tuesday'),
    ]);

    expect(amounts).toEqual([
      { quantity: 1, unit: 'tin' },
      { quantity: 200, unit: 'ml' },
    ]);
  });

  it('shows an item with no amount only when nothing else gives one', () => {
    const toTaste = recipe('Stew', 4, [{ item: 'salt', quantity: null, unit: null }]);
    const measured = recipe('Bread', 4, [{ item: 'salt', quantity: 1, unit: 'tsp' }]);

    expect(amountsOf('salt', [toTaste], [meal('stew', 4)])).toEqual([
      { quantity: null, unit: null },
    ]);
    expect(
      amountsOf('salt', [toTaste, measured], [meal('stew', 4), meal('bread', 4, 'tuesday')]),
    ).toEqual([{ quantity: 1, unit: 'tsp' }]);
  });

  it('groups names regardless of case and spacing, and ignores preparation notes', () => {
    const recipes = [
      recipe('Stew', 4, [{ item: 'Onion ', quantity: 1, unit: null, prep: 'chopped' }]),
      recipe('Salad', 4, [{ item: 'onion', quantity: 1, unit: null, prep: 'sliced' }]),
    ];

    const list = buildShoppingList(
      { meals: [meal('stew', 4), meal('salad', 4, 'tuesday')] },
      recipes,
    );

    expect(list.map((line) => [line.item, line.amounts])).toEqual([
      ['onion', [{ quantity: 2, unit: null }]],
    ]);
  });

  it('lists items alphabetically and each recipe once', () => {
    const stew = recipe('Stew', 4, [
      { item: 'onion', quantity: 1, unit: null },
      { item: 'carrot', quantity: 2, unit: null },
    ]);

    const list = buildShoppingList({ meals: [meal('stew', 4), meal('stew', 4, 'tuesday')] }, [
      stew,
    ]);

    expect(list.map((line) => line.item)).toEqual(['carrot', 'onion']);
    expect(list[0]?.recipes).toEqual(['Stew']);
  });

  it('skips a planned meal whose recipe has gone', () => {
    const recipes = [recipe('Stew', 4, [{ item: 'onion', quantity: 1, unit: null }])];

    expect(buildShoppingList({ meals: [meal('gone', 4)] }, recipes)).toEqual([]);
  });

  it('puts a plural on its singular’s line when both are planned', () => {
    const recipes = [
      recipe('Bolognese', 4, [
        { item: 'carrot', quantity: 1, unit: null },
        { item: 'potato', quantity: 2, unit: null },
      ]),
      recipe('Pie', 4, [
        { item: 'carrots', quantity: 2, unit: null },
        { item: 'potatoes', quantity: 3, unit: null },
      ]),
    ];

    const list = buildShoppingList(
      { meals: [meal('bolognese', 4), meal('pie', 4, 'tuesday')] },
      recipes,
    );

    expect(list).toEqual([
      { item: 'carrot', amounts: [{ quantity: 3, unit: null }], recipes: ['Bolognese', 'Pie'] },
      { item: 'potato', amounts: [{ quantity: 5, unit: null }], recipes: ['Bolognese', 'Pie'] },
    ]);
  });

  it('leaves a plural alone when its singular is not on the list', () => {
    const recipes = [recipe('Crumble', 6, [{ item: 'apples', quantity: 6, unit: null }])];

    expect(
      buildShoppingList({ meals: [meal('crumble', 6)] }, recipes).map((line) => line.item),
    ).toEqual(['apples']);
  });
});
