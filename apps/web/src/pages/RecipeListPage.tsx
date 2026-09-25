import { DIETARY_PREFERENCES, type DietaryPreference, type Recipe } from '@nosh/shared';
import { useRef, useState } from 'react';
import { Link, useLocation } from 'react-router';
import { CheckboxGroup } from '../components/form-fields.tsx';
import { LoadError } from '../components/LoadError.tsx';
import { RecipeMeta } from '../components/RecipeMeta.tsx';
import { suitsDiet } from '../lib/diet.ts';
import { DIETARY_LABELS } from '../lib/format.ts';
import { fetchPreferences, savePreferences } from '../lib/preferences-api.ts';
import { fetchRecipes } from '../lib/recipes-api.ts';
import { useDocumentTitle } from '../lib/use-document-title.ts';
import { useLoad } from '../lib/use-load.ts';

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
 * The diet panel and the recipes it lets through. Holds the chosen diet itself,
 * seeded from what was saved, so ticking a box filters instantly while the save
 * happens in the background.
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
  const [diet, setDiet] = useState(savedDiet);
  const [showAll, setShowAll] = useState(false);
  const [saveFailed, setSaveFailed] = useState(false);
  // Cleared by a successful save: the diet on screen is then the saved one.
  const [loadFailed, setLoadFailed] = useState(dietUnavailable);
  // What the API last confirmed, to fall back to if a save fails.
  const confirmedDiet = useRef(savedDiet);
  // Only the newest save may report back: an older one finishing late is stale.
  const latestSave = useRef(0);

  async function changeDiet(next: DietaryPreference[]) {
    setDiet(next);
    setSaveFailed(false);
    const save = ++latestSave.current;
    try {
      const saved = await savePreferences({ dietary: next });
      if (save !== latestSave.current) return;
      confirmedDiet.current = saved.dietary;
      setLoadFailed(false);
    } catch {
      if (save !== latestSave.current) return;
      setDiet(confirmedDiet.current);
      setSaveFailed(true);
    }
  }

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
        onChange={changeDiet}
      />
      {loadFailed && !saveFailed && (
        <p className="notice notice--warning">
          We couldn’t load your saved diet, so every recipe is showing.
        </p>
      )}
      {saveFailed && (
        <p className="notice notice--warning" role="alert">
          Sorry, we couldn’t save that change. Please try again.
        </p>
      )}

      {hiddenCount > 0 && (
        <div className="filter-summary">
          <p role="status">
            {showAll
              ? `Showing all ${recipes.length} recipes, including ${hiddenCount} that don’t suit you.`
              : `Showing ${suitable.length} of ${recipes.length} recipes that suit you.`}
          </p>
          <button
            type="button"
            className="button button--small"
            onClick={() => setShowAll(!showAll)}
          >
            {showAll ? 'Only show recipes that suit me' : 'Show all'}
          </button>
        </div>
      )}

      {visible.length === 0 ? (
        <p className="notice notice--success">
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
