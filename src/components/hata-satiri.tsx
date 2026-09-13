/**
 * HataSatiri — bölüm-içi (inline) hata. Bir bölüm başarısız olduğunda yalnız
 * o bölüm düşer; tüm ekranı düşürmek YASAK (ss-05/ss-06 dersi).
 *
 * Kullanım: `const [hata, setHata] = useState<UygulamaHatasi | null>(null)`
 *   catch'te: `setHata(siniflaHata(deger, 'BNS_YUK_001'))`
 *   JSX'te:  `{hata && <HataSatiri hata={hata} onRetry={() => void yukle()} />}`
 */
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Radii, Spacing } from '@/constants/theme';
import { hataMesaji, type UygulamaHatasi } from '@/lib/app-error';
import { useI18n } from '@/providers/locale-provider';

type HataSatiriProps = {
  hata: UygulamaHatasi | string;
  onRetry?: () => void;
  retrying?: boolean;
};

export function HataSatiri({ hata, onRetry, retrying }: HataSatiriProps) {
  const { t } = useI18n();
  const ileti = typeof hata === 'string' ? hata : hataMesaji(hata, t);
  const kod = typeof hata === 'string' ? undefined : hata.hataKodu;

  return (
    <ThemedView
      type="backgroundElement"
      accessibilityRole="alert"
      style={styles.kutu}>
      <View style={styles.metinAlani}>
        <ThemedText themeColor="danger">{ileti}</ThemedText>
        {kod ? (
          <ThemedText type="small" themeColor="textSecondary">
            {t.common.errorCode(kod)}
          </ThemedText>
        ) : null}
      </View>
      {onRetry ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t.common.retry}
          disabled={retrying}
          hitSlop={8}
          onPress={onRetry}
          style={({ pressed }) => [
            styles.tekrarDene,
            pressed || retrying ? styles.basilmis : null,
          ]}>
          <ThemedText type="smallBold" themeColor="tint">
            {retrying ? t.common.loading : t.common.retry}
          </ThemedText>
        </Pressable>
      ) : null}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  kutu: {
    borderRadius: Radii.medium,
    padding: Spacing.three,
    gap: Spacing.two,
  },
  metinAlani: {
    gap: Spacing.one,
  },
  tekrarDene: {
    minHeight: 44,
    minWidth: 44,
    alignSelf: 'flex-start',
    justifyContent: 'center',
    paddingHorizontal: Spacing.three,
  },
  basilmis: {
    opacity: 0.6,
  },
});
