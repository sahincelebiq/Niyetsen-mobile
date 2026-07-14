import { Pressable, StyleSheet, View } from 'react-native';

import { StreakPill } from '@/components/streak-pill';
import { ThemedText } from '@/components/themed-text';
import { Copy } from '@/constants/copy';
import { Fonts, Spacing } from '@/constants/theme';

type ChatHeaderProps = {
  streakDays: number;
  trialDaysRemaining?: number | null;
  onOpenHistory?: () => void;
};

export function ChatHeader({
  streakDays,
  trialDaysRemaining,
  onOpenHistory,
}: ChatHeaderProps) {
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
            accessibilityLabel="Geçmiş sohbetler"
            onPress={onOpenHistory}
            hitSlop={10}
            style={({ pressed }) => [styles.historyButton, pressed && styles.pressed]}>
            <ThemedText style={styles.historyGlyph}>☰</ThemedText>
          </Pressable>
        ) : (
          <View style={styles.historySpacer} />
        )}
        <View style={styles.titles}>
          <ThemedText type="screenTitle">{Copy.chat.title}</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {Copy.chat.subtitle}
          </ThemedText>
        </View>
        <StreakPill streakDays={streakDays} compact />
      </View>
      {showTrial ? (
        <View style={styles.trialChip}>
          <ThemedText type="smallBold" themeColor="accentWarm">
            Deneme: {trialDaysRemaining} gün kaldı
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
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
  historyButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  historySpacer: {
    width: 40,
  },
  historyGlyph: {
    fontSize: 22,
    lineHeight: 24,
    fontFamily: Fonts.sansBold,
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
