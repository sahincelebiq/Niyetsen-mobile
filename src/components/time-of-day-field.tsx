import { useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Fonts, Radii, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

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
  const [open, setOpen] = useState(false);
  const display = useMemo(() => formatTimeOfDay(value), [value]);

  return (
    <View style={styles.field}>
      <ThemedText type="smallBold">{label}</ThemedText>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${label} seç`}
        onPress={() => setOpen(true)}
        style={({ pressed }) => [
          styles.trigger,
          {
            borderColor: theme.border,
            backgroundColor: theme.backgroundElement,
            opacity: pressed ? 0.85 : 1,
          },
        ]}>
        <ThemedText style={{ fontFamily: Fonts.sansMedium }}>{display}</ThemedText>
        <ThemedText themeColor="textSecondary">Değiştir</ThemedText>
      </Pressable>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)}>
          <Pressable
            style={[styles.sheet, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}
            onPress={(event) => event.stopPropagation()}>
            <ThemedText type="subtitle">Saat seç</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              06:00 – 00:00 arası. Gece yarısından sonra kurduğunda bir sonraki güne yazılır.
            </ThemedText>
            <View style={styles.pickerRow}>
              <ScrollView style={styles.column} showsVerticalScrollIndicator={false}>
                {HOURS.map((hour) => {
                  const selected = value.hour === hour;
                  return (
                    <Pressable
                      key={`h-${hour}`}
                      onPress={() => onChange({ ...value, hour })}
                      style={[
                        styles.option,
                        selected && { backgroundColor: theme.backgroundSelected },
                      ]}>
                      <ThemedText type={selected ? 'smallBold' : 'small'}>
                        {String(hour).padStart(2, '0')}
                      </ThemedText>
                    </Pressable>
                  );
                })}
              </ScrollView>
              <ThemedText type="title">:</ThemedText>
              <ScrollView style={styles.column} showsVerticalScrollIndicator={false}>
                {MINUTES.map((minute) => {
                  const selected = value.minute === minute;
                  return (
                    <Pressable
                      key={`m-${minute}`}
                      onPress={() => onChange({ ...value, minute })}
                      style={[
                        styles.option,
                        selected && { backgroundColor: theme.backgroundSelected },
                      ]}>
                      <ThemedText type={selected ? 'smallBold' : 'small'}>
                        {String(minute).padStart(2, '0')}
                      </ThemedText>
                    </Pressable>
                  );
                })}
              </ScrollView>
            </View>
            <Pressable
              onPress={() => setOpen(false)}
              style={({ pressed }) => [
                styles.doneButton,
                { backgroundColor: theme.accentWarm, opacity: pressed ? 0.85 : 1 },
              ]}>
              <ThemedText style={{ color: theme.onAccent }} type="smallBold">
                Tamam
              </ThemedText>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  field: {
    gap: Spacing.one,
  },
  trigger: {
    minHeight: 48,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: Radii.medium,
    paddingHorizontal: Spacing.three,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'flex-end',
    padding: Spacing.three,
  },
  sheet: {
    borderRadius: Radii.large,
    borderWidth: StyleSheet.hairlineWidth,
    padding: Spacing.four,
    gap: Spacing.three,
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
    paddingVertical: Spacing.two,
    borderRadius: Radii.small,
    alignItems: 'center',
  },
  doneButton: {
    minHeight: 44,
    borderRadius: Radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
