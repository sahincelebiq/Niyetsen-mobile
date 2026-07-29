import { CameraView, useCameraPermissions } from 'expo-camera';
import { Image } from 'expo-image';
import { type Href, useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  useColorScheme,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { useConsentPreferences } from '@/components/consent-gate';
import {
  BottomTabInset, MaxContentWidth, MysticColors, Radii, Shadows, Spacing, SurfaceEdge,
} from '@/constants/theme';
import { trackEvent } from '@/lib/analytics';
import {
  ApiError,
  getFortuneRights,
  type FortuneRights,
  type PhotoFortune,
  uploadFortunePhoto,
} from '@/lib/api';

type FortuneKind = 'kahve' | 'el';

const KIND_LABELS: Record<FortuneKind, { title: string; hint: string }> = {
  kahve: { title: 'Kahve Falı', hint: 'Fincanı devirdikten sonra telveyi net ve yakından çek.' },
  el: { title: 'El Falı', hint: 'Avuç içini iyi ışıkta, çizgiler seçilecek şekilde çek.' },
};

export default function FortuneScreen() {
  const router = useRouter();
  const scheme = useColorScheme();
  const colors = MysticColors[scheme === 'dark' ? 'dark' : 'light'];
  const edge = scheme === 'dark' ? SurfaceEdge.dark : SurfaceEdge.light;
  const { status: consentStatus } = useConsentPreferences();
  const cameraRef = useRef<CameraView>(null);
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();

  const [kind, setKind] = useState<FortuneKind>('kahve');
  const [rights, setRights] = useState<FortuneRights | null>(null);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<PhotoFortune | null>(null);
  const [error, setError] = useState<string | null>(null);

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

  async function openCamera(selected: FortuneKind) {
    setError(null);
    setResult(null);
    setKind(selected);
    if (!consentStatus.proof_photo_processing.accepted) {
      setError(
        'Fal fotoğrafı için Ayarlar > Gizlilik bölümünden fotoğraf işleme onayı gerekli.',
      );
      router.push('/settings' as Href);
      return;
    }
    if (Platform.OS === 'web') {
      setError('Fal kamerası web sürümünde desteklenmiyor. iOS veya Android uygulamasını kullan.');
      return;
    }
    const permission = cameraPermission?.granted
      ? cameraPermission
      : await requestCameraPermission();
    if (!permission?.granted) {
      setError('Kamera izni olmadan fal fotoğrafı çekilemez.');
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
      if (!picture?.uri) throw new Error('Fotoğraf oluşturulamadı.');
      setCameraOpen(false);
      const fortune = await uploadFortunePhoto(kind, picture.uri);
      setResult(fortune);
      void trackEvent('mystic_secret_entry', { module: `fal_${kind}` });
      void loadRights();
    } catch (value) {
      setCameraOpen(false);
      if (value instanceof ApiError && value.status === 429) {
        setError(value.message);
      } else {
        setError(value instanceof Error ? value.message : 'Fal yorumu alınamadı.');
      }
    } finally {
      setBusy(false);
    }
  }

  function remainingLabel(target: FortuneKind): string {
    const item = rights?.rights[target];
    if (!item) return '';
    return item.remaining > 0 ? `bugün ${item.remaining} hak` : 'bugünkü hak doldu';
  }

  return (
    <View style={[styles.flex, { backgroundColor: colors.background }]}>
      <Image
        source={require('@/assets/images/chat-mystic-bg.png')}
        style={styles.background}
        contentFit="cover"
        pointerEvents="none"
      />
      <SafeAreaView style={styles.flex}>
        <ScrollView contentContainerStyle={styles.content}>
          <View
            style={[
              styles.card,
              Shadows.lifted ?? {},
              {
                backgroundColor: colors.backgroundElement,
                borderColor: colors.border,
                borderTopColor: edge,
              },
            ]}>
            <ThemedText style={[styles.symbol, { color: colors.tint }]}>☾</ThemedText>
            <ThemedText type="title" style={[styles.center, { color: colors.text }]}>
              Fal
            </ThemedText>
            <ThemedText type="small" style={[styles.center, { color: colors.textSecondary }]}>
              Kahve telvesi veya avuç içi — fotoğrafını çek, mistik rehber yorumlasın.
              Fal bir kader değil, bir ayna.
            </ThemedText>

            {(['kahve', 'el'] as FortuneKind[]).map((target) => (
              <Pressable
                key={target}
                accessibilityRole="button"
                disabled={busy}
                onPress={() => void openCamera(target)}
                style={({ pressed }) => [
                  styles.kindButton,
                  {
                    borderColor: colors.border,
                    backgroundColor:
                      pressed || (busy && kind === target)
                        ? colors.backgroundSelected
                        : colors.background,
                  },
                ]}>
                <View style={styles.kindText}>
                  <ThemedText type="subtitle" style={{ color: colors.text }}>
                    {KIND_LABELS[target].title}
                  </ThemedText>
                  <ThemedText type="small" style={{ color: colors.textSecondary }}>
                    {KIND_LABELS[target].hint}
                  </ThemedText>
                  {rights ? (
                    <ThemedText type="smallBold" style={{ color: colors.accentWarm }}>
                      {remainingLabel(target)}
                    </ThemedText>
                  ) : null}
                </View>
                {busy && kind === target ? <ActivityIndicator color={colors.tint} /> : null}
              </Pressable>
            ))}

            {result ? (
              <View style={[styles.resultBox, { borderColor: colors.border, backgroundColor: colors.background }]}>
                <ThemedText type="smallBold" style={{ color: colors.accentWarm }}>
                  {KIND_LABELS[result.kind].title.toUpperCase()}
                </ThemedText>
                {result.symbols.length > 0 ? (
                  <ThemedText type="small" style={{ color: colors.textSecondary }}>
                    Görülen semboller: {result.symbols.join(' · ')}
                  </ThemedText>
                ) : null}
                <ThemedText style={{ color: colors.text }}>{result.interpretation}</ThemedText>
                <ThemedText type="small" style={[styles.disclaimer, { color: colors.textSecondary }]}>
                  {result.disclaimer}
                </ThemedText>
              </View>
            ) : null}

            {error ? (
              <ThemedText type="small" style={[styles.center, { color: colors.accentWarm }]}>
                {error}
              </ThemedText>
            ) : null}

            <Pressable
              accessibilityRole="button"
              onPress={() => router.replace('/mystic')}
              style={({ pressed }) => [styles.linkButton, { opacity: pressed ? 0.6 : 1 }]}>
              <ThemedText type="smallBold" style={{ color: colors.tint }}>
                Mistik Keşfe Dön
              </ThemedText>
            </Pressable>
          </View>
        </ScrollView>
      </SafeAreaView>

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
                  Kapat
                </ThemedText>
              </Pressable>
              <ThemedText
                type="smallBold"
                numberOfLines={2}
                style={[styles.cameraText, styles.cameraHint]}>
                {cameraReady ? KIND_LABELS[kind].hint : 'Kamera hazırlanıyor…'}
              </ThemedText>
            </View>
            <Pressable
              accessibilityLabel="Fal fotoğrafı çek"
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
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  background: { ...StyleSheet.absoluteFillObject, opacity: 0.2 },
  content: {
    flexGrow: 1,
    width: '100%',
    maxWidth: Math.min(MaxContentWidth, 620),
    alignSelf: 'center',
    justifyContent: 'center',
    padding: Spacing.four,
    paddingBottom: BottomTabInset + Spacing.four, // tab bar altında kalmasın
  },
  card: {
    alignItems: 'stretch',
    gap: Spacing.three,
    borderWidth: 1,
    borderRadius: Radii.large,
    padding: Spacing.five,
    ...(Shadows.soft ?? {}),
  },
  symbol: { fontSize: 54, lineHeight: 64, textAlign: 'center' },
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
    minHeight: 44, // erişilebilir dokunma hedefi
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
  cameraHint: { flex: 1, textAlign: 'right' }, // dar ekranda taşma/çakışma önlenir
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
