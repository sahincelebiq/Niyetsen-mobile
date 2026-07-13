import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Radii, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type CategoryBadgeProps = {
  label: string;
  variant?: 'category' | 'points' | 'done';
};

export function CategoryBadge({ label, variant = 'category' }: CategoryBadgeProps) {
  const theme = useTheme();
  const palette =
    variant === 'points'
      ? { bg: theme.pointsBadge, fg: theme.pointsBadgeText }
      : variant === 'done'
        ? { bg: theme.categoryBadge, fg: theme.success }
        : { bg: theme.categoryBadge, fg: theme.categoryBadgeText };

  return (
    <View style={[styles.badge, { backgroundColor: palette.bg }]}>
      <ThemedText type="smallBold" style={{ color: palette.fg, fontSize: 11.5 }}>
        {label}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: 'flex-start',
    borderRadius: Radii.pill,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
});
