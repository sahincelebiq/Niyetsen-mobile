/**
 * Niyetsen tasarım dili — pastel yeşil-kahverengi ana palet.
 * `MysticColors` ikincil (mor-mavi) palettir; V2 fal modülü için hazırlanmıştır,
 * MASTER_PLAN kararı gereği (fal/RAG v2'den önce YAPILMAZ) henüz hiçbir ekrana
 * bağlanmamıştır — sadece token altyapısı olarak burada durur.
 */

import '@/global.css';

import { Platform } from 'react-native';

export const Colors = {
  light: {
    text: '#3B3327',
    textSecondary: '#8C8066',
    background: '#FBF7EF',
    backgroundElement: '#F0E9D8',
    backgroundSelected: '#E3D9BE',
    tint: '#7C9473',
    accentWarm: '#B98B5E',
    border: '#E3D9BE',
    success: '#567A50',
    danger: '#A14F4F',
  },
  dark: {
    text: '#F2EAD9',
    textSecondary: '#B3A488',
    background: '#211C15',
    backgroundElement: '#2E2820',
    backgroundSelected: '#3D362A',
    tint: '#93AF86',
    accentWarm: '#CDA06D',
    border: '#3D362A',
    success: '#A7C89B',
    danger: '#E49A9A',
  },
} as const;

/** V2 mistik/fal bölümleri için ikincil palet — şimdilik kullanılmıyor (bkz. dosya başı notu). */
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

/**
 * Modern-klasik font çifti: başlıklarda Fraunces (klasik, sıcak serif),
 * gövde metinde Manrope (modern, temiz sans). Kayıt isimleri
 * `_layout.tsx`'teki `useFonts` çağrısıyla birebir eşleşir.
 */
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
  large: 24,
  pill: 999,
} as const;

export const Shadows = {
  soft: Platform.select({
    web: { boxShadow: '0 8px 28px rgba(59, 51, 39, 0.10)' },
    default: {
      shadowColor: '#3B3327',
      shadowOffset: { width: 0, height: 5 },
      shadowOpacity: 0.1,
      shadowRadius: 12,
      elevation: 3,
    },
  }),
  subtle: Platform.select({
    web: { boxShadow: '0 3px 12px rgba(59, 51, 39, 0.07)' },
    default: {
      shadowColor: '#3B3327',
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.07,
      shadowRadius: 8,
      elevation: 1,
    },
  }),
} as const;

export const Texture = {
  backgroundOpacity: 0.13,
  cardBorderWidth: 1,
} as const;

/** Native tab bar yüksekliği — etiketli iOS sekmeleri için ~84pt. */
export const BottomTabInset = Platform.select({ ios: 84, android: 80 }) ?? 0;
export const MaxContentWidth = 800;
