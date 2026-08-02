/**
 * FAZ 8.3 — Plan görev düzenleme: action sheet + başlık + tarih seçici.
 * Vision-board kart kimliği bu bileşenin dışında kalır; yalnız modal/sheet.
 */
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { Copy } from '@/constants/copy';
import { Fonts, Radii, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useTheme } from '@/hooks/use-theme';
import {
  addPlanTask,
  ApiError,
  deletePlanTask,
  editPlanTask,
  type Category,
  type Task,
  type TaskCreateRequest,
} from '@/lib/api';
import {
  addDaysIso,
  formatIsoDate,
  formatTrDate,
  isPastIso,
  parseIsoDate,
  resolveTaskDate,
  todayIsoLocal,
} from '@/lib/plan-dates';
import { showAlert, showConfirm } from '@/lib/web-alert';

type SheetMode = 'actions' | 'move' | 'edit' | 'add' | null;

export type PlanTaskEditorTarget = {
  task: Task;
  planStartDate?: string | null;
  planDurationDays?: number;
};

type PlanTaskEditorProps = {
  target: PlanTaskEditorTarget | null;
  addDate?: string | null;
  onClose: () => void;
  onChanged: () => void;
};

const WEEKDAYS = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'] as const;

function monthLabel(year: number, monthIndex: number): string {
  return new Date(year, monthIndex, 1).toLocaleDateString('tr-TR', {
    month: 'long',
    year: 'numeric',
  });
}

