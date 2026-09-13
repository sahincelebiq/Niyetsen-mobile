import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import type { Messages } from '@/i18n/types';

/** Görev 01-C: Android bildirim kanalları — tek liste, tek kurulum. */
export const NOTIFICATION_CHANNELS = [
  {
    id: 'gunluk-hatirlatma',
    nameKey: 'channelDaily',
    descKey: 'channelDailyDesc',
    importance: Notifications.AndroidImportance.DEFAULT,
  },
  {
    id: 'gorev-zamani',
    nameKey: 'channelTasks',
    descKey: 'channelTasksDesc',
    importance: Notifications.AndroidImportance.HIGH,
  },
  {
    id: 'zincir-uyarisi',
    nameKey: 'channelStreak',
    descKey: 'channelStreakDesc',
    importance: Notifications.AndroidImportance.HIGH,
  },
  {
    id: 'bonus',
    nameKey: 'channelBonus',
    descKey: 'channelBonusDesc',
    importance: Notifications.AndroidImportance.LOW,
  },
] as const;

export type NotificationChannelId = (typeof NOTIFICATION_CHANNELS)[number]['id'];

/** Eski kanal kimlikleri → yeni karşılık (kurulumda sessizce taşınır). */
const LEGACY_CHANNEL_MAP: Record<string, NotificationChannelId> = {
  'niyetsen-gorevleri': 'gorev-zamani',
  'irade-gorevleri': 'gorev-zamani',
};

export function resolveChannelId(id: string): NotificationChannelId | string {
  return LEGACY_CHANNEL_MAP[id] ?? id;
}

/**
 * Dört kanalı kurar; eski kanalları silmez (kullanıcı ayarları korunur),
 * yalnız yeni kimliklere taşır. i18n metni çağırandan gelir.
 */
export async function ensureNotificationChannels(
  t: Messages['settings'],
): Promise<void> {
  if (Platform.OS !== 'android') return;
  for (const channel of NOTIFICATION_CHANNELS) {
    const name = t[channel.nameKey];
    const description = t[channel.descKey];
    await Notifications.setNotificationChannelAsync(channel.id, {
      name,
      description,
      importance: channel.importance,
      vibrationPattern: [0, 250, 200, 250],
      sound: 'default',
    });
  }
}
