/**
 * BosDurum — hata DEĞİL, boş. Üçlü kural: yükleniyor / boş / hata.
 * Boş durumda tek cümle + tek eylem gösterilir.
 */
import { ActivityIndicator, Pressable, StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Radii, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type BosDurumProps = {
  baslik: string;
  govde: string;
  eylemEtiketi?: string;
  onEylem?: () => void;
  mesgul?: boolean;
};

export function BosDurum({ baslik, govde, eylemEtiketi, onEylem, mesgul }: BosDurumProps) {
  const theme = useTheme();
  return (
    <ThemedView type="backgroundElement" style={styles.kutu}>
      <ThemedText type="subtitle">{baslik}</ThemedText>
      <ThemedText themeColor="textSecondary">{govde}</ThemedText>
      {eylemEtiketi && onEylem ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={eylemEtiketi}
          disabled={mesgul}
          onPress={onEylem}
          style={({ pressed }) => [
            styles.eylem,
            { backgroundColor: theme.tint, opacity: pressed || mesgul ? 0.7 : 1 },
          ]}>
          {mesgul ? (
            <ActivityIndicator color={theme.onAccent} />
          ) : (
            <ThemedText type="smallBold" style={{ color: theme.onAccent }}>
              {eylemEtiketi}
            </ThemedText>
          )}
        </Pressable>
      ) : null}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  kutu: {
    borderRadius: Radii.large,
    padding: Spacing.four,
    gap: Spacing.two,
    alignItems: 'flex-start',
  },
  eylem: {
    minHeight: 44,
    borderRadius: Radii.pill,
    paddingHorizontal: Spacing.four,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.one,
  },
});
