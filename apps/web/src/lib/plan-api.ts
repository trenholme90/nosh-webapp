import {
  isPlan,
  isPlannedMeal,
  type Day,
  type Plan,
  type PlannedMeal,
  type PlannedMealInput,
  type PlanSlot,
} from '@nosh/shared';
import { apiDelete, apiGet, apiPut } from './api.ts';

/** The weekly plan endpoints. */

export function fetchPlan(): Promise<Plan> {
  return apiGet('/plan', isPlan);
}

export function savePlannedMeal(
  day: Day,
  slot: PlanSlot,
  input: PlannedMealInput,
): Promise<PlannedMeal> {
  return apiPut(`/plan/${day}/${slot}`, input, isPlannedMeal);
}

export function removePlannedMeal(day: Day, slot: PlanSlot): Promise<void> {
  return apiDelete(`/plan/${day}/${slot}`);
}

export function clearPlan(): Promise<void> {
  return apiDelete('/plan');
}