function buildMonthCells(year: number, monthIndex: number): (string | null)[] {
  const first = new Date(year, monthIndex, 1);
  // JS: 0=Pazar → Pzt başlangıç için kaydır
  const mondayOffset = (first.getDay() + 6) % 7;
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
  const cells: (string | null)[] = Array.from({ length: mondayOffset }, () => null);
  for (let day = 1; day <= daysInMonth; day += 1) {
    cells.push(formatIsoDate(new Date(year, monthIndex, day)));
  }
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

export function isTaskEditable(
  task: Task,
  planStartDate?: string | null,
  today = todayIsoLocal(),
): boolean {
  if (task.status !== 'pending') return false;
  const date = resolveTaskDate(task, planStartDate);
  if (!date) return true;
  return !isPastIso(date, today);
}

export function PlanTaskEditor({ target, addDate, onClose, onChanged }: PlanTaskEditorProps) {
  const theme = useTheme();
  const scheme = useColorScheme();
  const insets = useSafeAreaInsets();
  const visible = target !== null || !!addDate;

  const [mode, setMode] = useState<SheetMode>(null);
  const [busy, setBusy] = useState(false);
  const [titleDraft, setTitleDraft] = useState('');
  const [selectedDate, setSelectedDate] = useState(todayIsoLocal());
  const [cursor, setCursor] = useState(() => {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() };
  });

  const today = todayIsoLocal();
  const maxDate = useMemo(() => {
    const start = target?.planStartDate;
    const duration = target?.planDurationDays ?? 365;
    if (!start) return addDaysIso(today, 90);
    return addDaysIso(start, Math.max(duration - 1, 0));
  }, [target?.planStartDate, target?.planDurationDays, today]);

  useEffect(() => {
    if (!visible) {
      setMode(null);
      setBusy(false);
      return;
    }
    if (addDate) {
      setMode('add');
      setTitleDraft('');
      setSelectedDate(addDate);
      const d = parseIsoDate(addDate);
      setCursor({ year: d.getFullYear(), month: d.getMonth() });
      return;
    }
    if (target) {
      setMode('actions');
      setTitleDraft(target.task.title);
      const date = resolveTaskDate(target.task, target.planStartDate) ?? today;
      setSelectedDate(date < today ? today : date);
      const d = parseIsoDate(date < today ? today : date);
      setCursor({ year: d.getFullYear(), month: d.getMonth() });
    }
  }, [visible, target, addDate, today]);

  const monthCells = useMemo(
    () => buildMonthCells(cursor.year, cursor.month),
    [cursor.year, cursor.month],
  );

  function close() {
    if (busy) return;
    onClose();
  }

  async function run(action: () => Promise<void>) {
    setBusy(true);
    try {
      await action();
      onChanged();
      onClose();
    } catch (error) {
      showAlert(
        'İşlem tamamlanamadı',
        error instanceof ApiError
          ? error.message
          : error instanceof Error
            ? error.message
            : 'Birazdan tekrar dene.',
      );
    } finally {
      setBusy(false);
    }
  }

  function confirmDelete() {
    if (!target) return;
    showConfirm(Copy.plan.deleteConfirmTitle, Copy.plan.deleteConfirmBody, {
      cancelLabel: Copy.plan.cancel,
      confirmLabel: Copy.plan.deleteConfirmAction,
      onConfirm: () => {
        void run(async () => {
          await deletePlanTask(target.task.id);
        });
      },
    });
  }

  function saveTitle() {
    if (!target) return;
    const title = titleDraft.trim();
    if (!title) {
      showAlert(Copy.plan.editTitle, 'Başlık boş olamaz.');
      return;
    }
    void run(async () => {
      await editPlanTask(target.task.id, { title });
    });
  }

  function saveMove() {
    if (!target) return;
    if (isPastIso(selectedDate, today)) {
      showAlert(Copy.plan.moveTitle, Copy.plan.pastDayBlocked);
      return;
    }
    void run(async () => {
      await editPlanTask(target.task.id, { date: selectedDate });
    });
  }

  function saveAdd() {
    if (!addDate) return;
    const title = titleDraft.trim();
    if (!title) {
      showAlert(Copy.plan.addTaskTitle, 'Başlık boş olamaz.');
      return;
    }
    if (isPastIso(addDate, today)) {
      showAlert(Copy.plan.addTaskTitle, Copy.plan.pastDayBlocked);
      return;
    }
    const body: TaskCreateRequest = {
      title,
      categories: ['İstikrar'] as Category[],
    };
    void run(async () => {
      await addPlanTask(addDate, body);
    });
  }

  const overlayOpacity = scheme === 'dark' ? 0.55 : 0.32;
  const sheetPad = { paddingBottom: insets.bottom + Spacing.three };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={close}>
      <View style={styles.root}>
        <View style={styles.backdrop}>
          <View
            pointerEvents="none"
            style={[StyleSheet.absoluteFill, { backgroundColor: theme.text, opacity: overlayOpacity }]}
          />
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={close}
            accessibilityRole="button"
            accessibilityLabel="Paneli kapat"
          />
        </View>

        <View
          style={[
            styles.sheet,
            sheetPad,
            { backgroundColor: theme.backgroundElement, borderColor: theme.border },
          ]}>
          {mode === 'actions' && target ? (
            <>
              <ThemedText type="subtitle">{Copy.plan.taskActionsTitle}</ThemedText>
              <ThemedText type="small" themeColor="textSecondary" numberOfLines={2}>
                {target.task.title}
              </ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                {Copy.plan.taskActionsHint}
              </ThemedText>
              <ActionRow
                label={Copy.plan.move}
                onPress={() => setMode('move')}
                disabled={busy}
              />
              <ActionRow
                label={Copy.plan.edit}
                onPress={() => setMode('edit')}
                disabled={busy}
              />
              <ActionRow
                label={Copy.plan.delete}
                tone="danger"
                onPress={confirmDelete}
                disabled={busy}
              />
              <ActionRow label={Copy.plan.cancel} muted onPress={close} disabled={busy} />
            </>
          ) : null}

          {mode === 'move' ? (
            <>
              <ThemedText type="subtitle">{Copy.plan.moveTitle}</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                {Copy.plan.moveHint}
              </ThemedText>
              <DateGrid
                year={cursor.year}
                month={cursor.month}
                cells={monthCells}
                selectedDate={selectedDate}
                today={today}
                maxDate={maxDate}
                onSelect={setSelectedDate}
                onPrev={() =>
                  setCursor((c) => {
                    const m = c.month - 1;
                    return m < 0 ? { year: c.year - 1, month: 11 } : { year: c.year, month: m };
                  })
                }
                onNext={() =>
                  setCursor((c) => {
                    const m = c.month + 1;
                    return m > 11 ? { year: c.year + 1, month: 0 } : { year: c.year, month: m };
                  })
                }
              />
              <ThemedText type="small" themeColor="tint">
                Seçili: {formatTrDate(selectedDate)}
              </ThemedText>
              <PrimaryButton label="Taşı" busy={busy} onPress={saveMove} />
              <ActionRow label={Copy.plan.cancel} muted onPress={() => setMode('actions')} disabled={busy} />
            </>
          ) : null}

          {mode === 'edit' ? (
            <>
              <ThemedText type="subtitle">{Copy.plan.editTitle}</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                {Copy.plan.editHint}
              </ThemedText>
              <TextInput
                value={titleDraft}
                onChangeText={setTitleDraft}
                placeholder={Copy.plan.titlePlaceholder}
                placeholderTextColor={theme.textSecondary}
                maxLength={200}
                autoFocus
                style={[
                  styles.input,
                  {
                    borderColor: theme.border,
                    color: theme.text,
                    backgroundColor: theme.background,
                    fontFamily: Fonts.sans,
                  },
                ]}
              />
              <PrimaryButton label={Copy.plan.save} busy={busy} onPress={saveTitle} />
              <ActionRow label={Copy.plan.cancel} muted onPress={() => setMode('actions')} disabled={busy} />
            </>
          ) : null}

          {mode === 'add' ? (
            <>
              <ThemedText type="subtitle">{Copy.plan.addTaskTitle}</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                {Copy.plan.addTaskHint}
              </ThemedText>
              {addDate ? (
                <ThemedText type="smallBold" themeColor="tint">
                  {formatTrDate(addDate)}
                </ThemedText>
              ) : null}
              <TextInput
                value={titleDraft}
                onChangeText={setTitleDraft}
                placeholder={Copy.plan.titlePlaceholder}
                placeholderTextColor={theme.textSecondary}
                maxLength={200}
                autoFocus
                style={[
                  styles.input,
                  {
                    borderColor: theme.border,
                    color: theme.text,
                    backgroundColor: theme.background,
                    fontFamily: Fonts.sans,
                  },
                ]}
              />
              <PrimaryButton label={Copy.plan.addTaskAction} busy={busy} onPress={saveAdd} />
              <ActionRow label={Copy.plan.cancel} muted onPress={close} disabled={busy} />
            </>
          ) : null}
        </View>
      </View>
    </Modal>
  );
}

