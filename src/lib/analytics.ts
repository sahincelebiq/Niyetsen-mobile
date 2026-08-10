/**
 * PostHog analitik — MASTER_PLAN §1.10 zorunlu event'ler.
 * Native SDK yerine HTTP capture kullanır; Expo Go'da da çalışır.
 */
import { Platform } from 'react-native';

import { supabase } from '@/lib/supabase';

const POSTHOG_KEY = process.env.EXPO_PUBLIC_POSTHOG_KEY?.trim();
const POSTHOG_HOST = (
  process.env.EXPO_PUBLIC_POSTHOG_HOST?.trim() || 'https://us.i.posthog.com'
).replace(/\/+$/, '');

export type AnalyticsEvent =
  | 'app_open'
  | 'onboarding_complete'
  | 'first_plan_generated'
  | 'task_completed'
  | 'proof_uploaded'
  | 'paywall_shown'
  | 'subscription_started'
  | 'subscription_cancelled'
  | 'notification_opened'
  | 'mystic_secret_entry'
  | 'mystic_chat_message';

let distinctId: string | null = null;

async function resolveDistinctId(): Promise<string> {
  if (distinctId) return distinctId;
  const { data } = await supabase.auth.getSession();
  distinctId = data.session?.user.id ?? `anon-${Platform.OS}`;
  return distinctId;
}

export async function trackEvent(
  event: AnalyticsEvent,
  properties: Record<string, string | number | boolean> = {},
): Promise<void> {
  if (!POSTHOG_KEY) return;
  try {
    const userId = await resolveDistinctId();
    await fetch(`${POSTHOG_HOST}/capture/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        api_key: POSTHOG_KEY,
        event,
        distinct_id: userId,
        properties: {
          platform: Platform.OS,
          ...properties,
        },
      }),
    });
  } catch {
    // Analitik hatası ürün akışını kesmemeli.
  }
}

export function resetAnalyticsIdentity(): void {
  distinctId = null;
}
