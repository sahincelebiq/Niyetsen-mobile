import AsyncStorage from '@react-native-async-storage/async-storage';

import type { SubscriptionInfo, UserProfile } from '@/lib/api';
import { supabase } from '@/lib/supabase';

const PROFILE_KEY = 'niyetsen.boot.profile.v1';
const SUBSCRIPTION_KEY = 'niyetsen.boot.subscription.v1';
/** Ölü anahtar — gunluk-akis kullanılıyor; çıkışta yine silinir. */
const LEGACY_DAILY_KEY = 'niyetsen.boot.daily.v1';

type CachedBox<T> = { userId?: string; payload: T };

async function currentUserId(): Promise<string | null> {
  try {
    const { data } = await supabase.auth.getSession();
    return data.session?.user.id ?? null;
  } catch {
    return null;
  }
}

async function readJson<T>(key: string): Promise<T | null> {
  try {
    const raw = await AsyncStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

async function writeJson(key: string, value: unknown): Promise<void> {
  try {
    await AsyncStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Cache yazılamasa boot devam etmeli.
  }
}

function unwrapBox<T>(raw: T | CachedBox<T> | null, userId: string | null): T | null {
  if (!raw) return null;
  if (typeof raw === 'object' && raw !== null && 'payload' in raw) {
    const box = raw as CachedBox<T>;
    if (userId && box.userId && box.userId !== userId) return null;
    return box.payload ?? null;
  }
  return raw as T;
}

export async function readCachedProfile(): Promise<UserProfile | null> {
  const userId = await currentUserId();
  return unwrapBox(await readJson<UserProfile | CachedBox<UserProfile>>(PROFILE_KEY), userId);
}

export async function writeCachedProfile(profile: UserProfile): Promise<void> {
  const userId = (await currentUserId()) ?? undefined;
  await writeJson(PROFILE_KEY, { userId, payload: profile } satisfies CachedBox<UserProfile>);
}

export async function readCachedSubscription(): Promise<SubscriptionInfo | null> {
  const userId = await currentUserId();
  return unwrapBox(
    await readJson<SubscriptionInfo | CachedBox<SubscriptionInfo>>(SUBSCRIPTION_KEY),
    userId,
  );
}

export async function writeCachedSubscription(info: SubscriptionInfo): Promise<void> {
  const userId = (await currentUserId()) ?? undefined;
  await writeJson(SUBSCRIPTION_KEY, {
    userId,
    payload: info,
  } satisfies CachedBox<SubscriptionInfo>);
}

export async function clearBootCache(): Promise<void> {
  try {
    await AsyncStorage.multiRemove([PROFILE_KEY, SUBSCRIPTION_KEY, LEGACY_DAILY_KEY]);
  } catch {
    // Önbellek temizliği başarısız olsa da oturum akışı sürmeli.
  }
}
