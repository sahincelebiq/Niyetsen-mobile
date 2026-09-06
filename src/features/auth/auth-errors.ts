import type { Messages } from '@/i18n/types';

export type AuthFlowKod =
  | 'gecersiz_kimlik'
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

/** TR yedek metin — i18n yoksa. `iptal` boş kalır (banner yok). */
export const AUTH_HATA_MESAJI: Record<AuthFlowKod, string> = {
  gecersiz_kimlik:
    'E-posta veya şifre hatalı. Google ile kayıt olduysan “Google ile devam et” kullan.',
  mail_dogrulanmadi:
    'E-postandaki 6 haneli Niyetsen kodunu gir, sonra tekrar giriş yap.',
  kullanici_var: 'Bu e-posta zaten kayıtlı. Giriş yapmayı dene.',
  zayif_sifre: 'Şifre çok zayıf. En az 8 karakter, harf ve rakam kullan.',
  cok_fazla_deneme: 'Çok fazla deneme yaptın. Kısa bir süre sonra tekrar dene.',
  saglayici_kapali: 'Google girişi henüz açık değil. E-posta ve şifre ile devam et.',
  sunucu_hatasi: 'Şu an bağlanamadık. Birazdan tekrar dene — sorun bizde.',
  baglanti_hatasi: 'İnternet bağlantını kontrol edip tekrar dene.',
  baglanti_suresi_doldu: 'Bağlantı zaman aşımına uğradı. Tekrar dene.',
  bilinmeyen: 'Bir şeyler ters gitti. Birazdan tekrar dene.',
  iptal: '',
};

const TEKRAR_DENENEBILIR: ReadonlySet<AuthFlowKod> = new Set([
  'sunucu_hatasi',
  'baglanti_hatasi',
  'baglanti_suresi_doldu',
  'bilinmeyen',
]);

export class AuthFlowError extends Error {
  kod: AuthFlowKod;
  kullaniciMesaji: string;
  teknikDetay?: string;
  tekrarDenenebilir: boolean;

  constructor({
    kod,
    kullaniciMesaji,
    teknikDetay,
    tekrarDenenebilir,
  }: {
    kod: AuthFlowKod;
    kullaniciMesaji?: string;
    teknikDetay?: string;
    tekrarDenenebilir?: boolean;
  }) {
    const mesaj = kullaniciMesaji ?? AUTH_HATA_MESAJI[kod];
    super(mesaj);
    this.name = 'AuthFlowError';
    this.kod = kod;
    this.kullaniciMesaji = mesaj;
    this.teknikDetay = teknikDetay;
    this.tekrarDenenebilir = tekrarDenenebilir ?? TEKRAR_DENENEBILIR.has(kod);
  }

  /** Eski çağrılar için `kod` takma adı. */
  get code(): AuthFlowKod {
    return this.kod;
  }
}

export function authMesaji(kod: AuthFlowKod, t: Messages): string {
  switch (kod) {
    case 'gecersiz_kimlik':
      return t.auth.wrongPassword;
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
    case 'bilinmeyen':
      return t.auth.sessionFailed;
    case 'iptal':
      return '';
  }
}

export function classifyAuthFailure({
  message,
  status,
  code,
}: {
  message?: string;
  status?: number;
  code?: string;
}): AuthFlowKod {
  const text = `${code ?? ''} ${message ?? ''}`.toLowerCase();

  if (
    text.includes('cancel') ||
    text.includes('cancelled') ||
    text.includes('canceled') ||
    text.includes('tamamlanmadı') ||
    code === 'ERR_REQUEST_CANCELED'
  ) {
    return 'iptal';
  }

  if (
    text.includes('email not confirmed') ||
    text.includes('email_not_confirmed')
  ) {
    return 'mail_dogrulanmadi';
  }

  if (
    text.includes('already registered') ||
    text.includes('already been registered') ||
    text.includes('user_already_exists')
  ) {
    return 'kullanici_var';
  }

  if (
    text.includes('weak_password') ||
    text.includes('weak password') ||
    text.includes('password should be at least') ||
    text.includes('password is known to be weak')
  ) {
    return 'zayif_sifre';
  }

  if (
    status === 429 ||
    text.includes('too many requests') ||
    text.includes('too many attempts') ||
    text.includes('over_email_send_rate_limit') ||
    text.includes('over_request_rate_limit') ||
    text.includes('rate limit')
  ) {
    return 'cok_fazla_deneme';
  }

  if (
    text.includes('provider is not enabled') ||
    text.includes('provider_disabled') ||
    text.includes('unsupported provider')
  ) {
    return 'saglayici_kapali';
  }

  if (
    text.includes('timeout') ||
    text.includes('timed out') ||
    text.includes('session_timeout') ||
    text.includes('zaman aşımı') ||
    text.includes('otp_expired') ||
    text.includes('token has expired') ||
    (text.includes('expired') && text.includes('token'))
  ) {
    return 'baglanti_suresi_doldu';
  }

  if (
    text.includes('network request failed') ||
    text.includes('failed to fetch') ||
    text.includes('networkerror') ||
    text.includes('err_network') ||
    text.includes('internet') ||
    text.includes('offline') ||
    text.includes('econnrefused') ||
    text.includes('enotfound')
  ) {
    return 'baglanti_hatasi';
  }

  if (
    text.includes('invalid login credentials') ||
    text.includes('invalid_credentials') ||
    text.includes('invalid otp') ||
    text.includes('token not found') ||
    text.includes('otp_disabled') ||
    (text.includes('invalid') && (text.includes('otp') || text.includes('token')))
  ) {
    return 'gecersiz_kimlik';
  }

  if (
    (typeof status === 'number' && status >= 500) ||
    text.includes('internal server') ||
    text.includes('service unavailable')
  ) {
    return 'sunucu_hatasi';
  }

  return 'bilinmeyen';
}

function pickAuthShape(error: unknown): {
  message: string;
  status?: number;
  code?: string;
} {
  if (error instanceof Error) {
    const extra = error as Error & { status?: number; code?: string };
    return {
      message: extra.message,
      status: typeof extra.status === 'number' ? extra.status : undefined,
      code: typeof extra.code === 'string' ? extra.code : undefined,
    };
  }
  if (error && typeof error === 'object') {
    const raw = error as { message?: unknown; status?: unknown; code?: unknown };
    return {
      message: typeof raw.message === 'string' ? raw.message : String(error),
      status: typeof raw.status === 'number' ? raw.status : undefined,
      code: typeof raw.code === 'string' ? raw.code : undefined,
    };
  }
  return { message: String(error) };
}

export function toAuthFlowError(error: unknown): AuthFlowError {
  if (error instanceof AuthFlowError) return error;
  const { message, status, code } = pickAuthShape(error);
  const kod = classifyAuthFailure({ message, status, code });
  return new AuthFlowError({
    kod,
    teknikDetay: message,
  });
}

/** Yalnızca __DEV__ — Play’de ham yığın / JSON yok. */
export function logAuthEvent(
  kod: AuthFlowKod,
  akis: string,
  teknikDetay?: string,
): void {
  if (!__DEV__) return;
  console.info('[auth]', { kod, akis, teknikDetay });
}
