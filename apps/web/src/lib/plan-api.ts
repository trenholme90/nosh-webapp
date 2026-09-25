import {
  isPlan,
  isPlannedMeal,
  type Plan,
  type PlannedMeal,
  type PlannedMealInput,
  type PlanSlotRef,
} from '@nosh/shared';
import { apiDelete, apiGet, apiPut } from './api.ts';

/** The weekly plan endpoints. */

export function fetchPlan(): Promise<Plan> {
  return apiGet('/plan', isPlan);
}

export function savePlannedMeal(
  { day, slot }: PlanSlotRef,
  input: PlannedMealInput,
): Promise<PlannedMeal> {
  return apiPut(`/plan/${day}/${slot}`, input, isPlannedMeal);
}

export function removePlannedMeal({ day, slot }: PlanSlotRef): Promise<void> {
  return apiDelete(`/plan/${day}/${slot}`);
}

export function clearPlan(): Promise<void> {
  return apiDelete('/plan');
}
