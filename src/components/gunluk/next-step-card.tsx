/**
 * Sıradaki adım kartı (03-Bugün, E.2) — ekranın en üstünde tek odak kartı:
 * kullanıcı düşünmeden "şimdi ne yapacağını" görür. Saatli etkinlik
 * öncelikli (geri sayımlı), yoksa ilk bekleyen görev.
 *
 * Gün kapanınca yerini DayCompleteCard alır (E.6 — konfeti değil, halkanın
 * kapanışı + tek cümle; kayıp hissi + kimlik tonu, suçlama yok).
 */
import { memo } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import { ProgressRing } from '@/components/gunluk/progress-ring';
import { SurfaceCard } from '@/components/ui/surface-card';
import { ThemedText } from '@/components/themed-text';
import { Radii, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { DailyEventItem } from '@/lib/api';
import { useLocale } from '@/providers/locale-provider';

export type NextStep =
  | { kind: 'event'; event: DailyEventItem; minutesUntil: number | null }
  | { kind: 'task'; id: string; title: string; durationMin: number; planName: string };

type NextStepCardProps = {
  step: NextStep;
  busy: boolean;
  onCompleteEvent: (event: DailyEventItem) => void;
  onProofTask: (taskId: string) => void;
};

export const NextStepCard = memo(function NextStepCard({
  step,
  busy,
  onCompleteEvent,
  onProofTask,
}: NextStepCardProps) {
  const theme = useTheme();
  const { t, locale } = useLocale();

  const isEvent = step.kind === 'event';
  const title = isEvent ? step.event.title : step.title;
  const durationMin = isEvent ? step.event.duration_min : step.durationMin;
  const planName = isEvent ? step.event.plan_name : step.planName;
  const countdown =
    isEvent && step.minutesUntil !== null && step.minutesUntil > 0
      ? t.daily.nextUpIn(step.minutesUntil)
      : t.daily.nextUpNow;

  return (
    <SurfaceCard hero style={styles.card}>
      <View style={styles.labelRow}>
        <ThemedText type="small" themeColor="textSecondary" style={styles.label}>
          {t.daily.nextUpTitle.toLocaleUpperCase(locale)}
        </ThemedText>
        <View style={[styles.countdownChip, { backgroundColor: theme.backgroundSelected }]}>
          <ThemedText type="smallBold" themeColor="tint">
            {countdown}
          </ThemedText>
        </View>
      </View>
      <View style={styles.bodyRow}>
        {isEvent ? (
          <View style={[styles.timePill, { backgroundColor: theme.surfaceMuted }]}>
            <ThemedText type="smallBold" themeColor="tint">
              {step.event.scheduled_time}
            </ThemedText>
          </View>
        ) : null}
        <View style={styles.titleBlock}>
          <ThemedText type="subtitle" numberOfLines={2}>
            {title}
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
            {planName || t.events.planNameFallback}
            {' · '}
            {t.events.durationShort(durationMin)}
          </ThemedText>
        </View>
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={
          isEvent
            ? `${t.events.markDone}: ${title}`
            : `${t.daily.addProof}: ${title}`
        }
        disabled={busy}
        onPress={() =>
          isEvent ? onCompleteEvent(step.event) : onProofTask(step.id)
        }
        style={({ pressed }) => [
          styles.action,
          { backgroundColor: theme.tint, opacity: pressed || busy ? 0.85 : 1 },
        ]}>
        {busy ? (
          <ActivityIndicator color={theme.onAccent} />
        ) : (
          <ThemedText type="smallBold" style={{ color: theme.onAccent }}>
            {isEvent ? t.events.markDone : t.daily.addProof}
          </ThemedText>
        )}
      </Pressable>
    </SurfaceCard>
  );
});

type DayCompleteCardProps = {
  done: number;
  total: number;
};

/** Günün son halkası kapandı — kısa, abartısız kutlama (E.6). */
export const DayCompleteCard = memo(function DayCompleteCard({
  done,
  total,
}: DayCompleteCardProps) {
  const { t } = useLocale();
  return (
    <SurfaceCard hero style={styles.card}>
      <View style={styles.completeRow}>
        <ProgressRing
          progress={1}
          complete
          size={44}
          accessibilityLabel={t.daily.progressLabel(done, total)}
        />
        <View style={styles.titleBlock}>
          <ThemedText type="subtitle" themeColor="accentWarm">
            {t.daily.dayCompleteTitle}
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {t.daily.dayCompleteBody}
          </ThemedText>
        </View>
      </View>
    </SurfaceCard>
  );
});

const styles = StyleSheet.create({
  card: {
    gap: Spacing.three,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
  label: {
    letterSpacing: 1.1,
  },
  countdownChip: {
    borderRadius: Radii.pill,
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.half,
  },
  bodyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  timePill: {
    minWidth: 56,
    paddingHorizontal: Spacing.one,
    paddingVertical: Spacing.one,
    borderRadius: Radii.medium,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleBlock: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  action: {
    minHeight: 44,
    borderRadius: Radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.three,
  },
  completeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
});
