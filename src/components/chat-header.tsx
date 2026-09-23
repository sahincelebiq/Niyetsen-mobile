import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useEffect } from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  ReduceMotion,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { StreakPill } from '@/components/streak-pill';
import { ThemedText } from '@/components/themed-text';
import { Motion, Radii, Spacing } from '@/constants/theme';
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
  /** Ücretsiz hesapta Stitch başlığındaki PRO çipi — paywall. */
  onOpenPro?: () => void;
  /** Aktif niyet adı — başlığın altında çip olarak görünür (varsa). */
  activeIntentName?: string | null;
  /** Kullanıcı geçmişe kaydırdı: başlık yapışkan ince bara küçülür. */
  compact?: boolean;
  /**
   * Klavye açık: başlık incelir ama aktif niyet çipi görünür kalır —
   * tab bar gizlendiğinde "sohbet modundasın" ipucu bu satırdır.
   */
  keyboardOpen?: boolean;
};

const HIT_SLOP_44 = { top: 10, bottom: 10, left: 10, right: 10 } as const;
const CHIP_ROW_HEIGHT = 34;

/**
 * ☾ nabız (faz8.13 / 1c): "yeni filiz" göstergesiyle aynı ritimde yumuşak
 * parlama — Easing YALNIZ reanimated'dan; ReduceMotion.System saygısı.
 */
function MysticPulse({ children }: { children: React.ReactNode }) {
  const pulse = useSharedValue(0);

  useEffect(() => {
    pulse.value = withRepeat(
      withSequence(
        withTiming(1, {
          duration: 1400,
          easing: Easing.inOut(Easing.sin),
          reduceMotion: ReduceMotion.System,
        }),
        withTiming(0, {
          duration: 1400,
          easing: Easing.inOut(Easing.sin),
          reduceMotion: ReduceMotion.System,
        }),
      ),
      -1,
      false,
      undefined,
      ReduceMotion.System,
    );
  }, [pulse]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: 0.55 + pulse.value * 0.45,
    transform: [{ scale: 1 + pulse.value * 0.08 }],
  }));

  return <Animated.View style={animatedStyle}>{children}</Animated.View>;
}

export function ChatHeader({
  streakDays,
  trialDaysRemaining,
  onOpenHistory,
  onSecretGesture,
  onOpenPro,
  activeIntentName,
  compact = false,
  keyboardOpen = false,
}: ChatHeaderProps) {
  const theme = useTheme();
  const { t } = useLocale();
  const showTrial =
    typeof trialDaysRemaining === 'number' &&
    trialDaysRemaining > 0 &&
    trialDaysRemaining <= 7;

  // İnce bar: scroll'da tam küçülme; klavyede başlık incelir, niyet çipi kalır.
  const thin = compact || keyboardOpen;
  const chipVisible = !!activeIntentName && (!compact || keyboardOpen);

  const thinProgress = useSharedValue(0);
  const chipProgress = useSharedValue(chipVisible ? 1 : 0);

  useEffect(() => {
    thinProgress.value = withTiming(thin ? 1 : 0, {
      duration: Motion.base,
      easing: Easing.out(Easing.quad),
      reduceMotion: ReduceMotion.System,
    });
  }, [thin, thinProgress]);

  useEffect(() => {
    chipProgress.value = withTiming(chipVisible ? 1 : 0, {
      duration: Motion.base,
      easing: Easing.out(Easing.quad),
      reduceMotion: ReduceMotion.System,
    });
  }, [chipVisible, chipProgress]);

  const titleAnim = useAnimatedStyle(() => ({
    transform: [{ scale: 1 - thinProgress.value * 0.16 }],
  }));
  const barAnim = useAnimatedStyle(() => ({
    paddingBottom: Spacing.two - thinProgress.value * Spacing.one,
  }));
  const chipAnim = useAnimatedStyle(() => ({
    opacity: chipProgress.value,
    maxHeight: chipProgress.value * CHIP_ROW_HEIGHT,
    marginTop: chipProgress.value * Spacing.one,
    overflow: 'hidden',
  }));

  return (
    <Animated.View style={[styles.container, barAnim]}>
      <View style={styles.titleRow}>
        <View style={styles.leftCluster}>
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
        </View>
        <Pressable
          style={styles.titles}
          accessibilityRole="header"
          delayLongPress={700}
          onLongPress={onSecretGesture}>
          <Animated.View style={titleAnim}>
            <ThemedText type="screenTitle" style={styles.titleText} numberOfLines={1}>
              {t.tabs.chat}
            </ThemedText>
          </Animated.View>
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
              <MysticPulse>
                <ThemedText style={styles.mysticGlyph}>☾</ThemedText>
              </MysticPulse>
            </Pressable>
          ) : null}
          <StreakPill streakDays={streakDays} compact />
          {onOpenPro ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t.common.proCta}
              onPress={onOpenPro}
              hitSlop={8}
              style={({ pressed }) => [
                styles.proChip,
                { backgroundColor: theme.backgroundSelected, opacity: pressed ? 0.75 : 1 },
              ]}>
              <ThemedText type="smallBold" themeColor="tint">
                PRO
              </ThemedText>
            </Pressable>
          ) : null}
        </View>
      </View>
      {activeIntentName ? (
        <Animated.View
          style={[
            styles.intentChip,
            {
              backgroundColor: theme.backgroundSelected,
              borderColor: theme.border,
            },
            chipAnim,
          ]}
          accessibilityElementsHidden={!chipVisible}
          importantForAccessibility={chipVisible ? 'auto' : 'no-hide-descendants'}>
          <MaterialCommunityIcons name="sprout-outline" size={15} color={theme.tint} />
          <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
            {t.chat.activeIntent(activeIntentName)}
          </ThemedText>
        </Animated.View>
      ) : null}
      {showTrial ? (
        <View style={styles.trialChip}>
          <ThemedText type="smallBold" themeColor="accentWarm">
            {t.chat.trialDaysLeft(trialDaysRemaining ?? 0)}
          </ThemedText>
        </View>
      ) : null}
    </Animated.View>
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
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
    minHeight: 44,
  },
  leftCluster: {
    minWidth: 44,
    flexShrink: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  historyButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  historySpacer: {
    width: 44,
  },
  rightCluster: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: Spacing.one,
    minWidth: 44,
    maxWidth: 168,
    flexShrink: 1,
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
  },
  titles: {
    flex: 1,
    minWidth: 0,
    alignItems: 'center',
  },
  titleText: {
    textAlign: 'center',
    width: '100%',
    flexShrink: 1,
  },
  intentChip: {
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
    maxWidth: '100%',
    borderRadius: Radii.pill,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.one,
  },
  trialChip: {
    alignSelf: 'center',
    borderRadius: 999,
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.one,
  },
  proChip: {
    minHeight: 32,
    paddingHorizontal: Spacing.two,
    borderRadius: Radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.7,
  },
});
