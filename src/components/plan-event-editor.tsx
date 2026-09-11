/**
 * Plana elle etkinlik ekleme sayfası (bottom sheet, 2026-09-10).
 *
 * Saat seçimi chip'lerle yapılır — iOS'ta Modal içinde Modal (TimeOfDayField)
 * açılmadığı için ikinci bir sayfa kullanılmaz. Backend zaten normalize eder
 * (HH:MM, byweekday 0..6); burada yalnız erken doğrulama var.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  useColorScheme,
  View,
} from 'react-native';

import { KeyboardAwareView } from '@/components/keyboard-aware-view';
import { ThemedText } from '@/components/themed-text';
import { Fonts, Radii, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import {
  createPlanEvent,
  type EventRecurrence,
  type PlanEvent,
  type PlanEventCreateRequest,
} from '@/lib/api';
import { showAlert } from '@/lib/web-alert';
import { useLocale } from '@/providers/locale-provider';

const HOURS = Array.from({ length: 24 }, (_, index) => (index + 5) % 24); // 05..23, 00..04
const MINUTES = [0, 15, 30, 45] as const;
const RECURRENCES: EventRecurrence[] = ['none', 'daily', 'weekdays', 'weekly'];
const WEEKDAY_ORDER = [0, 1, 2, 3, 4, 5, 6] as const; // Pzt=0 … Paz=6 (backend ile aynı)

function pad2(value: number): string {
  return value < 10 ? `0${value}` : String(value);
}

function todayIsoLocal(): string {
  const now = new Date();
  return `${now.getFullYear()}-${pad2(now.getMonth() + 1)}-${pad2(now.getDate())}`;
}

function addDaysIso(iso: string, days: number): string {
  const [year, month, day] = iso.split('-').map(Number);
  const date = new Date(year, (month ?? 1) - 1, (day ?? 1) + days);
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}

type Props = {
  visible: boolean;
  planId: string | null;
  onClose: () => void;
  onCreated: (event: PlanEvent) => void;
};

export function PlanEventEditor({ visible, planId, onClose, onCreated }: Props) {
  const theme = useTheme();
  const scheme = useColorScheme();
  const { t } = useLocale();
  const [title, setTitle] = useState('');
  const [hour, setHour] = useState(9);
  const [minute, setMinute] = useState<(typeof MINUTES)[number]>(0);
  const [startOffset, setStartOffset] = useState<0 | 1>(0);
  const [recurrence, setRecurrence] = useState<EventRecurrence>('none');
  const [weekdays, setWeekdays] = useState<number[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!visible) return;
    setTitle('');
    setHour(9);
    setMinute(0);
    setStartOffset(0);
    setRecurrence('none');
    setWeekdays([]);
    setSaving(false);
  }, [visible]);

  const startDate = useMemo(() => addDaysIso(todayIsoLocal(), startOffset), [startOffset]);

  const toggleWeekday = useCallback((day: number) => {
    setWeekdays((prev) => (prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]));
  }, []);

  const submit = useCallback(async () => {
    if (!planId || saving) return;
    const clean = title.trim();
    if (!clean) {
      showAlert(t.events.titleRequired);
      return;
    }
    if (recurrence === 'weekly' && weekdays.length === 0) {
      showAlert(t.events.weekdayRequired);
      return;
    }
    const body: PlanEventCreateRequest = {
      title: clean,
      scheduled_time: `${pad2(hour)}:${pad2(minute)}`,
      start_date: startDate,
      recurrence,
      byweekday: recurrence === 'weekly' ? [...weekdays].sort((a, b) => a - b) : [],
    };
    setSaving(true);
    try {
      const created = await createPlanEvent(planId, body);
      onCreated(created);
      onClose();
    } catch (error) {
      showAlert(t.common.errorGeneric, error instanceof Error ? error.message : undefined);
    } finally {
      setSaving(false);
    }
  }, [planId, saving, title, recurrence, weekdays, hour, minute, startDate, onCreated, onClose, t]);

  const chip = (selected: boolean) => [
    styles.chip,
    {
      backgroundColor: selected ? theme.tint : theme.surfaceMuted,
      borderColor: selected ? theme.tint : theme.border,
    },
  ];
  const chipText = (selected: boolean) => ({ color: selected ? theme.onAccent : theme.text });
  const overlayOpacity = scheme === 'dark' ? 0.55 : 0.32;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View
        pointerEvents="none"
        style={[StyleSheet.absoluteFill, { backgroundColor: theme.text, opacity: overlayOpacity }]}
      />
      <KeyboardAwareView style={styles.sheetWrap}>
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel={t.common.closeSection}
        />
        <View
          style={[
            styles.sheet,
            { backgroundColor: theme.backgroundElement, borderColor: theme.border },
          ]}>
          <View style={[styles.grabber, { backgroundColor: theme.border }]} />
          <ThemedText type="subtitle">{t.events.addTitle}</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {t.events.addHint}
          </ThemedText>
          <ScrollView
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.form}>
            <ThemedText type="smallBold">{t.events.titleLabel}</ThemedText>
            <TextInput
              value={title}
              onChangeText={setTitle}
              placeholder={t.events.titlePlaceholder}
              placeholderTextColor={theme.textSecondary}
              maxLength={120}
              returnKeyType="done"
              style={[
                styles.input,
                {
                  color: theme.text,
                  borderColor: theme.border,
                  backgroundColor: theme.background,
                },
              ]}
            />

            <ThemedText type="smallBold">{t.events.timeLabel}</ThemedText>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
              {HOURS.map((value) => (
                <Pressable
                  key={value}
                  onPress={() => setHour(value)}
                  accessibilityRole="button"
                  accessibilityState={{ selected: hour === value }}
                  style={chip(hour === value)}>
                  <ThemedText type="smallBold" style={chipText(hour === value)}>
                    {pad2(value)}
                  </ThemedText>
                </Pressable>
              ))}
            </ScrollView>
            <View style={styles.chipRow}>
              {MINUTES.map((value) => (
                <Pressable
                  key={value}
                  onPress={() => setMinute(value)}
                  accessibilityRole="button"
                  accessibilityState={{ selected: minute === value }}
                  style={chip(minute === value)}>
                  <ThemedText type="smallBold" style={chipText(minute === value)}>
                    :{pad2(value)}
                  </ThemedText>
                </Pressable>
              ))}
              <View style={[styles.preview, { borderColor: theme.border }]}>
                <ThemedText type="smallBold" themeColor="tint">
                  {pad2(hour)}:{pad2(minute)}
                </ThemedText>
              </View>
            </View>

            <ThemedText type="smallBold">{t.events.startLabel}</ThemedText>
            <View style={styles.chipRow}>
              {([0, 1] as const).map((offset) => (
                <Pressable
                  key={offset}
                  onPress={() => setStartOffset(offset)}
                  accessibilityRole="button"
                  accessibilityState={{ selected: startOffset === offset }}
                  style={chip(startOffset === offset)}>
                  <ThemedText type="smallBold" style={chipText(startOffset === offset)}>
                    {offset === 0 ? t.events.today : t.events.tomorrow}
                  </ThemedText>
                </Pressable>
              ))}
              <ThemedText type="small" themeColor="textSecondary" style={styles.dateHint}>
                {startDate}
              </ThemedText>
            </View>

            <ThemedText type="smallBold">{t.events.recurrenceLabel}</ThemedText>
            <View style={styles.chipRow}>
              {RECURRENCES.map((value) => (
                <Pressable
                  key={value}
                  onPress={() => setRecurrence(value)}
                  accessibilityRole="button"
                  accessibilityState={{ selected: recurrence === value }}
                  style={chip(recurrence === value)}>
                  <ThemedText type="smallBold" style={chipText(recurrence === value)}>
                    {t.events.recurrence[value]}
                  </ThemedText>
                </Pressable>
              ))}
            </View>
            {recurrence === 'weekly' ? (
              <View style={styles.chipRow}>
                {WEEKDAY_ORDER.map((day) => {
                  const selected = weekdays.includes(day);
                  return (
                    <Pressable
                      key={day}
                      onPress={() => toggleWeekday(day)}
                      accessibilityRole="button"
                      accessibilityState={{ selected }}
                      style={[chip(selected), styles.dayChip]}>
                      <ThemedText type="smallBold" style={chipText(selected)}>
                        {t.events.weekdaysShort[day]}
                      </ThemedText>
                    </Pressable>
                  );
                })}
              </View>
            ) : null}
          </ScrollView>

          <View style={styles.actions}>
            <Pressable
              onPress={onClose}
              accessibilityRole="button"
              style={({ pressed }) => [styles.secondary, { opacity: pressed ? 0.7 : 1 }]}>
              <ThemedText type="smallBold" themeColor="textSecondary">
                {t.common.cancel}
              </ThemedText>
            </Pressable>
            <Pressable
              onPress={submit}
              disabled={saving || !planId}
              accessibilityRole="button"
              style={({ pressed }) => [
                styles.primary,
                { backgroundColor: theme.accentWarm, opacity: pressed || saving ? 0.85 : 1 },
              ]}>
              {saving ? (
                <ActivityIndicator color={theme.onAccent} />
              ) : (
                <ThemedText type="smallBold" style={{ color: theme.onAccent }}>
                  {t.events.addAction}
                </ThemedText>
              )}
            </Pressable>
          </View>
        </View>
      </KeyboardAwareView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  sheetWrap: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheet: {
    maxHeight: '88%',
    borderTopLeftRadius: Radii.large + 6,
    borderTopRightRadius: Radii.large + 6,
    borderWidth: 1,
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.two,
    paddingBottom: Spacing.four,
    gap: Spacing.one,
  },
  grabber: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: Radii.pill,
    marginBottom: Spacing.two,
  },
  form: {
    gap: Spacing.two,
    paddingTop: Spacing.two,
    paddingBottom: Spacing.two,
  },
  input: {
    minHeight: 48,
    borderWidth: 1,
    borderRadius: Radii.medium,
    paddingHorizontal: Spacing.three,
    fontFamily: Fonts.sans,
    fontSize: 16,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: Spacing.two,
  },
  chip: {
    minHeight: 40,
    paddingHorizontal: Spacing.three,
    borderRadius: Radii.pill,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayChip: {
    minWidth: 48,
    paddingHorizontal: Spacing.two,
  },
  preview: {
    minHeight: 40,
    paddingHorizontal: Spacing.three,
    borderRadius: Radii.pill,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 'auto',
  },
  dateHint: {
    marginLeft: Spacing.one,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: Spacing.two,
    paddingTop: Spacing.two,
  },
  secondary: {
    minHeight: 48,
    paddingHorizontal: Spacing.three,
    justifyContent: 'center',
  },
  primary: {
    minHeight: 48,
    minWidth: 140,
    paddingHorizontal: Spacing.four,
    borderRadius: Radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
