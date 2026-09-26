import { Link, Navigate, Route, Routes } from 'react-router';
import { MainNav } from './components/MainNav.tsx';
import { NotFoundPage } from './pages/NotFoundPage.tsx';
import { PlanPage } from './pages/PlanPage.tsx';
import { RecipeDetailPage } from './pages/RecipeDetailPage.tsx';
import { RecipeFormPage } from './pages/RecipeFormPage.tsx';
import { RecipeListPage } from './pages/RecipeListPage.tsx';
import { ShoppingListPage } from './pages/ShoppingListPage.tsx';
import './App.css';

/** Application shell: brand header, then whichever page the URL names. */
export function App() {
  return (
    <div className="app">
      <header className="app__header">
        <div className="app__header-inner">
          <Link to="/" className="brand">
            {/* The mark is decorative: the wordmark beside it carries the name. */}
            <img className="brand__mark" src="/brand/nosh-mark.svg" alt="" width="39" height="44" />
            <img
              className="brand__wordmark"
              src="/brand/nosh-wordmark.svg"
              alt="Nosh"
              width="91"
              height="24"
            />
          </Link>
          <MainNav />
        </div>
      </header>

      <main className="app__main">
        <Routes>
          <Route path="/" element={<Navigate to="/recipes" replace />} />
          <Route path="/recipes" element={<RecipeListPage />} />
          <Route path="/recipes/new" element={<RecipeFormPage />} />
          <Route path="/recipes/:id" element={<RecipeDetailPage />} />
          <Route path="/recipes/:id/edit" element={<RecipeFormPage />} />
          <Route path="/plan" element={<PlanPage />} />
          <Route path="/shopping-list" element={<ShoppingListPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </main>
    </div>
  );
}
