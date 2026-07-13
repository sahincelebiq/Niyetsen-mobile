import { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { runOnJS } from 'react-native-reanimated';

type ChatEdgeDrawerProps = {
  children: ReactNode;
  onOpen: () => void;
  enabled?: boolean;
};

const EDGE_WIDTH = 72;
const OPEN_DISTANCE = 40;

/** Sol kenardan sağa kaydırınca niyet geçmişi panelini açar. */
export function ChatEdgeDrawer({ children, onOpen, enabled = true }: ChatEdgeDrawerProps) {
  const pan = Gesture.Pan()
    .enabled(enabled)
    .manualActivation(true)
    .onTouchesDown((event, state) => {
      const touch = event.allTouches[0];
      const startX = touch?.absoluteX ?? touch?.x ?? Number.POSITIVE_INFINITY;
      if (startX <= EDGE_WIDTH) {
        state.activate();
      } else {
        state.fail();
      }
    })
    .activeOffsetX(10)
    .failOffsetY([-32, 32])
    .onEnd((event) => {
      const shouldOpen =
        event.translationX > OPEN_DISTANCE ||
        (event.translationX > 20 && event.velocityX > 120);
      if (shouldOpen) {
        runOnJS(onOpen)();
      }
    });

  if (!enabled) {
    return <View style={styles.container}>{children}</View>;
  }

  return (
    <GestureDetector gesture={pan}>
      <View style={styles.container}>{children}</View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
