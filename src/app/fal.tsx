import { CameraView, useCameraPermissions } from 'expo-camera';
import { type Href, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import Animated, { FadeIn, ReduceMotion } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useConsentPreferences } from '@/components/consent-gate';
import { MysticGrantButton, MysticScreenShell, useMysticColors } from '@/components/mystic-screen-shell';
import { ThemedText } from '@/components/themed-text';
import { Motion, Radii, Spacing } from '@/constants/theme';
import { trackEvent } from '@/lib/analytics';
import { mysticHref } from '@/lib/mystic-routes';
import {
  ApiError,
  getFortuneRights,
  isPaywallError,
  type FortuneRights,
  type PhotoFortune,
  uploadFortunePhoto,
} from '@/lib/api';
import { useLocale } from '@/providers/locale-provider';
import { useProfile } from '@/providers/profile-provider';

type FortuneKind = 'kahve' | 'el';

export default function FortuneScreen() {
  const router = useRouter();
  const { colors } = useMysticColors();
  const { t } = useLocale();
  const { profile } = useProfile();
  const kindLabels: Record<FortuneKind, { title: string; hint: string }> = {
    kahve: { title: t.mystic.coffeeTitle, hint: t.mystic.coffeeHint },
    el: { title: t.mystic.palmTitle, hint: t.mystic.palmHint },
  };
  const { status: consentStatus, saveChoices } = useConsentPreferences();
  const cameraRef = useRef<CameraView>(null);
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();

  // Stack params: { kind: 'kahve' | 'el' } — query string NativeTabs'te düşüyordu.
  const params = useLocalSearchParams<{ kind?: string }>();
  const requestedKind: FortuneKind = params.kind === 'el' ? 'el' : 'kahve';
  const [kind, setKind] = useState<FortuneKind>(requestedKind);
  const [rights, setRights] = useState<FortuneRights | null>(null);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [granting, setGranting] = useState(false);
  const [result, setResult] = useState<PhotoFortune | null>(null);
  const [error, setError] = useState<string | null>(null);
  const photoConsent = consentStatus.proof_photo_processing.accepted;

  const loadRights = useCallback(async () => {
    try {
      setRights(await getFortuneRights());
    } catch {
      /* hak bilgisi görsel; hata akışı bloklamasın */
    }
  }, []);

  useEffect(() => {
    void loadRights();
  }, [loadRights]);

  useEffect(() => {
    if (params.kind === 'el' || params.kind === 'kahve') {
      setKind(params.kind);
    }
  }, [params.kind]);

  async function grantPhotoConsent() {
    setGranting(true);
    setError(null);
    try {
      await saveChoices({
        privacy: consentStatus.privacy_policy.accepted,
        ai: consentStatus.ai_chat_processing.accepted,
        proofPhoto: true,
        marketing: consentStatus.marketing_communications.accepted,
      });
    } catch (value) {
      setError(value instanceof Error ? value.message : t.mystic.grantSaveFailed);
    } finally {
      setGranting(false);
    }
  }

  async function openCamera(selected: FortuneKind) {
    setError(null);
    setResult(null);
    setKind(selected);
    const remaining = rights?.rights[selected]?.remaining;
    if (remaining === 0 && !rights?.is_premium) {
      setError(t.mystic.quotaUsed);
      return;
    }
    if (!consentStatus.proof_photo_processing.accepted) {
      setError(t.mystic.grantNeededPhoto);
      return;
    }
    if (Platform.OS === 'web') {
      setError(t.mystic.cameraWeb);
      return;
    }
    const permission = cameraPermission?.granted
      ? cameraPermission
      : await requestCameraPermission();
    if (!permission?.granted) {
      setError(t.mystic.cameraDenied);
      return;
    }
    setCameraReady(false);
    setCameraOpen(true);
  }

  async function captureAndUpload() {
    if (!cameraRef.current || !cameraReady || busy) return;
    setBusy(true);
    try {
      const picture = await cameraRef.current.takePictureAsync({
        quality: 0.7,
        imageType: 'jpg',
        skipProcessing: false,
      });
      if (!picture?.uri) throw new Error(t.mystic.captureFailed);
      setCameraOpen(false);
      const fortune = await uploadFortunePhoto(kind, picture.uri);
      setResult(fortune);
      void trackEvent('mystic_secret_entry', { module: `fal_${kind}` });
      void loadRights();
    } catch (value) {
      setCameraOpen(false);
      if (isPaywallError(value)) {
        setError(t.mystic.quotaUsed);
      } else if (value instanceof ApiError && value.status === 429) {
        setError(value.message);
      } else {
        setError(value instanceof Error ? value.message : t.mystic.interpretFailed);
      }
    } finally {
      setBusy(false);
    }
  }

  function remainingLabel(target: FortuneKind): string {
    const item = rights?.rights[target];
    if (!item) return '';
    if (item.remaining < 0) return t.mystic.unlimited;
    if (item.remaining > 0) return t.mystic.remaining(item.remaining);
    return t.mystic.quotaUsed;
  }

  return (
    <>
      <MysticScreenShell
        symbol="☾"
        title={t.mystic.falTitle}
        subtitle={`${kindLabels[kind].title} — ${kindLabels[kind].hint} ${t.mystic.falSubtitle}`}
        zodiacSign={profile?.zodiac_sign}>
        {(['kahve', 'el'] as FortuneKind[]).map((target, index) => (
          <Animated.View
            key={target}
            entering={FadeIn.delay(index * Motion.stagger)
              .duration(Motion.base)
              .reduceMotion(ReduceMotion.System)}>
            <Pressable
              accessibilityRole="button"
              disabled={busy}
              onPress={() => void openCamera(target)}
              style={({ pressed }) => [
                styles.kindButton,
                {
                  borderColor: kind === target ? colors.tint : colors.border,
                  backgroundColor:
                    pressed || kind === target
                      ? colors.backgroundSelected
                      : colors.background,
                  opacity: pressed ? 0.85 : 1,
                  transform: [{ scale: pressed ? 0.97 : 1 }],
                },
              ]}>
              <View style={styles.kindText}>
                <ThemedText type="subtitle" style={{ color: colors.text }}>
                  {kindLabels[target].title}
                </ThemedText>
                <ThemedText type="small" style={{ color: colors.textSecondary }}>
                  {kindLabels[target].hint}
                </ThemedText>
                {rights ? (
                  <ThemedText type="smallBold" style={{ color: colors.accentWarm }}>
                    {remainingLabel(target)}
                  </ThemedText>
                ) : null}
              </View>
              {busy && kind === target ? <ActivityIndicator color={colors.tint} /> : null}
            </Pressable>
          </Animated.View>
        ))}

        {result ? (
          <Animated.View
            entering={FadeIn.duration(Motion.base).reduceMotion(ReduceMotion.System)}
            style={[
              styles.resultBox,
              { borderColor: colors.border, backgroundColor: colors.background },
            ]}>
            <ThemedText type="smallBold" style={{ color: colors.accentWarm }}>
              {kindLabels[result.kind].title.toUpperCase()}
            </ThemedText>
            {result.symbols.length > 0 ? (
              <ThemedText type="small" style={{ color: colors.textSecondary }}>
                {t.mystic.symbolsSeen}: {result.symbols.join(' · ')}
              </ThemedText>
            ) : null}
            <ThemedText style={{ color: colors.text }}>{result.interpretation}</ThemedText>
            <ThemedText type="small" style={[styles.disclaimer, { color: colors.textSecondary }]}>
              {result.disclaimer}
            </ThemedText>
          </Animated.View>
        ) : null}

        {error ? (
          <ThemedText type="small" style={[styles.center, { color: colors.accentWarm }]}>
            {error}
          </ThemedText>
        ) : null}

        {rights &&
        !rights.is_premium &&
        ((rights.rights.kahve?.remaining ?? 1) === 0 ||
          (rights.rights.el?.remaining ?? 1) === 0) ? (
          <Pressable
            accessibilityRole="button"
            onPress={() => router.push('/paywall' as Href)}
            style={({ pressed }) => [
              styles.kindButton,
              {
                borderColor: colors.tint,
                backgroundColor: colors.tint,
                opacity: pressed ? 0.85 : 1,
                alignItems: 'center',
              },
            ]}>
            <ThemedText type="smallBold" style={{ color: colors.background }}>
              {t.mystic.falProCta}
            </ThemedText>
          </Pressable>
        ) : null}

        {!photoConsent ? (
          <MysticGrantButton
            label={t.mystic.photoGrant}
            hint={t.mystic.photoGrantHint}
            granting={granting}
            onGrant={() => void grantPhotoConsent()}
          />
        ) : null}

        {result ? (
          <Pressable
            accessibilityRole="button"
            onPress={() => router.push(mysticHref.chat)}
            style={({ pressed }) => [
              styles.kindButton,
              {
                borderColor: colors.tint,
                backgroundColor: colors.backgroundSelected,
                opacity: pressed ? 0.8 : 1,
              },
            ]}>
            <ThemedText type="smallBold" style={{ color: colors.tint }}>
              {t.mystic.interpretWithGuide}
            </ThemedText>
          </Pressable>
        ) : null}

        <ThemedText type="small" style={[styles.disclaimer, { color: colors.textSecondary }]}>
          {t.mystic.disclaimer}
        </ThemedText>

        <Pressable
          accessibilityRole="button"
          onPress={() => router.replace(mysticHref.chat)}
          style={({ pressed }) => [styles.linkButton, { opacity: pressed ? 0.6 : 1 }]}>
          <ThemedText type="smallBold" style={{ color: colors.tint }}>
            {t.mystic.backToChat}
          </ThemedText>
        </Pressable>
      </MysticScreenShell>

      <Modal
        animationType="slide"
        visible={cameraOpen}
        presentationStyle="fullScreen"
        onRequestClose={() => setCameraOpen(false)}>
        <View style={styles.cameraShell}>
          {cameraOpen ? (
            <CameraView
              ref={cameraRef}
              style={StyleSheet.absoluteFillObject}
              facing="back"
              active={cameraOpen}
              onCameraReady={() => setCameraReady(true)}
              onMountError={(event) => {
                setError(`Kamera açılamadı: ${event.message || 'bilinmeyen hata'}`);
                setCameraOpen(false);
              }}
            />
          ) : null}
          <SafeAreaView style={styles.cameraOverlay} pointerEvents="box-none">
            <View style={styles.cameraTop}>
              <Pressable onPress={() => setCameraOpen(false)} style={styles.cameraTextButton}>
                <ThemedText type="smallBold" style={styles.cameraText}>
                  {t.mystic.closeCamera}
                </ThemedText>
              </Pressable>
              <ThemedText
                type="smallBold"
                numberOfLines={2}
                style={[styles.cameraText, styles.cameraHint]}>
                {cameraReady ? kindLabels[kind].hint : t.common.loading}
              </ThemedText>
            </View>
            <Pressable
              accessibilityLabel={t.mystic.capture}
              disabled={!cameraReady || busy}
              onPress={() => void captureAndUpload()}
              style={({ pressed }) => [
                styles.shutter,
                (!cameraReady || pressed) && styles.dimmed,
              ]}>
              {busy ? <ActivityIndicator color={colors.text} /> : null}
            </Pressable>
          </SafeAreaView>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  center: { textAlign: 'center' },
  kindButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
    borderWidth: 1,
    borderRadius: Radii.medium,
    padding: Spacing.three,
  },
  kindText: { flex: 1, gap: 4 },
  resultBox: {
    gap: Spacing.two,
    borderWidth: 1,
    borderRadius: Radii.medium,
    padding: Spacing.three,
  },
  disclaimer: {
    textAlign: 'center',
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: Spacing.two,
  },
  linkButton: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
    paddingVertical: Spacing.two,
  },
  cameraShell: { flex: 1, backgroundColor: '#000' },
  cameraOverlay: {
    flex: 1,
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.four,
  },
  cameraTop: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
  cameraTextButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: Radii.pill,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  cameraText: { color: '#FFF' },
  cameraHint: { flex: 1, textAlign: 'right' },
  shutter: {
    width: 74,
    height: 74,
    borderRadius: 37,
    backgroundColor: '#FFF',
    borderWidth: 4,
    borderColor: 'rgba(255,255,255,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dimmed: { opacity: 0.5 },
});
