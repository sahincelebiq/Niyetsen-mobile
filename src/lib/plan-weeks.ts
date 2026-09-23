/** Planım hafta şeridi. Gün numaraları takvimden gelir, yalnız üretilmiş 1–7’den değil. */

export const PLAN_HORIZON_DAYS = 365;
export const WEEK_LENGTH = 7;
/** Aktif hafta + geriye en fazla bu kadar hafta (prompt: geçmiş 10 hafta). */
export const PAST_WEEK_WINDOW = 10;

export type PlanWeek = {
  week: number;
  startDay: number;
  endDay: number;
};

export function weekIndex(day: number): number {
  const safe = Math.max(1, Math.floor(day));
  return Math.floor((safe - 1) / WEEK_LENGTH) + 1;
}

/** Seçili haftanın gün aralığı. Ufuk dışındaysa null. */
export function weekBounds(week: number, horizonDays: number): PlanWeek | null {
  const horizon = Math.max(1, Math.floor(horizonDays));
  const safeWeek = Math.max(1, Math.floor(week));
  const startDay = (safeWeek - 1) * WEEK_LENGTH + 1;
  if (startDay > horizon) return null;
  return {
    week: safeWeek,
    startDay,
    endDay: Math.min(safeWeek * WEEK_LENGTH, horizon),
  };
}

/**
 * Şeridin göstereceği ufuk: kayıtlı süre ile “bugünün haftasının sonu”nun büyüğü, tavan 365.
 * Süre 7 ve takvim 73 ise şerit 71–77’yi gösterir; 1–7’de kilitlenmez.
 */
export function planHorizon(durationDays: number, todayDay: number): number {
  const stored = Math.min(PLAN_HORIZON_DAYS, Math.max(1, Math.floor(durationDays)));
  const livedWeekEnd = weekIndex(todayDay) * WEEK_LENGTH;
  return Math.min(PLAN_HORIZON_DAYS, Math.max(stored, livedWeekEnd));
}

/** Başlıktaki payda. Süre dolmuşsa hedef 365; ilk haftadaysa kayıtlı süre. */
export function progressTotal(durationDays: number, todayDay: number): number {
  const stored = Math.max(1, Math.floor(durationDays));
  if (todayDay > stored && stored < PLAN_HORIZON_DAYS) return PLAN_HORIZON_DAYS;
  return Math.min(stored, PLAN_HORIZON_DAYS);
}

export function daysInWeek(week: PlanWeek): number[] {
  const days: number[] = [];
  for (let day = week.startDay; day <= week.endDay; day += 1) days.push(day);
  return days;
}

/** Aktif haftadan geriye `pastLimit` hafta, ufuk izin verirse bir sonraki hafta. */
export function visibleWeeks(args: {
  horizonDays: number;
  todayDay: number;
  pastLimit?: number;
}): PlanWeek[] {
  const pastLimit = args.pastLimit ?? PAST_WEEK_WINDOW;
  const horizon = Math.max(1, args.horizonDays);
  const today = Math.min(Math.max(1, args.todayDay), horizon);
  const current = weekIndex(today);
  const lastWeek = weekIndex(horizon);
  const from = Math.max(1, current - (pastLimit - 1));
  const to = Math.min(lastWeek, current + 1);
  const weeks: PlanWeek[] = [];
  for (let week = from; week <= to; week += 1) {
    const bounds = weekBounds(week, horizon);
    if (bounds) weeks.push(bounds);
  }
  return weeks;
}

/**
 * Süre bitmiş, seçilen hafta bugünü (veya sonrasını) kapsıyor.
 * PRO olmadan bu haftanın kartları üretilmez; geçmiş atlanmış haftalar buraya girmez.
 */
export function weekNeedsHorizonUnlock(
  week: PlanWeek,
  durationDays: number,
  todayDay: number,
): boolean {
  return week.endDay > durationDays && week.endDay >= todayDay && todayDay > durationDays;
}

/** Üretilmemiş ve bugünden eski: backend geçmişi doldurmaz. */
export function weekWasSkipped(
  week: PlanWeek,
  generatedDays: readonly number[],
  todayDay: number,
): boolean {
  const hasDay = generatedDays.some((day) => day >= week.startDay && day <= week.endDay);
  return !hasDay && week.endDay < todayDay;
}
