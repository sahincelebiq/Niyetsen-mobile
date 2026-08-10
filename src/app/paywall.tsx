import { type Href, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator, Pressable, ScrollView, StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import {
  BottomTabInset, MaxContentWidth, Radii, Shadows, Spacing, Texture,
} from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { trackEvent } from '@/lib/analytics';
import { waitForPremiumAccess } from '@/lib/api';
import { openLegalDocument } from '@/lib/legal-links';
import { getStorePrices, purchasePlan, restorePurchases } from '@/lib/purchases';
import { useLocale } from '@/providers/locale-provider';
import { useSubscription } from '@/providers/subscription-provider';

const FALLBACK_MONTHLY = '450 TL / ay';
const FALLBACK_YEARLY = '3.600 TL / yıl';
const YEARLY_EQUIV = 'Ayda ~300 TL';

export default function PaywallScreen() {
  const theme = useTheme();
  const { t } = useLocale();
  const router = useRouter();
  const { status, refresh } = useSubscription();
  const [busy, setBusy] = useState<'monthly' | 'yearly' | 'restore' | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [monthlyPrice, setMonthlyPrice] = useState(FALLBACK_MONTHLY);
  const [yearlyPrice, setYearlyPrice] = useState(FALLBACK_YEARLY);

  useEffect(() => {
    let mounted = true;
    void trackEvent('paywall_shown', { status: status?.status ?? 'unknown' });
    void getStorePrices().then((prices) => {
      if (!mounted) return; // unmount sonrası setState engellenir
      if (prices.monthly) setMonthlyPrice(`${prices.monthly} / ay`);
      if (prices.yearly) setYearlyPrice(`${prices.yearly} / yıl`);
    });
    return () => {
      mounted = false;
    };
  }, []);

  // Render sırasında navigate etmek expo-router'da "navigate before mounting"
  // hatası atabiliyor; yönlendirme effect'e taşındı.
  const shouldRedirectHome = Boolean(status?.has_premium_access && !status.show_paywall);
  useEffect(() => {
    if (shouldRedirectHome) {
      router.replace('/' as Href);
    }
  }, [shouldRedirectHome, router]);

  async function handlePurchase(plan: 'monthly' | 'yearly') {
    setBusy(plan);
    setMessage(null);
    const result = await purchasePlan(plan);
    if (result.ok) {
      void trackEvent('subscription_started', { plan });
      try {
        await waitForPremiumAccess();
      } catch {
        setMessage(
          'Satın alma tamamlandı. Abonelik birkaç saniye içinde açılacak — Geri Yükle ile de deneyebilirsin.',
        );
        setBusy(null);
        await refresh();
        return;
      }
      await refresh();
      router.replace('/' as Href);
      return;
    }
    setMessage(result.message);
    setBusy(null);
  }

  async function handleRestore() {
    setBusy('restore');
    setMessage(null);
    const result = await restorePurchases();
    if (result.ok) {
      try {
        await waitForPremiumAccess();
      } catch {
        setMessage('Geri yükleme tamamlandı; senkron birkaç saniye sürebilir.');
        setBusy(null);
        await refresh();
        return;
      }
      await refresh();
      router.replace('/' as Href);
      return;
    }
    setMessage(result.message);
    setBusy(null);
  }

  if (shouldRedirectHome) {
    return null;
  }

  return (
    <ThemedView style={styles.flex}>
      <SafeAreaView style={styles.flex} edges={['top', 'left', 'right']}>
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}>
          <ThemedView style={styles.hero}>
            <ThemedText type="title">{t.paywall.title}</ThemedText>
            <ThemedText themeColor="textSecondary">
              {t.paywall.body}
            </ThemedText>
            {status?.trial_days_remaining === 0 && status.status === 'trial' ? (
              <ThemedText type="smallBold" themeColor="accentWarm">
                {t.paywall.trialEnded}
              </ThemedText>
            ) : null}
          </ThemedView>

          <ThemedView
            style={[styles.card, { borderColor: theme.border }, Shadows.soft ?? {}]}>
            <ThemedText type="subtitle">Aylık</ThemedText>
            <ThemedText type="screenTitle">{monthlyPrice}</ThemedText>
            <ThemedText themeColor="textSecondary">
              Esnek devam — istediğin zaman iptal edebilirsin.
            </ThemedText>
            <Pressable
              disabled={busy !== null}
              onPress={() => void handlePurchase('monthly')}
              style={({ pressed }) => [
                styles.button,
                { backgroundColor: theme.accentWarm },
                pressed && styles.pressed,
              ]}>
              {busy === 'monthly' ? (
                <ActivityIndicator color={theme.onAccent} />
              ) : (
                <ThemedText style={{ color: theme.onAccent }} type="smallBold">
                  Aylık devam et
                </ThemedText>
              )}
            </Pressable>
          </ThemedView>

          <ThemedView
            style={[styles.card, styles.recommended, { borderColor: theme.accentWarm }, Shadows.soft ?? {}]}>
            <ThemedText type="subtitle" themeColor="accentWarm">Yıllık · önerilen</ThemedText>
            <ThemedText type="screenTitle">{yearlyPrice}</ThemedText>
            <ThemedText themeColor="textSecondary">{YEARLY_EQUIV}</ThemedText>
            <Pressable
              disabled={busy !== null}
              onPress={() => void handlePurchase('yearly')}
              style={({ pressed }) => [
                styles.button,
                { backgroundColor: theme.accentWarm },
                pressed && styles.pressed,
              ]}>
              {busy === 'yearly' ? (
                <ActivityIndicator color={theme.onAccent} />
              ) : (
                <ThemedText style={{ color: theme.onAccent }} type="smallBold">
                  Yıllık devam et
                </ThemedText>
              )}
            </Pressable>
          </ThemedView>

          {message ? (
            <ThemedText themeColor="textSecondary" style={styles.message}>
              {message}
            </ThemedText>
          ) : null}

          <Pressable
            disabled={busy !== null}
            onPress={() => void handleRestore()}
            style={styles.linkButton}>
            <ThemedText type="linkPrimary">
              {busy === 'restore' ? 'Geri yükleniyor…' : 'Satın alımları geri yükle'}
            </ThemedText>
          </Pressable>

          <ThemedView style={styles.legalRow}>
            <Pressable hitSlop={8} onPress={() => void openLegalDocument('terms')}>
              <ThemedText type="linkPrimary">Kullanım Koşulları</ThemedText>
            </Pressable>
            <ThemedText themeColor="textSecondary">·</ThemedText>
            <Pressable hitSlop={8} onPress={() => void openLegalDocument('privacy')}>
              <ThemedText type="linkPrimary">Gizlilik Politikası</ThemedText>
            </Pressable>
          </ThemedView>

          <ThemedText type="small" themeColor="textSecondary" style={styles.renewal}>
            {t.paywall.renewalNote}
          </ThemedText>
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: {
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    padding: Spacing.four,
    paddingBottom: BottomTabInset + Spacing.five,
    gap: Spacing.four,
  },
  hero: { gap: Spacing.two },
  card: {
    borderWidth: Texture.cardBorderWidth,
    borderRadius: Radii.large,
    padding: Spacing.four,
    gap: Spacing.two,
  },
  recommended: {
    borderWidth: 2,
  },
  button: {
    minHeight: 48,
    borderRadius: Radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.two,
  },
  pressed: { opacity: 0.85 },
  linkButton: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44, // Apple review: geri yükleme erişilebilir olmalı
    paddingVertical: Spacing.two,
  },
  legalRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.two,
    flexWrap: 'wrap',
  },
  renewal: { textAlign: 'center', lineHeight: 20 },
  message: { textAlign: 'center' },
});
