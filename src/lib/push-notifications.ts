import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import type { Href, Router } from 'expo-router';
import { Platform } from 'react-native';

import { trackEvent } from '@/lib/analytics';
import {
  registerPushToken,
  unregisterPushToken,
  type PushPlatform,
} from '@/lib/api';
import type { Messages } from '@/i18n/types';

const ANDROID_CHANNEL_ID = 'niyetsen-gorevleri';
const ALLOWED_NOTIFICATION_URLS = new Set([
  '/daily',
  '/bonus',
  '/rank',
  '/tarot',
  '/rapor',
]);
const SCREEN_TO_URL: Record<string, string> = {
  rapor: '/rapor',
  daily: '/daily',
  bonus: '/bonus',
  rank: '/rank',
  tarot: '/tarot',
};

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export type PushStatus = {
  enabled: boolean;
  supported: boolean;
  permission: Notifications.PermissionStatus | 'unsupported';
  message: string | null;
};

function preferenceKey(userId: string): string {
  return `push-enabled:${userId}`;
}

function tokenKey(userId: string): string {
  return `push-token:${userId}`;
}

/**
 * ss-01 dersi: ham platform/FCM metni ASLA fırlatılmaz. Hata kodludur,
 * kullanıcı metni çağrı noktasında i18n'den üretilir (`pushHataMesaji`).
 */
export type PushHataKodu =
  | 'desteklenmiyor'
  | 'proje-kimligi-yok'
  | 'izin-verilmedi'
  | 'platform-desteklenmiyor';

export class PushHatasi extends Error {
  readonly kod: PushHataKodu;
  constructor(kod: PushHataKodu) {
    super(`push:${kod}`);
    this.name = 'PushHatasi';
    this.kod = kod;
  }
}

/** Kodlu hatayı o anki dile çevirir — ekrana basılan tek metin budur. */
export function pushHataMesaji(kod: PushHataKodu, t: Messages): string {
  switch (kod) {
    case 'desteklenmiyor':
      return t.settings.pushUnsupported;
    case 'izin-verilmedi':
      return t.settings.pushPermissionOff;
    case 'proje-kimligi-yok':
    case 'platform-desteklenmiyor':
      return t.settings.pushStatusFailed;
  }
}

function getProjectId(): string | null {
  const easProjectId = Constants.easConfig?.projectId;
  const extraProjectId = Constants.expoConfig?.extra?.eas?.projectId;
  const value = easProjectId ?? extraProjectId;
  return typeof value === 'string' && value.trim() ? value : null;
}

function desteklenmiyorMu(): boolean {
  if (Platform.OS === 'web') return true;
  if (!Device.isDevice) return true;
  if (Constants.appOwnership === 'expo') return true;
  return false;
}

async function ensureAndroidChannel(): Promise<void> {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync(ANDROID_CHANNEL_ID, {
    name: 'Niyetsen görevleri',
    description: 'Günlük görev ve bonus görev hatırlatıcıları',
    importance: Notifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 250, 200, 250],
    sound: 'default',
  });
}

export async function getPushStatus(userId: string, t: Messages): Promise<PushStatus> {
  if (desteklenmiyorMu()) {
    return {
      enabled: false,
      supported: false,
      permission: 'unsupported',
      message: t.settings.pushUnsupported,
    };
  }

  const [{ status }, enabledValue] = await Promise.all([
    Notifications.getPermissionsAsync(),
    AsyncStorage.getItem(preferenceKey(userId)),
  ]);
  const enabled = enabledValue === 'true' && status === Notifications.PermissionStatus.GRANTED;
  return {
    enabled,
    supported: true,
    permission: status,
    message:
      enabledValue === 'true' && status !== Notifications.PermissionStatus.GRANTED
        ? t.settings.pushPermissionOff
        : null,
  };
}

export async function enablePushNotifications(userId: string, t: Messages): Promise<PushStatus> {
  if (desteklenmiyorMu()) throw new PushHatasi('desteklenmiyor');

  const projectId = getProjectId();
  if (!projectId) {
    throw new PushHatasi('proje-kimligi-yok');
  }

  await ensureAndroidChannel();
  const permission = await Notifications.requestPermissionsAsync();
  if (permission.status !== Notifications.PermissionStatus.GRANTED) {
    await AsyncStorage.setItem(preferenceKey(userId), 'false');
    throw new PushHatasi('izin-verilmedi');
  }

  const response = await Notifications.getExpoPushTokenAsync({ projectId });
  const platform = Platform.OS as PushPlatform;
  if (platform !== 'ios' && platform !== 'android') {
    throw new PushHatasi('platform-desteklenmiyor');
  }
  await registerPushToken(response.data, platform);
  await AsyncStorage.multiSet([
    [preferenceKey(userId), 'true'],
    [tokenKey(userId), response.data],
  ]);

  return {
    enabled: true,
    supported: true,
    permission: permission.status,
    message: t.settings.pushEnabled,
  };
}

export async function disablePushNotifications(userId: string, t: Messages): Promise<PushStatus> {
  const token = await AsyncStorage.getItem(tokenKey(userId));
  if (token) await unregisterPushToken(token);
  await AsyncStorage.multiRemove([preferenceKey(userId), tokenKey(userId)]);

  const permission =
    Platform.OS === 'web'
      ? 'unsupported'
      : (await Notifications.getPermissionsAsync()).status;
  return {
    enabled: false,
    supported: !desteklenmiyorMu(),
    permission,
    message: t.settings.pushDisabled,
  };
}

export function openNotificationUrl(router: Router, value: unknown): boolean {
  if (typeof value !== 'string' || !ALLOWED_NOTIFICATION_URLS.has(value)) return false;
  void trackEvent('notification_opened', { url: value });
  router.push(value as Href);
  return true;
}

function resolveNotificationTarget(data: Record<string, unknown> | undefined): unknown {
  if (!data) return undefined;
  if (typeof data.url === 'string') return data.url;
  if (typeof data.screen === 'string') {
    return SCREEN_TO_URL[data.screen] ?? `/${data.screen}`;
  }
  return undefined;
}

export async function openLastNotificationResponse(router: Router): Promise<void> {
  if (Platform.OS === 'web') return;
  const response = await Notifications.getLastNotificationResponseAsync();
  const data = response?.notification.request.content.data as
    | Record<string, unknown>
    | undefined;
  if (openNotificationUrl(router, resolveNotificationTarget(data))) {
    await Notifications.clearLastNotificationResponseAsync();
  }
}

export function addNotificationResponseListener(
  router: Router,
): Notifications.EventSubscription | null {
  if (Platform.OS === 'web') return null;
  return Notifications.addNotificationResponseReceivedListener((response) => {
    const data = response.notification.request.content.data as
      | Record<string, unknown>
      | undefined;
    openNotificationUrl(router, resolveNotificationTarget(data));
  });
}
