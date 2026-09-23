/**
 * Zincir ekranı kademe rozeti. Sunucu rütbesi (Çaylak / Bronz…) ayrı kalır;
 * bu bantlar yalnız gelişim alanı çubuğunun adıdır.
 *
 * 0–99 Başlangıç · 100–249 Gelişen · 250–499 Yetkin · 500–999 İstikrarlı · 1000+ Usta
 */

export type ScoreTierId =
  | 'foundation'
  | 'progressing'
  | 'proficient'
  | 'consistent'
  | 'master';

const BANDS: { id: ScoreTierId; min: number; next: number | null }[] = [
  { id: 'master', min: 1000, next: null },
  { id: 'consistent', min: 500, next: 1000 },
  { id: 'proficient', min: 250, next: 500 },
  { id: 'progressing', min: 100, next: 250 },
  { id: 'foundation', min: 0, next: 100 },
];

export function scoreTier(points: number): ScoreTierId {
  const safe = Math.max(0, Math.floor(points));
  for (const band of BANDS) {
    if (safe >= band.min) return band.id;
  }
  return 'foundation';
}

/** Çubuk, 1000 tavanına değil bulunduğu banda göre dolar. 60 puan ≈ %60 görünür. */
export function scoreTierProgress(points: number): number {
  const safe = Math.max(0, points);
  const id = scoreTier(safe);
  const band = BANDS.find((item) => item.id === id) ?? BANDS[BANDS.length - 1];
  if (band.next == null) return 1;
  const span = band.next - band.min;
  if (span <= 0) return 1;
  return Math.max(0, Math.min(1, (safe - band.min) / span));
}
