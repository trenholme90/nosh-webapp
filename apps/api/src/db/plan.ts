import type { DatabaseSync } from 'node:sqlite';
import {
  DAYS,
  PLAN_SLOTS,
  type Day,
  type Plan,
  type PlannedMeal,
  type PlannedMealInput,
  type PlanSlot,
} from '@nosh/shared';

/** Reads and writes for the weekly plan. One row per filled slot. */

interface PlanRow {
  day: Day;
  slot: PlanSlot;
  recipe_id: string;
  servings: number;
}

/** Filled slots in week order. SQL would sort the day names alphabetically, so sort here. */
export function getPlan(db: DatabaseSync): Plan {
  const rows = db
    .prepare('SELECT day, slot, recipe_id, servings FROM plan_entries')
    .all() as unknown as PlanRow[];

  const meals = rows.map(toPlannedMeal);
  meals.sort(
    (a, b) =>
      DAYS.indexOf(a.day) - DAYS.indexOf(b.day) ||
      PLAN_SLOTS.indexOf(a.slot) - PLAN_SLOTS.indexOf(b.slot),
  );
  return { meals };
}

/** Fill a slot, replacing whatever was there. The caller checks the recipe exists. */
export function setPlannedMeal(
  db: DatabaseSync,
  day: Day,
  slot: PlanSlot,
  input: PlannedMealInput,
): PlannedMeal {
  db.prepare(
    `INSERT INTO plan_entries (day, slot, recipe_id, servings) VALUES (?, ?, ?, ?)
     ON CONFLICT (day, slot) DO UPDATE SET recipe_id = excluded.recipe_id, servings = excluded.servings`,
  ).run(day, slot, input.recipeId, input.servings);
  return { day, slot, ...input };
}

export function removePlannedMeal(db: DatabaseSync, day: Day, slot: PlanSlot): void {
  db.prepare('DELETE FROM plan_entries WHERE day = ? AND slot = ?').run(day, slot);
}

export function clearPlan(db: DatabaseSync): void {
  db.exec('DELETE FROM plan_entries');
}

function toPlannedMeal(row: PlanRow): PlannedMeal {
  return { day: row.day, slot: row.slot, recipeId: row.recipe_id, servings: row.servings };
}
