import { ReactNode } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

type KeyboardAwareViewProps = {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  /** Ekstra üst offset (header yüksekliği vb.) */
  offset?: number;
};

export function KeyboardAwareView({ children, style, offset = 0 }: KeyboardAwareViewProps) {
  return (
    <KeyboardAvoidingView
      style={[styles.flex, style]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={offset}>
      {children}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
});
