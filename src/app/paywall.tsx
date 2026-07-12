import { type Href, useRouter } from 'expo-router';
import { useState } from 'react';
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
import { purchasePlan, restorePurchases } from '@/lib/purchases';
import { useSubscription } from '@/providers/subscription-provider';

const MONTHLY_PRICE = '450 TL / ay';
const YEARLY_PRICE = '3.600 TL / yıl';
const YEARLY_EQUIV = 'Ayda ~300 TL';

export default function PaywallScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { status, refresh } = useSubscription();
  const [busy, setBusy] = useState<'monthly' | 'yearly' | 'restore' | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function handlePurchase(plan: 'monthly' | 'yearly') {
    setBusy(plan);
    setMessage(null);
    const result = await purchasePlan(plan);
    if (result.ok) {
      void trackEvent('subscription_started', { plan });
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
      await refresh();
      router.replace('/' as Href);
      return;
    }
    setMessage(result.message);
    setBusy(null);
  }

  if (status?.has_premium_access && !status.show_paywall) {
    router.replace('/' as Href);
    return null;
  }

  return (
    <ThemedView style={styles.flex}>
      <SafeAreaView style={styles.flex} edges={['top', 'left', 'right']}>
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}>
          <ThemedView style={styles.hero}>
            <ThemedText type="title">Zincirin seni bekliyor</ThemedText>
            <ThemedText themeColor="textSecondary">
              Planın hazır, ritmin başladı. 7 günlük denemen bitti — devam etmek için
              aboneliğini seç. Verilerin silinmez; yalnızca erişim kilitlenir.
            </ThemedText>
            {status?.trial_days_remaining === 0 && status.status === 'trial' ? (
              <ThemedText type="smallBold" themeColor="accentWarm">
                Deneme süren doldu.
              </ThemedText>
            ) : null}
          </ThemedView>

          <ThemedView
            style={[styles.card, { borderColor: theme.border }, Shadows.soft ?? {}]}>
            <ThemedText type="subtitle">Aylık</ThemedText>
            <ThemedText type="title">{MONTHLY_PRICE}</ThemedText>
            <ThemedText themeColor="textSecondary">
              Esnek devam — istediğin zaman iptal edebilirsin.
            </ThemedText>
            <Pressable
              disabled={busy !== null}
              onPress={() => void handlePurchase('monthly')}
              style={({ pressed }) => [
                styles.button,
                { backgroundColor: theme.tint },
                pressed && styles.pressed,
              ]}>
              {busy === 'monthly' ? (
                <ActivityIndicator color={theme.background} />
              ) : (
                <ThemedText style={{ color: theme.background }} type="smallBold">
                  Aylık devam et
                </ThemedText>
              )}
            </Pressable>
          </ThemedView>

          <ThemedView
            style={[styles.card, { borderColor: theme.tint }, Shadows.soft ?? {}]}>
            <ThemedText type="subtitle">Yıllık · önerilen</ThemedText>
            <ThemedText type="title">{YEARLY_PRICE}</ThemedText>
            <ThemedText themeColor="textSecondary">{YEARLY_EQUIV}</ThemedText>
            <Pressable
              disabled={busy !== null}
              onPress={() => void handlePurchase('yearly')}
              style={({ pressed }) => [
                styles.button,
                { backgroundColor: theme.tint },
                pressed && styles.pressed,
              ]}>
              {busy === 'yearly' ? (
                <ActivityIndicator color={theme.background} />
              ) : (
                <ThemedText style={{ color: theme.background }} type="smallBold">
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
            <Pressable onPress={() => router.push('/legal/terms' as Href)}>
              <ThemedText type="linkPrimary">Kullanım Koşulları</ThemedText>
            </Pressable>
            <ThemedText themeColor="textSecondary">·</ThemedText>
            <Pressable onPress={() => router.push('/legal/privacy' as Href)}>
              <ThemedText type="linkPrimary">Gizlilik Politikası</ThemedText>
            </Pressable>
          </ThemedView>

          <ThemedText type="small" themeColor="textSecondary" style={styles.renewal}>
            Abonelik, seçtiğin dönemin sonunda otomatik yenilenir. İptal App Store /
            Google Play hesap ayarlarından yapılır. Yalnız mağaza içi satın alma (IAP).
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
