import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, {
  FadeIn,
  FadeOut,
  ReduceMotion,
  SlideInDown,
  SlideOutDown,
} from 'react-native-reanimated';

import { ThemedText } from '@/components/themed-text';
import { Motion, Radii, Shadows, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useLocale } from '@/providers/locale-provider';

type ComposerPopoverProps = {
  title: string;
  onClose: () => void;
  children: ReactNode;
};

/**
 * Composer'ın üstünden yükselen küçük alt sayfa kabuğu (ek eylemler,
 * Felsefe Yolları). Tam ekran modal DEĞİL — sohbet akışını bölmez:
 * sohbet sütununun içinde, alttan Motion.base ile yükselir, backdrop'a
 * dokununca aynı simetriyle iner. Ebeveyni `position: relative` olmalı.
 */
export function ComposerPopover({ title, onClose, children }: ComposerPopoverProps) {
  const theme = useTheme();
  const { t } = useLocale();

  return (
    <View style={styles.root} pointerEvents="box-none">
      <Animated.View
        entering={FadeIn.duration(Motion.fast).reduceMotion(ReduceMotion.System)}
        exiting={FadeOut.duration(Motion.fast).reduceMotion(ReduceMotion.System)}
        style={styles.backdrop}>
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel={t.common.closeSection}
        />
      </Animated.View>
      <Animated.View
        entering={SlideInDown.duration(Motion.base).reduceMotion(ReduceMotion.System)}
        exiting={SlideOutDown.duration(Motion.base).reduceMotion(ReduceMotion.System)}
        style={[
          styles.sheet,
          Shadows.lifted,
          {
            backgroundColor: theme.backgroundElement,
            borderColor: theme.border,
          },
        ]}>
        <View style={styles.header}>
          <ThemedText type="smallBold" themeColor="textSecondary" style={styles.title}>
            {title}
          </ThemedText>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t.common.closeSection}
            onPress={onClose}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            style={({ pressed }) => [
              styles.closeButton,
              { backgroundColor: theme.surfaceMuted },
              pressed && styles.pressed,
            ]}>
            <MaterialCommunityIcons name="close" size={18} color={theme.textSecondary} />
          </Pressable>
        </View>
        {children}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 6,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  sheet: {
    marginHorizontal: Spacing.two,
    marginBottom: Spacing.two,
    borderRadius: Radii.large,
    borderWidth: StyleSheet.hairlineWidth,
    padding: Spacing.three,
    gap: Spacing.two,
    maxHeight: '62%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
  title: {
    flex: 1,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  closeButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.7,
  },
});
