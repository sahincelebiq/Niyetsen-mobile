import { StyleSheet, Text, type TextProps } from 'react-native';

import { Fonts, ThemeColor } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type ThemedTextProps = TextProps & {
  type?: 'default' | 'title' | 'screenTitle' | 'small' | 'smallBold' | 'subtitle' | 'link' | 'linkPrimary' | 'code';
  themeColor?: ThemeColor;
};

export function ThemedText({ style, type = 'default', themeColor, ...rest }: ThemedTextProps) {
  const theme = useTheme();
  const linkPrimaryStyle = type === 'linkPrimary'
    ? { color: theme.tint, fontFamily: Fonts.sansSemiBold, lineHeight: 30, fontSize: 14 }
    : null;

  return (
    <Text
      style={[
        { color: theme[themeColor ?? 'text'] },
        type === 'default' && styles.default,
        type === 'title' && styles.title,
        type === 'screenTitle' && styles.screenTitle,
        type === 'small' && styles.small,
        type === 'smallBold' && styles.smallBold,
        type === 'subtitle' && styles.subtitle,
        type === 'link' && styles.link,
        linkPrimaryStyle,
        type === 'code' && styles.code,
        style,
      ]}
      {...rest}
    />
  );
}

const styles = StyleSheet.create({
  // UI v3.1 MİNİMAL ölçek (2026-08-05, Şahin: "çok hantal, çok kalın, çok
  // büyük"). Başlıklar web değil APP hiyerarşisine indi: title 44→32,
  // subtitle 30→18, screenTitle 28→22. Gövde/small değişmedi. Bu ölçek
  // KİLİTLİ — büyütme; vurgu gerekiyorsa boşluk ve renkle ver, puntoyla değil.
  small: {
    fontFamily: Fonts.sansMedium,
    fontSize: 14,
    lineHeight: 21,
    letterSpacing: 0.1,
  },
  smallBold: {
    fontFamily: Fonts.sansSemiBold,
    fontSize: 14,
    lineHeight: 21,
    letterSpacing: 0.2,
  },
  default: {
    fontFamily: Fonts.sansMedium,
    fontSize: 16,
    lineHeight: 25,
    letterSpacing: 0.05,
  },
  title: {
    fontFamily: Fonts.serif,
    fontSize: 32,
    lineHeight: 38,
    letterSpacing: -0.5,
  },
  screenTitle: {
    fontFamily: Fonts.serif,
    fontSize: 22,
    lineHeight: 28,
    letterSpacing: -0.3,
  },
  subtitle: {
    fontFamily: Fonts.serifMedium,
    fontSize: 18,
    lineHeight: 24,
    letterSpacing: -0.15,
  },
  link: {
    fontFamily: Fonts.sansMedium,
    lineHeight: 30,
    fontSize: 14,
  },
  code: {
    fontFamily: Fonts.mono,
    fontSize: 12,
  },
});
