import { ReactNode } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

type KeyboardAwareViewProps = {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  /** Ekstra üst offset (header yüksekliği vb.) — yalnız iOS'ta kullanılır. */
  offset?: number;
};

/**
 * Klavye telafisi TEK katman (faz8.13 / 1a):
 * - iOS: pencere yeniden boyutlanmaz → KeyboardAvoidingView "padding" gerekir.
 * - Android: `softwareKeyboardLayoutMode: "resize"` pencereyi ZATEN küçültür.
 *   Üstüne bir de behavior="height" koymak çifte küçültme yapıyordu →
 *   kompozer zıplıyor/kayboluyordu. Android'de saf View döneriz.
 */
export function KeyboardAwareView({ children, style, offset = 0 }: KeyboardAwareViewProps) {
  if (Platform.OS !== 'ios') {
    return <View style={[styles.flex, style]}>{children}</View>;
  }
  return (
    <KeyboardAvoidingView
      style={[styles.flex, style]}
      behavior="padding"
      keyboardVerticalOffset={offset}>
      {children}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
});
