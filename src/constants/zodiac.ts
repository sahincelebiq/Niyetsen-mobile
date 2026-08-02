/**
 * FAZ 8 — Burç ikon haritası.
 * Kullanım: profil başlığında ismin yanında + mistik ekranlarda.
 * `profile.zodiac_sign` backend'den Türkçe gelir (profile_service.zodiac_for).
 * Client `zodiacFromBirthDate` backend ile birebir aynı sınırları kullanır.
 */

export const ZODIAC_GLYPHS: Record<string, string> = {
  Koç: '♈',
  Boğa: '♉',
  İkizler: '♊',
  Yengeç: '♋',
  Aslan: '♌',
  Başak: '♍',
  Terazi: '♎',
  Akrep: '♏',
  Yay: '♐',
  Oğlak: '♑',
  Kova: '♒',
  Balık: '♓',
} as const;

/** Backend `profile_service.zodiac_for` ile aynı (ay, gün) sınırları. */
const ZODIAC_BOUNDARIES: ReadonlyArray<readonly [number, number, string]> = [
  [1, 20, 'Kova'],
  [2, 19, 'Balık'],
  [3, 21, 'Koç'],
  [4, 20, 'Boğa'],
  [5, 21, 'İkizler'],
  [6, 22, 'Yengeç'],
  [7, 23, 'Aslan'],
  [8, 23, 'Başak'],
  [9, 23, 'Terazi'],
  [10, 23, 'Akrep'],
  [11, 22, 'Yay'],
  [12, 22, 'Oğlak'],
];

export function getZodiacGlyph(sign: string | null | undefined): string {
  if (!sign) return '';
  return ZODIAC_GLYPHS[sign] ?? '';
}

/** "Yengeç ♋" gibi birleşik etiket; burç yoksa boş döner. */
export function zodiacLabel(sign: string | null | undefined): string {
  const glyph = getZodiacGlyph(sign);
  return glyph && sign ? `${sign} ${glyph}` : '';
}

/**
 * ISO (YYYY-MM-DD) veya geçerli Date → burç adı.
 * Geçersiz / eksik tarihte null.
 */
export function zodiacFromBirthDate(
  isoOrDate: string | Date | null | undefined,
): string | null {
  if (!isoOrDate) return null;
  let month: number;
  let day: number;
  if (isoOrDate instanceof Date) {
    if (Number.isNaN(isoOrDate.getTime())) return null;
    month = isoOrDate.getMonth() + 1;
    day = isoOrDate.getDate();
  } else {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(isoOrDate.trim());
    if (!match) return null;
    month = Number(match[2]);
    day = Number(match[3]);
    if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  }
  let sign = 'Oğlak';
  for (const [bMonth, bDay, candidate] of ZODIAC_BOUNDARIES) {
    if (month > bMonth || (month === bMonth && day >= bDay)) {
      sign = candidate;
    }
  }
  return sign;
}
