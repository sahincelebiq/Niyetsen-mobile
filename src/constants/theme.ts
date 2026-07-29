/**
 * Niyetsen tasarım dili v3 — "İLKBAHAR" (2026-07-29, yatırımcı geri bildirimi:
 * "uygulama bana ilkbaharı hissettirmeli, sonbaharı değil").
 * Kuru kil/sonbahar pastelinden → taze yaprak yeşili + çiçek mercanı +
 * güneşli krem. Token anahtarları DEĞİŞMEDİ; tüm ekranlar otomatik yenilenir.
 * Ekran turu planı: kök repo `docs/UI_V3_ILKBAHAR.md`.
 * `MysticColors` ikincil palet (fal/mistik ekranlar).
 */

import '@/global.css';

import { Platform } from 'react-native';

export const Colors = {
  // "İlkbahar sabahı": güneşli krem zemin, koyu yaprak metin (kontrast ↑),
  // taze yaprak yeşili birincil, çiçek mercanı enerji vurgusu.
  light: {
    text: '#1F2A1E',
    textSecondary: '#64735B',
    background: '#F6F7EE',
    backgroundElement: '#FEFEF8',
    backgroundSelected: '#DCEEDD',
    tint: '#35814A',
    accentWarm: '#E06842',
    border: '#DDE4CF',
    success: '#2F8A46',
    danger: '#C94F44',
    onAccent: '#FFFCF4',
    surfaceMuted: '#EFF2E2',
    categoryBadge: '#DBEFD9',
    categoryBadgeText: '#2F7A41',
    pointsBadge: '#FFE3D3',
    pointsBadgeText: '#C25A2E',
    tabInactive: '#93A088',
    progressTrack: '#E3E9D4',
  },
  // "İlkbahar gecesi": derin orman zemini, parlayan genç yaprak vurgusu.
  dark: {
    text: '#ECF4E6',
    textSecondary: '#A3B598',
    background: '#131A12',
    backgroundElement: '#1D271B',
    backgroundSelected: '#2A3A27',
    tint: '#7FD08B',
    accentWarm: '#E0764C',
    border: '#364634',
    success: '#8FD99B',
    danger: '#E9857A',
    onAccent: '#FFF7EC',
    surfaceMuted: '#232E20',
    categoryBadge: '#2E4229',
    categoryBadgeText: '#A8D8A0',
    pointsBadge: '#472E1E',
    pointsBadgeText: '#F0AF85',
    tabInactive: '#77876F',
    progressTrack: '#2A3A27',
  },
} as const;

