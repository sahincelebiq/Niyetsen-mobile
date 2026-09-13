/**
 * Kapalı test / production deep link'lerini Expo Router rotasına çevirir.
 * Supabase bazen niyetsen://auth/callback, niyetsen://auth-callback,
 * niyetsen://sifre-sifirla veya hash token ile döner — bunlar
 * /auth/callback'e düşmezse siyah ekran olur.
 */
export function redirectSystemPath({ path }: { path: string; initial: boolean }): string {
  try {
    const raw = path || '';
    const looksLikeAuth =
      /[?&#](code|access_token|refresh_token|token_hash|type)=/.test(raw) ||
      raw.includes('auth/callback') ||
      raw.includes('auth-callback') ||
      raw.includes('reset-password') ||
      raw.includes('sifre-sifirla');
    if (!looksLikeAuth) return path;
    const queryStart = raw.indexOf('?');
    const hashStart = raw.indexOf('#');
    let suffix = '';
    if (queryStart >= 0) suffix = raw.slice(queryStart);
    else if (hashStart >= 0) suffix = raw.slice(hashStart);
    return `/auth/callback${suffix}`;
  } catch {
    return '/';
  }
}
