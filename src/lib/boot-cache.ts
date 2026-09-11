import AsyncStorage from '@react-native-async-storage/async-storage';

import type { DailyTasksResponse, SubscriptionInfo, UserProfile } from '@/lib/api';

const PROFILE_KEY = 'niyetsen.boot.profile.v1';
const SUBSCRIPTION_KEY = 'niyetsen.boot.subscription.v1';
const DAILY_KEY = 'niyetsen.boot.daily.v1';

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

export async function readCachedDaily(): Promise<DailyTasksResponse | null> {
  return readJson<DailyTasksResponse>(DAILY_KEY);
}

export async function writeCachedDaily(daily: DailyTasksResponse): Promise<void> {
  await writeJson(DAILY_KEY, daily);
}
