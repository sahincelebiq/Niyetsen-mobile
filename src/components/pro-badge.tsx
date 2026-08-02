import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { MysticColors, Radii, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useAppearance } from '@/providers/appearance-provider';

/** Ücretsiz kullanıcıya gösterilen net PRO etiketi (paywall yönlendirmesiyle birlikte). */
export function ProBadge({ tone = 'brand' }: { tone?: 'brand' | 'mystic' }) {
  const theme = useTheme();
  const { isDark } = useAppearance();
  const mystic = MysticColors[isDark ? 'dark' : 'light'];
  const backgroundColor =
    tone === 'mystic' ? mystic.backgroundSelected : theme.backgroundSelected;
  const color = tone === 'mystic' ? mystic.tint : theme.tint;

  return (
    <View
      accessibilityLabel="PRO özellik"
      style={[styles.badge, { backgroundColor }]}>
      <ThemedText type="smallBold" style={{ color }}>
        PRO
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    borderRadius: Radii.pill,
    paddingVertical: 4,
    paddingHorizontal: Spacing.two,
    alignSelf: 'flex-start',
  },
});
