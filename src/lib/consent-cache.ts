import AsyncStorage from '@react-native-async-storage/async-storage';

const CONSENT_OK_PREFIX = 'niyetsen.consent.ok.';

export function buildConsentOkCacheKey(versionToken: string): string {
  return `${CONSENT_OK_PREFIX}${versionToken}`;
}

export async function clearConsentOkCache(): Promise<void> {
  try {
    const keys = await AsyncStorage.getAllKeys();
    const consentKeys = keys.filter((key) => key.startsWith(CONSENT_OK_PREFIX));
    if (consentKeys.length > 0) {
      await AsyncStorage.multiRemove(consentKeys);
    }
  } catch {
    // Önbellek temizliği başarısız olsa da çıkış akışı sürmeli.
  }
}
