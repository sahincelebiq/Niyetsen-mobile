/**
 * Sohbet sabitleme (pin) — cihazda görüntüleme tercihi.
 * Backend'de pinned alanı yok; sıralama yalnız bu cihazın Bağlam listesini
 * etkiler. Backend desteği gelirse bu modül tek noktadan değiştirilir.
 * CLAUDE.md kuralı: localStorage YOK — AsyncStorage.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

const PINS_KEY = 'chat.threadPins.v1';

export async function loadPinnedThreads(): Promise<string[]> {
  try {
    const raw = await AsyncStorage.getItem(PINS_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((id): id is string => typeof id === 'string');
  } catch {
    return [];
  }
}

/** Pin durumunu tersine çevirir; güncel pin listesini döndürür. */
export async function togglePinnedThread(
  pins: string[],
  threadId: string,
): Promise<string[]> {
  const next = pins.includes(threadId)
    ? pins.filter((id) => id !== threadId)
    : [...pins, threadId];
  try {
    await AsyncStorage.setItem(PINS_KEY, JSON.stringify(next));
  } catch {
    // Yazma başarısızsa bellek içi liste yine de döner; oturumda kalır.
  }
  return next;
}
