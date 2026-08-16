import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import Animated, { FadeIn, ReduceMotion } from 'react-native-reanimated';

import { useConsentPreferences } from '@/components/consent-gate';
import { MysticGrantButton, MysticScreenShell, useMysticColors } from '@/components/mystic-screen-shell';
import { ThemedText } from '@/components/themed-text';
import { Motion, Radii, Spacing } from '@/constants/theme';
import { getZodiacGlyph } from '@/constants/zodiac';
import { trackEvent } from '@/lib/analytics';
import { ApiError, getDailyHoroscope, type Horoscope } from '@/lib/api';
import { mysticHref } from '@/lib/mystic-routes';
import { useProfile } from '@/providers/profile-provider';

export default function AstrologyScreen() {
  const router = useRouter();
  const { colors } = useMysticColors();
  const { profile } = useProfile();
  const { status: consentStatus, saveChoices } = useConsentPreferences();
  const [loading, setLoading] = useState(true);
  const [horoscope, setHoroscope] = useState<Horoscope | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [needsProfile, setNeedsProfile] = useState(false);
  const [period, setPeriod] = useState<'daily' | 'weekly'>('daily');
  const [granting, setGranting] = useState(false);
  const aiAllowed = consentStatus.ai_chat_processing.accepted;

  const load = useCallback(async (target: 'daily' | 'weekly' = 'daily') => {
    setLoading(true);
    setError(null);
    setNeedsProfile(false);
    try {
      const result = await getDailyHoroscope(target);
      setHoroscope(result);
      void trackEvent('mystic_secret_entry', { module: 'astroloji' });
    } catch (value) {
      if (value instanceof ApiError && value.status === 400) {
        setNeedsProfile(true);
      } else if (value instanceof ApiError && value.status === 403) {
        setError('Günlük burç için Ayarlar > Gizlilik bölümünden AI işleme onayı gerekli.');
      } else {
        setError(value instanceof Error ? value.message : 'Gökyüzüne şu an ulaşılamıyor.');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  async function grantAiConsent() {
    setGranting(true);
    setError(null);
    try {
      await saveChoices({
        privacy: consentStatus.privacy_policy.accepted,
        ai: true,
        proofPhoto: consentStatus.proof_photo_processing.accepted,
        marketing: consentStatus.marketing_communications.accepted,
      });
      await load(period);
    } catch (value) {
      setError(value instanceof Error ? value.message : 'Onay kaydedilemedi.');
    } finally {
      setGranting(false);
    }
  }

  useEffect(() => {
    void load(period);
  }, [load, period]);

  return (
    <MysticScreenShell
      symbol="✦"
      title={period === 'weekly' ? 'Haftalık Burç' : 'Günlük Burç'}
      zodiacSign={profile?.zodiac_sign}>
      <View style={styles.periodRow}>
        {(['daily', 'weekly'] as const).map((target) => (
          <Pressable
            key={target}
            accessibilityRole="button"
            disabled={loading}
            onPress={() => setPeriod(target)}
            style={[
              styles.periodButton,
              {
                borderColor: colors.tint,
                backgroundColor: period === target ? colors.tint : 'transparent',
              },
            ]}>
            <ThemedText
              type="smallBold"
              style={{ color: period === target ? colors.background : colors.tint }}>
              {target === 'daily' ? 'Bugün' : 'Bu Hafta'}
            </ThemedText>
          </Pressable>
        ))}
      </View>

      {loading ? (
        <ActivityIndicator color={colors.tint} />
      ) : horoscope ? (
        <Animated.View
          entering={FadeIn.duration(Motion.base).reduceMotion(ReduceMotion.System)}
          style={styles.resultBlock}>
          <View style={[styles.badge, { backgroundColor: colors.backgroundSelected }]}>
            <ThemedText type="smallBold" style={{ color: colors.tint }}>
              {getZodiacGlyph(horoscope.sign)} {horoscope.sign.toUpperCase()} · {horoscope.day}
            </ThemedText>
          </View>
          <ThemedText style={{ color: colors.text }}>{horoscope.interpretation}</ThemedText>
          <ThemedText type="small" style={[styles.disclaimer, { color: colors.textSecondary }]}>
            {horoscope.disclaimer}
          </ThemedText>
        </Animated.View>
      ) : needsProfile ? (
        <>
          <ThemedText type="small" style={[styles.center, { color: colors.textSecondary }]}>
            Burcunu bilmem için doğum tarihine ihtiyacım var.
          </ThemedText>
          <Pressable
            accessibilityRole="button"
            onPress={() => router.push('/settings')}
            style={({ pressed }) => [
              styles.button,
              { backgroundColor: colors.tint, opacity: pressed ? 0.75 : 1 },
            ]}>
            <ThemedText type="smallBold" style={{ color: colors.background }}>
              Profili Tamamla
            </ThemedText>
          </Pressable>
        </>
      ) : !aiAllowed ? (
        <MysticGrantButton
          label="AI onayını ver ve burcu aç"
          hint="Günlük burç ücretsizdir; onay yalnız yorum üretimi içindir."
          granting={granting}
          onGrant={() => void grantAiConsent()}
        />
      ) : (
        <>
          <ThemedText type="small" style={[styles.center, { color: colors.accentWarm }]}>
            {error}
          </ThemedText>
          <Pressable
            accessibilityRole="button"
            onPress={() => void load(period)}
            style={({ pressed }) => [
              styles.button,
              { backgroundColor: colors.tint, opacity: pressed ? 0.75 : 1 },
            ]}>
            <ThemedText type="smallBold" style={{ color: colors.background }}>
              Tekrar Dene
            </ThemedText>
          </Pressable>
        </>
      )}

      <Pressable
        accessibilityRole="button"
        onPress={() => router.replace(mysticHref.hub)}
        style={({ pressed }) => [styles.linkButton, { opacity: pressed ? 0.6 : 1 }]}>
        <ThemedText type="smallBold" style={{ color: colors.tint }}>
          Mistik Keşfe Dön
        </ThemedText>
      </Pressable>
    </MysticScreenShell>
  );
}

const styles = StyleSheet.create({
  periodRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: Spacing.two,
  },
  periodButton: {
    minHeight: 44,
    minWidth: 110,
    borderWidth: 1.5,
    borderRadius: Radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.three,
  },
  resultBlock: { gap: Spacing.three },
  badge: {
    alignSelf: 'center',
    borderRadius: Radii.pill,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  center: { textAlign: 'center' },
  disclaimer: {
    textAlign: 'center',
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: Spacing.three,
  },
  button: {
    minHeight: 48,
    borderRadius: Radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.four,
  },
  linkButton: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
    paddingVertical: Spacing.two,
  },
});
