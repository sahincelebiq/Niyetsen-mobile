import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import { createClient, processLock } from '@supabase/supabase-js';

import { assertNoServiceKeyEnv, assertPublishableSupabaseKey } from '@/lib/supabase-keys';

assertNoServiceKeyEnv();

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
const supabasePublishableKey =
  process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? '';

if (supabasePublishableKey) {
  assertPublishableSupabaseKey(supabasePublishableKey);
}

if (!supabaseUrl || !supabasePublishableKey) {
  console.warn(
    'Supabase mobile env eksik: EXPO_PUBLIC_SUPABASE_URL ve ' +
      'EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY gerekli.',
  );
}

// SecureStore ~2KB üstünde uyarır ve bazı Android sürümlerinde yazmayı
// sessizce kaybedebilir; Supabase oturumu ise 3-4KB JSON'dur. Değer büyükse
// parçalara bölerek saklarız (ek bağımlılık yok, veri yine SecureStore'da).
const SECURE_CHUNK_SIZE = 1800;
const CHUNK_MARKER = '__chunked__:';

async function secureGetItem(key: string): Promise<string | null> {
  const head = await SecureStore.getItemAsync(key);
  if (!head || !head.startsWith(CHUNK_MARKER)) return head;
  const count = Number.parseInt(head.slice(CHUNK_MARKER.length), 10);
  if (!Number.isFinite(count) || count <= 0) return null;
  const parts = await Promise.all(
    Array.from({ length: count }, (_, i) => SecureStore.getItemAsync(`${key}.${i}`)),
  );
  if (parts.some((part) => part === null)) return null; // eksik parça = oturum yok
  return parts.join('');
}

async function clearSecureChunks(key: string): Promise<void> {
  const head = await SecureStore.getItemAsync(key);
  if (head?.startsWith(CHUNK_MARKER)) {
    const count = Number.parseInt(head.slice(CHUNK_MARKER.length), 10) || 0;
    await Promise.all(
      Array.from({ length: count }, (_, i) => SecureStore.deleteItemAsync(`${key}.${i}`)),
    );
  }
}

async function secureSetItem(key: string, value: string): Promise<void> {
  await clearSecureChunks(key); // eski parça sayısı değişmişse artık kalmasın
  if (value.length <= SECURE_CHUNK_SIZE) {
    await SecureStore.setItemAsync(key, value);
    return;
  }
  const chunks: string[] = [];
  for (let i = 0; i < value.length; i += SECURE_CHUNK_SIZE) {
    chunks.push(value.slice(i, i + SECURE_CHUNK_SIZE));
  }
  await Promise.all(
    chunks.map((chunk, i) => SecureStore.setItemAsync(`${key}.${i}`, chunk)),
  );
  await SecureStore.setItemAsync(key, `${CHUNK_MARKER}${chunks.length}`);
}

async function secureRemoveItem(key: string): Promise<void> {
  await clearSecureChunks(key);
  await SecureStore.deleteItemAsync(key);
}

const authStorage = {
  getItem(key: string) {
    if (Platform.OS === 'web') {
      if (typeof window === 'undefined') return Promise.resolve(null);
      return AsyncStorage.getItem(key);
    }
    return secureGetItem(key);
  },
  setItem(key: string, value: string) {
    if (Platform.OS === 'web') {
      if (typeof window === 'undefined') return Promise.resolve();
      return AsyncStorage.setItem(key, value);
    }
    return secureSetItem(key, value);
  },
  removeItem(key: string) {
    if (Platform.OS === 'web') {
      if (typeof window === 'undefined') return Promise.resolve();
      return AsyncStorage.removeItem(key);
    }
    return secureRemoveItem(key);
  },
};

// FAZ 8.12 AÇILIŞ DAYANIKLILIĞI: env eksikse createClient module-load'da
// throw eder ve uygulama release'te AÇILMADAN çöker (Play kapalı test hatası).
// Placeholder ile boot hayatta kalır; giriş ekranı anlaşılır hata gösterir.
// Kalıcı çözüm: eas.json env bloklarında EXPO_PUBLIC_SUPABASE_* tanımlı tut.
export const supabaseConfigured = Boolean(supabaseUrl && supabasePublishableKey);

export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabasePublishableKey || 'sb_publishable_placeholder',
  {
    auth: {
      storage: authStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: Platform.OS === 'web',
      lock: processLock,
    },
  },
);
