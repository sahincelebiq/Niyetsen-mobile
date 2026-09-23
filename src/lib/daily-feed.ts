/** Bugün boş kartının eylemi. Gün doluysa kart gizlenir. */

export type DailyEmptyMode = 'extend' | 'agent' | 'chat' | 'hidden';

export function dailyEmptyMode(input: {
  showSkeleton: boolean;
  totalCount: number;
  needsExtension: boolean;
  hasActivePlan: boolean;
}): DailyEmptyMode {
  if (input.showSkeleton || input.totalCount > 0) return 'hidden';
  if (input.needsExtension) return 'extend';
  if (input.hasActivePlan) return 'agent';
  return 'chat';
}

/** Ajan sohbeti aktif plana bağlanır; id yoksa görev veya etkinlik planına düşer. */
export function resolveAgentPlanId(input: {
  activePlanId?: string | null;
  taskPlanId?: string | null;
  eventPlanId?: string | null;
}): string | null {
  for (const value of [input.activePlanId, input.taskPlanId, input.eventPlanId]) {
    const id = (value ?? '').trim();
    if (id) return id;
  }
  return null;
}
