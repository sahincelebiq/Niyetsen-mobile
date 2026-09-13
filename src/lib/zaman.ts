/**
 * ZAMAN SÖZLEŞMESİ (tek kaynak) — 03-Bugün görevi, madde B.
 *
 * - Depolama: backend her zaman UTC ISO-8601 / YYYY-MM-DD saklar.
 * - Hesaplama + gösterim: her zaman CİHAZIN YEREL saat dilimi
 *   (ürün varsayılanı Europe/Istanbul; cihaz başka bölgedeyse ona uyulur).
 * - "Bugün" = yerel 00:00 → 23:59:59.999.
 * - Ekranlarda çıplak `new Date()` aritmetiği YASAK — buradaki yardımcılar
 *   kullanılır. (plan-dates.ts bu modüle taşındı; eski içe aktarımlar
 *   plan-dates.ts üzerinden çalışmaya devam eder.)
 */

/** Date → yerel takvim günü `YYYY-MM-DD`. */
export function formatIsoDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** Şu anın yerel günü — "bugün" tanımının tek başlangıcı. */
export function bugunIso(): string {
  return formatIsoDate(new Date());
}

/** Öğlen çapasıyla parse: DST kenarında gün kaymasını engeller. */
export function parseIsoDate(iso: string): Date {
  return new Date(`${iso}T12:00:00`);
}

export function addDaysIso(startIso: string, days: number): string {
  const date = parseIsoDate(startIso);
  date.setDate(date.getDate() + days);
  return formatIsoDate(date);
}

/** Görevin takvim günü: açık `date` alanı öncelikli, yoksa plan başlangıcı + gün no. */
export function resolveTaskDate(
  task: { date: string | null; day: number },
  planStartDate?: string | null,
): string | null {
  if (task.date) return task.date;
  if (planStartDate) return addDaysIso(planStartDate, task.day - 1);
  return null;
}

export function isPastIso(iso: string, today = bugunIso()): boolean {
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

/** Yerel gün başlangıcı (00:00:00.000). */
export function gunBaslangic(iso = bugunIso()): Date {
  const date = parseIsoDate(iso);
  date.setHours(0, 0, 0, 0);
  return date;
}

/** Yerel gün sonu (23:59:59.999). */
export function gunBitis(iso = bugunIso()): Date {
  const date = parseIsoDate(iso);
  date.setHours(23, 59, 59, 999);
  return date;
}

/** Gece yarısına kalan ms — rollover zamanlayıcısı için (DST güvenli). */
export function geceYarisinaKalanMs(now = new Date()): number {
  const next = new Date(now);
  next.setDate(now.getDate() + 1);
  next.setHours(0, 0, 0, 0);
  return Math.max(1_000, next.getTime() - now.getTime());
}

/** Şu an, yerel gece yarısından itibaren dakika (0–1439). */
export function simdiDakika(now = new Date()): number {
  return now.getHours() * 60 + now.getMinutes();
}

/** "HH:MM" → gece yarısından itibaren dakika. Bozuk girişte null. */
export function hhmmToMinutes(hhmm: string): number | null {
  const match = /^(\d{1,2}):(\d{2})/.exec(hhmm.trim());
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours > 23 || minutes > 59) return null;
  return hours * 60 + minutes;
}

/** Dakika → "HH:MM" (şu-an çizgisi etiketi). */
export function dakikaToHhmm(total: number): string {
  const clamped = Math.max(0, Math.min(1439, Math.round(total)));
  const h = String(Math.floor(clamped / 60)).padStart(2, '0');
  const m = String(clamped % 60).padStart(2, '0');
  return `${h}:${m}`;
}

export type GununBolumu = 'sabah' | 'ogle' | 'aksam';

/** Zaman şeridi blokları: Sabah 00–12 · Öğle 12–17 · Akşam 17–24. */
export function gununBolumu(dakika: number): GununBolumu {
  if (dakika < 12 * 60) return 'sabah';
  if (dakika < 17 * 60) return 'ogle';
  return 'aksam';
}

/** Cihazın IANA saat dilimi (örn. Europe/Istanbul); çözülemezse UTC. */
export function cihazZamanDilimi(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  } catch {
    return 'UTC';
  }
}
