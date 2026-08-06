import {
  Tabs,
  TabList,
  TabTrigger,
  TabSlot,
  TabTriggerSlotProps,
  TabListProps,
} from 'expo-router/ui';
import { Pressable, View, StyleSheet } from 'react-native';

import { ThemedText } from './themed-text';
import { ThemedView } from './themed-view';

import { BottomTabInset, MaxContentWidth, Shadows, Spacing } from '@/constants/theme';
import { useI18n } from '@/providers/locale-provider';

export default function AppTabs() {
  const { t } = useI18n();
  return (
    <Tabs>
      <TabSlot style={{ height: '100%', paddingBottom: BottomTabInset }} />
      <TabList asChild>
        <CustomTabList>
          <TabTrigger name="home" href="/" asChild>
            <TabButton>{t.tabs.chat}</TabButton>
          </TabTrigger>
          <TabTrigger name="daily" href="/daily" asChild>
            <TabButton>{t.tabs.today}</TabButton>
          </TabTrigger>
          <TabTrigger name="explore" href="/explore" asChild>
            <TabButton>{t.tabs.plan}</TabButton>
          </TabTrigger>
          <TabTrigger name="rank" href="/rank" asChild>
            <TabButton>{t.tabs.chain}</TabButton>
          </TabTrigger>
          <TabTrigger name="settings" href="/settings" asChild>
            <TabButton>{t.tabs.profile}</TabButton>
          </TabTrigger>
        </CustomTabList>
      </TabList>
    </Tabs>
  );
}

export function TabButton({ children, isFocused, ...props }: TabTriggerSlotProps) {
  return (
    <Pressable {...props} style={({ pressed }) => pressed && styles.pressed}>
      <ThemedView
        type={isFocused ? 'backgroundSelected' : 'backgroundElement'}
        style={styles.tabButtonView}>
        <ThemedText type="smallBold" themeColor={isFocused ? 'accentWarm' : 'textSecondary'}>
          {children}
        </ThemedText>
      </ThemedView>
    </Pressable>
  );
}

export function CustomTabList(props: TabListProps) {
  return (
    <View {...props} style={styles.tabListContainer}>
      {/* Sabit açık renk kaldırıldı — ThemedView dark modda da doğru zemini verir. */}
      <ThemedView type="backgroundElement" style={[styles.innerContainer, Shadows.subtle]}>
        {props.children}
      </ThemedView>
    </View>
  );
}

const styles = StyleSheet.create({
  tabListContainer: {
    position: 'absolute',
    bottom: 0,
    width: '100%',
    paddingHorizontal: Spacing.three,
    paddingBottom: Spacing.two,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
  },
  innerContainer: {
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.two,
    borderRadius: Spacing.five,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    flexGrow: 1,
    gap: Spacing.one,
    maxWidth: MaxContentWidth,
  },
  pressed: {
    opacity: 0.7,
  },
  tabButtonView: {
    paddingVertical: Spacing.one,
    paddingHorizontal: Spacing.two,
    borderRadius: Spacing.three,
  },
});
