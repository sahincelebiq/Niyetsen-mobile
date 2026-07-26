import { ReactNode } from 'react';
import { StyleSheet, useColorScheme, View, type ViewStyle } from 'react-native';

import { Radii, Shadows, Spacing, SurfaceEdge, Texture } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type SurfaceCardProps = {
  children: ReactNode;
  style?: ViewStyle;
  elevated?: boolean;
  /** Öne çıkan kart: daha geniş gölge + belirgin kenar ışığı. */
  hero?: boolean;
};

/**
 * Uygulamanın temel yüzeyi. UI cilası v2 (19 Tem): iki katmanlı gölge +
 * üst kenar ışığı — kart zeminden "kalkar", düz görünüm kaybolur.
 * Ölçüler (padding/radius/gap) DEĞİŞMEDİ; düzen kaymaz.
 */
export function SurfaceCard({
  children,
  style,
  elevated = false,
  hero = false,
}: SurfaceCardProps) {
  const theme = useTheme();
  const scheme = useColorScheme();
  const edge = scheme === 'dark' ? SurfaceEdge.dark : SurfaceEdge.light;

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: theme.backgroundElement,
          borderColor: theme.border,
          borderTopColor: elevated || hero ? edge : theme.border,
        },
        hero ? Shadows.hero : elevated ? Shadows.lifted : null,
        style,
      ]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: Texture.cardBorderWidth,
    borderRadius: Radii.large,
    padding: Spacing.three,
    gap: Spacing.two,
  },
});
