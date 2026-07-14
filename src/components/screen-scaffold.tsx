import { ReactNode } from 'react';
import { ScrollView, StyleSheet, View, type ScrollViewProps } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useScreenInsets } from '@/hooks/use-screen-insets';

type ScreenScaffoldProps = {
  children: ReactNode;
  scrollable?: boolean;
  refreshControl?: ScrollViewProps['refreshControl'];
  contentStyle?: ScrollViewProps['contentContainerStyle'];
};

export function ScreenScaffold({
  children,
  scrollable = true,
  refreshControl,
  contentStyle,
}: ScreenScaffoldProps) {
  const insets = useScreenInsets();

  if (!scrollable) {
    return (
      <SafeAreaView style={styles.flex} edges={['top', 'left', 'right']}>
        <View style={[styles.staticContent, { paddingBottom: insets.bottom }, contentStyle]}>
          {children}
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.flex} edges={['top', 'left', 'right']}>
      <ScrollView
        refreshControl={refreshControl}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom },
          contentStyle,
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}>
        {children}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scrollContent: {
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.two,
    gap: Spacing.three,
  },
  staticContent: {
    flex: 1,
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.two,
    gap: Spacing.three,
  },
});
