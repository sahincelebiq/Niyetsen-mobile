import { Link, useRouter, type Href } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import {
  LEGAL_DOCUMENTS,
  LEGAL_EFFECTIVE_DATE,
  LEGAL_IDENTITY,
  LegalDocumentId,
} from '@/constants/legal';
import { MaxContentWidth, Radii, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { openLegalDocument } from '@/lib/legal-links';

const LEGAL_LINKS = [
  { id: 'privacy', href: '/legal/privacy' as const },
  { id: 'kvkk', href: '/legal/kvkk' as const },
  { id: 'consent', href: '/legal/consent' as const },
  { id: 'terms', href: '/legal/terms' as const },
] satisfies { id: LegalDocumentId; href: string }[];

export function LegalDocumentScreen({ documentId }: { documentId: LegalDocumentId }) {
  const document = LEGAL_DOCUMENTS[documentId];
  const router = useRouter();
  const theme = useTheme();

  return (
    <ThemedView style={styles.flex}>
      <SafeAreaView style={styles.flex} edges={['top', 'left', 'right']}>
        <ScrollView contentContainerStyle={styles.page}>
          <View style={styles.topRow}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Geri dön"
              onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))}
              style={({ pressed }) => [
                styles.backButton,
                { borderColor: theme.border },
                pressed && styles.pressed,
              ]}>
              <ThemedText type="smallBold" themeColor="tint">
                ← Geri
              </ThemedText>
            </Pressable>
            <View style={styles.topActions}>
              <Pressable
                accessibilityRole="link"
                accessibilityLabel="Bu dokümanı web'de aç"
                hitSlop={8}
                onPress={() => void openLegalDocument(documentId)}
                style={({ pressed }) => pressed && styles.pressed}>
                <ThemedText type="smallBold" themeColor="tint">
                  {'Web’de aç ↗'}
                </ThemedText>
              </Pressable>
              <ThemedText type="small" themeColor="textSecondary">
                Sürüm {document.version}
              </ThemedText>
            </View>
          </View>

          <View style={styles.header}>
            <ThemedText type="title" style={styles.title}>
              {document.title}
            </ThemedText>
            <ThemedText themeColor="textSecondary">{document.summary}</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              Yürürlük: {LEGAL_EFFECTIVE_DATE}
            </ThemedText>
          </View>

          <ThemedView
            type="backgroundElement"
            style={[styles.identityCard, { borderColor: theme.border }]}>
            <ThemedText type="smallBold">Veri sorumlusu / hizmeti sunan</ThemedText>
            <ThemedText>{LEGAL_IDENTITY.dataController} · {LEGAL_IDENTITY.service}</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              {LEGAL_IDENTITY.email}
            </ThemedText>
          </ThemedView>

          {document.sections.map((section) => (
            <View key={section.title} style={styles.section}>
              <ThemedText type="subtitle" style={styles.sectionTitle}>
                {section.title}
              </ThemedText>
              {section.paragraphs?.map((paragraph) => (
                <ThemedText key={paragraph}>{paragraph}</ThemedText>
              ))}
              {section.bullets?.map((bullet) => (
                <View key={bullet} style={styles.bulletRow}>
                  <ThemedText themeColor="tint">•</ThemedText>
                  <ThemedText style={styles.bulletText}>{bullet}</ThemedText>
                </View>
              ))}
            </View>
          ))}

          <View style={[styles.linkGrid, { borderTopColor: theme.border }]}>
            {LEGAL_LINKS.map((item) => (
              <Link key={item.id} href={item.href as Href} asChild>
                <Pressable style={({ pressed }) => pressed && styles.pressed}>
                  <ThemedText
                    type="smallBold"
                    themeColor={item.id === documentId ? 'textSecondary' : 'tint'}>
                    {LEGAL_DOCUMENTS[item.id].shortTitle}
                  </ThemedText>
                </Pressable>
              </Link>
            ))}
          </View>
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  page: {
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    padding: Spacing.four,
    paddingBottom: Spacing.six,
    gap: Spacing.four,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.three,
  },
  topActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  backButton: {
    minHeight: 42,
    justifyContent: 'center',
    borderWidth: 1,
    borderRadius: Radii.pill,
    paddingHorizontal: Spacing.three,
  },
  header: { gap: Spacing.two },
  title: { fontSize: 38, lineHeight: 44 },
  identityCard: {
    borderWidth: 1,
    borderRadius: Radii.medium,
    padding: Spacing.three,
    gap: Spacing.one,
  },
  section: { gap: Spacing.two },
  sectionTitle: { fontSize: 24, lineHeight: 31 },
  bulletRow: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.two },
  bulletText: { flex: 1 },
  linkGrid: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: Spacing.four,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.three,
  },
  pressed: { opacity: 0.65 },
});

