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
 * Klavye telafisi TEK katman:
 * - iOS: pencere yeniden boyutlanmaz → KeyboardAvoidingView "padding" gerekir.
 * - Android: NativeTabs + edge-to-edge'de resize pencereyi küçültmez.
 *   Kompozer `keyboardHeight` ile kalkar (chat-composer / mistik sohbet).
 *   Burada KAV kullanmak çifte kaydırma yapardı — Android'de saf View.
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
