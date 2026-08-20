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
  // "İlkbahar sabahı" — daha açık, profesyonel; neon oyuncak yeşili yok.
  light: {
    text: '#1C241C',
    textSecondary: '#5E6B58',
    background: '#F8F9F3',
    backgroundElement: '#FFFFFF',
    backgroundSelected: '#E4EFE4',
    tint: '#3D7A4E',
    accentWarm: '#D96A45',
    border: '#E2E8D8',
    success: '#3A8A4C',
    danger: '#C94F44',
    onAccent: '#FFFCF4',
    surfaceMuted: '#F1F3E8',
    categoryBadge: '#E2F0E0',
    categoryBadgeText: '#2F6B3E',
    pointsBadge: '#FFE8DA',
    pointsBadgeText: '#B85A32',
    tabInactive: '#8A9684',
    progressTrack: '#E8ECDD',
  },
  // Soft dark — simsiyah değil; hafif açık orman charcoal (profesyonel).
  dark: {
    text: '#EAF1E6',
    textSecondary: '#A3B49A',
    background: '#1C241B',
    backgroundElement: '#2A3428',
    backgroundSelected: '#354235',
    tint: '#7BBF86',
    accentWarm: '#E2855C',
    border: '#445343',
    success: '#86C992',
    danger: '#E98F85',
    onAccent: '#FFF8EE',
    surfaceMuted: '#303B2E',
    categoryBadge: '#3A4A36',
    categoryBadgeText: '#B4D4AC',
    pointsBadge: '#4A3526',
    pointsBadgeText: '#EBB894',
    tabInactive: '#87967F',
    progressTrack: '#354235',
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
  serifItalic: 'Fraunces_500Medium',
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

/** Görev kartı görseli — sadece alt başlık bandı; renkleri silikleştirmesin. */
export const ImageScrim = {
  light: ['rgba(20, 26, 16, 0)', 'rgba(20, 26, 16, 0.32)'] as const,
  dark: ['rgba(8, 12, 7, 0)', 'rgba(8, 12, 7, 0.42)'] as const,
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
/** @deprecated Tema ile uyumsuz sabit kremdi (dark web'de beyaz şerit). Colors.*.backgroundElement kullan. */
export const TabBarBackground = Colors.light.backgroundElement;
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
