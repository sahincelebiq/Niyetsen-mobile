import { ReactNode, useEffect, useRef } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

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
 */
export function KeyboardAwareView({
  children,
  style,
  bottomInset,
  onKeyboardChange,
}: KeyboardAwareViewProps) {
  const containerRef = useRef<View>(null);
  const { onLayout, ...keyboard } = useKeyboardLift(containerRef, { bottomInset });

  useEffect(() => {
    onKeyboardChange?.(keyboard);
    // Yalnız durum değişince bildir — callback kimliği değişse de tekrar tetikleme.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [keyboard.lift, keyboard.open, keyboard.covering, keyboard.height]);

  return (
    <View
      ref={containerRef}
      collapsable={false}
      onLayout={onLayout}
      style={[styles.flex, keyboard.lift > 0 ? { paddingBottom: keyboard.lift } : null, style]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
});
