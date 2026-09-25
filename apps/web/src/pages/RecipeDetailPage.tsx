import type { Recipe } from '@nosh/shared';
import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { LoadError } from '../components/LoadError.tsx';
import { RecipeMeta } from '../components/RecipeMeta.tsx';
import { ApiError } from '../lib/api.ts';
import { formatIngredient } from '../lib/format.ts';
import { fetchPlan } from '../lib/plan-api.ts';
import { deleteRecipe, fetchRecipe } from '../lib/recipes-api.ts';
import { useDocumentTitle } from '../lib/use-document-title.ts';
import { useLoad } from '../lib/use-load.ts';
import { NotFoundPage } from './NotFoundPage.tsx';
import type { RecipeListState } from './RecipeListPage.tsx';

export function RecipeDetailPage() {
  const { id = '' } = useParams();
  const recipe = useLoad(id, () => fetchRecipe(id));

  useDocumentTitle(recipe.status === 'ready' ? recipe.data.name : 'Recipe');

  if (recipe.status === 'loading') return <p role="status">Loading recipe…</p>;
  if (recipe.status === 'error') {
    return recipe.error instanceof ApiError && recipe.error.status === 404 ? (
      <NotFoundPage message="We couldn’t find that recipe. It may have been deleted." />
    ) : (
      <LoadError />
    );
  }

  return <RecipeDetail recipe={recipe.data} />;
}

function RecipeDetail({ recipe }: { recipe: Recipe }) {
  return (
    <article className="recipe">
      <p>
        <Link to="/recipes">← All recipes</Link>
      </p>

      <h1>{recipe.name}</h1>
      <RecipeMeta recipe={recipe} />

      {recipe.isCustom ? (
        <CustomRecipeActions recipe={recipe} />
      ) : (
        <p className="recipe__source">A Nosh starter recipe.</p>
      )}

      <div className="recipe__body">
        <section aria-labelledby="ingredients-heading">
          <h2 id="ingredients-heading">Ingredients</h2>
          <ul className="ingredient-list">
            {recipe.ingredients.map((ingredient, index) => (
              <li key={index}>{formatIngredient(ingredient)}</li>
            ))}
          </ul>
        </section>

        <section aria-labelledby="method-heading">
          <h2 id="method-heading">Method</h2>
          <ol className="method-list">
            {recipe.method.map((step, index) => (
              <li key={index}>{step}</li>
            ))}
          </ol>
        </section>
      </div>
    </article>
  );
}

/**
 * Edit and delete for the user's own recipes. Delete asks inline rather than
 * through window.confirm, which is easy to dismiss by accident on a small phone.
 */
function CustomRecipeActions({ recipe }: { recipe: Recipe }) {
  const navigate = useNavigate();
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [failed, setFailed] = useState(false);
  // Only used to warn on delete. Delete waits until it has loaded, so the warning can't
  // be skipped by a quick tap; if it fails to load, the warning is simply left out.
  const plan = useLoad('plan', fetchPlan);
  const checkingPlan = plan.status === 'loading';
  const planned =
    plan.status === 'ready' && plan.data.meals.some((meal) => meal.recipeId === recipe.id);

  async function handleDelete() {
    setDeleting(true);
    setFailed(false);
    try {
      await deleteRecipe(recipe.id);
      const state: RecipeListState = { deletedName: recipe.name };
      navigate('/recipes', { state });
    } catch {
      setDeleting(false);
      setFailed(true);
    }
  }

  if (confirming) {
    return (
      <div
        className="confirm"
        role="group"
        aria-labelledby="confirm-delete"
        aria-describedby={planned ? 'confirm-delete-plan' : undefined}
      >
        <p id="confirm-delete">Delete “{recipe.name}”? This can’t be undone.</p>
        {planned && (
          <p id="confirm-delete-plan">It’s in your week, so it will come out of your plan too.</p>
        )}
        <div className="button-row">
          <button
            type="button"
            className="button button--danger"
            onClick={handleDelete}
            disabled={deleting || checkingPlan}
          >
            {deleting ? 'Deleting…' : 'Yes, delete it'}
          </button>
          <button
            type="button"
            className="button"
            onClick={() => setConfirming(false)}
            disabled={deleting}
          >
            Keep it
          </button>
        </div>
        {failed && (
          <p className="field-error" role="alert">
            Sorry, that didn’t work. Please try again.
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="button-row">
      <Link to={`/recipes/${recipe.id}/edit`} className="button">
        Edit
      </Link>
      <button type="button" className="button button--danger" onClick={() => setConfirming(true)}>
        Delete
      </button>
    </div>
  );
}
