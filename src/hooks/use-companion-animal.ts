import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useState } from 'react';

const STORAGE_KEY = 'niyetsen.companion.animalIndex';

type Listener = (index: number | null) => void;
const listeners = new Set<Listener>();
let cachedIndex: number | null | undefined;

function notify(index: number | null) {
  cachedIndex = index;
  listeners.forEach((listener) => listener(index));
}

async function persist(index: number | null) {
  notify(index);
  if (index == null) {
    await AsyncStorage.removeItem(STORAGE_KEY);
    return;
  }
  await AsyncStorage.setItem(STORAGE_KEY, String(index));
}

/**
 * Zincir yoldaşı: kullanıcı 12 hayvandan birini seçer (filiz/Serçe dahil).
 * null = zincir gününe göre otomatik evrim.
 */
export function useCompanionAnimal() {
  const [animalIndex, setAnimalIndex] = useState<number | null>(
    cachedIndex === undefined ? null : cachedIndex,
  );

  useEffect(() => {
    const listener: Listener = (index) => setAnimalIndex(index);
    listeners.add(listener);
    if (cachedIndex !== undefined) {
      setAnimalIndex(cachedIndex);
      return () => {
        listeners.delete(listener);
      };
    }
    void AsyncStorage.getItem(STORAGE_KEY).then((raw) => {
      if (raw == null || raw === '') {
        notify(null);
        return;
      }
      const parsed = Number.parseInt(raw, 10);
      notify(Number.isFinite(parsed) ? parsed : null);
    });
    return () => {
      listeners.delete(listener);
    };
  }, []);

  const selectAnimal = useCallback((index: number | null) => {
    void persist(index);
  }, []);

  return { animalIndex, selectAnimal };
}
