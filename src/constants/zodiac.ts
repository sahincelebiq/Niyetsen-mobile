/**
 * FAZ 8 — Burç ikon haritası (iskelet, Claude Cowork 2026-07-28).
 * Kullanım: profil başlığında ismin yanında + mistik ekranlarda.
 * `profile.zodiac_sign` backend'den Türkçe gelir (profile_service.zodiac_for).
 *
 * Cursor için: profil ekranında ismin yanına <ThemedText>{getZodiacGlyph(
 * profile.zodiac_sign)}</ThemedText> yerleştir; astroloji ekranı başlığında da
 * kullanılabilir. Sembol yoksa boş string döner (kırılmaz).
 */

export const ZODIAC_GLYPHS: Record<string, string> = {
  'Koç': '♈',
  'Boğa': '♉',
  'İkizler': '♊',
  'Yengeç': '♋',
  'Aslan': '♌',
  'Başak': '♍',
  'Terazi': '♎',
  'Akrep': '♏',
  'Yay': '♐',
  'Oğlak': '♑',
  'Kova': '♒',
  'Balık': '♓',
} as const;

export function getZodiacGlyph(sign: string | null | undefined): string {
  if (!sign) return '';
  return ZODIAC_GLYPHS[sign] ?? '';
}

/** "Yengeç ♋" gibi birleşik etiket; burç yoksa boş döner. */
export function zodiacLabel(sign: string | null | undefined): string {
  const glyph = getZodiacGlyph(sign);
  return glyph && sign ? `${sign} ${glyph}` : '';
}
