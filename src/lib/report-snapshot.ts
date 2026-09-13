import AsyncStorage from '@react-native-async-storage/async-storage';

import type { RecapDashboard } from '@/lib/api';

/**
 * Rapor paneli anlık görüntüsü: sunucunun ÖNCEDEN TOPLADIĞI metrikleri saklar.
 * Ekran açılışta bunu anında gösterir, arka planda taze çeker; tamamlama
 * sonrası `gamification.ts` temizler. İstemci burada hesap yapmaz.
 */
const PREFIX = 'niyetsen.rapor.snapshot.v1.';
const PERIODS = ['7d', '14d', '30d'] as const;

export async function readReportSnapshot(period: string): Promise<RecapDashboard | null> {
  try {
    const raw = await AsyncStorage.getItem(PREFIX + period);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as RecapDashboard;
    return typeof parsed?.completed_tasks === 'number' ? parsed : null;
  } catch {
    return null;
  }
}

export async function writeReportSnapshot(period: string, dashboard: RecapDashboard): Promise<void> {
  try {
    await AsyncStorage.setItem(PREFIX + period, JSON.stringify(dashboard));
  } catch {
    // Anlık görüntü yazılamazsa ekran ağdan çalışmaya devam eder.
  }
}

export async function clearReportSnapshots(): Promise<void> {
  try {
    await AsyncStorage.multiRemove(PERIODS.map((period) => PREFIX + period));
  } catch {
    // Temizlenemezse bir sonraki taze çekim üzerine yazar.
  }
}
