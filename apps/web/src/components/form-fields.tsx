/**
 * Form pieces shared by the recipe form and the diet panel on the recipe list.
 */

/** DOM id for the input an error path points at: `ingredients.2.item` -> `field-ingredients-2-item`. */
export const fieldId = (path: string) => `field-${path.replace(/\./g, '-')}`;
export const errorId = (path: string) => `${fieldId(path)}-error`;
const hintId = (path: string) => `${fieldId(path)}-hint`;

export function FieldError({ path, error }: { path: string; error: string | undefined }) {
  if (!error) return null;
  return (
    <p className="field-error" id={errorId(path)}>
      {error}
    </p>
  );
}

/** A fieldset of checkboxes over a closed list of options, e.g. meal types or diets. */
export function CheckboxGroup<T extends string>({
  legend,
  hint,
  path,
  options,
  labels,
  selected,
  onChange,
  error,
  className = 'form-group',
  disabled = false,
}: {
  legend: string;
  hint?: string;
  path: string;
  options: readonly T[];
  labels: Record<T, string>;
  selected: T[];
  onChange: (selected: T[]) => void;
  error?: string;
  className?: string;
  disabled?: boolean;
}) {
  const describedBy = [hint ? hintId(path) : '', error ? errorId(path) : '']
    .filter(Boolean)
    .join(' ');

  return (
    <fieldset
      className={className}
      id={fieldId(path)}
      tabIndex={-1}
      aria-describedby={describedBy || undefined}
      disabled={disabled}
    >
      <legend>{legend}</legend>
      {hint && (
        <p className="field-hint" id={hintId(path)}>
          {hint}
        </p>
      )}
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
