/**
 * Hafif dokunsal geri bildirim — tek noktadan.
 * Web'de ve haptics'i olmayan cihazlarda sessiz no-op; sohbet akışı asla
 * haptic hatasıyla düşmez. Not: expo-haptics native modüldür → yeni native
 * build gerekir (EAS development/internal).
 */
import { Platform } from 'react-native';
import * as Haptics from 'expo-haptics';

/** Yeni asistan mesajı listeye düştüğünde çok hafif tik. */
export function selectionHaptic(): void {
  if (Platform.OS === 'web') return;
  void Haptics.selectionAsync().catch(() => {});
}
