import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Calendar from 'expo-calendar';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import type { Task, ToolCall } from '@/lib/api';
import { ensureNotificationChannels } from '@/lib/notification-channels';
import { captureException } from '@/lib/sentry';
import { uiCopy } from '@/lib/ui-copy';

export type DeviceActionResult = {
  ok: boolean;
  message: string;
};

const TASK_CHANNEL_ID = 'gorev-zamani';
const DAILY_LOCAL_ID_KEY = 'irade-daily-id';

export function supportsWillpowerReminder(task: Task): boolean {
  return task.categories.some((category) => category === 'İrade' || category === 'Disiplin');
}

function taskStart(task: Task, hour: number, minute = 0): Date {
  const date = task.date ?? new Date().toISOString().slice(0, 10);
  const start = new Date(
    `${date}T${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:00`,
  );
  if (Number.isNaN(start.getTime())) throw new Error('Görev tarihi geçersiz.');
  if (start.getTime() <= Date.now()) {
    return new Date(start.getTime() + 24 * 60 * 60 * 1000);
  }
  return start;
}

async function ensureTaskChannel(): Promise<void> {
  try {
    await ensureNotificationChannels(uiCopy().settings);
  } catch (error) {
    captureException(error, 'reminders:channels');
  }
}

export async function scheduleTaskNotification(
  task: Task,
  hour: number,
  minute = 0,
): Promise<DeviceActionResult> {
  if (Platform.OS === 'web') {
    return { ok: false, message: 'Yerel görev bildirimleri web sürümünde desteklenmiyor.' };
  }
  if (!supportsWillpowerReminder(task)) {
    return { ok: false, message: 'Hatırlatıcı yalnız İrade ve Disiplin görevleri içindir.' };
  }

  const permission = await Notifications.requestPermissionsAsync();
  if (!permission.granted) {
    return {
      ok: false,
      message: 'Bildirim izni verilmedi. Görevlerin uygulama içinde görünmeye devam edecek.',
    };
  }

  await ensureTaskChannel();
  const copy = uiCopy().settings;

  let triggerDate = taskStart(task, hour, minute);
  if (triggerDate.getTime() <= Date.now()) {
    triggerDate = new Date(Date.now() + 60_000);
  }
  await Notifications.scheduleNotificationAsync({
    content: {
      title: copy.dailyReminderTitle,
      body: copy.dailyReminderBody(task.title),
      sound: 'default',
      data: { taskId: task.id, url: '/daily' },
    },
    trigger:
      Platform.OS === 'android'
        ? { type: Notifications.SchedulableTriggerInputTypes.DATE, date: triggerDate, channelId: TASK_CHANNEL_ID }
        : { type: Notifications.SchedulableTriggerInputTypes.DATE, date: triggerDate },
  });
  return { ok: true, message: 'İrade hatırlatıcısı kuruldu.' };
}

/**
 * Görev 01-E: günlük yerel hatırlatıcı — push'tan tamamen bağımsız.
 * Sunucudaki kayıtlı saat değiştiğinde eski zamanlama iptal edilip yenisi
 * kurulur; DAILY tetikleyici cihaz saat dilimini kullanır.
 */
export async function rescheduleDailyLocalReminder(
  hour: number,
  minute = 0,
): Promise<boolean> {
  try {
    if (Platform.OS === 'web') return false;
    const permission = await Notifications.getPermissionsAsync();
    if (!permission.granted) return false;
    await ensureTaskChannel();
    const previous = await AsyncStorage.getItem(DAILY_LOCAL_ID_KEY).catch(() => null);
    if (previous) {
      await Notifications.cancelScheduledNotificationAsync(previous).catch(() => undefined);
    }
    const copy = uiCopy().settings;
    const id = await Notifications.scheduleNotificationAsync({
      content: {
        title: copy.dailyReminderTitle,
        body: copy.channelDailyDesc,
        sound: 'default',
        data: { url: '/daily', kind: 'daily-local' },
      },
      trigger:
        Platform.OS === 'android'
          ? {
              type: Notifications.SchedulableTriggerInputTypes.DAILY,
              hour,
              minute,
              channelId: TASK_CHANNEL_ID,
            }
          : { type: Notifications.SchedulableTriggerInputTypes.DAILY, hour, minute },
    });
    await AsyncStorage.setItem(DAILY_LOCAL_ID_KEY, id).catch(() => undefined);
    return true;
  } catch (error) {
    captureException(error, 'reminders:daily');
    return false;
  }
}

/** Saat dilimi değişiminde günlük hatırlatıcıyı aynı saatle yeniden kurar. */
export async function refreshDailyLocalOnTimezoneChange(
  hour: number,
  minute = 0,
): Promise<boolean> {
  return rescheduleDailyLocalReminder(hour, minute);
}

