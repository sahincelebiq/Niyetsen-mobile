import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { LEGAL_VERSIONS, type LegalDocumentId } from '@/constants/legal';
import { openLegalDocument } from '@/lib/legal-links';
import { Radii, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type ConsentChoicesValue = {
  privacy: boolean;
  ai: boolean;
  proofPhoto: boolean;
  marketing: boolean;
};

export const EMPTY_CONSENT_CHOICES: ConsentChoicesValue = {
  privacy: false,
  ai: false,
  proofPhoto: false,
  marketing: false,
};

export function ConsentChoices({
  value,
  onChange,
}: {
  value: ConsentChoicesValue;
  onChange: (value: ConsentChoicesValue) => void;
}) {
  return (
    <View style={styles.container}>
      <ConsentRow
        checked={value.privacy}
        onChange={(checked) => onChange({ ...value, privacy: checked })}
        label="Gizlilik Politikası ile KVKK Aydınlatma Metni’ni okudum ve kişisel verilerimin işlenmesine açık rıza veriyorum."
        detail="Uygulamayı kullanmak için gereklidir. AI sohbeti ve fotoğraf işleme izinlerini aşağıdan ayrıca yönetebilirsin."
        required
      />
      <View style={styles.links}>
        <LegalLink documentId="privacy" label="Gizlilik Politikası" />
        <LegalLink documentId="kvkk" label="KVKK Aydınlatma" />
      </View>

      <ConsentRow
        checked={value.ai}
        onChange={(checked) => onChange({ ...value, ai: checked })}
        label="AI sohbeti ve kişiselleştirilmiş plan için açık rıza veriyorum."
        detail="Sohbet ve plan bağlamı Google Gemini’ye aktarılabilir. Bu rıza olmadan AI sohbeti kullanılamaz."
      />

      <ConsentRow
        checked={value.proofPhoto}
        onChange={(checked) => onChange({ ...value, proofPhoto: checked })}
        label="Kanıt fotoğraflarımın işlenmesine açık rıza veriyorum."
        detail="İsteğe bağlıdır. Kapalıysa fotoğraf kanıtı özelliği kullanılamaz."
      />

      <ConsentRow
        checked={value.marketing}
        onChange={(checked) => onChange({ ...value, marketing: checked })}
        label="Pazarlama iletişimi almak istiyorum."
        detail="İsteğe bağlıdır, varsayılan olarak kapalıdır ve pazarlama gönderimi şu anda aktif değildir."
      />

      <View style={styles.links}>
        <LegalLink documentId="consent" label="Açık Rıza Metni" />
        <LegalLink documentId="terms" label="Kullanım Koşulları" />
      </View>
      <ThemedText type="small" themeColor="textSecondary">
        Metin sürümü: {LEGAL_VERSIONS.privacyPolicy}
      </ThemedText>
    </View>
  );
}

function ConsentRow({
  checked,
  onChange,
  label,
  detail,
  required = false,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  detail: string;
  required?: boolean;
}) {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked }}
      onPress={() => onChange(!checked)}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}>
      <View
        style={[
          styles.checkbox,
          {
            borderColor: theme.tint,
            backgroundColor: checked ? theme.tint : 'transparent',
          },
        ]}>
        {checked && <ThemedText style={{ color: theme.background }}>✓</ThemedText>}
      </View>
      <View style={styles.copy}>
        <ThemedText type="smallBold">
          {label} {required && <ThemedText themeColor="danger">*</ThemedText>}
        </ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          {detail}
        </ThemedText>
      </View>
    </Pressable>
  );
}

function LegalLink({
  documentId,
  label,
}: {
  documentId: LegalDocumentId;
  label: string;
}) {
  return (
    <Pressable
      accessibilityRole="link"
      accessibilityLabel={`${label} sayfasını aç`}
      hitSlop={8}
      onPress={() => void openLegalDocument(documentId)}
      style={({ pressed }) => pressed && styles.pressed}>
      <ThemedText type="smallBold" themeColor="tint">
        {label}
      </ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { gap: Spacing.three },
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.three },
  checkbox: {
    width: 28,
    height: 28,
    borderWidth: 2,
    borderRadius: Radii.small,
    alignItems: 'center',
    justifyContent: 'center',
  },
  copy: { flex: 1, gap: Spacing.one },
  links: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.three },
  pressed: { opacity: 0.7 },
});

