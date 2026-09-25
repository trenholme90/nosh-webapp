import { describe, expect, it } from 'vitest';
import { formatIngredient, formatQuantity, parseQuantity } from './format.ts';

describe('formatQuantity', () => {
  it.each([
    [2, '2'],
    [0.5, '½'],
    [1.5, '1½'],
    [0.25, '¼'],
    [2.75, '2¾'],
    [1 / 3, '0.33'],
  ])('%s -> %s', (quantity, expected) => {
    expect(formatQuantity(quantity)).toBe(expected);
  });
});

describe('parseQuantity', () => {
  it.each([
    ['', null],
    ['  ', null],
    ['2', 2],
    ['0.5', 0.5],
    ['.5', 0.5],
    ['1/2', 0.5],
    ['1 1/2', 1.5],
  ])('%j -> %s', (text, expected) => {
    expect(parseQuantity(text)).toBe(expected);
  });

  it.each(['abc', '1/0', '-2', '2 eggs'])('%j is not a number', (text) => {
    expect(parseQuantity(text)).toBeNaN();
  });
});

describe('formatIngredient', () => {
  it('reads naturally for measured, counted and unquantified ingredients', () => {
    expect(formatIngredient({ item: 'mushrooms', quantity: 100, unit: 'g' })).toBe(
      '100 g mushrooms',
    );
    expect(formatIngredient({ item: 'pork sausages', quantity: 4, unit: null })).toBe(
      '4 pork sausages',
    );
    expect(formatIngredient({ item: 'salt', quantity: null, unit: null })).toBe('salt');
    expect(formatIngredient({ item: 'tomatoes', quantity: 2, unit: null, prep: 'halved' })).toBe(
      '2 tomatoes, halved',
    );
  });

  it('pluralises word units but not abbreviations', () => {
    expect(formatIngredient({ item: 'bread', quantity: 2, unit: 'slice' })).toBe('2 slices bread');
    expect(formatIngredient({ item: 'salt', quantity: 2, unit: 'pinch' })).toBe('2 pinches salt');
    expect(formatIngredient({ item: 'beans', quantity: 1, unit: 'tin' })).toBe('1 tin beans');
    expect(formatIngredient({ item: 'olive oil', quantity: 2, unit: 'tbsp' })).toBe(
      '2 tbsp olive oil',
    );
  });
});
