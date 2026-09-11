import type { Messages } from '@/i18n/types';

/**
 * Auth hata kodları — ekranlar bu tablo dışında metin üretmez.
 * kullaniciMesaji ASLA sunucunun ham JSON/İngilizce yanıtı olmaz.
 */
export type AuthFlowKod =
  | 'gecersiz_kimlik'
  | 'gecersiz_otp'
  | 'mail_dogrulanmadi'
  | 'kullanici_var'
  | 'zayif_sifre'
  | 'cok_fazla_deneme'
  | 'saglayici_kapali'
  | 'sunucu_hatasi'
  | 'baglanti_hatasi'
  | 'baglanti_suresi_doldu'
  | 'bilinmeyen'
  | 'iptal';

export const AUTH_HATA_MESAJI: Record<AuthFlowKod, string> = {
  gecersiz_kimlik: 'E-posta veya şifre hatalı.',
  gecersiz_otp: 'Kod hatalı. E-postadaki kodu tekrar yaz.',
  mail_dogrulanmadi:
    'E-postanı doğrulaman gerekiyor. Maildeki kodu giriş ekranına yaz.',
  kullanici_var: 'Bu e-posta ile bir hesap zaten var. Giriş yapmayı dene.',
  zayif_sifre: 'Şifre çok zayıf. En az 8 karakter, harf ve rakam kullan.',
  cok_fazla_deneme: 'Çok fazla deneme yaptın. Kısa bir süre sonra tekrar dene.',
  saglayici_kapali:
    'Bu giriş yöntemi şu an kullanılamıyor. E-posta ile devam edebilirsin.',
  sunucu_hatasi: 'Şu an bağlanamadık. Birazdan tekrar dene — sorun bizde.',
  baglanti_hatasi: 'İnternet bağlantını kontrol edip tekrar dene.',
  baglanti_suresi_doldu: 'Bu kodun süresi dolmuş. Yeni bir tane iste.',
  bilinmeyen: 'Beklenmeyen bir sorun oldu. Tekrar dene.',
  iptal: '',
};

const TEKRAR_DENENEBILIR: Record<AuthFlowKod, boolean> = {
  gecersiz_kimlik: true,
  gecersiz_otp: true,
  mail_dogrulanmadi: true,
  kullanici_var: false,
  zayif_sifre: true,
  cok_fazla_deneme: true,
  saglayici_kapali: false,
  sunucu_hatasi: true,
  baglanti_hatasi: true,
  baglanti_suresi_doldu: true,
  bilinmeyen: true,
  iptal: false,
};

export class AuthFlowError extends Error {
  readonly kod: AuthFlowKod;
  readonly kullaniciMesaji: string;
  readonly teknikDetay?: string;
  readonly tekrarDenenebilir: boolean;

  constructor(init: {
    kod: AuthFlowKod;
    kullaniciMesaji?: string;
    teknikDetay?: string;
    tekrarDenenebilir?: boolean;
  }) {
    const kullaniciMesaji = init.kullaniciMesaji ?? AUTH_HATA_MESAJI[init.kod];
    super(kullaniciMesaji);
    this.kod = init.kod;
    this.kullaniciMesaji = kullaniciMesaji;
    this.teknikDetay = init.teknikDetay;
    this.tekrarDenenebilir =
      init.tekrarDenenebilir ?? TEKRAR_DENENEBILIR[init.kod];
  }

  /** Eski ekranlar `error.code` okuyordu. */
  get code(): AuthFlowKod {
    return this.kod;
  }
}

export function authMesaji(kod: AuthFlowKod, t: Messages): string {
  switch (kod) {
    case 'gecersiz_kimlik':
      return t.auth.wrongPassword;
    case 'gecersiz_otp':
      return t.auth.invalidOtp;
    case 'mail_dogrulanmadi':
      return t.auth.emailNotConfirmed;
    case 'kullanici_var':
      return t.auth.alreadyRegistered;
    case 'zayif_sifre':
      return t.auth.weakPassword;
    case 'cok_fazla_deneme':
      return t.auth.tooManyAttempts;
    case 'saglayici_kapali':
      return t.auth.providerNotEnabled;
    case 'sunucu_hatasi':
      return t.auth.serverError;
    case 'baglanti_hatasi':
      return t.auth.networkError;
    case 'baglanti_suresi_doldu':
      return t.auth.recoveryExpired;
    case 'iptal':
      return '';
    default:
      return t.common.errorGeneric;
  }
}

