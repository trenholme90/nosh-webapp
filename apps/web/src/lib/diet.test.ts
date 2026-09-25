import type { DietaryPreference, Recipe } from '@nosh/shared';
import { describe, expect, it } from 'vitest';
import { suitsDiet } from './diet.ts';

const recipeTagged = (...dietary: DietaryPreference[]): Recipe => ({
  id: 'r',
  name: 'R',
  cuisine: 'british',
  mealType: ['dinner'],
  dietary,
  tags: [],
  serves: 2,
  ingredients: [],
  method: [],
  isCustom: false,
});

describe('suitsDiet', () => {
  it('suits everyone when no preferences are set', () => {
    expect(suitsDiet(recipeTagged(), [])).toBe(true);
  });

  it('needs every chosen tag, not just one', () => {
    const veganOnly = recipeTagged('vegetarian', 'vegan');

    expect(suitsDiet(veganOnly, ['vegan'])).toBe(true);
    expect(suitsDiet(veganOnly, ['vegan', 'gluten-free'])).toBe(false);
    expect(suitsDiet(recipeTagged('vegan', 'gluten-free'), ['vegan', 'gluten-free'])).toBe(true);
  });

  it('never suits a preference the recipe does not carry', () => {
    expect(suitsDiet(recipeTagged(), ['dairy-free'])).toBe(false);
  });
});
