import { isRecipe, isRecipeList, type Recipe, type RecipeInput } from '@nosh/shared';
import { apiDelete, apiGet, apiPost, apiPut } from './api.ts';

/** The recipe endpoints, so pages never build URLs or pick guards themselves. */

export function fetchRecipes(): Promise<Recipe[]> {
  return apiGet('/recipes', isRecipeList);
}

export function fetchRecipe(id: string): Promise<Recipe> {
  return apiGet(`/recipes/${encodeURIComponent(id)}`, isRecipe);
}

export function createRecipe(input: RecipeInput): Promise<Recipe> {
  return apiPost('/recipes', input, isRecipe);
}

export function updateRecipe(id: string, input: RecipeInput): Promise<Recipe> {
  return apiPut(`/recipes/${encodeURIComponent(id)}`, input, isRecipe);
}

export function deleteRecipe(id: string): Promise<void> {
  return apiDelete(`/recipes/${encodeURIComponent(id)}`);
}
