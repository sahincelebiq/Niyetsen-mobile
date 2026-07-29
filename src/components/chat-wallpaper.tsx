import { memo, useMemo } from 'react';
import { StyleSheet, Text, useWindowDimensions, View } from 'react-native';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { useTheme } from '@/hooks/use-theme';

/**
 * WhatsApp tarzı sohbet duvar kâğıdı — emoji yok; ay / sonsuzluk / filiz
 * glifleri düşük opaklıkta tekrarlanır. Light + soft dark'ta okunur.
 */
const GLYPHS = ['☾', '∞', '✦', '⚘', '·'] as const;

export const ChatWallpaper = memo(function ChatWallpaper() {
  const theme = useTheme();
  const scheme = useColorScheme();
  const { width, height } = useWindowDimensions();

  const cells = useMemo(() => {
    const cols = Math.max(4, Math.ceil(width / 72));
    const rows = Math.max(6, Math.ceil(height / 88));
    const items: { key: string; glyph: string; left: number; top: number; rotate: string }[] =
      [];
    for (let r = 0; r < rows; r += 1) {
      for (let c = 0; c < cols; c += 1) {
        const i = r * cols + c;
        // Hafif ofset: satırlar damalı, "doodle" hissi.
        const jitterX = ((r % 2) * 18) + ((c % 3) - 1) * 4;
        const jitterY = ((c % 2) * 10) + ((r % 3) - 1) * 3;
        items.push({
          key: `${r}-${c}`,
          glyph: GLYPHS[i % GLYPHS.length],
          left: c * 72 + jitterX,
          top: r * 88 + jitterY,
          rotate: `${((i * 17) % 24) - 12}deg`,
        });
      }
    }
    return items;
  }, [width, height]);

  const glyphColor =
    scheme === 'dark' ? 'rgba(160, 190, 150, 0.11)' : 'rgba(61, 122, 78, 0.09)';

  return (
    <View
      pointerEvents="none"
      style={[styles.root, { backgroundColor: theme.background }]}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants">
      {cells.map((cell) => (
        <Text
          key={cell.key}
          style={[
            styles.glyph,
            {
              left: cell.left,
              top: cell.top,
              color: glyphColor,
              transform: [{ rotate: cell.rotate }],
            },
          ]}>
          {cell.glyph}
        </Text>
      ))}
    </View>
  );
});

const styles = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
  },
  glyph: {
    position: 'absolute',
    fontSize: 18,
    lineHeight: 22,
    fontWeight: '600',
  },
});
