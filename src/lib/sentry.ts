/**
 * Sentry iskeleti — EXPO_PUBLIC_SENTRY_DSN yoksa no-op.
 * Native SDK EAS production build aşamasında bağlanır.
 */
import { Platform } from 'react-native';

const SENTRY_DSN = process.env.EXPO_PUBLIC_SENTRY_DSN?.trim();

let initialized = false;

export function initSentry(): void {
  if (!SENTRY_DSN || initialized || Platform.OS === 'web') return;
  initialized = true;
  // @sentry/react-native EAS production profilinde eklenecek.
}

export function captureException(error: unknown, context?: string): void {
  if (!SENTRY_DSN) return;
  if (__DEV__) {
    console.warn('[sentry]', context ?? 'error', error);
  }
}
