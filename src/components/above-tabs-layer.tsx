import { ReactNode } from 'react';
import { Modal, Platform, StyleSheet } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import {
  initialWindowMetrics,
  SafeAreaProvider,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';
import { FullWindowOverlay } from 'react-native-screens';

import { Spacing } from '@/constants/theme';

type AboveTabsLayerProps = {
  visible: boolean;
  onRequestClose: () => void;
  children: ReactNode;
};

/**
 * Native tab bar, ekranın içindeki Modal'ın üstünde kalabiliyor (sekme
 * içeriği ile sheet iç içe). iOS'ta tam pencere örtüsü, Android'de kenardan
 * kenara Dialog sheet'i sekmenin ve sistem çubuğunun üstüne alır.
 */
export function AboveTabsLayer({ visible, onRequestClose, children }: AboveTabsLayerProps) {
  if (Platform.OS === 'ios') {
    if (!visible) return null;
    return (
      <FullWindowOverlay unstable_accessibilityContainerViewIsModal>
        <GestureHandlerRootView style={styles.fill}>
          <SafeAreaProvider initialMetrics={initialWindowMetrics}>
            {children}
          </SafeAreaProvider>
        </GestureHandlerRootView>
      </FullWindowOverlay>
    );
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      statusBarTranslucent
      navigationBarTranslucent
      presentationStyle="overFullScreen"
      onRequestClose={onRequestClose}>
      <GestureHandlerRootView style={styles.fill}>
        <SafeAreaProvider initialMetrics={initialWindowMetrics}>
          {children}
        </SafeAreaProvider>
      </GestureHandlerRootView>
    </Modal>
  );
}

/** Sheet dibi: sistem çubuğu ölçülmezse de navigasyona yapışmasın. */
export function useSheetBottomPadding(extra: number = Spacing.three): number {
  const insets = useSafeAreaInsets();
  const measured = Math.max(insets.bottom, initialWindowMetrics?.insets.bottom ?? 0);
  return Math.max(measured, 12) + extra;
}

const styles = StyleSheet.create({
  fill: {
    flex: 1,
  },
});
