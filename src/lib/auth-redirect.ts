import Constants from 'expo-constants';
import * as Linking from 'expo-linking';
import { Platform } from 'react-native';

import { supabase } from '@/lib/supabase';

/** Standalone / Play / TestFlight — Supabase Redirect URLs ile birebir. */
export const NATIVE_AUTH_REDIRECT = 'niyetsen://auth/callback';

/**
 * OAuth ve e-posta linklerinin döneceği adres.
 * Expo Go: exp://…/--/auth/callback (proxy).
 * Kapalı test / EAS: niyetsen://auth/callback (özel scheme).
 */
export function getAuthRedirectUri(): string {
  if (Platform.OS === 'web') {
    return Linking.createURL('auth/callback');
  }
  if (Constants.appOwnership === 'expo') {
    return Linking.createURL('auth/callback');
  }
  return NATIVE_AUTH_REDIRECT;
}

export type AuthUrlResult = {
  handled: boolean;
  recovery: boolean;
};

type AuthParams = {
  code?: string;
  accessToken?: string;
  refreshToken?: string;
  tokenHash?: string;
  type?: string;
  errorDescription?: string;
};

function pickParam(
  query: Record<string, string | string[] | undefined>,
  hash: URLSearchParams | null,
  key: string,
): string | undefined {
  const fromQuery = query[key];
  if (typeof fromQuery === 'string' && fromQuery) return fromQuery;
  if (Array.isArray(fromQuery) && fromQuery[0]) return fromQuery[0];
  return hash?.get(key) || undefined;
}

export function parseAuthParams(url: string): AuthParams {
  const parsed = Linking.parse(url);
  const query = parsed.queryParams ?? {};
  const hash = url.includes('#') ? new URLSearchParams(url.split('#')[1]) : null;
  const pick = (key: string) => pickParam(query, hash, key);
  return {
    code: pick('code'),
    accessToken: pick('access_token'),
    refreshToken: pick('refresh_token'),
    tokenHash: pick('token_hash') ?? pick('token'),
    type: pick('type'),
    errorDescription: pick('error_description') ?? pick('error'),
  };
}

const seenCodes = new Set<string>();
let inFlightKey: string | null = null;

function remember(key: string): boolean {
  if (seenCodes.has(key) || inFlightKey === key) return false;
  inFlightKey = key;
  seenCodes.add(key);
  if (seenCodes.size > 24) {
    const first = seenCodes.values().next().value;
    if (first) seenCodes.delete(first);
  }
  return true;
}

function release(key: string) {
  if (inFlightKey === key) inFlightKey = null;
}

/**
 * Deep link / AuthSession dönüşündeki code, hash token veya OTP'yi oturuma çevirir.
 * Şifre sıfırlama (type=recovery) hash fragment'ta gelebilir — Android bunu
 * bazen düşürür; PKCE `code` sorgu parametresi yedektir.
 */
export async function completeAuthFromUrl(url: string): Promise<AuthUrlResult> {
  if (!url || !url.includes('://')) {
    return { handled: false, recovery: false };
  }
  const params = parseAuthParams(url);
  if (params.errorDescription) {
    throw new Error(params.errorDescription);
  }

  const recovery =
    params.type === 'recovery' || params.type === 'password_recovery';

  if (params.accessToken && params.refreshToken) {
    const key = `tok:${params.accessToken.slice(0, 24)}`;
    if (!remember(key)) return { handled: true, recovery };
    try {
      const { error } = await supabase.auth.setSession({
        access_token: params.accessToken,
        refresh_token: params.refreshToken,
      });
      if (error) throw error;
      return { handled: true, recovery };
    } finally {
      release(key);
    }
  }

  if (params.code) {
    const key = `code:${params.code}`;
    if (!remember(key)) return { handled: true, recovery };
    try {
      const { error } = await supabase.auth.exchangeCodeForSession(params.code);
      if (error) throw error;
      return { handled: true, recovery };
    } finally {
      release(key);
    }
  }

  if (params.tokenHash && params.type) {
    const key = `otp:${params.tokenHash}`;
    if (!remember(key)) return { handled: true, recovery };
    try {
      const { error } = await supabase.auth.verifyOtp({
        token_hash: params.tokenHash,
        type: params.type as
          | 'signup'
          | 'email'
          | 'recovery'
          | 'invite'
          | 'magiclink'
          | 'email_change',
      });
      if (error) throw error;
      return { handled: true, recovery };
    } finally {
      release(key);
    }
  }

  return { handled: false, recovery };
}

export function looksLikeAuthCallback(url: string): boolean {
  if (!url) return false;
  return (
    url.includes('auth/callback') ||
    url.includes('auth-callback') ||
    url.includes('reset-password') ||
    /[?&#](code|access_token|refresh_token|token_hash|type)=/.test(url)
  );
}
