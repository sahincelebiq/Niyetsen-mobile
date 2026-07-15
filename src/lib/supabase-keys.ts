/**
 * Mobil yalnızca publishable/anon Supabase anahtarı kullanır.
 * service_role / sb_secret_ burada asla kabul edilmez.
 */

const FORBIDDEN_ENV_NAMES = [
  'EXPO_PUBLIC_SUPABASE_SERVICE_KEY',
  'EXPO_PUBLIC_SUPABASE_SECRET_KEY',
  'SUPABASE_SERVICE_KEY',
  'SUPABASE_SECRET_KEY',
] as const;

function jwtRole(token: string): string | null {
  try {
    const payload = token.split('.')[1];
    if (!payload) return null;
    const padded = payload + '='.repeat((4 - (payload.length % 4)) % 4);
    const json = atob(padded.replace(/-/g, '+').replace(/_/g, '/'));
    return (JSON.parse(json) as { role?: string }).role ?? null;
  } catch {
    return null;
  }
}

export function assertNoServiceKeyEnv(): void {
  for (const name of FORBIDDEN_ENV_NAMES) {
    const value = process.env[name]?.trim();
    if (value) {
      throw new Error(
        `${name} mobilde tanımlı olamaz — service_role yalnızca backend'de yaşar.`,
      );
    }
  }
}

export function assertPublishableSupabaseKey(key: string): void {
  const trimmed = key.trim();
  if (!trimmed) return;

  if (trimmed.startsWith('sb_secret_')) {
    throw new Error(
      'EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY bir secret/service anahtarı gibi görünüyor. ' +
        'Supabase dashboard → API Keys → publishable (anon) anahtarını kullan.',
    );
  }

  if (trimmed.startsWith('eyJ') && jwtRole(trimmed) === 'service_role') {
    throw new Error(
      'Legacy service_role JWT mobilde kullanılamaz. anon/publishable anahtarını kullan.',
    );
  }
}
