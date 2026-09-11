/**
 * Plan etkinliği kartları (2026-09-10 — plan-içi ajan dilim 1b).
 *
 * - DailyEventCard: Bugün sekmesi — fotosuz “Yaptım” (+50), kamera YOK.
 * - PlanEventRow: Planım etkinlik listesi — tekrar/saat özeti + sil.
 * Renkler yalnız theme token'ları; hex hardcode yok.
 */
import { memo } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import { CategoryBadge } from '@/components/ui/category-badge';
import { SurfaceCard } from '@/components/ui/surface-card';
import { ThemedText } from '@/components/themed-text';
import { Radii, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { DailyEventItem, EventRecurrence, PlanEvent } from '@/lib/api';
import { useLocale } from '@/providers/locale-provider';

export function describeRecurrence(
  recurrence: EventRecurrence,
  byweekday: number[],
  labels: { recurrence: Record<EventRecurrence, string>; weekdaysShort: readonly string[] },
): string {
  if (recurrence === 'weekly' && byweekday.length) {
    const days = [...byweekday]
      .sort((a, b) => a - b)
      .map((day) => labels.weekdaysShort[day] ?? '')
      .filter(Boolean)
      .join(', ');
    return days ? `${labels.recurrence.weekly} · ${days}` : labels.recurrence.weekly;
  }
  return labels.recurrence[recurrence] ?? labels.recurrence.none;
}

type DailyEventCardProps = {
  event: DailyEventItem;
  busy: boolean;
  outcome?: { tone: 'success' | 'danger'; message: string };
  onComplete: () => void;
};

export const DailyEventCard = memo(function DailyEventCard({
  event,
  busy,
  outcome,
  onComplete,
}: DailyEventCardProps) {
  const theme = useTheme();
  const { t } = useLocale();
  const done = event.status === 'done';
  return (
    <SurfaceCard elevated={!done} style={done ? styles.cardDone : undefined}>
      <View style={styles.row}>
        <View style={[styles.timePill, { backgroundColor: theme.surfaceMuted }]}>
          <ThemedText type="smallBold" themeColor={done ? 'textSecondary' : 'tint'}>
            {event.scheduled_time}
          </ThemedText>
        </View>
        <View style={styles.body}>
          <ThemedText
            type="smallBold"
            numberOfLines={2}
            style={done ? styles.strike : undefined}
            themeColor={done ? 'textSecondary' : 'text'}>
            {event.title}
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
            {event.plan_name || t.events.planNameFallback}
            {' · '}
            {describeRecurrence(event.recurrence, [], t.events)}
            {' · '}
            {t.events.durationShort(event.duration_min)}
          </ThemedText>
          <View style={styles.badges}>
            {event.categories.map((category) => (
              <CategoryBadge key={category} label={category} variant={done ? 'done' : 'category'} />
            ))}
          </View>
        </View>
        {done ? (
          <View style={[styles.doneChip, { borderColor: theme.success }]}>
            <ThemedText type="smallBold" themeColor="success">
              ✓ {t.events.done}
            </ThemedText>
          </View>
        ) : (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`${t.events.markDone}: ${event.title}`}
            disabled={busy}
            onPress={onComplete}
            hitSlop={6}
            style={({ pressed }) => [
              styles.doneButton,
              { backgroundColor: theme.tint, opacity: pressed || busy ? 0.8 : 1 },
            ]}>
            {busy ? (
              <ActivityIndicator color={theme.onAccent} />
            ) : (
              <ThemedText type="smallBold" style={{ color: theme.onAccent }}>
                {t.events.markDone}
              </ThemedText>
            )}
          </Pressable>
        )}
      </View>
      {outcome ? (
        <ThemedText
          type="small"
          themeColor={outcome.tone === 'success' ? 'success' : 'danger'}
          style={styles.outcome}>
          {outcome.message}
        </ThemedText>
      ) : null}
    </SurfaceCard>
  );
});

type PlanEventRowProps = {
  event: PlanEvent;
  busy: boolean;
  onDelete: () => void;
};

export const PlanEventRow = memo(function PlanEventRow({ event, busy, onDelete }: PlanEventRowProps) {
  const theme = useTheme();
  const { t } = useLocale();
  return (
    <View style={[styles.planRow, { borderColor: theme.border }]}>
      <View style={[styles.timePill, { backgroundColor: theme.surfaceMuted }]}>
        <ThemedText type="smallBold" themeColor="tint">
          {event.scheduled_time}
        </ThemedText>
      </View>
      <View style={styles.body}>
        <View style={styles.titleRow}>
          <ThemedText type="smallBold" numberOfLines={2} style={styles.flexText}>
            {event.title}
          </ThemedText>
          {event.created_by === 'agent' ? (
            <View style={[styles.agentBadge, { backgroundColor: theme.backgroundSelected }]}>
              <ThemedText type="small" themeColor="tint" style={styles.agentBadgeText}>
                {t.events.byAgent}
              </ThemedText>
            </View>
          ) : null}
        </View>
        <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
          {describeRecurrence(event.recurrence, event.byweekday, t.events)}
          {' · '}
          {t.events.durationShort(event.duration_min)}
        </ThemedText>
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${t.events.delete}: ${event.title}`}
        disabled={busy}
        onPress={onDelete}
        hitSlop={8}
        style={({ pressed }) => [styles.deleteButton, { opacity: pressed || busy ? 0.6 : 1 }]}>
        {busy ? (
          <ActivityIndicator size="small" color={theme.textSecondary} />
        ) : (
          <ThemedText type="smallBold" themeColor="danger">
            {t.events.delete}
          </ThemedText>
        )}
      </Pressable>
    </View>
  );
});

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  cardDone: {
    opacity: 0.82,
  },
  timePill: {
    minWidth: 56,
    paddingHorizontal: Spacing.one,
    paddingVertical: Spacing.one,
    borderRadius: Radii.medium,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
  },
  flexText: {
    flexShrink: 1,
  },
  strike: {
    textDecorationLine: 'line-through',
  },
  badges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    marginTop: 2,
  },
  doneButton: {
    minHeight: 44,
    minWidth: 84,
    paddingHorizontal: Spacing.two,
    borderRadius: Radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  doneChip: {
    minHeight: 36,
    paddingHorizontal: Spacing.two,
    borderRadius: Radii.pill,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  outcome: {
    marginTop: Spacing.one,
  },
  planRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingVertical: Spacing.two,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  agentBadge: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: Radii.pill,
  },
  agentBadgeText: {
    fontSize: 11,
  },
  deleteButton: {
    minHeight: 44,
    minWidth: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
