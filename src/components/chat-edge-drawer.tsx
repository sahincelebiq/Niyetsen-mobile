import { ReactNode, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { runOnJS } from 'react-native-reanimated';

type ChatEdgeDrawerProps = {
  children: ReactNode;
  onOpen: () => void;
  enabled?: boolean;
};

/** Sol kenar şeridi — sohbet kaydırmasıyla çakışmayı önlemek için dar tutulur. */
const EDGE_WIDTH = 28;
const OPEN_DISTANCE = 36;

/**
 * Sol kenardan sağa kaydırınca bağlam panelini açar.
 * Jest yalnızca kenar şeridinde yakalanır; FlatList dikey scroll'u bozulmaz.
 */
export function ChatEdgeDrawer({ children, onOpen, enabled = true }: ChatEdgeDrawerProps) {
  const pan = useMemo(
    () =>
      Gesture.Pan()
        .enabled(enabled)
        .activeOffsetX(14)
        .failOffsetY([-20, 20])
        .onEnd((event) => {
          const shouldOpen =
            event.translationX > OPEN_DISTANCE ||
            (event.translationX > 18 && event.velocityX > 140);
          if (shouldOpen) {
            runOnJS(onOpen)();
          }
        }),
    [enabled, onOpen],
  );

  return (
    <View style={styles.container}>
      {children}
      {enabled ? (
        <GestureDetector gesture={pan}>
          <View
            style={styles.edgeHit}
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants"
            pointerEvents="box-only"
          />
        </GestureDetector>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  edgeHit: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: EDGE_WIDTH,
    zIndex: 2,
  },
});
