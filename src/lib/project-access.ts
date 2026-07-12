import type { PlanSummary, SubscriptionInfo } from '@/lib/api';

/** İkinci+ plan yalnızca ödenmiş abonelikle açılır (deneme dahil tek plan). */
export function needsPaidPlanForSecondProject(
  projects: PlanSummary[],
  subscription: SubscriptionInfo | null | undefined,
): boolean {
  const hasCompletedPlan = projects.some((project) => project.has_content);
  const isPaid = subscription?.status === 'active';
  return hasCompletedPlan && !isPaid;
}
