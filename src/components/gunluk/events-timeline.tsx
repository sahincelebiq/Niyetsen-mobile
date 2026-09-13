/**
 * Zaman şeridi (03-Bugün, E.1) — etkinlikler Sabah / Öğle / Akşam bloklarında
 * gruplanır; şu anki saatin hizasında ince bir "şu an" çizgisi akar.
 * Saatler yerel "HH:MM" string'idir; dakika hesabı `@/lib/zaman` üzerinden.
 */
import { memo, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';

import { DailyEventCard } from '@/components/plan-event-card';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { DailyEventItem } from '@/lib/api';
import { dakikaToHhmm, gununBolumu, hhmmToMinutes, type GununBolumu } from '@/lib/zaman';
import { useLocale } from '@/providers/locale-provider';

type Outcome = { tone: 'success' | 'danger'; message: string };

type EventsTimelineProps = {
  events: DailyEventItem[];
  nowMinutes: number;
  busyKey: string | null;
  outcomes: Record<string, Outcome>;
  onComplete: (event: DailyEventItem) => void;
};

const BLOCK_ORDER: GununBolumu[] = ['sabah', 'ogle', 'aksam'];

export const EventsTimeline = memo(function EventsTimeline({
  events,
  nowMinutes,
  busyKey,
  outcomes,
  onComplete,
}: EventsTimelineProps) {
  const { t, locale } = useLocale();

  const blocks = useMemo(() => {
    const sorted = [...events].sort(
      (a, b) =>
        (hhmmToMinutes(a.scheduled_time) ?? 0) - (hhmmToMinutes(b.scheduled_time) ?? 0),
    );
    const grouped: Record<GununBolumu, DailyEventItem[]> = {
      sabah: [],
      ogle: [],
      aksam: [],
    };
    for (const event of sorted) {
      grouped[gununBolumu(hhmmToMinutes(event.scheduled_time) ?? 0)].push(event);
    }
    return grouped;
  }, [events]);

  const blockLabels: Record<GununBolumu, string> = {
    sabah: t.daily.blockMorning,
    ogle: t.daily.blockNoon,
    aksam: t.daily.blockEvening,
  };
  const nowBlock = gununBolumu(nowMinutes);
  const nowRow = (
    <NowLine label={t.daily.nowLine(dakikaToHhmm(nowMinutes))} />
  );

  return (
    <View style={styles.wrap}>
      {BLOCK_ORDER.map((block) => {
        const items = blocks[block];
        if (items.length === 0) return null;
        // "Şu an" çizgisi yalnız içinde bulunulan blokta görünür: ilk gelecek
        // etkinliğin üstünde; bloktaki her şey geçtiyse en altta.
        const upcomingIndex =
          block === nowBlock
            ? items.findIndex(
                (event) => (hhmmToMinutes(event.scheduled_time) ?? 0) >= nowMinutes,
              )
            : -1;
        const showNowAtEnd = block === nowBlock && upcomingIndex === -1;
        return (
          <View key={block} style={styles.block}>
            <ThemedText type="small" themeColor="textSecondary" style={styles.blockLabel}>
              {blockLabels[block].toLocaleUpperCase(locale)}
            </ThemedText>
            {items.map((event, index) => (
              <View key={event.occurrence_id} style={styles.itemWrap}>
                {index === upcomingIndex ? nowRow : null}
                <DailyEventCard
                  event={event}
                  busy={busyKey === `event:${event.occurrence_id}`}
                  outcome={outcomes[`event:${event.occurrence_id}`]}
                  onComplete={() => onComplete(event)}
                />
              </View>
            ))}
            {showNowAtEnd ? nowRow : null}
          </View>
        );
      })}
    </View>
  );
});

function NowLine({ label }: { label: string }) {
  const theme = useTheme();
  return (
    <View style={styles.nowRow}>
      <View style={[styles.nowDot, { backgroundColor: theme.accentWarm }]} />
      <View style={[styles.nowRule, { backgroundColor: theme.accentWarm }]} />
      <ThemedText type="small" themeColor="accentWarm">
        {label}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: Spacing.four,
  },
  block: {
    gap: Spacing.two,
  },
  blockLabel: {
    letterSpacing: 1.1,
  },
  itemWrap: {
    gap: Spacing.two,
  },
  nowRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    minHeight: 20,
  },
  nowDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  nowRule: {
    flex: 1,
    height: StyleSheet.hairlineWidth * 2,
    borderRadius: 1,
  },
});
