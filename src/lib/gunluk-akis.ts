/**
 * GÜNLÜK AKIŞ — tek doğruluk kaynağı (03-Bugün görevi, madde A).
 *
 * Bugün sekmesi ve Planım'daki etkinlik mutasyonları aynı domain katmanından
 * beslenir:
 *
 *     Supabase/FastAPI  (/tasks/daily)
 *            ↓
 *     gunluk-akis (bu modül) ──► useGunlukAkis() ──► Bugün ekranı
 *            ▲
 *     Planım mutasyonları (etkinlik ekle/sil/tamamla, görev düzenle)
 *     → invalidateGunlukAkis() → sessiz tazeleme → Bugün ANINDA güncel.
 *
 * Özellikler:
 * - AsyncStorage kalıcı önbellek: uçak modunda son bilinen gün gösterilir
 *   (stale-while-revalidate; kullanıcı asla boş/hata ekranına düşmez).
 * - Üstel geri çekilmeli otomatik retry (3 deneme) — yalnız ağ/5xx hataları.
 * - 401'de tek seferlik oturum tazeleme + tekrar (token yarışı, H5).
 * - Etkinlik tamamlama OPTIMISTIC: UI anında döner, sunucu reddederse geri alınır.
 * - Gün sözleşmesi: önbellek yalnız `bugunIso()` ile eşleşirse geçerli —
 *   dünün verisi asla "bugün" gibi gösterilmez.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  ApiError,
  completePlanEvent,
  getDailyTasks,
  type CompleteEventResponse,
  type DailyTasksResponse,
} from '@/lib/api';
import { supabase } from '@/lib/supabase';
import { bugunIso } from '@/lib/zaman';

const STORAGE_KEY = 'niyetsen.gunluk-akis.v1';
/** Ağ/5xx için üstel geri çekilme (ms): 3 otomatik deneme, sonra manuel buton. */
const RETRY_DELAYS_MS = [700, 1_400, 2_800] as const;

export type GunlukAkisState = {
  /** Verinin ait olduğu yerel gün (YYYY-MM-DD). */
  date: string;
  data: DailyTasksResponse | null;
  /** Son başarılı sunucu/önbellek yazımı (ms epoch). */
  savedAt: number;
  /** AsyncStorage önbelleği okundu mu. */
  hydrated: boolean;
  /** İlk yükleme (elde hiç veri yokken). */
  loading: boolean;
  /** Sessiz tazeleme (elde veri varken). */
  refreshing: boolean;
  /** Son hata — veri varsa "yumuşak" (banner), yoksa bölüm hatası. */
  error: ApiError | null;
  /** invalidate edildi; ilk fırsatta tazelenmeli. */
  stale: boolean;
};

const INITIAL: GunlukAkisState = {
  date: bugunIso(),
  data: null,
  savedAt: 0,
  hydrated: false,
  loading: false,
  refreshing: false,
  error: null,
  stale: true,
};

let state: GunlukAkisState = INITIAL;
const listeners = new Set<(next: GunlukAkisState) => void>();
let hydratePromise: Promise<void> | null = null;
let refreshInFlight: Promise<void> | null = null;

function emit(next: Partial<GunlukAkisState>): void {
  state = { ...state, ...next };
  listeners.forEach((listener) => listener(state));
}

export function getGunlukAkis(): GunlukAkisState {
  return state;
}

export function subscribeGunlukAkis(listener: (next: GunlukAkisState) => void): () => void {
  listeners.add(listener);
  listener(state);
  return () => {
    listeners.delete(listener);
  };
}

type Persisted = { date: string; savedAt: number; payload: DailyTasksResponse };

async function persist(data: DailyTasksResponse): Promise<void> {
  try {
    const record: Persisted = { date: state.date, savedAt: state.savedAt, payload: data };
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(record));
  } catch {
    // Önbellek yazılamazsa akış yine de çalışır.
  }
}

/** Önbelleği bir kez okur; günü geçmiş kayıt "bugün" diye gösterilmez. */
export function ensureGunlukHydrated(): Promise<void> {
  if (hydratePromise) return hydratePromise;
  hydratePromise = (async () => {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      if (raw) {
        const record = JSON.parse(raw) as Persisted;
        if (record && record.date === bugunIso() && record.payload) {
          emit({
            data: normalizeDaily(record.payload),
            savedAt: record.savedAt ?? 0,
            stale: true,
          });
        }
      }
    } catch {
      // Bozuk kayıt — yok say, ağdan tazelenir.
    } finally {
      emit({ hydrated: true });
    }
  })();
  return hydratePromise;
}

