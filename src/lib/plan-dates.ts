/**
 * @deprecated Tarih/saat yardımcıları tek sözleşme modülüne taşındı:
 * `@/lib/zaman`. Bu dosya yalnız eski içe aktarımları kırmamak için
 * köprüdür — yeni kod `zaman.ts`'ten içe aktarsın.
 */
import { bugunIso } from '@/lib/zaman';

export {
  addDaysIso,
  bugunIso,
  formatIsoDate,
  formatTrDate,
  isPastIso,
  parseIsoDate,
  resolveTaskDate,
} from '@/lib/zaman';

/** @deprecated `bugunIso()` kullan. */
export function todayIsoLocal(): string {
  return bugunIso();
}
