import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import { createClient, processLock } from '@supabase/supabase-js';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
const supabasePublishableKey =
  process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? '';

if (!supabaseUrl || !supabasePublishableKey) {
  console.warn(
    'Supabase mobile env eksik: EXPO_PUBLIC_SUPABASE_URL ve ' +
      'EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY gerekli.',
  );
}

const authStorage = {
  getItem(key: string) {
    if (Platform.OS === 'web') {
      if (typeof window === 'undefined') return Promise.resolve(null);
      return AsyncStorage.getItem(key);
    }
    return SecureStore.getItemAsync(key);
  },
  setItem(key: string, value: string) {
    if (Platform.OS === 'web') {
      if (typeof window === 'undefined') return Promise.resolve();
      return AsyncStorage.setItem(key, value);
    }
    return SecureStore.setItemAsync(key, value);
  },
  removeItem(key: string) {
    if (Platform.OS === 'web') {
      if (typeof window === 'undefined') return Promise.resolve();
      return AsyncStorage.removeItem(key);
    }
    return SecureStore.deleteItemAsync(key);
  },
};

export const supabase = createClient(supabaseUrl, supabasePublishableKey, {
  auth: {
    storage: authStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: Platform.OS === 'web',
    lock: processLock,
  },
});