function readNumber(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

function readString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value : undefined;
}

export function classifyAuthFailure(input: {
  message: string;
  status?: number;
  code?: string;
}): AuthFlowKod {
  const text = input.message.toLowerCase();
  const code = (input.code ?? '').toLowerCase();
  const status = input.status;

  if (
    text.includes('network request failed') ||
    text.includes('failed to fetch') ||
    text.includes('networkerror') ||
    text.includes('internet') ||
    ((text.includes('timeout') || text.includes('timed out')) &&
      !text.includes('token'))
  ) {
    return 'baglanti_hatasi';
  }

  if (
    (typeof status === 'number' && status >= 500) ||
    code === 'unexpected_failure' ||
    text.includes('error sending confirmation email') ||
    text.includes('error sending recovery email') ||
    text.includes('error sending magic link') ||
    text.includes('error sending')
  ) {
    return 'sunucu_hatasi';
  }

  if (
    status === 429 ||
    code.includes('over_email') ||
    code.includes('over_request') ||
    text.includes('rate limit') ||
    text.includes('too many') ||
    text.includes('for security purposes')
  ) {
    return 'cok_fazla_deneme';
  }

  if (code === 'email_not_confirmed' || text.includes('email not confirmed')) {
    return 'mail_dogrulanmadi';
  }

  if (
    code === 'invalid_login_credentials' ||
    code === 'invalid_credentials' ||
    text.includes('invalid login credentials')
  ) {
    return 'gecersiz_kimlik';
  }

  if (
    code === 'user_already_exists' ||
    text.includes('already registered') ||
    text.includes('already been registered') ||
    text.includes('user already exists')
  ) {
    return 'kullanici_var';
  }

  if (code === 'weak_password' || text.includes('weak password')) {
    return 'zayif_sifre';
  }

  if (
    code === 'provider_disabled' ||
    text.includes('provider is not enabled') ||
    text.includes('unsupported provider')
  ) {
    return 'saglayici_kapali';
  }

  if (
    code === 'otp_expired' ||
    text.includes('otp_expired') ||
    text.includes('token has expired') ||
    (text.includes('expired') && (text.includes('otp') || text.includes('token')))
  ) {
    return 'baglanti_suresi_doldu';
  }

  if (code === 'otp_disabled') {
    return 'saglayici_kapali';
  }

  if (
    code === 'otp_invalid' ||
    text.includes('invalid otp') ||
    text.includes('token not found') ||
    (text.includes('invalid') && (text.includes('otp') || text.includes('token')))
  ) {
    return 'gecersiz_otp';
  }

  if (
    text.includes('tamamlanmadı') ||
    text.includes('cancelled') ||
    text.includes('canceled')
  ) {
    return 'iptal';
  }

  return 'bilinmeyen';
}

export function toAuthFlowError(error: unknown): AuthFlowError {
  if (error instanceof AuthFlowError) return error;

  const rec = error && typeof error === 'object' ? (error as Record<string, unknown>) : {};
  const raw = error instanceof Error ? error.message : String(error ?? '');
  const status = readNumber(rec.status);
  const code = readString(rec.code) ?? readString(rec.error_code);
  const kod = classifyAuthFailure({ message: raw, status, code });
  const teknikDetay = raw && raw !== AUTH_HATA_MESAJI[kod] ? raw : undefined;

  return new AuthFlowError({
    kod,
    kullaniciMesaji: AUTH_HATA_MESAJI[kod],
    teknikDetay,
  });
}

export function logAuthEvent(
  kod: AuthFlowKod | string,
  akis: string,
  teknikDetay?: string,
): void {
  if (typeof __DEV__ !== 'undefined' && __DEV__) {
    console.info('[auth]', akis, kod, teknikDetay ?? '');
    return;
  }
  // Üretimde ham JSON/stack yok — Play incelemesi ekranda teknik iz görmesin.
}
