/**
 * RAPOR HATTI — hazır metrik okuyucu (saf; RN importu yok).
 *
 * İlke: rapor ekranı ham görev verisinden HESAP YAPMAZ. Sunucu `/me/recap`
 * içinde önceden toplanmış `dashboard`'u döndürür; bu modül onu
 *   - okur (sunucu > yerel anlık görüntü > eski backend geçişi > boş),
 *   - sunum için etiketler (saat penceresi, plan uyumu),
 *   - boş/eksik alanları güvenle yorumlar.
 * Yalnız kazanımlar sunulur; kaçırma/ceza alanları burada üretilmez.
 */
import type { Recap, RecapDashboard, StateResponse } from '@/lib/api';

export const HOURS_IN_DAY = 24;
export const PEAK_WINDOW_HOURS = 2;

/** Örüntü kartı için asgari veri eşiği: ilk hafta tamamlanmadan desen gösterilmez. */
export const PATTERN_MIN_DAYS = 7;

export type PlanAlignment = {
  total: number;
  scheduled: number;
  completed: number;
  /** 0-100, sunucu vermezse adım sayılarından oranlanır (basit bölme; ham veri değil). */
  scheduledRate: number;
  completedRate: number;
};

function ratio(part: number, whole: number): number {
  if (whole <= 0) return 0;
  return Math.max(0, Math.min(100, Math.round((part / whole) * 100)));
}

/** Plan adımlarından kaçı etkinliğe dönüştü, kaçı tamamlandı (04 `plan_adimi_id`). */
export function planAlignment(dashboard: Pick<RecapDashboard, 'plan_steps_total' | 'plan_steps_scheduled' | 'plan_steps_completed'>): PlanAlignment | null {
  const total = dashboard.plan_steps_total ?? 0;
  if (total <= 0) return null;
  const scheduled = Math.max(0, dashboard.plan_steps_scheduled ?? 0);
  const completed = Math.max(0, dashboard.plan_steps_completed ?? 0);
  return {
    total,
    scheduled,
    completed,
    scheduledRate: ratio(scheduled, total),
    completedRate: ratio(completed, total),
  };
}

export type PeakWindow = {
  startHour: number;
  /** Pencere sonu (dışlayıcı): 07–09 → startHour 7, endHour 9. */
  endHour: number;
  count: number;
  /** Bu pencerenin tüm tamamlamalara oranı (0-100). */
  share: number;
};

/**
 * Saat histogramında (24 kova) en yoğun ardışık pencere. Gece yarısını
 * sarmaz; toplam sıfırsa null (boş durum metni ekranda).
 */
export function peakHourWindow(
  hourDone: readonly number[] | undefined,
  windowHours: number = PEAK_WINDOW_HOURS,
): PeakWindow | null {
  if (!hourDone || hourDone.length !== HOURS_IN_DAY) return null;
  const total = hourDone.reduce((sum, value) => sum + Math.max(0, value), 0);
  if (total <= 0) return null;
  const size = Math.max(1, Math.min(windowHours, HOURS_IN_DAY));
  let best: PeakWindow | null = null;
  for (let start = 0; start + size <= HOURS_IN_DAY; start += 1) {
    let count = 0;
    for (let offset = 0; offset < size; offset += 1) count += Math.max(0, hourDone[start + offset]);
    if (!best || count > best.count) {
      best = { startHour: start, endHour: start + size, count, share: ratio(count, total) };
    }
  }
  return best;
}

export function formatHour(hour: number): string {
  return `${String(hour % HOURS_IN_DAY).padStart(2, '0')}:00`;
}

export function formatHourWindow(window: Pick<PeakWindow, 'startHour' | 'endHour'>): string {
  return `${formatHour(window.startHour)}–${formatHour(window.endHour)}`;
}

/** Örüntü kartı için yeterli veri var mı (saat/gün deseni veya sunucu içgörüsü)? */
export function hasPatternData(dashboard: RecapDashboard): boolean {
  const enoughDays = (dashboard.days_in ?? 0) >= PATTERN_MIN_DAYS || dashboard.completed_tasks >= PATTERN_MIN_DAYS;
  const hasHours = peakHourWindow(dashboard.hour_done) != null;
  const hasWeekdays = (dashboard.weekday_done ?? []).some((value) => value > 0);
  const hasInsights = (dashboard.insights ?? []).length > 0;
  return enoughDays && (hasHours || hasWeekdays || hasInsights);
}

export type CompletionRates = { daily: number | null; weekly: number | null; overall: number };

/** Oranlar sunucudan hazır gelir; yoksa null (istemci uydurmaz). */
export function completionRates(dashboard: RecapDashboard): CompletionRates {
  return {
    daily: typeof dashboard.daily_completion_rate === 'number' ? dashboard.daily_completion_rate : null,
    weekly: typeof dashboard.weekly_completion_rate === 'number' ? dashboard.weekly_completion_rate : null,
    overall: dashboard.completion_rate,
  };
}

export function periodPoints(dashboard: RecapDashboard): number | null {
  return typeof dashboard.period_points === 'number' ? dashboard.period_points : null;
}

export function emptyDashboard(categories: readonly string[]): RecapDashboard {
  const categoryCounts: Record<string, number> = {};
  for (const category of categories) categoryCounts[category] = 0;
  return {
    total_tasks: 0,
    completed_tasks: 0,
    proofed_tasks: 0,
    completion_rate: 0,
    category_counts: categoryCounts,
    points: {},
    total_points: 0,
    streak_len: 0,
    best_streak: 0,
    days_in: 1,
    plans_count: 1,
    weekly_completed: [0, 0, 0, 0, 0, 0, 0, 0],
    mirror_line: null,
  };
}

/**
 * Panel verisi çözümü — hesap yok, yalnız öncelik:
 *   1) sunucu `recap.dashboard` (önceden toplanmış),
 *   2) yerel anlık görüntü (son başarılı sunucu paneli),
 *   3) eski backend: recap + state alanlarının OLDUĞU GİBİ geçişi (oran türetilmez),
 *   4) null (yükleniyor / veri yok — ekran boş durumu gösterir).
 */
export function resolveDashboard(
  recap: Recap | null,
  snapshot: RecapDashboard | null,
  state: Pick<StateResponse, 'points' | 'streak_len' | 'best_streak'> | null,
  categories: readonly string[],
): RecapDashboard | null {
  if (recap?.dashboard) return recap.dashboard;
  if (snapshot) return snapshot;
  if (!recap && !state) return null;
  const base = emptyDashboard(categories);
  return {
    ...base,
    total_tasks: recap?.completed_tasks ?? 0,
    completed_tasks: recap?.completed_tasks ?? 0,
    points: state?.points ?? {},
    total_points: recap?.total_points ?? 0,
    streak_len: state?.streak_len ?? 0,
    best_streak: state?.best_streak ?? 0,
    days_in: recap?.days_in ?? 1,
  };
}

/** Rapor zincir kartındaki filiz için gün sayısı — başlık metninden regex ile DEĞİL. */
export function streakGlyphDays(dashboard: Pick<RecapDashboard, 'streak_len'> | null): number {
  return Math.max(0, dashboard?.streak_len ?? 0);
}
