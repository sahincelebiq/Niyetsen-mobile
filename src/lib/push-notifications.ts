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

function getProjectId(): string | null {
  const easProjectId = Constants.easConfig?.projectId;
  const extraProjectId = Constants.expoConfig?.extra?.eas?.projectId;
  const value = easProjectId ?? extraProjectId;
  return typeof value === 'string' && value.trim() ? value : null;
}

function unsupportedMessage(): string | null {
  if (Platform.OS === 'web') {
    return 'Push bildirimleri web sürümünde desteklenmiyor.';
  }
  if (!Device.isDevice) {
    return 'Push bildirimleri simülatörde çalışmaz; fiziksel cihaz gerekir.';
  }
  if (Constants.appOwnership === 'expo') {
    return 'Uzaktan push Expo Go’da desteklenmiyor; development build kullan.';
  }
  return null;
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

export async function getPushStatus(userId: string): Promise<PushStatus> {
  const unsupported = unsupportedMessage();
  if (unsupported) {
    return {
      enabled: false,
      supported: false,
      permission: 'unsupported',
      message: unsupported,
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
        ? 'Bildirim izni cihaz ayarlarından kapatılmış.'
        : null,
  };
}

export async function enablePushNotifications(userId: string): Promise<PushStatus> {
  const unsupported = unsupportedMessage();
  if (unsupported) throw new Error(unsupported);

  const projectId = getProjectId();
  if (!projectId) {
    throw new Error(
      'EAS projectId bulunamadı. Push için app.json extra.eas.projectId veya EAS proje bağlantısı gerekli.',
    );
  }

  await ensureAndroidChannel();
  const permission = await Notifications.requestPermissionsAsync();
  if (permission.status !== Notifications.PermissionStatus.GRANTED) {
    await AsyncStorage.setItem(preferenceKey(userId), 'false');
    throw new Error(
      'Bildirim izni verilmedi. Uygulama bildirim olmadan çalışmaya devam edecek.',
    );
  }

  const response = await Notifications.getExpoPushTokenAsync({ projectId });
  const platform = Platform.OS as PushPlatform;
  if (platform !== 'ios' && platform !== 'android') {
    throw new Error('Bu platform push bildirimlerini desteklemiyor.');
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
    message: 'Bildirimler açıldı.',
  };
}

export async function disablePushNotifications(userId: string): Promise<PushStatus> {
  const token = await AsyncStorage.getItem(tokenKey(userId));
  if (token) await unregisterPushToken(token);
  await AsyncStorage.multiRemove([preferenceKey(userId), tokenKey(userId)]);

  const permission =
    Platform.OS === 'web'
      ? 'unsupported'
      : (await Notifications.getPermissionsAsync()).status;
  return {
    enabled: false,
    supported: unsupportedMessage() === null,
    permission,
    message: 'Bildirimler kapatıldı. Sistem iznini cihaz ayarlarından da değiştirebilirsin.',
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
