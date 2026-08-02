/** Yerel takvim günü yardımcıları — plan taşıma/ekleme için YYYY-MM-DD. */

export function formatIsoDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function todayIsoLocal(): string {
  return formatIsoDate(new Date());
}

export function parseIsoDate(iso: string): Date {
  return new Date(`${iso}T12:00:00`);
}

export function addDaysIso(startIso: string, days: number): string {
  const date = parseIsoDate(startIso);
  date.setDate(date.getDate() + days);
  return formatIsoDate(date);
}

export function resolveTaskDate(
  task: { date: string | null; day: number },
  planStartDate?: string | null,
): string | null {
  if (task.date) return task.date;
  if (planStartDate) return addDaysIso(planStartDate, task.day - 1);
  return null;
}

export function isPastIso(iso: string, today = todayIsoLocal()): boolean {
  return iso < today;
}

export function formatTrDate(iso: string): string {
  const date = parseIsoDate(iso);
  return date.toLocaleDateString('tr-TR', {
    weekday: 'short',
    day: 'numeric',
    month: 'long',
  });
}
