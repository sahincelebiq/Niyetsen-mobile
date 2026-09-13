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
import { ensureNotificationChannels } from '@/lib/notification-channels';
import { captureException } from '@/lib/sentry';
import { uiCopy } from '@/lib/ui-copy';

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

/**
 * Görev 01-B: bildirim durum makinesi — ekrandaki tek kapalı toggle
 * artık bu 5 durumdan birini gösterir.
 */
export type NotificationState =
  | 'unsupported'
  | 'undetermined'
  | 'denied'
  | 'granted_no_token'
  | 'ready';

export type PushStatus = {
  enabled: boolean;
  supported: boolean;
  permission: Notifications.PermissionStatus | 'unsupported';
  state: NotificationState;
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

function unsupportedReason(): string | null {
  if (Platform.OS === 'web') return 'web';
  if (!Device.isDevice) return 'simulator';
  if (Constants.appOwnership === 'expo') return 'expo-go';
  return null;
}

async function ensureChannels(): Promise<void> {
  try {
    await ensureNotificationChannels(uiCopy().settings);
  } catch (error) {
    captureException(error, 'push:channels');
  }
}

function stateMessage(
  state: NotificationState,
  permission: Notifications.PermissionStatus | 'unsupported',
  preferenceOn: boolean,
): string | null {
  const t = uiCopy().settings;
  switch (state) {
    case 'unsupported':
      return t.pushUnsupported;
    case 'undetermined':
      // İzin hiç istenmemiş ya da uygulama tercihi kapalı: davet cümlesi.
      return preferenceOn ? null : t.pushTapToEnable;
    case 'denied':
      return permission === 'unsupported' ? null : t.pushDeniedHint;
    case 'granted_no_token':
      return t.pushConnecting;
    case 'ready':
      return null;
    default:
      return null;
  }
}

export async function getPushStatus(userId: string): Promise<PushStatus> {
  if (unsupportedReason()) {
    return {
      enabled: false,
      supported: false,
      permission: 'unsupported',
      state: 'unsupported',
      message: uiCopy().settings.pushUnsupported,
    };
  }

  let status: Notifications.PermissionStatus;
  let enabledValue: string | null;
  try {
    const [permission, stored] = await Promise.all([
      Notifications.getPermissionsAsync(),
      AsyncStorage.getItem(preferenceKey(userId)),
    ]);
    status = permission.status;
    enabledValue = stored;
  } catch (error) {
    captureException(error, 'push:status');
    throw new Error(uiCopy().settings.pushStatusFailed);
  }

  const preferenceOn = enabledValue === 'true';
  let state: NotificationState;
  if (status === Notifications.PermissionStatus.UNDETERMINED) {
    state = 'undetermined';
  } else if (status === Notifications.PermissionStatus.DENIED) {
    state = 'denied';
  } else if (preferenceOn) {
    const token = await AsyncStorage.getItem(tokenKey(userId)).catch(() => null);
    state = token ? 'ready' : 'granted_no_token';
  } else {
    state = 'undetermined';
  }

  return {
    enabled: state === 'ready',
    supported: true,
    permission: status,
    state,
    message: stateMessage(state, status, preferenceOn),
  };
}

export async function enablePushNotifications(userId: string): Promise<PushStatus> {
  if (unsupportedReason()) {
    throw new Error(uiCopy().settings.pushUnsupported);
  }

  const projectId = getProjectId();
  if (!projectId) {
    captureException(new Error('EAS projectId yok'), 'push:projectId');
    throw new Error(uiCopy().settings.notifPrefFailed);
  }

  await ensureChannels();

  let permission: Notifications.PermissionResponse;
  try {
    permission = await Notifications.requestPermissionsAsync();
  } catch (error) {
    captureException(error, 'push:permission');
    throw new Error(uiCopy().settings.notifPrefFailed);
  }
  if (permission.status !== Notifications.PermissionStatus.GRANTED) {
    await AsyncStorage.setItem(preferenceKey(userId), 'false').catch(() => undefined);
    throw new Error(uiCopy().settings.pushDenied);
  }

  let expoToken: string;
  try {
    const response = await Notifications.getExpoPushTokenAsync({ projectId });
    expoToken = response.data;
  } catch (error) {
    // Ham FCM/credential detayı asla ekrana çıkmaz — servise + konsola gider.
    captureException(error, 'push:token');
    throw new Error(uiCopy().settings.notifPrefFailed);
  }

  const platform = Platform.OS as PushPlatform;
  if (platform !== 'ios' && platform !== 'android') {
    throw new Error(uiCopy().settings.pushUnsupported);
  }
  try {
    await registerPushToken(expoToken, platform);
  } catch (error) {
    captureException(error, 'push:register');
    throw new Error(uiCopy().settings.notifPrefFailed);
  }
  await AsyncStorage.multiSet([
    [preferenceKey(userId), 'true'],
    [tokenKey(userId), expoToken],
  ]);

  return {
    enabled: true,
    supported: true,
    permission: permission.status,
    state: 'ready',
    message: null,
  };
}

export async function disablePushNotifications(userId: string): Promise<PushStatus> {
  const token = await AsyncStorage.getItem(tokenKey(userId)).catch(() => null);
  if (token) {
    try {
      await unregisterPushToken(token);
    } catch (error) {
      captureException(error, 'push:unregister');
    }
  }
  await AsyncStorage.multiRemove([preferenceKey(userId), tokenKey(userId)]).catch(
    () => undefined,
  );

  const permission =
    Platform.OS === 'web'
      ? 'unsupported'
      : (await Notifications.getPermissionsAsync().catch(() => null))?.status ??
        Notifications.PermissionStatus.UNDETERMINED;
  const state: NotificationState =
    permission === 'unsupported'
      ? 'unsupported'
      : permission === Notifications.PermissionStatus.DENIED
        ? 'denied'
        : 'undetermined';
  return {
    enabled: false,
    supported: unsupportedReason() === null,
    permission,
    state,
    message: null,
  };
}

/**
 * Görev 01-D: uygulama her açılışında token tazeliği. İzin yoksa sessizce
 * çıkar; hata fırlatmaz (açılış akışını düşürmez).
 */
export async function refreshPushTokenIfNeeded(userId: string): Promise<boolean> {
  try {
    if (unsupportedReason()) return false;
    const [permission, preference] = await Promise.all([
      Notifications.getPermissionsAsync(),
      AsyncStorage.getItem(preferenceKey(userId)),
    ]);
    if (
      permission.status !== Notifications.PermissionStatus.GRANTED ||
      preference !== 'true'
    ) {
      return false;
    }
    const projectId = getProjectId();
    if (!projectId) return false;
    const response = await Notifications.getExpoPushTokenAsync({ projectId });
    const stored = await AsyncStorage.getItem(tokenKey(userId));
    if (stored === response.data) return false;
    const platform = Platform.OS as PushPlatform;
    if (platform !== 'ios' && platform !== 'android') return false;
    await registerPushToken(response.data, platform);
    await AsyncStorage.setItem(tokenKey(userId), response.data);
    return true;
  } catch (error) {
    captureException(error, 'push:refresh');
    return false;
  }
}

/**
 * Görev 01-D: çıkışta token sızıntısı yok. Kayıtlı token backend'den
 * kapatılmaya çalışılır; yereldeki anahtarlar her durumda silinir.
 */
export async function clearPushStateOnSignOut(userId: string): Promise<void> {
  try {
    const token = await AsyncStorage.getItem(tokenKey(userId)).catch(() => null);
    if (token) {
      try {
        await unregisterPushToken(token);
      } catch (error) {
        captureException(error, 'push:signout-unregister');
      }
    }
  } finally {
    await AsyncStorage.multiRemove([preferenceKey(userId), tokenKey(userId)]).catch(
      () => undefined,
    );
  }
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
