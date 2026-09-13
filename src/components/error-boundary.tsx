/**
 * ErrorBoundary — ekran seviyesinde kurtarma + kökte beyaz-ekran koruması.
 *
 * Sınıf bileşeni dili bilmez; `HataSiniri` sarmalayıcısı o anki dilden
 * metinleri verir. Çökme Sentry'ye raporlanır, kullanıcıya teknik detay
 * gösterilmez — yalnız destek kodu (hataKodu) küçük gri satırda.
 *
 * Kök kullanımı (`_layout.tsx`): `<HataSiniri hataKodu="KOK_001">…</HataSiniri>`
 * Ekran kullanımı: `<HataSiniri hataKodu="BNS_EKRAN_001" anaSayfayaDon={false}>`
 */
import { Component, type ReactNode } from 'react';
import { Pressable, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Radii, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { bildirHata } from '@/lib/error-report';
import { useI18n } from '@/providers/locale-provider';
import type { Messages } from '@/i18n/types';

type SinirMetinleri = {
  baslik: string;
  govde: string;
  tekrarDene: string;
  anaSayfa: string;
  kodSatiri: string;
};

type ErrorBoundaryProps = {
  children: ReactNode;
  metinler: SinirMetinleri;
  hataKodu: string;
  ekran?: string;
  /** Kök sınırda true — "Ana sayfaya dön" router.replace('/') yapar. */
  anaSayfayaDon?: boolean;
  onAnaSayfa?: () => void;
};

type ErrorBoundaryState = { ariza: Error | null };

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { ariza: null };

  static getDerivedStateFromError(ariza: Error): ErrorBoundaryState {
    return { ariza };
  }

  componentDidCatch(ariza: Error): void {
    bildirHata(ariza, 'error-boundary', {
      ekran: this.props.ekran,
      hataKodu: this.props.hataKodu,
    });
  }

  private sifirla = (): void => {
    this.setState({ ariza: null });
  };

  render(): ReactNode {
    if (!this.state.ariza) return this.props.children;
    return (
      <KurtarmaEkrani
        metinler={this.props.metinler}
        anaSayfayaDon={this.props.anaSayfayaDon ?? true}
        onAnaSayfa={this.props.onAnaSayfa}
        onTekrarDene={this.sifirla}
      />
    );
  }
}

function KurtarmaEkrani({
  metinler,
  anaSayfayaDon,
  onAnaSayfa,
  onTekrarDene,
}: {
  metinler: SinirMetinleri;
  anaSayfayaDon: boolean;
  onAnaSayfa?: () => void;
  onTekrarDene: () => void;
}) {
  const theme = useTheme();
  const router = useRouter();
  return (
    <ThemedView style={styles.kapsayici}>
      <ThemedView type="backgroundElement" style={styles.kart}>
        <ThemedText type="screenTitle">{metinler.baslik}</ThemedText>
        <ThemedText themeColor="textSecondary">{metinler.govde}</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          {metinler.kodSatiri}
        </ThemedText>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={metinler.tekrarDene}
          onPress={onTekrarDene}
          style={({ pressed }) => [
            styles.birincil,
            { backgroundColor: theme.tint, opacity: pressed ? 0.8 : 1 },
          ]}>
          <ThemedText type="smallBold" style={{ color: theme.onAccent }}>
            {metinler.tekrarDene}
          </ThemedText>
        </Pressable>
        {anaSayfayaDon ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={metinler.anaSayfa}
            onPress={() => {
              if (onAnaSayfa) {
                onAnaSayfa();
              } else {
                router.replace('/');
              }
              onTekrarDene();
            }}
            style={({ pressed }) => [styles.ikincil, pressed ? styles.basilmis : null]}>
            <ThemedText type="smallBold" themeColor="tint">
              {metinler.anaSayfa}
            </ThemedText>
          </Pressable>
        ) : null}
      </ThemedView>
    </ThemedView>
  );
}

function metinleriUret(t: Messages, hataKodu: string): SinirMetinleri {
  return {
    baslik: t.common.errorGeneric,
    govde: t.common.offlineBanner,
    tekrarDene: t.common.retry,
    anaSayfa: t.common.back,
    kodSatiri: t.common.errorCode(hataKodu),
  };
}

export function HataSiniri({
  children,
  hataKodu,
  ekran,
  anaSayfayaDon,
  onAnaSayfa,
}: {
  children: ReactNode;
  hataKodu: string;
  ekran?: string;
  anaSayfayaDon?: boolean;
  onAnaSayfa?: () => void;
}) {
  const { t } = useI18n();
  const metinler = metinleriUret(t, hataKodu);
  return (
    <ErrorBoundary
      hataKodu={hataKodu}
      ekran={ekran}
      anaSayfayaDon={anaSayfayaDon}
      onAnaSayfa={onAnaSayfa}
      metinler={metinler}>
      {children}
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  kapsayici: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.four,
  },
  kart: {
    width: '100%',
    maxWidth: 420,
    borderRadius: Radii.large,
    padding: Spacing.four,
    gap: Spacing.three,
  },
  birincil: {
    minHeight: 48,
    borderRadius: Radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.four,
  },
  ikincil: {
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.three,
  },
  basilmis: {
    opacity: 0.6,
  },
});
