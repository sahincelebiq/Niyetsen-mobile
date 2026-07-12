import { Icon, Label, NativeTabs } from 'expo-router/unstable-native-tabs';
import { useColorScheme } from 'react-native';

import { Colors } from '@/constants/theme';

export default function AppTabs() {
  const scheme = useColorScheme();
  const colors = Colors[scheme === 'dark' ? 'dark' : 'light'];

  return (
    <NativeTabs
      backgroundColor={colors.background}
      indicatorColor={colors.backgroundSelected}
      labelStyle={{ selected: { color: colors.tint } }}>
      <NativeTabs.Trigger name="index">
        <Label>Sohbet</Label>
        <Icon sf="bubble.left.and.bubble.right.fill" />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="daily">
        <Label>Bugün</Label>
        <Icon sf="checkmark.circle.fill" />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="explore">
        <Label>Planım</Label>
        <Icon sf="calendar" />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="rank">
        <Label>Rütbe</Label>
        <Icon sf="chart.bar.fill" />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="mystic">
        <Label>Mistik</Label>
        <Icon sf="sparkles" />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="settings">
        <Label>Ayarlar</Label>
        <Icon sf="gearshape.fill" />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="bonus" hidden />
      <NativeTabs.Trigger name="paywall" hidden />
    </NativeTabs>
  );
}
