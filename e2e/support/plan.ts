import { expect, type APIRequestContext } from '@playwright/test';
import type { PlannedMealInput, PlanSlotRef } from '@nosh/shared';

/**
 * Helpers for tests that need a week planned. The week is global on the shared
 * API, so only specs in a serial project may use them.
 */

export async function clearWeek(request: APIRequestContext): Promise<void> {
  await request.delete('/api/plan');
}

export async function planMeal(
  request: APIRequestContext,
  { day, slot }: PlanSlotRef,
  meal: PlannedMealInput,
): Promise<void> {
  const response = await request.put(`/api/plan/${day}/${slot}`, { data: meal });
  expect(response.status(), await response.text()).toBe(200);
}
