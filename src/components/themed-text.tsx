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
  small: {
    fontFamily: Fonts.sansMedium,
    fontSize: 14,
    lineHeight: 20,
  },
  smallBold: {
    fontFamily: Fonts.sansSemiBold,
    fontSize: 14,
    lineHeight: 20,
  },
  default: {
    fontFamily: Fonts.sansMedium,
    fontSize: 16,
    lineHeight: 24,
  },
  title: {
    fontFamily: Fonts.serif,
    fontSize: 44,
    lineHeight: 48,
    letterSpacing: -0.5,
  },
  screenTitle: {
    fontFamily: Fonts.serif,
    fontSize: 28,
    lineHeight: 34,
    letterSpacing: -0.3,
  },
  subtitle: {
    fontFamily: Fonts.serifMedium,
    fontSize: 30,
    lineHeight: 38,
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
