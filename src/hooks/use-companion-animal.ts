import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useState } from 'react';

import {
  companionStorageKey,
  SPROUT_ID,
  type CompanionId,
} from '@/constants/chain-animals';

const LEGACY_KEY = 'niyetsen.companion.animalIndex';
const STORE_KEY = 'niyetsen.companion.v2';

export type CompanionStore = {
  selected: CompanionId | null;
  invested: Record<string, number>;
  lastStreak: number;
};

const EMPTY: CompanionStore = { selected: null, invested: {}, lastStreak: 0 };

type Listener = (store: CompanionStore) => void;
const listeners = new Set<Listener>();
let cached: CompanionStore | undefined;

function notify(store: CompanionStore) {
  cached = store;
  listeners.forEach((listener) => listener(store));
}

async function persist(store: CompanionStore) {
  notify(store);
  await AsyncStorage.setItem(STORE_KEY, JSON.stringify(store));
}

function parseId(raw: unknown): CompanionId | null {
  if (raw === SPROUT_ID || raw === 'sprout') return SPROUT_ID;
  if (typeof raw === 'number' && Number.isInteger(raw) && raw >= 0 && raw <= 11) {
    return raw;
  }
  if (typeof raw === 'string' && /^\d+$/.test(raw)) {
    const parsed = Number.parseInt(raw, 10);
    if (parsed >= 0 && parsed <= 11) return parsed;
  }
  return null;
}

function parseStore(raw: string | null): CompanionStore | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<CompanionStore>;
    return {
      selected: parseId(parsed.selected),
      invested: parsed.invested && typeof parsed.invested === 'object' ? parsed.invested : {},
      lastStreak: typeof parsed.lastStreak === 'number' ? parsed.lastStreak : 0,
    };
  } catch {
    return null;
  }
}

function applyStreakDelta(store: CompanionStore, streakLen: number): CompanionStore {
  const safe = Math.max(0, streakLen);
  if (safe === store.lastStreak) return store;
  if (store.selected == null) {
    return { ...store, lastStreak: safe };
  }
  const key = companionStorageKey(store.selected);
  if (safe > store.lastStreak) {
    const add = safe - store.lastStreak;
    return {
      selected: store.selected,
      lastStreak: safe,
      invested: {
        ...store.invested,
        [key]: (store.invested[key] ?? 0) + add,
      },
    };
  }
  return { ...store, lastStreak: safe };
}

async function loadStore(): Promise<CompanionStore> {
  const v2 = parseStore(await AsyncStorage.getItem(STORE_KEY));
  if (v2) return v2;
  const legacy = await AsyncStorage.getItem(LEGACY_KEY);
  const selected = parseId(legacy == null || legacy === '' ? null : Number.parseInt(legacy, 10));
  const migrated: CompanionStore = { selected, invested: {}, lastStreak: 0 };
  await persist(migrated);
  return migrated;
}

/**
 * Zincir yoldaşı: Filiz + 12 hayvan. Her yoldaşın olgunluğu kendi gününde
 * saklanır — başka ikona geçince bebekliğe düşmez.
 */
export function useCompanionAnimal() {
  const [store, setStore] = useState<CompanionStore>(cached ?? EMPTY);

  useEffect(() => {
    const listener: Listener = (next) => setStore(next);
    listeners.add(listener);
    if (cached) {
      setStore(cached);
      return () => {
        listeners.delete(listener);
      };
    }
    void loadStore().then((next) => notify(next));
    return () => {
      listeners.delete(listener);
    };
  }, []);

  const selectCompanion = useCallback((id: CompanionId | null) => {
    const current = cached ?? EMPTY;
    void persist({ ...current, selected: id });
  }, []);

  const syncStreak = useCallback((streakLen: number) => {
    const current = cached ?? EMPTY;
    const next = applyStreakDelta(current, streakLen);
    if (next === current) return;
    void persist(next);
  }, []);

  const investedDays =
    store.selected == null
      ? 0
      : store.invested[companionStorageKey(store.selected)] ?? 0;

  const investedFor = useCallback(
    (id: CompanionId) => store.invested[companionStorageKey(id)] ?? 0,
    [store.invested],
  );

  return {
    companionId: store.selected,
    investedDays,
    investedFor,
    selectCompanion,
    syncStreak,
  };
}
