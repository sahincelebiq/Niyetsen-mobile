import { useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Fonts, Radii, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useTheme } from '@/hooks/use-theme';
import { useI18n } from '@/providers/locale-provider';

const HOURS = Array.from({ length: 19 }, (_, index) => index + 6).concat([0]);
const MINUTES = Array.from({ length: 60 }, (_, index) => index);

export type TimeOfDayValue = {
  hour: number;
  minute: number;
};

type TimeOfDayFieldProps = {
  label: string;
  value: TimeOfDayValue;
  onChange: (value: TimeOfDayValue) => void;
};

export function formatTimeOfDay(value: TimeOfDayValue): string {
  return `${String(value.hour).padStart(2, '0')}:${String(value.minute).padStart(2, '0')}`;
}

export function parseTimeOfDay(raw: string, fallback: TimeOfDayValue): TimeOfDayValue {
  const match = /^(\d{1,2}):(\d{2})$/.exec(raw.trim());
  if (!match) return fallback;
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (Number.isNaN(hour) || Number.isNaN(minute)) return fallback;
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return fallback;
  return { hour, minute };
}

export function TimeOfDayField({ label, value, onChange }: TimeOfDayFieldProps) {
  const theme = useTheme();
  const scheme = useColorScheme();
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const display = useMemo(() => formatTimeOfDay(value), [value]);
  const overlayOpacity = scheme === 'dark' ? 0.55 : 0.32;

  return (
    <View style={styles.field}>
      <ThemedText type="smallBold">{label}</ThemedText>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t.onboarding.timeSelectA11y(label)}
        onPress={() => setOpen(true)}
        style={({ pressed }) => [
          styles.trigger,
          {
            borderColor: theme.border,
            backgroundColor: theme.surfaceMuted,
            opacity: pressed ? 0.85 : 1,
            transform: [{ scale: pressed ? 0.97 : 1 }],
          },
        ]}>
        <ThemedText style={{ fontFamily: Fonts.sansMedium }}>{display}</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          {t.onboarding.timeChange}
        </ThemedText>
      </Pressable>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <View style={styles.sheetRoot}>
          <View
            pointerEvents="none"
            style={[StyleSheet.absoluteFill, { backgroundColor: theme.text, opacity: overlayOpacity }]}
          />
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={() => setOpen(false)}
            accessibilityRole="button"
            accessibilityLabel={t.common.cancel}
          />
          <View
            style={[styles.sheet, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}
            accessibilityViewIsModal>
            <ThemedText type="subtitle">{t.onboarding.timeSelectTitle}</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              {t.onboarding.timeRangeHint}
            </ThemedText>
            <View style={styles.pickerRow}>
              <ScrollView style={styles.column} showsVerticalScrollIndicator={false}>
                {HOURS.map((hour) => {
                  const selected = value.hour === hour;
                  const hourLabel = String(hour).padStart(2, '0');
                  return (
                    <Pressable
                      key={`h-${hour}`}
                      accessibilityRole="button"
                      accessibilityState={{ selected }}
                      accessibilityLabel={hourLabel}
                      onPress={() => onChange({ ...value, hour })}
                      style={[
                        styles.option,
                        selected && { backgroundColor: theme.backgroundSelected },
                      ]}>
                      <ThemedText type={selected ? 'smallBold' : 'small'}>{hourLabel}</ThemedText>
                    </Pressable>
                  );
                })}
              </ScrollView>
              <ThemedText type="subtitle" themeColor="textSecondary">
                :
              </ThemedText>
              <ScrollView style={styles.column} showsVerticalScrollIndicator={false}>
                {MINUTES.map((minute) => {
                  const selected = value.minute === minute;
                  const minuteLabel = String(minute).padStart(2, '0');
                  return (
                    <Pressable
                      key={`m-${minute}`}
                      accessibilityRole="button"
                      accessibilityState={{ selected }}
                      accessibilityLabel={minuteLabel}
                      onPress={() => onChange({ ...value, minute })}
                      style={[
                        styles.option,
                        selected && { backgroundColor: theme.backgroundSelected },
                      ]}>
                      <ThemedText type={selected ? 'smallBold' : 'small'}>{minuteLabel}</ThemedText>
                    </Pressable>
                  );
                })}
              </ScrollView>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t.common.done}
              onPress={() => setOpen(false)}
              style={({ pressed }) => [
                styles.doneButton,
                {
                  backgroundColor: theme.accentWarm,
                  opacity: pressed ? 0.85 : 1,
                  transform: [{ scale: pressed ? 0.97 : 1 }],
                },
              ]}>
              <ThemedText style={{ color: theme.onAccent }} type="smallBold">
                {t.common.done}
              </ThemedText>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  field: {
    gap: Spacing.one,
  },
  trigger: {
    minHeight: 52,
    borderWidth: 1,
    borderRadius: Radii.medium,
    paddingHorizontal: Spacing.three,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sheetRoot: {
    flex: 1,
    justifyContent: 'flex-end',
    padding: Spacing.three,
    zIndex: 1,
  },
  sheet: {
    borderRadius: Radii.large,
    borderWidth: StyleSheet.hairlineWidth,
    padding: Spacing.four,
    gap: Spacing.three,
    zIndex: 1,
  },
  pickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
    maxHeight: 220,
  },
  column: {
    width: 72,
  },
  option: {
    minHeight: 44,
    paddingVertical: Spacing.two,
    borderRadius: Radii.small,
    alignItems: 'center',
    justifyContent: 'center',
  },
  doneButton: {
    minHeight: 52,
    borderRadius: Radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
