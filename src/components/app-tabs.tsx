import { Icon, Label, NativeTabs } from 'expo-router/unstable-native-tabs';
import { useColorScheme } from 'react-native';

import { Colors } from '@/constants/theme';

export default function AppTabs() {
  // Tab bar artık sistem temasını izler — önceden dark modda açık renkli kalıyordu.
  const scheme = useColorScheme();
  const colors = scheme === 'dark' ? Colors.dark : Colors.light;

  return (
    <NativeTabs
      backgroundColor={colors.backgroundElement}
      indicatorColor={colors.backgroundSelected}
      labelStyle={{
        default: { color: colors.tabInactive },
        selected: { color: colors.accentWarm },
      }}
      iconColor={{
        default: colors.tabInactive,
        selected: colors.accentWarm,
      }}>
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
        <Label>Zincir</Label>
        <Icon sf="link" />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="settings">
        <Label>Profil</Label>
        <Icon sf="person.crop.circle.fill" />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="mystic" hidden />
      <NativeTabs.Trigger name="bonus" hidden />
      <NativeTabs.Trigger name="paywall" hidden />
      <NativeTabs.Trigger name="astroloji" hidden />
      <NativeTabs.Trigger name="tarot" hidden />
      <NativeTabs.Trigger name="fal" hidden />
    </NativeTabs>
  );
}
