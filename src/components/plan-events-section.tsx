/**
 * Planım → “Etkinlikler” bölümü (2026-09-10 plan-içi ajan dilim 1b).
 *
 * Kendi verisini yükler (GET /plan/{id}/events), elle ekleme sayfasını ve
 * plan asistanı sohbetini açar. Hata olursa 365 planını DÜŞÜRMEZ — bölüm
 * sessizce küçük bir uyarı gösterir (degrade).
 */
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import { PlanAgentSheet } from '@/components/plan-agent-sheet';
import { PlanEventRow } from '@/components/plan-event-card';
import { PlanEventEditor } from '@/components/plan-event-editor';
import { SurfaceCard } from '@/components/ui/surface-card';
import { ThemedText } from '@/components/themed-text';
import { Radii, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { trackEvent } from '@/lib/analytics';
import { ApiError, deletePlanEvent, listPlanEvents, type PlanEvent } from '@/lib/api';
import { showAlert, showConfirm } from '@/lib/web-alert';
import { useLocale } from '@/providers/locale-provider';

type Props = {
  planId: string;
  planName: string;
  /** Üst ekran yenilenince artar → liste yeniden çekilir. */
  reloadKey?: number;
  /** Etkinlik eklendi/silindi → Bugün sekmesi vb. tazelemek isteyebilir. */
  onChanged?: () => void;
};

export function PlanEventsSection({ planId, planName, reloadKey = 0, onChanged }: Props) {
  const theme = useTheme();
  const { t } = useLocale();
  const [events, setEvents] = useState<PlanEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [agentOpen, setAgentOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const next = await listPlanEvents(planId);
      setEvents(next);
      setFailed(false);
    } catch {
      setFailed(true);
    } finally {
      setLoading(false);
    }
  }, [planId]);

  useEffect(() => {
    void load();
  }, [load, reloadKey]);

  const remove = useCallback(
    (event: PlanEvent) => {
      showConfirm(t.events.deleteTitle, t.events.deleteBody, {
        cancelLabel: t.common.cancel,
        confirmLabel: t.events.delete,
        onConfirm: () => {
          setBusyId(event.id);
          deletePlanEvent(event.id)
            .then(() => {
              setEvents((current) => current.filter((item) => item.id !== event.id));
              onChanged?.();
            })
            .catch((error: unknown) => {
              showAlert(
                t.common.errorGeneric,
                error instanceof ApiError ? error.message : undefined,
              );
            })
            .finally(() => setBusyId(null));
        },
      });
    },
    [onChanged, t],
  );

  const handleCreated = useCallback(
    (event: PlanEvent) => {
      setEvents((current) => [...current, event].sort(byTime));
      showAlert(t.events.created(event.title));
      void trackEvent('plan_event_created', { plan_id: planId, recurrence: event.recurrence });
      onChanged?.();
    },
    [onChanged, planId, t],
  );

  const handleAgentEventsChanged = useCallback(() => {
    void load();
    onChanged?.();
  }, [load, onChanged]);

  return (
    <SurfaceCard style={styles.card}>
      <View style={styles.headerRow}>
        <View style={styles.headerText}>
          <ThemedText type="subtitle">{t.events.sectionTitle}</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {t.events.sectionHint}
          </ThemedText>
        </View>
      </View>

      {loading && events.length === 0 ? (
        <View style={styles.loading}>
          <ActivityIndicator color={theme.tint} />
        </View>
      ) : failed && events.length === 0 ? (
        <Pressable onPress={() => void load()} accessibilityRole="button" style={styles.retry}>
          <ThemedText type="small" themeColor="danger">
            {t.common.errorGeneric} · {t.common.retry}
          </ThemedText>
        </Pressable>
      ) : events.length === 0 ? (
        <ThemedText type="small" themeColor="textSecondary" style={styles.empty}>
          {t.events.listEmpty}
        </ThemedText>
      ) : (
        <View>
          {events.map((event) => (
            <PlanEventRow
              key={event.id}
              event={event}
              busy={busyId === event.id}
              onDelete={() => remove(event)}
            />
          ))}
        </View>
      )}

      <View style={styles.actions}>
        <Pressable
          accessibilityRole="button"
          onPress={() => setAgentOpen(true)}
          style={({ pressed }) => [
            styles.action,
            { backgroundColor: theme.tint, opacity: pressed ? 0.85 : 1 },
          ]}>
          <ThemedText type="smallBold" style={{ color: theme.onAccent }}>
            ✦ {t.events.agentOpen}
          </ThemedText>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          onPress={() => setEditorOpen(true)}
          style={({ pressed }) => [
            styles.action,
            styles.actionOutline,
            { borderColor: theme.border, backgroundColor: theme.surfaceMuted, opacity: pressed ? 0.8 : 1 },
          ]}>
          <ThemedText type="smallBold" themeColor="text">
            + {t.events.addTitle}
          </ThemedText>
        </Pressable>
      </View>

      <PlanEventEditor
        visible={editorOpen}
        planId={planId}
        onClose={() => setEditorOpen(false)}
        onCreated={handleCreated}
      />
      <PlanAgentSheet
        visible={agentOpen}
        planId={planId}
        planName={planName}
        onClose={() => setAgentOpen(false)}
        onEventsChanged={handleAgentEventsChanged}
      />
    </SurfaceCard>
  );
}

function byTime(a: PlanEvent, b: PlanEvent): number {
  return a.scheduled_time.localeCompare(b.scheduled_time) || a.title.localeCompare(b.title);
}

const styles = StyleSheet.create({
  card: {
    gap: Spacing.two,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.two,
  },
  headerText: {
    flex: 1,
    gap: 2,
  },
  loading: {
    paddingVertical: Spacing.three,
    alignItems: 'center',
  },
  retry: {
    minHeight: 44,
    justifyContent: 'center',
  },
  empty: {
    paddingVertical: Spacing.one,
  },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
    paddingTop: Spacing.one,
  },
  action: {
    minHeight: 44,
    paddingHorizontal: Spacing.three,
    borderRadius: Radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionOutline: {
    borderWidth: 1,
  },
});
