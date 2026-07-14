import * as Calendar from 'expo-calendar';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import type { Task, ToolCall } from '@/lib/api';

export type DeviceActionResult = {
  ok: boolean;
  message: string;
};

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

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('irade-gorevleri', {
      name: 'İrade görevleri',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 300, 200, 300],
      sound: 'default',
    });
  }

  let triggerDate = taskStart(task, hour, minute);
  if (triggerDate.getTime() <= Date.now()) {
    triggerDate = new Date(Date.now() + 60_000);
  }
  await Notifications.scheduleNotificationAsync({
    content: {
      title: 'Bugünün halkası seni bekliyor',
      body: task.title,
      sound: 'default',
      data: { taskId: task.id, url: '/daily' },
    },
    trigger:
      Platform.OS === 'android'
        ? { type: Notifications.SchedulableTriggerInputTypes.DATE, date: triggerDate, channelId: 'irade-gorevleri' }
        : { type: Notifications.SchedulableTriggerInputTypes.DATE, date: triggerDate },
  });
  return { ok: true, message: 'İrade hatırlatıcısı kuruldu.' };
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
    const time = String(call.args.time ?? '');
    const label = String(call.args.label ?? 'Niyetsen görevi');
    const date = nextTime(time);
    await Notifications.scheduleNotificationAsync({
      content: { title: 'Niyetsen', body: label, sound: 'default', data: { url: '/daily' } },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date },
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