/** Eski backend dizi döndürebilir; events alanı eksik olabilir — tek yerden düzelt. */
function normalizeDaily(raw: DailyTasksResponse): DailyTasksResponse {
  return { ...raw, events: Array.isArray(raw.events) ? raw.events : [] };
}

function isRetryable(error: unknown): boolean {
  return error instanceof ApiError && (error.status === 0 || error.status >= 500);
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** 401'de oturumu bir kez tazeler; taze token ile tek tekrar hakkı verir. */
async function refreshSessionOnce(): Promise<boolean> {
  try {
    const { error } = await supabase.auth.refreshSession();
    return !error;
  } catch {
    return false;
  }
}

async function fetchDailyWithRetry(): Promise<DailyTasksResponse> {
  let sessionRefreshed = false;
  for (let attempt = 0; attempt <= RETRY_DELAYS_MS.length; attempt += 1) {
    try {
      return normalizeDaily(await getDailyTasks());
    } catch (error) {
      if (error instanceof ApiError && error.status === 401 && !sessionRefreshed) {
        sessionRefreshed = true;
        if (await refreshSessionOnce()) continue;
      }
      if (!isRetryable(error) || attempt === RETRY_DELAYS_MS.length) throw error;
      await sleep(RETRY_DELAYS_MS[attempt]);
    }
  }
  throw new ApiError(0, 'unreachable');
}

/**
 * Akışı tazeler. `full`: veri yokken ilk yükleme (skeleton); `silent`:
 * eldeki veri dururken arka planda tazeleme. Aynı anda tek istek uçar.
 */
export function refreshGunlukAkis(mode: 'full' | 'silent' = 'silent'): Promise<void> {
  if (refreshInFlight) return refreshInFlight;
  const hasData = state.data !== null;
  emit({
    loading: mode === 'full' && !hasData,
    refreshing: hasData || mode === 'silent',
    error: null,
  });
  refreshInFlight = (async () => {
    try {
      const data = await fetchDailyWithRetry();
      emit({ data, date: bugunIso(), savedAt: Date.now(), stale: false, error: null });
      await persist(state.data as DailyTasksResponse);
    } catch (error) {
      emit({ error: error instanceof ApiError ? error : new ApiError(0, String(error)) });
    } finally {
      emit({ loading: false, refreshing: false });
      refreshInFlight = null;
    }
  })();
  return refreshInFlight;
}

/**
 * Planım tarafında etkinlik/görev değiştiğinde çağrılır: önbellek bayatlar,
 * sessiz tazeleme hemen başlar. Bugün sekmesi açık olmasa bile (NativeTabs
 * mounted kalır) veri taze bekler — elle yenileme bug sayılır.
 */
export function invalidateGunlukAkis(): void {
  emit({ stale: true });
  void refreshGunlukAkis('silent');
}

/**
 * Fotosuz "Yaptım" — OPTIMISTIC. UI anında done'a döner; sunucu reddederse
 * geri alınır. 409 (zaten tamamlanmış) geri alma DEĞİLDİR: sunucu "done"
 * diyor, yerel done kalır; çağıran başarı tonunda mesaj gösterir.
 */
export async function completeEventOptimistic(
  occurrenceId: string,
): Promise<CompleteEventResponse> {
  const before = state.data;
  if (before) {
    emit({
      data: {
        ...before,
        events: before.events.map((event) =>
          event.occurrence_id === occurrenceId ? { ...event, status: 'done' } : event,
        ),
      },
    });
  }
  try {
    const response = await completePlanEvent(occurrenceId);
    if (state.data && Array.isArray(response.events)) {
      emit({ data: { ...state.data, events: response.events }, savedAt: Date.now() });
      await persist(state.data as DailyTasksResponse);
    }
    return response;
  } catch (error) {
    const status = error instanceof ApiError ? error.status : 0;
    if (status !== 409 && before) {
      emit({ data: before });
    }
    throw error;
  }
}

/**
 * Gece yarısı geçişi: gün değiştiyse dünün verisini "bugün" gibi gösterme;
 * sıfırla ve yeni günü çek. App foreground + tarih dinleyicisi burayı çağırır.
 */
export function rolloverGunlukAkisIfNeeded(): boolean {
  const today = bugunIso();
  if (state.date === today) return false;
  emit({ date: today, data: null, savedAt: 0, error: null, stale: true });
  void refreshGunlukAkis('full');
  return true;
}
