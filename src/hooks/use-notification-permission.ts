import { useCallback, useState } from 'react';
import { Linking } from 'react-native';

import {
  disablePushNotifications,
  enablePushNotifications,
  getPushStatus,
  type PushStatus,
} from '@/lib/push-notifications';
import { captureException } from '@/lib/sentry';
import { uiCopy } from '@/lib/ui-copy';

/**
 * Görev 01-B: bildirim durumu tek kanca altında. Toggle iyimser açılmaz —
 * gerçek izin sonucu dönene kadar `busy` kalır, sonuca göre yerleşir.
 * `denied` durumunda izni yeniden istemek yerine sistem ayarları açılır.
 */
export function useNotificationPermission(userId: string | null) {
  const [status, setStatus] = useState<PushStatus | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!userId) return;
    try {
      setStatus(await getPushStatus(userId));
    } catch (value) {
      captureException(value, 'hook:push-refresh');
      setError(value instanceof Error ? value.message : uiCopy().settings.pushStatusFailed);
    }
  }, [userId]);

  const openSettings = useCallback(async () => {
    try {
      await Linking.openSettings();
    } catch (value) {
      captureException(value, 'hook:push-settings');
    }
  }, []);

  const setEnabled = useCallback(
    async (enabled: boolean) => {
      if (!userId || busy) return;
      setBusy(true);
      setError(null);
      try {
        // Kalıcı rette sistemi yorma — doğrudan ayarlara gönder.
        if (enabled && status?.state === 'denied') {
          await Linking.openSettings().catch((value: unknown) =>
            captureException(value, 'hook:push-settings'),
          );
          setStatus(await getPushStatus(userId));
          return;
        }
        const next = enabled
          ? await enablePushNotifications(userId)
          : await disablePushNotifications(userId);
        setStatus(next);
      } catch (value) {
        captureException(value, 'hook:push-toggle');
        setError(value instanceof Error ? value.message : uiCopy().settings.notifPrefFailed);
        try {
          setStatus(await getPushStatus(userId));
        } catch {
          // Yenileme hatası sessiz — mevcut durum korunur.
        }
      } finally {
        setBusy(false);
      }
    },
    [busy, status?.state, userId],
  );

  return { status, busy, error, setEnabled, refresh, openSettings };
}