function ActionRow({
  label,
  onPress,
  disabled,
  tone,
  muted,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  tone?: 'danger';
  muted?: boolean;
}) {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.actionRow,
        {
          backgroundColor: muted ? theme.surfaceMuted : theme.background,
          borderColor: theme.border,
          opacity: pressed || disabled ? 0.7 : 1,
        },
      ]}>
      <ThemedText
        type="smallBold"
        themeColor={tone === 'danger' ? 'danger' : muted ? 'textSecondary' : 'text'}>
        {label}
      </ThemedText>
    </Pressable>
  );
}

function PrimaryButton({
  label,
  onPress,
  busy,
}: {
  label: string;
  onPress: () => void;
  busy: boolean;
}) {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      disabled={busy}
      onPress={onPress}
      style={({ pressed }) => [
        styles.primaryButton,
        {
          backgroundColor: theme.accentWarm,
          opacity: pressed || busy ? 0.8 : 1,
        },
      ]}>
      {busy ? (
        <ActivityIndicator color={theme.onAccent} />
      ) : (
        <ThemedText type="smallBold" style={{ color: theme.onAccent }}>
          {label}
        </ThemedText>
      )}
    </Pressable>
  );
}

function DateGrid({
  year,
  month,
  cells,
  selectedDate,
  today,
  maxDate,
  onSelect,
  onPrev,
  onNext,
}: {
  year: number;
  month: number;
  cells: (string | null)[];
  selectedDate: string;
  today: string;
  maxDate: string;
  onSelect: (iso: string) => void;
  onPrev: () => void;
  onNext: () => void;
}) {
  const theme = useTheme();
  return (
    <View style={styles.calendar}>
      <View style={styles.monthNav}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Önceki ay"
          hitSlop={12}
          onPress={onPrev}
          style={({ pressed }) => [styles.navChip, { opacity: pressed ? 0.7 : 1 }]}>
          <ThemedText type="smallBold" themeColor="tint">
            ‹
          </ThemedText>
        </Pressable>
        <ThemedText type="smallBold" style={styles.monthTitle}>
          {monthLabel(year, month)}
        </ThemedText>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Sonraki ay"
          hitSlop={12}
          onPress={onNext}
          style={({ pressed }) => [styles.navChip, { opacity: pressed ? 0.7 : 1 }]}>
          <ThemedText type="smallBold" themeColor="tint">
            ›
          </ThemedText>
        </Pressable>
      </View>
      <View style={styles.weekRow}>
        {WEEKDAYS.map((day) => (
          <ThemedText key={day} type="small" themeColor="textSecondary" style={styles.weekCell}>
            {day}
          </ThemedText>
        ))}
      </View>
      <ScrollView style={styles.gridScroll} showsVerticalScrollIndicator={false}>
        <View style={styles.grid}>
          {cells.map((iso, index) => {
            if (!iso) {
              return <View key={`e-${index}`} style={styles.dayCell} />;
            }
            const disabled = iso < today || iso > maxDate;
            const selected = iso === selectedDate;
            const isToday = iso === today;
            return (
              <Pressable
                key={iso}
                disabled={disabled}
                accessibilityRole="button"
                accessibilityState={{ selected, disabled }}
                onPress={() => onSelect(iso)}
                style={({ pressed }) => [
                  styles.dayCell,
                  {
                    backgroundColor: selected
                      ? theme.accentWarm
                      : isToday
                        ? theme.backgroundSelected
                        : 'transparent',
                    opacity: disabled ? 0.28 : pressed ? 0.75 : 1,
                    borderColor: isToday && !selected ? theme.tint : 'transparent',
                    borderWidth: isToday && !selected ? 1.5 : 0,
                  },
                ]}>
                <ThemedText
                  type="smallBold"
                  style={{
                    color: selected ? theme.onAccent : disabled ? theme.textSecondary : theme.text,
                  }}>
                  {Number(iso.slice(8, 10))}
                </ThemedText>
              </Pressable>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  sheet: {
    borderTopLeftRadius: Radii.large,
    borderTopRightRadius: Radii.large,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.four,
    gap: Spacing.two,
    maxHeight: '88%',
  },
  actionRow: {
    minHeight: 48,
    borderRadius: Radii.medium,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.three,
  },
  primaryButton: {
    minHeight: 48,
    borderRadius: Radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  input: {
    minHeight: 52,
    borderWidth: 1,
    borderRadius: Radii.medium,
    paddingHorizontal: Spacing.three,
    fontSize: 16,
  },
  calendar: {
    gap: Spacing.two,
  },
  monthNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  navChip: {
    minWidth: 44,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  monthTitle: {
    textTransform: 'capitalize',
    fontFamily: Fonts.serif,
  },
  weekRow: {
    flexDirection: 'row',
  },
  weekCell: {
    width: `${100 / 7}%`,
    textAlign: 'center',
  },
  gridScroll: {
    maxHeight: 260,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  dayCell: {
    width: `${100 / 7}%`,
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radii.small,
  },
});
