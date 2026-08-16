import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { companionVisual } from '@/constants/chain-animals';
import { Radii, Spacing } from '@/constants/theme';
import { useCompanionAnimal } from '@/hooks/use-companion-animal';
import { useTheme } from '@/hooks/use-theme';

type StreakPillProps = {
  streakDays: number;
  compact?: boolean;
};

/**
 * İlkbahar filiz kademesi: 🌱→🌿→🌳 (3 / 7 / 30 gün).
 * rapor/yollar ekranlarında DEKORATİF olarak kullanılmaya devam eder;
 * zincir kimliği artık chain-animals.ts'tir.
 */
export function sproutGlyph(streakDays: number): string {
  if (streakDays >= 30) return '🌳';
  if (streakDays >= 7) return '🌿';
  if (streakDays >= 3) return '🌱';
  return '🌱';
}

/**
 * faz8.13/6: filiz emojisi → 12 hayvanlı evrim ikonu (chain-animals.ts tek
 * gerçek kaynak; rank hero'suyla tam senkron). Emoji değil vektör ikon.
 */
export function StreakPill({ streakDays, compact = false }: StreakPillProps) {
  const theme = useTheme();
  const { companionId, investedDays } = useCompanionAnimal();
  const visual = companionVisual(companionId, investedDays, streakDays, 14);
  const label = streakDays > 0 ? `${streakDays} gün` : 'Yeni yoldaş';

  return (
    <ThemedView
      type="backgroundSelected"
      style={[
        styles.pill,
        compact && styles.pillCompact,
        { borderColor: theme.border },
      ]}>
      <MaterialCommunityIcons name={visual.icon} size={14} color={theme.tint} />
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
});
