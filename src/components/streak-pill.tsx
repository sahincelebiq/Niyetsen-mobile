import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Radii, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type StreakPillProps = {
  streakDays: number;
  compact?: boolean;
};

/** İlkbahar filiz kademesi: 🌱→🌿→🌳 (3 / 7 / 30 gün). */
export function sproutGlyph(streakDays: number): string {
  if (streakDays >= 30) return '🌳';
  if (streakDays >= 7) return '🌿';
  if (streakDays >= 3) return '🌱';
  return '🌱';
}

export function StreakPill({ streakDays, compact = false }: StreakPillProps) {
  const theme = useTheme();
  const label = streakDays > 0 ? `${streakDays} gün` : 'Yeni filiz';

  return (
    <ThemedView
      type="backgroundSelected"
      style={[
        styles.pill,
        compact && styles.pillCompact,
        { borderColor: theme.border },
      ]}>
      <ThemedText type="smallBold" style={styles.glyph}>
        {sproutGlyph(streakDays)}
      </ThemedText>
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
  glyph: {
    fontSize: 13,
    lineHeight: 16,
  },
});
