import { ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

type KeyboardAwareViewProps = {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  /** Eski iOS offset — NativeTabs ile KAV çifte kaydırma yaptığı için yok sayılır. */
  offset?: number;
};

/**
 * Sohbet klavye telafisi `useKeyboardDockLift` ile TEK katman (ölçüm).
 * KeyboardAvoidingView NativeTabs'te yanlış hesaplıyordu; burada yalnız flex sarmalayıcı.
 */
export function KeyboardAwareView({ children, style }: KeyboardAwareViewProps) {
  return <View style={[styles.flex, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
});
