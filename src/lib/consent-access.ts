/**
 * Uygulama giriş kapısı = sunucu sözleşmesi.
 *
 * Backend `needs_reconsent` yalnız privacy + KVKK kabulüne bakar.
 * İstemcide sürüm string'i veya isteğe bağlı rıza (AI/foto/pazarlama)
 * `decided_at` aramak, eski AAB + yeni API (veya tersi) eşleşmesinde
 * kayıttan sonra spinner/form döngüsü üretiyordu.
 */
export type ConsentDecision = {
  accepted: boolean;
  version?: string;
  decided_at?: string | null;
};

export type ConsentGateStatus = {
  needs_reconsent: boolean;
  privacy_policy: ConsentDecision;
  kvkk_explicit_consent: ConsentDecision;
  ai_chat_processing?: ConsentDecision;
  proof_photo_processing?: ConsentDecision;
  marketing_communications?: ConsentDecision;
};

export function canEnterApp(status: ConsentGateStatus): boolean {
  return (
    !status.needs_reconsent &&
    status.privacy_policy.accepted &&
    status.kvkk_explicit_consent.accepted
  );
}
