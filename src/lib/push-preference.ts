/**
 * Bildirim anahtarının kararı. İşletim sistemi izni ile uygulama tercihi ayrıdır.
 * Saf fonksiyon — Expo importu yok, test edilir.
 */

export type PushPermission = 'granted' | 'denied' | 'undetermined' | 'unsupported';

export type PushUiState =
  | 'unsupported'
  | 'undetermined'
  | 'denied'
  | 'granted_no_token'
  | 'ready';

export type StoredPushPreference = 'true' | 'false' | null;

export function resolvePushUi(input: {
  supported: boolean;
  permission: PushPermission;
  /** null = hiç seçilmedi. 'false' = kullanıcı anahtarı kapattı. */
  preference: StoredPushPreference;
  hasToken: boolean;
}): { enabled: boolean; state: PushUiState } {
  if (!input.supported || input.permission === 'unsupported') {
    return { enabled: false, state: 'unsupported' };
  }
  if (input.permission === 'denied') {
    return { enabled: false, state: 'denied' };
  }
  if (input.permission !== 'granted') {
    return { enabled: false, state: 'undetermined' };
  }
  if (input.preference === 'false') {
    return { enabled: false, state: 'undetermined' };
  }
  if (input.hasToken) {
    return { enabled: true, state: 'ready' };
  }
  return { enabled: true, state: 'granted_no_token' };
}
