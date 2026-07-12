import { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';

type ChatEdgeDrawerProps = {
  children: ReactNode;
  onOpen: () => void;
  enabled?: boolean;
};

/** Sol kenardan sağa kaydırınca niyet geçmişi panelini açar. */
export function ChatEdgeDrawer({ children, onOpen, enabled = true }: ChatEdgeDrawerProps) {
  const pan = Gesture.Pan()
    .enabled(enabled)
    .activeOffsetX(24)
    .failOffsetY([-20, 20])
    .onEnd((event) => {
      if (event.translationX > 72 && event.velocityX > 0) {
        onOpen();
      }
    });

  return (
    <View style={styles.container}>
      {enabled ? (
        <GestureDetector gesture={pan}>
          <View style={styles.edgeZone} />
        </GestureDetector>
      ) : null}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  edgeZone: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 28,
    zIndex: 2,
  },
});
