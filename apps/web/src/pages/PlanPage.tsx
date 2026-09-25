import {
  DAYS,
  PLAN_SLOTS,
  validatePlannedMeal,
  type DietaryPreference,
  type FieldErrors,
  type PlannedMeal,
  type PlannedMealInput,
  type PlanSlotRef,
  type Recipe,
} from '@nosh/shared';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Link } from 'react-router';
import { errorId, FieldError, fieldId } from '../components/form-fields.tsx';
import { LoadError } from '../components/LoadError.tsx';
import { ApiError } from '../lib/api.ts';
import { suitsDiet } from '../lib/diet.ts';
import { DAY_LABELS, formatServings, MEAL_TYPE_LABELS } from '../lib/format.ts';
import { clearPlan, fetchPlan, removePlannedMeal, savePlannedMeal } from '../lib/plan-api.ts';
import { fetchPreferences } from '../lib/preferences-api.ts';
import { fetchRecipes } from '../lib/recipes-api.ts';
import { useDocumentTitle } from '../lib/use-document-title.ts';
import { useLoad } from '../lib/use-load.ts';

export function PlanPage() {
  useDocumentTitle('Your week');
  const plan = useLoad('plan', fetchPlan);
  const recipes = useLoad('recipes', fetchRecipes);
  const preferences = useLoad('preferences', fetchPreferences);

  const failed = plan.status === 'error' || recipes.status === 'error';
  const loading =
    plan.status === 'loading' || recipes.status === 'loading' || preferences.status === 'loading';

  return (
    <>
      <h1>Your week</h1>
      <p className="lede">
        Pick something for the meals you want to plan. There’s no need to fill every one.
      </p>

      {failed && <LoadError />}
      {!failed && loading && <p role="status">Loading your week…</p>}
      {plan.status === 'ready' &&
        recipes.status === 'ready' &&
        preferences.status !== 'loading' && (
          <WeekPlanner
            savedMeals={plan.data.meals}
            recipes={recipes.data}
            // The diet only narrows the picker, so the week still works without it.
            diet={preferences.status === 'ready' ? preferences.data.dietary : []}
            dietUnavailable={preferences.status === 'error'}
          />
        )}
    </>
  );
}

const slotKey = ({ day, slot }: PlanSlotRef) => `${day}-${slot}`;
const slotHeadingId = (at: PlanSlotRef) => `slot-${slotKey(at)}`;
const slotName = ({ day, slot }: PlanSlotRef) =>
  `${DAY_LABELS[day]} ${MEAL_TYPE_LABELS[slot].toLowerCase()}`;
const isIn = (meal: PlannedMeal, at: PlanSlotRef) => meal.day === at.day && meal.slot === at.slot;

/**
 * The seven days and their slots. Each change is sent and confirmed before the
 * week updates: these are one-off choices, so there is nothing to queue.
 */
