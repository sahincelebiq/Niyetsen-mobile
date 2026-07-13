import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Radii, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type StreakPillProps = {
  streakDays: number;
  compact?: boolean;
};

export function StreakPill({ streakDays, compact = false }: StreakPillProps) {
  const theme = useTheme();
  const label = streakDays > 0 ? `${streakDays} gün` : 'Yeni halka';

  return (
    <ThemedView
      type="backgroundSelected"
      style={[
        styles.pill,
        compact && styles.pillCompact,
        { borderColor: theme.border },
      ]}>
      <View style={[styles.dot, { backgroundColor: theme.tint }]} />
      <ThemedText type="smallBold" style={{ color: theme.text }}>
        {label}
      </ThemedText>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
    borderRadius: Radii.pill,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.one,
  },
  pillCompact: {
    paddingHorizontal: Spacing.two,
    paddingVertical: 6,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
});
