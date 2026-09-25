import {
  DIETARY_PREFERENCES,
  MEAL_TYPES,
  validateRecipeInput,
  type DietaryPreference,
  type MealType,
  type Recipe,
  type RecipeFieldErrors,
  type RecipeInput,
} from '@nosh/shared';
import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { LoadError } from '../components/LoadError.tsx';
import { ApiError } from '../lib/api.ts';
import { DIETARY_LABELS, MEAL_TYPE_LABELS, parseQuantity } from '../lib/format.ts';
import { createRecipe, fetchRecipe, updateRecipe } from '../lib/recipes-api.ts';
import { useDocumentTitle } from '../lib/use-document-title.ts';
import { useLoad } from '../lib/use-load.ts';
import { NotFoundPage } from './NotFoundPage.tsx';

/** `/recipes/new` and `/recipes/:id/edit` share one form. */
export function RecipeFormPage() {
  const { id } = useParams();
  return id ? <EditRecipe id={id} /> : <RecipeForm />;
}

function EditRecipe({ id }: { id: string }) {
  const recipe = useLoad(id, () => fetchRecipe(id));

  if (recipe.status === 'loading') return <p role="status">Loading recipe…</p>;
  if (recipe.status === 'error') {
    return recipe.error instanceof ApiError && recipe.error.status === 404 ? (
      <NotFoundPage message="We couldn’t find that recipe. It may have been deleted." />
    ) : (
      <LoadError />
    );
  }
  if (!recipe.data.isCustom) {
    return <NotFoundPage message="Starter recipes can’t be edited, but you can add your own." />;
  }
  return <RecipeForm existing={recipe.data} />;
}

// ---------------------------------------------------------------------------
// Form state: every input is held as the text typed, and only turned into a
// RecipeInput on submit, so half-typed amounts such as "1/" are not lost.

interface IngredientRow {
  key: number;
  item: string;
  quantity: string;
  unit: string;
  prep: string;
}

interface StepRow {
  key: number;
  text: string;
}

interface FormValues {
  name: string;
  cuisine: string;
  serves: string;
  mealType: MealType[];
  dietary: DietaryPreference[];
  ingredients: IngredientRow[];
  method: StepRow[];
}

/**
 * Stable React keys for rows, so removing one does not reshuffle the others' inputs.
 * A row the user has just added also takes focus, via its key, so keyboard users
 * can type straight into it.
 */
let nextRowKey = 0;
const rowKey = () => nextRowKey++;

const blankIngredient = (): IngredientRow => ({
  key: rowKey(),
  item: '',
  quantity: '',
  unit: '',
  prep: '',
});
const blankStep = (): StepRow => ({ key: rowKey(), text: '' });

function toFormValues(recipe?: Recipe): FormValues {
  if (!recipe) {
    return {
      name: '',
      cuisine: '',
      serves: '2',
      mealType: [],
      dietary: [],
      ingredients: [blankIngredient()],
      method: [blankStep()],
    };
  }
  return {
    name: recipe.name,
    cuisine: recipe.cuisine,
    serves: String(recipe.serves),
    mealType: recipe.mealType,
    dietary: recipe.dietary,
    ingredients: recipe.ingredients.map((ingredient) => ({
      key: rowKey(),
      item: ingredient.item,
      quantity: ingredient.quantity === null ? '' : String(ingredient.quantity),
      unit: ingredient.unit ?? '',
      prep: ingredient.prep ?? '',
    })),
    method: recipe.method.map((text) => ({ key: rowKey(), text })),
  };
}

function toRecipeInput(values: FormValues, tags: string[]): RecipeInput {
  return {
    name: values.name,
    cuisine: values.cuisine,
    serves: Number(values.serves),
    mealType: values.mealType,
    dietary: values.dietary,
    tags,
    ingredients: values.ingredients.map((row) => ({
      item: row.item,
      quantity: parseQuantity(row.quantity),
      unit: row.unit,
      prep: row.prep,
    })),
    method: values.method.map((row) => row.text),
  };
}

// ---------------------------------------------------------------------------

/** DOM id for the input an error path points at: `ingredients.2.item` -> `field-ingredients-2-item`. */
const fieldId = (path: string) => `field-${path.replace(/\./g, '-')}`;
const errorId = (path: string) => `${fieldId(path)}-error`;