/** V2 mistik/fal bölümleri için ikincil palet — şimdilik kullanılmıyor. */
export const MysticColors = {
  light: {
    text: '#2C2350',
    textSecondary: '#6C5F99',
    background: '#F3EFFB',
    backgroundElement: '#E4DBF6',
    backgroundSelected: '#CDBEEC',
    tint: '#6F58C0',
    accentWarm: '#4A7FE0',
    border: '#CDBEEC',
  },
  dark: {
    text: '#E7E1F8',
    textSecondary: '#AA9DD1',
    background: '#15102A',
    backgroundElement: '#221A3D',
    backgroundSelected: '#31264F',
    tint: '#A78FF0',
    accentWarm: '#85A8F5',
    border: '#31264F',
  },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

export const Fonts = {
  sans: 'Manrope_400Regular',
  sansMedium: 'Manrope_500Medium',
  sansSemiBold: 'Manrope_600SemiBold',
  sansBold: 'Manrope_700Bold',
  serif: 'Fraunces_600SemiBold',
  serifMedium: 'Fraunces_500Medium',
  serifItalic: 'Fraunces_500Medium_Italic',
  mono: Platform.select({ ios: 'ui-monospace', default: 'monospace' }) as string,
} as const;

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

export const Radii = {
  small: 10,
  medium: 16,
  large: 18,
  bubble: 19,
  pill: 999,
} as const;

export const Shadows = {
  soft: Platform.select({
    web: { boxShadow: '0 8px 22px rgba(47, 102, 50, 0.12)' },
    default: {
      shadowColor: '#2F6632',
      shadowOffset: { width: 0, height: 5 },
      shadowOpacity: 0.12,
      shadowRadius: 12,
      elevation: 3,
    },
  }),
  subtle: Platform.select({
    web: { boxShadow: '0 2px 8px rgba(42, 51, 36, 0.07)' },
    default: {
      shadowColor: '#2A3324',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.07,
      shadowRadius: 8,
      elevation: 1,
    },
  }),
  // v3: anahtar adı korunuyor (kırılma olmasın); artık "çiçek mercanı" gölgesi.
  clay: Platform.select({
    web: { boxShadow: '0 3px 10px rgba(224, 104, 66, 0.28)' },
    default: {
      shadowColor: '#E06842',
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.28,
      shadowRadius: 10,
      elevation: 4,
    },
  }),
  /**
   * UI cilası v2 (19 Tem): "kaldırılmış yüzey" — kartlar zeminden ayrılsın,
   * düz beyaz kart hissi gitsin. Web'de iki katmanlı gölge (yakın + uzak),
   * native'de daha geniş yayılım. Layout'a etkisi YOKTUR.
   */
  lifted: Platform.select({
    web: {
      boxShadow:
        '0 1px 2px rgba(42, 51, 36, 0.06), 0 10px 30px rgba(47, 102, 50, 0.10)',
    },
    default: {
      shadowColor: '#2E5A2F',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.14,
      shadowRadius: 20,
      elevation: 6,
    },
  }),
  /** Öne çıkan tek kart (bugünün görevi, kutlama kartı). */
  hero: Platform.select({
    web: {
      boxShadow:
        '0 2px 4px rgba(42, 51, 36, 0.08), 0 18px 44px rgba(47, 102, 50, 0.16)',
    },
    default: {
      shadowColor: '#2E5A2F',
      shadowOffset: { width: 0, height: 12 },
      shadowOpacity: 0.18,
      shadowRadius: 28,
      elevation: 9,
    },
  }),
} as const;

/**
 * Yüzey kenar ışığı: kartın üst kenarında 1px açık çizgi — ışık yukarıdan
 * geliyormuş hissi verir (premium algısının en ucuz kaynağı).
 */
export const SurfaceEdge = {
  light: 'rgba(255, 255, 255, 0.72)',
  dark: 'rgba(255, 255, 255, 0.06)',
} as const;

/** Görev kartı görseli üzerine metin okunurluğu için degrade örtü. */
export const ImageScrim = {
  light: ['rgba(20, 26, 16, 0)', 'rgba(20, 26, 16, 0.55)'] as const,
  dark: ['rgba(8, 12, 7, 0)', 'rgba(8, 12, 7, 0.68)'] as const,
} as const;

/** Mikro hareket süreleri — tek yerden, tutarlı ritim. */
export const Motion = {
  fast: 180,
  base: 260,
  slow: 420,
  stagger: 60, // liste öğeleri arası gecikme
} as const;

export const Texture = {
  backgroundOpacity: 0.08,
  cardBorderWidth: 1,
} as const;

/** Native tab bar + home indicator payı; içerik bunun üstünde biter. */
export const BottomTabInset = Platform.select({ ios: 78, android: 72, default: 68 }) ?? 68;
export const TabBarBackground = '#FEFEF8';
export const MaxContentWidth = 800;
export const ApiTimeoutMs = 20_000;
/**
 * Sohbet (Gemini 2.5 Flash): backend'de araç tespiti + JSON retry'ları 20 sn'yi
 * aşabiliyor. İstemci erken iptal edip "Sunucu yanıt vermedi" göstermesin diye
 * sohbet istekleri için ayrı ve daha geniş zaman aşımı kullanılır.
 */
export const ChatTimeoutMs = 75_000;
/** Plan üretimi (Gemini 2.5 Pro): backend GEMINI_PLAN_TIMEOUT_SEC=90 ile uyumlu. */
export const PlanTimeoutMs = 120_000;
/** Kanıt yükleme + Gemini Vision; backend GEMINI_PROOF_TIMEOUT_SEC ile uyumlu. */
export const ProofTimeoutMs = 90_000;
