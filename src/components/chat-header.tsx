import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Platform, Pressable, StyleSheet, View } from 'react-native';

import { StreakPill } from '@/components/streak-pill';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useLocale } from '@/providers/locale-provider';

type ChatHeaderProps = {
  streakDays: number;
  trialDaysRemaining?: number | null;
  onOpenHistory?: () => void;
  /**
   * Mistik bölüm girişi. Başlığa uzun basma jesti korunur; ayrıca başlığın
   * yanında görünür bir ☾ düğmesi vardır (Şahin'in kararı, 2026-07-17 —
   * gizli kapı keşfedilemiyordu). Fal ikincil özellik konumunu korur:
   * yalnız küçük bir sembol, ana akışta reklamı yapılmaz.
   */
  onSecretGesture?: () => void;
};

const HIT_SLOP_44 = { top: 10, bottom: 10, left: 10, right: 10 } as const;

export function ChatHeader({
  streakDays,
  trialDaysRemaining,
  onOpenHistory,
  onSecretGesture,
}: ChatHeaderProps) {
  const theme = useTheme();
  const { t } = useLocale();
  const showTrial =
    typeof trialDaysRemaining === 'number' &&
    trialDaysRemaining > 0 &&
    trialDaysRemaining <= 7;

  return (
    <View style={styles.container}>
      <View style={styles.titleRow}>
        {onOpenHistory ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t.chat.openHistory}
            accessibilityHint={t.chat.openHistoryHint}
            onPress={onOpenHistory}
            hitSlop={HIT_SLOP_44}
            style={({ pressed }) => [styles.historyButton, pressed && styles.pressed]}>
            <MaterialCommunityIcons name="menu" size={24} color={theme.text} />
          </Pressable>
        ) : (
          <View style={styles.historySpacer} />
        )}
        <Pressable
          style={styles.titles}
          accessibilityRole="header"
          delayLongPress={700}
          onLongPress={onSecretGesture}>
          <ThemedText type="screenTitle">{t.chat.title}</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {t.chat.subtitle}
          </ThemedText>
        </Pressable>
        <View style={styles.rightCluster} pointerEvents="box-none">
          {onSecretGesture ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t.chat.mysticOpen}
              accessibilityHint={t.chat.mysticOpenHint}
              onPress={onSecretGesture}
              hitSlop={{ top: 14, bottom: 14, left: 14, right: 14 }}
              style={({ pressed }) => [
                styles.mysticButton,
                pressed && styles.pressed,
              ]}>
              <ThemedText style={styles.mysticGlyph}>☾</ThemedText>
            </Pressable>
          ) : null}
          <StreakPill streakDays={streakDays} compact />
        </View>
      </View>
      {showTrial ? (
        <View style={styles.trialChip}>
          <ThemedText type="smallBold" themeColor="accentWarm">
            {t.chat.trialDaysLeft(trialDaysRemaining ?? 0)}
          </ThemedText>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.two,
    paddingBottom: Spacing.two,
    paddingHorizontal: Spacing.three,
    zIndex: 2,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
  historyButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 0,
  },
  historySpacer: {
    width: 44,
  },
  rightCluster: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
    marginTop: 2,
    zIndex: 3,
  },
  mysticButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 4,
    ...Platform.select({
      web: { cursor: 'pointer' as const },
      default: {},
    }),
  },
  mysticGlyph: {
    fontSize: 20,
    lineHeight: 24,
    textAlign: 'center',
    includeFontPadding: false,
    opacity: 0.85,
  },
  titles: {
    flex: 1,
    gap: Spacing.half,
  },
  trialChip: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.one,
  },
  pressed: {
    opacity: 0.7,
  },
});