function WeekPlanner({
  savedMeals,
  recipes,
  diet,
  dietUnavailable,
}: {
  savedMeals: PlannedMeal[];
  recipes: Recipe[];
  diet: DietaryPreference[];
  dietUnavailable: boolean;
}) {
  const [meals, setMeals] = useState(savedMeals);
  const [editing, setEditing] = useState<string>();
  const [busy, setBusy] = useState(false);
  const [confirmingClear, setConfirmingClear] = useState(false);
  const [announcement, setAnnouncement] = useState('');
  const [changeFailed, setChangeFailed] = useState(false);

  // Where focus goes once the week re-renders, so it never drops to the top of the page.
  const focusAfterRender = useRef<string>(undefined);
  useEffect(() => {
    if (!focusAfterRender.current) return;
    document.getElementById(focusAfterRender.current)?.focus();
    focusAfterRender.current = undefined;
  });

  const recipesById = new Map(recipes.map((recipe) => [recipe.id, recipe]));
  /** Say what changed, and put focus where the change happened. */
  function announceChange(message: string, focusId: string) {
    setAnnouncement(message);
    setChangeFailed(false);
    focusAfterRender.current = focusId;
  }

  // The whole week is locked while a save is out, so nothing can change under it.
  // A failure is rethrown for the editor to explain beside its fields.
  async function save(at: PlanSlotRef, input: PlannedMealInput) {
    setBusy(true);
    try {
      const saved = await savePlannedMeal(at, input);
      setMeals((current) => [...current.filter((meal) => !isIn(meal, at)), saved]);
      setEditing(undefined);
      const name = recipesById.get(saved.recipeId)?.name ?? 'That recipe';
      announceChange(`${name} is planned for ${slotName(at)}.`, slotHeadingId(at));
    } finally {
      setBusy(false);
    }
  }

  async function remove(at: PlanSlotRef) {
    setBusy(true);
    try {
      await removePlannedMeal(at);
      setMeals((current) => current.filter((meal) => !isIn(meal, at)));
      announceChange(`${slotName(at)} is empty again.`, slotHeadingId(at));
    } catch {
      setChangeFailed(true);
    } finally {
      setBusy(false);
    }
  }

  async function startNewWeek() {
    setBusy(true);
    try {
      await clearPlan();
      setMeals([]);
      setConfirmingClear(false);
      setEditing(undefined);
      announceChange('Your week is clear. Time to plan a new one.', 'plan-days');
    } catch {
      setChangeFailed(true);
    } finally {
      setBusy(false);
    }
  }

  const planned = meals.filter((meal) => recipesById.has(meal.recipeId));

  return (
    <>
      {dietUnavailable && (
        <p className="notice notice--warning">
          We couldn’t load your saved diet, so every recipe is on offer. Reload the page to try
          again.
        </p>
      )}
      {changeFailed && (
        <p className="notice notice--warning" role="alert">
          Sorry, we couldn’t change your week. Please try again.
        </p>
      )}
      <p role="status" className="plan__status">
        {announcement}
      </p>

      {planned.length > 0 &&
        (confirmingClear ? (
          <div className="confirm" role="group" aria-labelledby="confirm-clear">
            <p id="confirm-clear">Clear every meal from your week?</p>
            <div className="button-row">
              <button
                type="button"
                className="button button--danger"
                onClick={startNewWeek}
                disabled={busy}
              >
                {busy ? 'Clearing…' : 'Yes, clear it'}
              </button>
              <button
                type="button"
                className="button"
                onClick={() => setConfirmingClear(false)}
                disabled={busy}
              >
                Keep my week
              </button>
            </div>
          </div>
        ) : (
          <div className="page-actions">
            <button
              type="button"
              className="button"
              onClick={() => setConfirmingClear(true)}
              disabled={busy}
            >
              Start a new week
            </button>
          </div>
        ))}

      <div className="plan" id="plan-days" tabIndex={-1}>
        {DAYS.map((day) => (
          <section key={day} className="plan-day" aria-labelledby={`day-${day}`}>
            <h2 id={`day-${day}`}>{DAY_LABELS[day]}</h2>
            <div className="plan-day__slots">
              {PLAN_SLOTS.map((slot) => {
                const at = { day, slot };
                const meal = meals.find((candidate) => isIn(candidate, at));
                const recipe = meal && recipesById.get(meal.recipeId);
                const key = slotKey(at);

                return (
                  <div key={slot} className="plan-slot">
                    <h3 id={slotHeadingId(at)} tabIndex={-1}>
                      {MEAL_TYPE_LABELS[slot]}
                    </h3>
                    {editing === key ? (
                      <SlotEditor
                        at={at}
                        current={recipe && meal}
                        recipes={recipes}
                        diet={diet}
                        onSave={(input) => save(at, input)}
                        onCancel={() => {
                          setEditing(undefined);
                          focusAfterRender.current = slotHeadingId(at);
                        }}
                      />
                    ) : recipe && meal ? (
                      <>
                        <p className="plan-slot__recipe">
                          <Link to={`/recipes/${recipe.id}`}>{recipe.name}</Link>
                        </p>
                        <p>{formatServings(meal.servings)}</p>
                        <div className="button-row">
                          <button
                            type="button"
                            className="button button--small"
                            onClick={() => setEditing(key)}
                            disabled={busy}
                          >
                            Change <span className="visually-hidden">{slotName(at)}</span>
                          </button>
                          <button
                            type="button"
                            className="button button--small"
                            onClick={() => remove(at)}
                            disabled={busy}
                          >
                            Remove <span className="visually-hidden">{slotName(at)}</span>
                          </button>
                        </div>
                      </>
                    ) : (
                      <button
                        type="button"
                        className="button button--small"
                        onClick={() => setEditing(key)}
                        disabled={busy}
                      >
                        Add {MEAL_TYPE_LABELS[slot].toLowerCase()}{' '}
                        <span className="visually-hidden">on {DAY_LABELS[day]}</span>
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        ))}
      </div>
    </>
  );
}

/**
 * Pick a recipe and how many it is for. Recipes that suit the saved diet are
 * offered, those made for this meal first; servings follow the recipe until edited.
 */
function SlotEditor({
  at,
  current,
  recipes,
  diet,
  onSave,
  onCancel,
}: {
  at: PlanSlotRef;
  current: PlannedMeal | undefined;
  recipes: Recipe[];
  diet: DietaryPreference[];
  onSave: (input: PlannedMealInput) => Promise<void>;
  onCancel: () => void;
}) {
  const [recipeId, setRecipeId] = useState(current?.recipeId ?? '');
  const [servings, setServings] = useState(current ? String(current.servings) : '');
  // Picking a different recipe resets servings to what it serves, until the person
  // types their own number in this editor - even when changing a planned meal.
  const [servingsEdited, setServingsEdited] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [saving, setSaving] = useState(false);
  const [saveFailed, setSaveFailed] = useState(false);

  const select = useRef<HTMLSelectElement>(null);
  useEffect(() => {
    select.current?.focus();
  }, []);

  // Keep the current choice on offer even if the diet has changed since it was planned.
  const offered = recipes.filter(
    (recipe) => suitsDiet(recipe, diet) || recipe.id === current?.recipeId,
  );
  const madeForSlot = offered.filter((recipe) => recipe.mealType.includes(at.slot));
  const others = offered.filter((recipe) => !recipe.mealType.includes(at.slot));

  function chooseRecipe(id: string) {
    setRecipeId(id);
    const recipe = recipes.find((candidate) => candidate.id === id);
    if (recipe && !servingsEdited) setServings(String(recipe.serves));
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const result = validatePlannedMeal({
      recipeId,
      servings: servings.trim() === '' ? undefined : Number(servings),
    });
    if (!result.ok) {
      setErrors(result.errors);
      return;
    }

    setSaving(true);
    setErrors({});
    setSaveFailed(false);
    try {
      await onSave(result.value);
    } catch (error) {
      setSaving(false);
      if (error instanceof ApiError && Object.keys(error.fields).length > 0) {
        setErrors(error.fields);
      } else {
        setSaveFailed(true);
      }
    }
  }

  const fieldAttributes = (path: string) => ({
    id: fieldId(path),
    'aria-invalid': errors[path] ? true : undefined,
    'aria-describedby': errors[path] ? errorId(path) : undefined,
  });

  return (
    <form className="slot-editor" onSubmit={handleSubmit} noValidate>
      <div className="field">
        <label htmlFor={fieldId('recipeId')}>
          Recipe <span className="visually-hidden">for {slotName(at)}</span>
        </label>
        <FieldError path="recipeId" error={errors['recipeId']} />
        <select
          ref={select}
          {...fieldAttributes('recipeId')}
          value={recipeId}
          onChange={(event) => chooseRecipe(event.target.value)}
        >
          <option value="">Choose a recipe</option>
          {madeForSlot.length > 0 && (
            <optgroup label={`Good for ${MEAL_TYPE_LABELS[at.slot].toLowerCase()}`}>
              {madeForSlot.map((recipe) => (
                <option key={recipe.id} value={recipe.id}>
                  {recipe.name}
                </option>
              ))}
            </optgroup>
          )}
          {others.length > 0 && (
            <optgroup label="Other recipes">
              {others.map((recipe) => (
                <option key={recipe.id} value={recipe.id}>
                  {recipe.name}
                </option>
              ))}
            </optgroup>
          )}
        </select>
      </div>

      <div className="field">
        <label htmlFor={fieldId('servings')}>How many people?</label>
        <FieldError path="servings" error={errors['servings']} />
        <input
          {...fieldAttributes('servings')}
          className="input--short"
          type="number"
          inputMode="numeric"
          min={1}
          max={20}
          value={servings}
          onChange={(event) => {
            setServings(event.target.value);
            setServingsEdited(true);
          }}
        />
      </div>

      {saveFailed && (
        <p className="field-error" role="alert">
          Sorry, we couldn’t save that. Please try again.
        </p>
      )}
      <div className="button-row">
        <button type="submit" className="button button--primary" disabled={saving}>
          {saving ? 'Saving…' : 'Save'}
        </button>
        <button type="button" className="button" onClick={onCancel} disabled={saving}>
          Cancel
        </button>
      </div>
    </form>
  );
}