/** Context for the error summary, where a message is read away from its row. */
function describePath(path: string): string {
  const [list, index] = path.split('.');
  if (index === undefined) return '';
  return list === 'ingredients'
    ? `Ingredient ${Number(index) + 1}: `
    : `Step ${Number(index) + 1}: `;
}

function RecipeForm({ existing }: { existing?: Recipe }) {
  const navigate = useNavigate();
  const [values, setValues] = useState(() => toFormValues(existing));
  const [errors, setErrors] = useState<RecipeFieldErrors>({});
  const [saveFailed, setSaveFailed] = useState(false);
  const [saving, setSaving] = useState(false);
  const [failedSubmits, setFailedSubmits] = useState(0);
  const [focusRowKey, setFocusRowKey] = useState<number>();
  const summaryRef = useRef<HTMLDivElement>(null);

  const title = existing ? `Edit ${existing.name}` : 'Add your own recipe';
  useDocumentTitle(title);

  // Move focus to the error summary after each failed submit, so keyboard and
  // screen-reader users land on the list of what to fix.
  useEffect(() => {
    if (failedSubmits > 0) summaryRef.current?.focus();
  }, [failedSubmits]);

  const update = <K extends keyof FormValues>(field: K, value: FormValues[K]) =>
    setValues((current) => ({ ...current, [field]: value }));

  function updateIngredient(key: number, field: keyof Omit<IngredientRow, 'key'>, value: string) {
    update(
      'ingredients',
      values.ingredients.map((row) => (row.key === key ? { ...row, [field]: value } : row)),
    );
  }

  function addIngredient() {
    const row = blankIngredient();
    update('ingredients', [...values.ingredients, row]);
    setFocusRowKey(row.key);
  }

  function addStep() {
    const row = blankStep();
    update('method', [...values.method, row]);
    setFocusRowKey(row.key);
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setSaveFailed(false);

    const result = validateRecipeInput(toRecipeInput(values, existing?.tags ?? []));
    if (!result.ok) {
      setErrors(result.errors);
      setFailedSubmits((count) => count + 1);
      return;
    }

    setErrors({});
    setSaving(true);
    try {
      const saved = existing
        ? await updateRecipe(existing.id, result.value)
        : await createRecipe(result.value);
      navigate(`/recipes/${saved.id}`);
    } catch (error) {
      setSaving(false);
      if (error instanceof ApiError && Object.keys(error.fields).length > 0) {
        setErrors(error.fields);
      } else {
        setSaveFailed(true);
      }
      setFailedSubmits((count) => count + 1);
    }
  }

  const errorEntries = Object.entries(errors);
  const fieldProps = (path: string) => ({
    id: fieldId(path),
    'aria-invalid': errors[path] ? true : undefined,
    'aria-describedby': errors[path] ? errorId(path) : undefined,
  });

  return (
    <>
      <p>
        <Link to={existing ? `/recipes/${existing.id}` : '/recipes'}>← Back</Link>
      </p>
      <h1>{title}</h1>

      {(errorEntries.length > 0 || saveFailed) && (
        <div
          className="error-summary"
          ref={summaryRef}
          tabIndex={-1}
          role="alert"
          aria-labelledby="error-summary-title"
        >
          <h2 id="error-summary-title">
            {saveFailed ? 'Sorry, we couldn’t save your recipe' : 'A few things need fixing'}
          </h2>
          {saveFailed ? (
            <p>Please check your connection and try again.</p>
          ) : (
            <ul>
              {errorEntries.map(([path, message]) => (
                <li key={path}>
                  <a
                    href={`#${fieldId(path)}`}
                    onClick={(event) => {
                      event.preventDefault();
                      document.getElementById(fieldId(path))?.focus();
                    }}
                  >
                    {describePath(path)}
                    {message}
                  </a>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      <form className="recipe-form" onSubmit={handleSubmit} noValidate>
        <Field label="Recipe name" path="name" error={errors['name']}>
          <input
            {...fieldProps('name')}
            type="text"
            autoComplete="off"
            value={values.name}
            onChange={(event) => update('name', event.target.value)}
          />
        </Field>

        <div className="form-row">
          <Field
            label="Cuisine"
            hint="For example, British or Italian"
            path="cuisine"
            error={errors['cuisine']}
          >
            <input
              {...fieldProps('cuisine')}
              type="text"
              autoComplete="off"
              value={values.cuisine}
              onChange={(event) => update('cuisine', event.target.value)}
            />
          </Field>

          <Field label="Serves" path="serves" error={errors['serves']}>
            <input
              {...fieldProps('serves')}
              className="input--short"
              type="number"
              inputMode="numeric"
              min={1}
              max={20}
              value={values.serves}
              onChange={(event) => update('serves', event.target.value)}
            />
          </Field>
        </div>

        <CheckboxGroup
          legend="Good for"
          path="mealType"
          options={MEAL_TYPES}
          labels={MEAL_TYPE_LABELS}
          selected={values.mealType}
          onChange={(selected) => update('mealType', selected)}
          error={errors['mealType']}
        />

        <CheckboxGroup
          legend="Suitable for"
          hint="Tick any that apply, so people with these diets can find it"
          path="dietary"
          options={DIETARY_PREFERENCES}
          labels={DIETARY_LABELS}
          selected={values.dietary}
          onChange={(selected) => update('dietary', selected)}
          error={errors['dietary']}
        />

        <fieldset className="form-group" id={fieldId('ingredients')} tabIndex={-1}>
          <legend>Ingredients</legend>
          <p className="field-hint">Leave the amount blank for things like “salt, to taste”.</p>
          <FieldError path="ingredients" error={errors['ingredients']} />

          <ol className="row-list">
            {values.ingredients.map((row, index) => {
              const path = `ingredients.${index}`;
              return (
                <li key={row.key} className="ingredient-row">
                  <Field
                    label="Amount"
                    labelSuffix={` for ingredient ${index + 1}`}
                    path={`${path}.quantity`}
                    error={errors[`${path}.quantity`]}
                    compact
                  >
                    <input
                      {...fieldProps(`${path}.quantity`)}
                      type="text"
                      inputMode="decimal"
                      autoComplete="off"
                      value={row.quantity}
                      onChange={(event) =>
                        updateIngredient(row.key, 'quantity', event.target.value)
                      }
                    />
                  </Field>
                  <Field
                    label="Unit"
                    labelSuffix={` for ingredient ${index + 1}`}
                    path={`${path}.unit`}
                    error={errors[`${path}.unit`]}
                    compact
                  >
                    <input
                      {...fieldProps(`${path}.unit`)}
                      type="text"
                      list="unit-suggestions"
                      autoComplete="off"
                      value={row.unit}
                      onChange={(event) => updateIngredient(row.key, 'unit', event.target.value)}
                    />
                  </Field>
                  <Field
                    label="Ingredient"
                    labelSuffix={` ${index + 1}`}
                    path={`${path}.item`}
                    error={errors[`${path}.item`]}
                    compact
                  >
                    <input
                      {...fieldProps(`${path}.item`)}
                      type="text"
                      autoComplete="off"
                      autoFocus={row.key === focusRowKey}
                      value={row.item}
                      onChange={(event) => updateIngredient(row.key, 'item', event.target.value)}
                    />
                  </Field>
                  <Field
                    label="Prep (optional)"
                    labelSuffix={` for ingredient ${index + 1}`}
                    path={`${path}.prep`}
                    error={errors[`${path}.prep`]}
                    compact
                  >
                    <input
                      {...fieldProps(`${path}.prep`)}
                      type="text"
                      autoComplete="off"
                      value={row.prep}
                      onChange={(event) => updateIngredient(row.key, 'prep', event.target.value)}
                    />
                  </Field>
                  {values.ingredients.length > 1 && (
                    <button
                      type="button"
                      className="button button--small"
                      aria-label={`Remove ingredient ${index + 1}`}
                      onClick={() =>
                        update(
                          'ingredients',
                          values.ingredients.filter((other) => other.key !== row.key),
                        )
                      }
                    >
                      Remove
                    </button>
                  )}
                </li>
              );
            })}
          </ol>
          <datalist id="unit-suggestions">
            {['g', 'kg', 'ml', 'l', 'tsp', 'tbsp', 'tin', 'clove', 'slice', 'handful', 'pinch'].map(
              (unit) => (
                <option key={unit} value={unit} />
              ),
            )}
          </datalist>
          <button type="button" className="button" onClick={addIngredient}>
            Add another ingredient
          </button>
        </fieldset>

        <fieldset className="form-group" id={fieldId('method')} tabIndex={-1}>
          <legend>Method</legend>
          <FieldError path="method" error={errors['method']} />

          <ol className="row-list">
            {values.method.map((row, index) => {
              const path = `method.${index}`;
              return (
                <li key={row.key} className="step-row">
                  <Field label={`Step ${index + 1}`} path={path} error={errors[path]}>
                    <textarea
                      {...fieldProps(path)}
                      rows={3}
                      autoFocus={row.key === focusRowKey}
                      value={row.text}
                      onChange={(event) =>
                        update(
                          'method',
                          values.method.map((other) =>
                            other.key === row.key ? { ...other, text: event.target.value } : other,
                          ),
                        )
                      }
                    />
                  </Field>
                  {values.method.length > 1 && (
                    <button
                      type="button"
                      className="button button--small"
                      aria-label={`Remove step ${index + 1}`}
                      onClick={() =>
                        update(
                          'method',
                          values.method.filter((other) => other.key !== row.key),
                        )
                      }
                    >
                      Remove
                    </button>
                  )}
                </li>
              );
            })}
          </ol>
          <button type="button" className="button" onClick={addStep}>
            Add another step
          </button>
        </fieldset>

        <div className="button-row">
          <button type="submit" className="button button--primary" disabled={saving}>
            {saving ? 'Saving…' : existing ? 'Save changes' : 'Save recipe'}
          </button>
          <Link to={existing ? `/recipes/${existing.id}` : '/recipes'} className="button">
            Cancel
          </Link>
        </div>
      </form>
    </>
  );
}

/**
 * A labelled input with its hint and error. `labelSuffix` is read by screen
 * readers but not shown: ingredient rows repeat the same visible labels, and
 * "Amount for ingredient 2" says which row an input belongs to.
 */
function Field({
  label,
  labelSuffix,
  hint,
  path,
  error,
  compact = false,
  children,
}: {
  label: string;
  labelSuffix?: string;
  hint?: string;
  path: string;
  error: string | undefined;
  compact?: boolean;
  children: ReactNode;
}) {
  return (
    <div className={`field${compact ? ' field--compact' : ''}`}>
      <label htmlFor={fieldId(path)}>
        {label}
        {labelSuffix && <span className="visually-hidden">{labelSuffix}</span>}
      </label>
      {hint && <p className="field-hint">{hint}</p>}
      <FieldError path={path} error={error} />
      {children}
    </div>
  );
}

function FieldError({ path, error }: { path: string; error: string | undefined }) {
  if (!error) return null;
  return (
    <p className="field-error" id={errorId(path)}>
      {error}
    </p>
  );
}

function CheckboxGroup<T extends string>({
  legend,
  hint,
  path,
  options,
  labels,
  selected,
  onChange,
  error,
}: {
  legend: string;
  hint?: string;
  path: string;
  options: readonly T[];
  labels: Record<T, string>;
  selected: T[];
  onChange: (selected: T[]) => void;
  error: string | undefined;
}) {
  return (
    <fieldset
      className="form-group"
      id={fieldId(path)}
      tabIndex={-1}
      aria-describedby={error ? errorId(path) : undefined}
    >
      <legend>{legend}</legend>
      {hint && <p className="field-hint">{hint}</p>}
      <FieldError path={path} error={error} />
      <div className="checkboxes">
        {options.map((option) => (
          <label key={option} className="checkbox">
            <input
              type="checkbox"
              checked={selected.includes(option)}
              onChange={(event) =>
                // Keep the canonical order whatever order boxes are ticked in.
                onChange(
                  options.filter((o) =>
                    o === option ? event.target.checked : selected.includes(o),
                  ),
                )
              }
            />
            {labels[option]}
          </label>
        ))}
      </div>
    </fieldset>
  );
}
