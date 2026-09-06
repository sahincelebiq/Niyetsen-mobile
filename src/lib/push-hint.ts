import { useSyncExternalStore } from 'react';

/**
 * Cihaz bildirimi kapalıysa Profil sekmesinde küçük rozet.
 * Redux/RQ yok — mevcut getPushStatus sonucunu paylaşır.
 */
let visible = false;
const listeners = new Set<() => void>();

export function setPushHintVisible(next: boolean): void {
  if (visible === next) return;
  visible = next;
  listeners.forEach((listen) => listen());
}

export function getPushHintVisible(): boolean {
  return visible;
}

export function usePushHintVisible(): boolean {
  return useSyncExternalStore(
    (onStoreChange) => {
      listeners.add(onStoreChange);
      return () => {
        listeners.delete(onStoreChange);
      };
    },
    () => visible,
    () => false,
  );
}
