import type { Recipe } from '@nosh/shared';
import { Link, useLocation } from 'react-router';
import { LoadError } from '../components/LoadError.tsx';
import { RecipeMeta } from '../components/RecipeMeta.tsx';
import { fetchRecipes } from '../lib/recipes-api.ts';
import { useDocumentTitle } from '../lib/use-document-title.ts';
import { useLoad } from '../lib/use-load.ts';

/** Navigation state a page can hand the list, e.g. after deleting a recipe. */
export interface RecipeListState {
  deletedName?: string;
}

export function RecipeListPage() {
  useDocumentTitle('Recipes');
  const recipes = useLoad('all', fetchRecipes);
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

      {recipes.status === 'loading' && <p role="status">Loading recipes…</p>}
      {recipes.status === 'error' && <LoadError />}
      {recipes.status === 'ready' && <RecipeSections recipes={recipes.data} />}
    </>
  );
}

function RecipeSections({ recipes }: { recipes: Recipe[] }) {
  const custom = recipes.filter((recipe) => recipe.isCustom);
  const starter = recipes.filter((recipe) => !recipe.isCustom);

  return (
    <>
      {custom.length > 0 && <RecipeSection title="Your recipes" recipes={custom} />}
      <RecipeSection title="Starter recipes" recipes={starter} />
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