export async function cancelDailyLocalReminder(): Promise<void> {
  try {
    const previous = await AsyncStorage.getItem(DAILY_LOCAL_ID_KEY).catch(() => null);
    if (previous) {
      await Notifications.cancelScheduledNotificationAsync(previous).catch(() => undefined);
    }
  } catch (error) {
    captureException(error, 'reminders:daily-cancel');
  } finally {
    await AsyncStorage.removeItem(DAILY_LOCAL_ID_KEY).catch(() => undefined);
  }
}

export async function addTaskToCalendar(
  task: Task,
  hour: number,
  minute = 0,
): Promise<DeviceActionResult> {
  if (Platform.OS === 'web') {
    return { ok: false, message: 'Takvime ekleme web sürümünde desteklenmiyor.' };
  }
  if (!supportsWillpowerReminder(task)) {
    return { ok: false, message: 'Takvim kısayolu yalnız İrade ve Disiplin görevleri içindir.' };
  }

  const permission = await Calendar.requestCalendarPermissionsAsync();
  if (!permission.granted) {
    return {
      ok: false,
      message: 'Takvim izni verilmedi. Görevlerin uygulama içinde görünmeye devam edecek.',
    };
  }

  const calendars = await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT);
  const target = calendars.find((calendar) => calendar.isPrimary && calendar.allowsModifications)
    ?? calendars.find((calendar) => calendar.allowsModifications);
  if (!target) {
    return { ok: false, message: 'Yazılabilir bir cihaz takvimi bulunamadı.' };
  }

  const startDate = taskStart(task, hour, minute);
  const endDate = new Date(startDate.getTime() + Math.max(task.duration_min, 5) * 60_000);
  await Calendar.createEventAsync(target.id, {
    title: task.title,
    notes: `Niyetsen · ${task.categories.join(' · ')}`,
    startDate,
    endDate,
    alarms: [{ relativeOffset: -10 }],
    timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  });
  return { ok: true, message: 'Görev cihaz takvimine eklendi.' };
}

function nextTime(time: string): Date {
  const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(time);
  if (!match) throw new Error('Saat HH:MM biçiminde olmalı.');
  const next = new Date();
  next.setHours(Number(match[1]), Number(match[2]), 0, 0);
  if (next.getTime() <= Date.now()) next.setDate(next.getDate() + 1);
  return next;
}

export async function executeDeviceTool(
  call: ToolCall,
): Promise<DeviceActionResult> {
  if (Platform.OS === 'web') {
    return { ok: false, message: 'Bu cihaz işlemi web sürümünde desteklenmiyor.' };
  }
  if (call.name === 'alarm_kur') {
    const permission = await Notifications.requestPermissionsAsync();
    if (!permission.granted) {
      return { ok: false, message: 'Bildirim izni verilmedi; alarm kurulmadı.' };
    }
    await ensureTaskChannel();
    const time = String(call.args.time ?? '');
    const label = String(call.args.label ?? 'Niyetsen görevi');
    const date = nextTime(time);
    await Notifications.scheduleNotificationAsync({
      content: { title: 'Niyetsen', body: label, sound: 'default', data: { url: '/daily' } },
      trigger:
        Platform.OS === 'android'
          ? { type: Notifications.SchedulableTriggerInputTypes.DATE, date, channelId: TASK_CHANNEL_ID }
          : { type: Notifications.SchedulableTriggerInputTypes.DATE, date },
    });
    return { ok: true, message: `${time} için yerel hatırlatıcı kuruldu.` };
  }
  if (call.name === 'takvime_ekle') {
    const permission = await Calendar.requestCalendarPermissionsAsync();
    if (!permission.granted) {
      return { ok: false, message: 'Takvim izni verilmedi; etkinlik eklenmedi.' };
    }
    const calendars = await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT);
    const target = calendars.find((item) => item.isPrimary && item.allowsModifications)
      ?? calendars.find((item) => item.allowsModifications);
    if (!target) return { ok: false, message: 'Yazılabilir cihaz takvimi bulunamadı.' };
    const eventDate = String(call.args.date ?? '');
    const eventTime = String(call.args.time ?? '09:00');
    const startDate = new Date(`${eventDate}T${eventTime}:00`);
    if (Number.isNaN(startDate.getTime())) {
      return { ok: false, message: 'Takvim tarihi veya saati geçersiz.' };
    }
    await Calendar.createEventAsync(target.id, {
      title: String(call.args.title ?? 'Niyetsen görevi'),
      startDate,
      endDate: new Date(startDate.getTime() + 30 * 60_000),
      notes: 'Niyetsen tarafından eklendi.',
      alarms: [{ relativeOffset: -10 }],
    });
    return { ok: true, message: 'Etkinlik cihaz takvimine eklendi.' };
  }
  return { ok: false, message: 'Bu işlem görev ekranından tamamlanmalı.' };
}
