import {
  createContext,
  PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  ConsentChoices,
  ConsentChoicesValue,
  EMPTY_CONSENT_CHOICES,
} from '@/components/consent-choices';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { LEGAL_VERSIONS } from '@/constants/legal';
import { MaxContentWidth, Radii, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { ConsentStatus, getConsentStatus, updateConsent } from '@/lib/api';

type ConsentContextValue = {
  status: ConsentStatus;
  saveChoices: (choices: ConsentChoicesValue) => Promise<void>;
};

const ConsentContext = createContext<ConsentContextValue | null>(null);

// Cache anahtarı yasal sürümlere bağlı: herhangi bir metin sürümü artarsa
// anahtar değişir → eski "tamam" cache'i otomatik geçersizleşir, gate döner.
const CONSENT_OK_KEY = `niyetsen.consent.ok.${Object.values(LEGAL_VERSIONS).join('|')}`;
const CONSENT_OK_VALUE = '1';

/** Cache'li hızlı yolda, sunucu yanıtı gelene dek geçerli iyimser durum. */
function optimisticGrantedStatus(): ConsentStatus {
  const now = new Date().toISOString();
  return {
    privacy_policy: { version: LEGAL_VERSIONS.privacyPolicy, accepted: true, decided_at: now },
    kvkk_explicit_consent: { version: LEGAL_VERSIONS.kvkkConsent, accepted: true, decided_at: now },
    ai_chat_processing: { version: LEGAL_VERSIONS.aiChatConsent, accepted: true, decided_at: now },
    proof_photo_processing: { version: LEGAL_VERSIONS.proofPhotoConsent, accepted: true, decided_at: now },
    marketing_communications: { version: LEGAL_VERSIONS.marketingConsent, accepted: true, decided_at: now },
    needs_reconsent: false,
  } as ConsentStatus;
}

function hasCurrentDecisions(status: ConsentStatus): boolean {
  return (
    !status.needs_reconsent &&
    status.privacy_policy.version === LEGAL_VERSIONS.privacyPolicy &&
    status.privacy_policy.accepted &&
    status.kvkk_explicit_consent.version === LEGAL_VERSIONS.kvkkConsent &&
    status.kvkk_explicit_consent.decided_at !== null &&
    status.ai_chat_processing.version === LEGAL_VERSIONS.aiChatConsent &&
    status.ai_chat_processing.decided_at !== null &&
    status.proof_photo_processing.version === LEGAL_VERSIONS.proofPhotoConsent &&
    status.proof_photo_processing.decided_at !== null &&
    status.marketing_communications.version === LEGAL_VERSIONS.marketingConsent &&
    status.marketing_communications.decided_at !== null
  );
}

function choicesFromStatus(status: ConsentStatus): ConsentChoicesValue {
  return {
    privacy: status.privacy_policy.accepted,
    ai: status.ai_chat_processing.accepted,
    proofPhoto: status.proof_photo_processing.accepted,
    marketing: status.marketing_communications.accepted,
  };
}

export function ConsentGate({ children }: PropsWithChildren) {
  const theme = useTheme();
  const [status, setStatus] = useState<ConsentStatus | null>(null);
  const [choices, setChoices] = useState(EMPTY_CONSENT_CHOICES);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // FAZ 8.11: onaylar bir kez verildiyse her açılışta ağ BEKLENMEZ — cache'ten
  // hemen geçilir, sunucu arka planda doğrulanır (versiyon değişirse gate döner).
  const [cachedOk, setCachedOk] = useState(false);

  const load = useCallback(async (background = false) => {
    if (!background) {
      setLoading(true);
    }
    setError(null);
    try {
      const nextStatus = await getConsentStatus();
      setStatus(nextStatus);
      setChoices(choicesFromStatus(nextStatus));
      const ok = hasCurrentDecisions(nextStatus);
      setCachedOk(ok);
      void AsyncStorage.setItem(CONSENT_OK_KEY, ok ? CONSENT_OK_VALUE : '');
    } catch (value) {
      // Arka plan doğrulaması sessiz düşer; cache'li kullanıcı engellenmez.
      if (!background) {
        setError(value instanceof Error ? value.message : 'Rıza tercihleri yüklenemedi.');
      }
    } finally {
      if (!background) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const cached = await AsyncStorage.getItem(CONSENT_OK_KEY);
        if (cancelled) return;
        if (cached === CONSENT_OK_VALUE) {
          // Hızlı yol: son bilinen durum "tamam" — uygulamayı hemen aç,
          // sunucuyla arka planda senkronize ol.
          setCachedOk(true);
          setLoading(false);
          void load(true);
          return;
        }
      } catch {
        // Cache okunamazsa normal (bloklu) yol.
      }
      if (!cancelled) void load();
    })();
    return () => {
      cancelled = true;
    };
  }, [load]);

  const saveChoices = useCallback(async (nextChoices: ConsentChoicesValue) => {
    setSaving(true);
    setError(null);
    try {
      // KVKK açık rıza, aydınlatma onayıyla (privacy) birlikte verilir. AI ve fotoğraf
      // izinleri amaç bazlı ek rızalardır; kapatılmaları KVKK temel rızasını DÜŞÜRMEZ.
      // (Eski `ai || proofPhoto` türetmesi, iki izin kapatılınca tüm uygulamayı
      // consent kilidine sokuyordu — backend sözleşmesiyle çelişen hataydı.)
      const nextStatus = await updateConsent({
        privacy_policy: { accepted: nextChoices.privacy },
        kvkk_explicit_consent: { accepted: nextChoices.privacy },
        ai_chat_processing: { accepted: nextChoices.ai },
        proof_photo_processing: { accepted: nextChoices.proofPhoto },
        marketing_communications: { accepted: nextChoices.marketing },
      });
      setStatus(nextStatus);
      setChoices(choicesFromStatus(nextStatus));
    } catch (value) {
      setError(value instanceof Error ? value.message : 'Tercihler kaydedilemedi.');
      throw value;
    } finally {
      setSaving(false);
    }
  }, []);

  // Sunucu yanıtı yoksa ama cache "tamam" diyorsa iyimser durumla ilerle —
  // kullanıcı beklemez; sunucu farklı derse gate kendiliğinden geri gelir.
  const effectiveStatus = status ?? (cachedOk ? optimisticGrantedStatus() : null);
  const contextValue = useMemo(
    () => (effectiveStatus ? { status: effectiveStatus, saveChoices } : null),
    [saveChoices, effectiveStatus],
  );

  if (loading && !cachedOk) {
    return (
      <ThemedView style={styles.center}>
        <ActivityIndicator color={theme.tint} />
        <ThemedText themeColor="textSecondary">Yasal tercihler kontrol ediliyor…</ThemedText>
      </ThemedView>
    );
  }

  if (effectiveStatus && hasCurrentDecisions(effectiveStatus) && contextValue) {
    return <ConsentContext.Provider value={contextValue}>{children}</ConsentContext.Provider>;
  }

  async function save() {
    if (!choices.privacy) {
      setError('Devam etmek için aydınlatma metinlerini okuduğunu belirtmelisin.');
      return;
    }
    try {
      await saveChoices(choices);
    } catch {
      // saveChoices kullanıcıya gösterilecek hata durumunu günceller.
    }
  }

  return (
    <ThemedView style={styles.flex}>
      <SafeAreaView style={styles.flex}>
        <ScrollView contentContainerStyle={styles.page}>
          <View style={styles.header}>
            <ThemedText type="title" style={styles.title}>
              Yasal tercihlerini güncelle
            </ThemedText>
            <ThemedText themeColor="textSecondary">
              Metinler veya veri işleme tercihleri yenilendi. Seçimlerini ayrı ayrı
              inceleyebilirsin.
            </ThemedText>
          </View>

          <ThemedView
            type="backgroundElement"
            style={[styles.card, { borderColor: theme.border }]}>
            <ConsentChoices value={choices} onChange={setChoices} />
            {error && <ThemedText themeColor="danger">{error}</ThemedText>}
            <Pressable
              disabled={saving}
              onPress={() => void save()}
              style={({ pressed }) => [
                styles.button,
                { backgroundColor: theme.accentWarm },
                (pressed || saving) && styles.pressed,
              ]}>
              {saving ? (
                <ActivityIndicator color={theme.onAccent} />
              ) : (
                <ThemedText type="smallBold" style={{ color: theme.onAccent }}>
                  Tercihlerimi Kaydet
                </ThemedText>
              )}
            </Pressable>
            {!status && (
              <Pressable onPress={() => void load()}>
                <ThemedText type="smallBold" themeColor="tint" style={styles.centerText}>
                  Tekrar dene
                </ThemedText>
              </Pressable>
            )}
          </ThemedView>
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

export function useConsentPreferences() {
  const value = useContext(ConsentContext);
  if (!value) throw new Error('useConsentPreferences, ConsentGate içinde kullanılmalı.');
  return value;
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.three,
    padding: Spacing.four,
  },
  page: {
    flexGrow: 1,
    width: '100%',
    maxWidth: Math.min(MaxContentWidth, 620),
    alignSelf: 'center',
    justifyContent: 'center',
    padding: Spacing.four,
    gap: Spacing.four,
  },
  header: { gap: Spacing.two },
  title: { fontSize: 36, lineHeight: 42 },
  card: {
    borderWidth: 1,
    borderRadius: Radii.large,
    padding: Spacing.four,
    gap: Spacing.four,
  },
  button: {
    minHeight: 50,
    borderRadius: Radii.medium,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.three,
  },
  pressed: { opacity: 0.7 },
  centerText: { textAlign: 'center' },
});

