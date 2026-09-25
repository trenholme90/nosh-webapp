import { DIETARY_PREFERENCES, type DietaryPreference, type Recipe } from '@nosh/shared';
import { useState } from 'react';
import { Link, useLocation } from 'react-router';
import { CheckboxGroup } from '../components/form-fields.tsx';
import { LoadError } from '../components/LoadError.tsx';
import { RecipeMeta } from '../components/RecipeMeta.tsx';
import { suitsDiet } from '../lib/diet.ts';
import { DIETARY_LABELS } from '../lib/format.ts';
import { fetchPreferences } from '../lib/preferences-api.ts';
import { fetchRecipes } from '../lib/recipes-api.ts';
import { useDocumentTitle } from '../lib/use-document-title.ts';
import { useLoad } from '../lib/use-load.ts';
import { useSavedDiet } from '../lib/use-saved-diet.ts';

/** Navigation state a page can hand the list, e.g. after deleting a recipe. */
export interface RecipeListState {
  deletedName?: string;
}

export function RecipeListPage() {
  useDocumentTitle('Recipes');
  const recipes = useLoad('recipes', fetchRecipes);
  const preferences = useLoad('preferences', fetchPreferences);
  const { deletedName } = (useLocation().state ?? {}) as RecipeListState;

  return (
    <>
      <div className="page-heading">
        <h1>Recipes</h1>
        <Link to="/recipes/new" className="button button--primary">
          Add your own recipe
        </Link>
      </div>
      <p className="lede">
        Pick something tasty for the week, or add a family favourite of your own.
      </p>

      {deletedName && (
        <p className="notice notice--success" role="status">
          “{deletedName}” has been deleted.
        </p>
      )}

      {recipes.status === 'error' && <LoadError />}
      {recipes.status !== 'error' &&
        (recipes.status === 'loading' || preferences.status === 'loading') && (
          <p role="status">Loading recipes…</p>
        )}
      {recipes.status === 'ready' && preferences.status !== 'loading' && (
        // Recipes are still worth showing if the diet did not load: unfiltered, with a note.
        <RecipeBrowser
          recipes={recipes.data}
          savedDiet={preferences.status === 'ready' ? preferences.data.dietary : []}
          dietUnavailable={preferences.status === 'error'}
        />
      )}
    </>
  );
}

/**
 * The diet panel and the recipes it lets through. Ticking a box filters at once;
 * `useSavedDiet` saves it in the background.
 */
function RecipeBrowser({
  recipes,
  savedDiet,
  dietUnavailable,
}: {
  recipes: Recipe[];
  savedDiet: DietaryPreference[];
  dietUnavailable: boolean;
}) {
  const { diet, changeDiet, saveFailed } = useSavedDiet(savedDiet);
  const [showAll, setShowAll] = useState(false);

  const suitable = recipes.filter((recipe) => suitsDiet(recipe, diet));
  const hiddenCount = recipes.length - suitable.length;
  const visible = showAll ? recipes : suitable;

  return (
    <>
      <CheckboxGroup
        className="diet-panel"
        legend="Your diet"
        hint="We’ll only show recipes that suit all of these."
        path="diet"
        options={DIETARY_PREFERENCES}
        labels={DIETARY_LABELS}
        selected={diet}
        onChange={(next) => {
          // A new choice starts filtered again, so its effect is visible.
          setShowAll(false);
          changeDiet(next);
        }}
        // Saving over a diet we never loaded would wipe whatever was stored.
        disabled={dietUnavailable}
      />
      {dietUnavailable && (
        <p className="notice notice--warning" role="status">
          We couldn’t load your saved diet, so every recipe is showing. Reload the page to try
          again.
        </p>
      )}
      {saveFailed && (
        <p className="notice notice--warning" role="alert">
          Sorry, we couldn’t save that change. Please try again.
        </p>
      )}

      {diet.length > 0 && (
        <div className="filter-summary">
          <p role="status">
            {hiddenCount === 0
              ? `All ${recipes.length} recipes suit you.`
              : showAll
                ? `Showing all ${recipes.length} recipes, including ${hiddenCount} that don’t suit you.`
                : `Showing ${suitable.length} of ${recipes.length} recipes that suit you.`}
          </p>
          {hiddenCount > 0 && (
            <button
              type="button"
              className="button button--small"
              onClick={() => setShowAll(!showAll)}
            >
              {showAll ? 'Only show recipes that suit me' : 'Show all'}
            </button>
          )}
        </div>
      )}

      {visible.length === 0 && diet.length > 0 ? (
        <p className="notice">
          None of our recipes suit all of those just yet. Try unticking one, or{' '}
          <Link to="/recipes/new">add a recipe of your own</Link>.
        </p>
      ) : (
        <RecipeSections recipes={visible} />
      )}
    </>
  );
}

function RecipeSections({ recipes }: { recipes: Recipe[] }) {
  const custom = recipes.filter((recipe) => recipe.isCustom);
  const starter = recipes.filter((recipe) => !recipe.isCustom);

  return (
    <>
      {custom.length > 0 && <RecipeSection title="Your recipes" recipes={custom} />}
      {starter.length > 0 && <RecipeSection title="Starter recipes" recipes={starter} />}
    </>
  );
}

function RecipeSection({ title, recipes }: { title: string; recipes: Recipe[] }) {
  const headingId = `section-${title.toLowerCase().replace(/\s+/g, '-')}`;

  return (
    <section className="recipe-section" aria-labelledby={headingId}>
      <h2 id={headingId}>
        {title} <span className="count">({recipes.length})</span>
      </h2>
      <ul className="recipe-grid">
        {recipes.map((recipe) => (
          <li key={recipe.id} className="recipe-card">
            <h3 className="recipe-card__title">
              <Link to={`/recipes/${recipe.id}`}>{recipe.name}</Link>
            </h3>
            <RecipeMeta recipe={recipe} />
          </li>
        ))}
      </ul>
    </section>
  );
}
