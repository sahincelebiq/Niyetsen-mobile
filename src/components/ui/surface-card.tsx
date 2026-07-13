import { ReactNode } from 'react';
import { StyleSheet, View, type ViewStyle } from 'react-native';

import { Radii, Shadows, Spacing, Texture } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type SurfaceCardProps = {
  children: ReactNode;
  style?: ViewStyle;
  elevated?: boolean;
};

export function SurfaceCard({ children, style, elevated = false }: SurfaceCardProps) {
  const theme = useTheme();
  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: theme.backgroundElement,
          borderColor: theme.border,
        },
        elevated ? Shadows.subtle : null,
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
