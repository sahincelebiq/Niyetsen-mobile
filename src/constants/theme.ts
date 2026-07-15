/**
 * Niyetsen MVP tasarım dili — sıcak kil/yeşil palet (2026-07-13 mockup).
 * `MysticColors` ikincil palet; V2 fal modülü için hazır, henüz bağlı değil.
 */

import '@/global.css';

import { Platform } from 'react-native';

export const Colors = {
  light: {
    text: '#2C241C',
    textSecondary: '#9C8B72',
    background: '#F1E7D9',
    backgroundElement: '#FBF6EF',
    backgroundSelected: '#EBD9C6',
    tint: '#6E7856',
    accentWarm: '#B4623C',
    border: '#E0D4C4',
    success: '#56603F',
    danger: '#A14F4F',
    onAccent: '#FCF4EA',
    surfaceMuted: '#F7EEE2',
    categoryBadge: '#E5E8D4',
    categoryBadgeText: '#56603F',
    pointsBadge: '#F1DECF',
    pointsBadgeText: '#9A4E2E',
    tabInactive: '#A28F76',
    progressTrack: '#E7DCCB',
  },
  dark: {
    text: '#F2EAD9',
    textSecondary: '#B3A488',
    background: '#1E1914',
    backgroundElement: '#2A241C',
    backgroundSelected: '#3D3428',
    tint: '#93AF86',
    accentWarm: '#CD8A5E',
    border: '#4A4034',
    success: '#A7C89B',
    danger: '#E49A9A',
    onAccent: '#FCF4EA',
    surfaceMuted: '#352D22',
    categoryBadge: '#3D4530',
    categoryBadgeText: '#B8C4A0',
    pointsBadge: '#4A3528',
    pointsBadgeText: '#E8B89A',
    tabInactive: '#8A7A66',
    progressTrack: '#3D3428',
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
    tint: '#7B68B8',
    accentWarm: '#5C86D6',
    border: '#CDBEEC',
  },
  dark: {
    text: '#E7E1F8',
    textSecondary: '#AA9DD1',
    background: '#15102A',
    backgroundElement: '#221A3D',
    backgroundSelected: '#31264F',
    tint: '#9C87DD',
    accentWarm: '#7C9EE8',
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
    web: { boxShadow: '0 8px 22px rgba(154, 78, 46, 0.12)' },
    default: {
      shadowColor: '#9A4E2E',
      shadowOffset: { width: 0, height: 5 },
      shadowOpacity: 0.12,
      shadowRadius: 12,
      elevation: 3,
    },
  }),
  subtle: Platform.select({
    web: { boxShadow: '0 2px 8px rgba(74, 59, 44, 0.07)' },
    default: {
      shadowColor: '#4A3B2C',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.07,
      shadowRadius: 8,
      elevation: 1,
    },
  }),
  clay: Platform.select({
    web: { boxShadow: '0 3px 10px rgba(154, 78, 46, 0.28)' },
    default: {
      shadowColor: '#9A4E2E',
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.28,
      shadowRadius: 10,
      elevation: 4,
    },
  }),
} as const;

export const Texture = {
  backgroundOpacity: 0.08,
  cardBorderWidth: 1,
} as const;

/** Native tab bar + home indicator payı; içerik bunun üstünde biter. */
export const BottomTabInset = Platform.select({ ios: 78, android: 72, default: 68 }) ?? 68;
export const TabBarBackground = '#FBF6EF';
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
