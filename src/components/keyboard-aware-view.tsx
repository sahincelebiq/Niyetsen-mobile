import { ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { useOverlayKeyboardInset } from '@/hooks/use-keyboard-height';

type KeyboardAwareViewProps = {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  /**
   * Dock ölçümünden gelen ek lift (sohbet). Verilmezse overlay klavye
   * yüksekliği kullanılır — NativeTabs + KAV çift kaydırmasın diye
   * KeyboardAvoidingView yok.
   */
  lift?: number;
  /** Eski iOS offset — artık yok sayılır; API kırılmasın diye durur. */
  offset?: number;
};

/**
 * Sohbet / profil / mistik klavye telafisi TEK katman.
 * Overlay IME'de paddingBottom = max(ölçülen lift, klavye yedeği).
 * adjustResize pencereyi küçülttüyse inset 0 kalır.
 */
export function KeyboardAwareView({ children, style, lift = 0 }: KeyboardAwareViewProps) {
  const fallback = useOverlayKeyboardInset();
  const paddingBottom = Math.max(lift, fallback);
  return (
    <View style={[styles.flex, paddingBottom > 0 ? { paddingBottom } : null, style]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
});
