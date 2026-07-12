import { Pressable, StyleSheet, View } from 'react-native';

import { StreakPill } from '@/components/streak-pill';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
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
            style={({ pressed }) => [styles.historyButton, pressed && styles.pressed]}>
            <ThemedText style={styles.historyGlyph}>☰</ThemedText>
          </Pressable>
        ) : (
          <View style={styles.historySpacer} />
        )}
        <View style={styles.titles}>
          <ThemedText type="screenTitle">Niyet Rehberi</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            Potansiyelini ortaya çıkart
          </ThemedText>
        </View>
        <StreakPill streakDays={streakDays} compact />
      </View>
      {streakDays > 0 ? (
        <ThemedText type="small" themeColor="textSecondary">
          {streakDays} gündür zincirini koruyorsun — her halka seni güçlendirir.
        </ThemedText>
      ) : (
        <ThemedText type="small" themeColor="textSecondary">
          Bugün atacağın küçük bir adım, yarının zincirini başlatır.
        </ThemedText>
      )}
      {showTrial ? (
        <ThemedView type="backgroundElement" style={styles.trialChip}>
          <ThemedText type="smallBold" themeColor="accentWarm">
            Deneme: {trialDaysRemaining} gün kaldı
          </ThemedText>
        </ThemedView>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.two,
    paddingBottom: Spacing.three,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
  historyButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  historySpacer: {
    width: 36,
  },
  historyGlyph: {
    fontSize: 20,
    lineHeight: 22,
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
