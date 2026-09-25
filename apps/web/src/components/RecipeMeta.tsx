import type { Recipe } from '@nosh/shared';
import { capitalise, DIETARY_LABELS, MEAL_TYPE_LABELS } from '../lib/format.ts';

/** "Serves 4 · British · Lunch, Dinner", then a badge per dietary tag. Shared by the list and detail pages. */
export function RecipeMeta({ recipe }: { recipe: Recipe }) {
  const meals = recipe.mealType.map((meal) => MEAL_TYPE_LABELS[meal]).join(', ');

  return (
    <>
      <p className="recipe-meta">
        Serves {recipe.serves} · {capitalise(recipe.cuisine)} · {meals}
      </p>
      {recipe.dietary.length > 0 && (
        <ul className="badges" aria-label="Dietary">
          {recipe.dietary.map((diet) => (
            <li key={diet} className="badge">
              {DIETARY_LABELS[diet]}
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
