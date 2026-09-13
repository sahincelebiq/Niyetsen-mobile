import { ReactNode, useEffect, useRef } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, {
  Easing,
  ReduceMotion,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { Motion } from '@/constants/theme';
import { useKeyboardLift, type KeyboardLiftState } from '@/hooks/use-keyboard-height';

type KeyboardAwareViewProps = {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  /** Kabın dibiyle yazı kutusunun dibi arasındaki sabit boşluk (çoğu ekranda 0). */
  bottomInset?: number;
  /** Ekranın klavye durumuna ihtiyacı varsa (sohbet: composer padding, scroll). */
  onKeyboardChange?: (state: KeyboardLiftState) => void;
};

/**
 * Sohbet / profil / mistik / auth klavye telafisi TEK katman.
 *
 * Kendi dibini ölçer: klavye onu örtüyorsa paddingBottom = örtüşme + gap;
 * adjustResize pencereyi zaten küçülttüyse 0 kalır. KeyboardAvoidingView YOK
 * (NativeTabs + edge-to-edge'de çift kaydırıyordu); Dimensions tahmini YOK
 * (Android'de klavyeyle küçülmüyor, yanlış "overlay" veriyordu).
 *
 * Lift uygulanırken zıplama olmasın diye padding reanimated ile Motion.base
 * süresinde yumuşatılır (iOS klavye eğrisine yakın; Android resize'da lift
 * zaten ~0 ölçülür, animasyon devreye girmez). ReduceMotion.System saygısı var.
 *
 * Ölçülen kap (dış View, yalnız flex:1) ile padding uygulanan kap (iç
 * Animated.View; caller style'ı da ona düşer) ayrık: padding içerde kaldığı
 * için dış kabın dibi yerinden oynamaz, her ölçüm bağımsız kalır
 * ("uygulanan lift'i geri ekle" düzeltmesi ve yarışı yok). İç kap dışını
 * birebir doldurur (flex:1), yani dış dibin ölçümü iç dibin ölçümüdür.
 */
export function KeyboardAwareView({
  children,
  style,
  bottomInset,
  onKeyboardChange,
}: KeyboardAwareViewProps) {
  const containerRef = useRef<View>(null);
  const { onLayout, ...keyboard } = useKeyboardLift(containerRef, { bottomInset });
  const lift = useSharedValue(0);

  useEffect(() => {
    lift.value = withTiming(keyboard.lift, {
      duration: Motion.base,
      easing: Easing.out(Easing.quad),
      reduceMotion: ReduceMotion.System,
    });
  }, [keyboard.lift, lift]);

  useEffect(() => {
    onKeyboardChange?.(keyboard);
    // Yalnız durum değişince bildir — callback kimliği değişse de tekrar tetikleme.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [keyboard.lift, keyboard.open, keyboard.covering, keyboard.height]);

  const animatedPadding = useAnimatedStyle(() => ({
    paddingBottom: lift.value,
  }));

  return (
    <View ref={containerRef} collapsable={false} onLayout={onLayout} style={styles.flex}>
      <Animated.View style={[styles.flex, animatedPadding, style]}>
        {children}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
});
