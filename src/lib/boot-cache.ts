import AsyncStorage from '@react-native-async-storage/async-storage';

import type { SubscriptionInfo, UserProfile } from '@/lib/api';

const PROFILE_KEY = 'niyetsen.boot.profile.v1';
const SUBSCRIPTION_KEY = 'niyetsen.boot.subscription.v1';

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

export async function readCachedProfile(): Promise<UserProfile | null> {
  return readJson<UserProfile>(PROFILE_KEY);
}

export async function writeCachedProfile(profile: UserProfile): Promise<void> {
  await writeJson(PROFILE_KEY, profile);
}

export async function readCachedSubscription(): Promise<SubscriptionInfo | null> {
  return readJson<SubscriptionInfo>(SUBSCRIPTION_KEY);
}

export async function writeCachedSubscription(info: SubscriptionInfo): Promise<void> {
  await writeJson(SUBSCRIPTION_KEY, info);
}
