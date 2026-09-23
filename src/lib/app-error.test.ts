import assert from 'node:assert/strict';
import test from 'node:test';

import {
  AgHatasi,
  BeklenmeyenHata,
  DogrulamaHatasi,
  ekranaGuvenliMetin,
  hataMesaji,
  KotaHatasi,
  siniflaHata,
  SunucuHatasi,
  YetkiHatasi,
} from './app-error.ts';
import { tr } from '../i18n/locales/tr.ts';
import { enUS } from '../i18n/locales/en-US.ts';

function apiHatasi(status: number, message = 'x', extra: Record<string, unknown> = {}) {
  return { status, message, ...extra };
}

test('ağ kopması AgHatasi olur, TR/EN mesaj paritededir', () => {
  const hata = siniflaHata(apiHatasi(0, 'unreachable'), 'TST_001');
  assert.ok(hata instanceof AgHatasi);
  assert.equal(hataMesaji(hata, tr), tr.common.unreachable);
  assert.equal(hataMesaji(hata, enUS), enUS.common.unreachable);
});

test('zaman aşımı AgHatasi olur ama timeout metni verir', () => {
  const hata = siniflaHata(
    apiHatasi(0, 'timeout', { neden: 'zaman-asimi' }),
    'TST_002',
  );
  assert.ok(hata instanceof AgHatasi && hata.zamanAsimi);
  assert.equal(hataMesaji(hata, tr), tr.common.timeout);
});

test('401 YetkiHatasi, 5xx SunucuHatasi olur', () => {
  assert.ok(siniflaHata(apiHatasi(401, 'expired'), 'TST_003') instanceof YetkiHatasi);
  assert.ok(siniflaHata(apiHatasi(503, 'down'), 'TST_004') instanceof SunucuHatasi);
  assert.equal(
    hataMesaji(siniflaHata(apiHatasi(401, 'e'), 'TST_005'), tr),
    tr.common.sessionExpired,
  );
});

test('402 paywall dili, 429 hız-sınırı dili verir (kapı içeride)', () => {
  const kota = siniflaHata(apiHatasi(402, 'pay', { code: 'paywall_required' }), 'TST_006');
  assert.ok(kota instanceof KotaHatasi && !kota.hizSiniri);
  assert.equal(hataMesaji(kota, tr), tr.paywall.notYetActive);
  const hiz = siniflaHata(apiHatasi(429, 'slow'), 'TST_007');
  assert.ok(hiz instanceof KotaHatasi && hiz.hizSiniri);
  assert.equal(hataMesaji(hiz, tr), tr.common.rateLimited);
});

test('ham teknik metin kullanıcı mesajına sızmaz', () => {
  const ham = 'FirebaseError: Firebase: Error (auth/network-request-failed).';
  const hata = siniflaHata(new Error(ham), 'TST_008');
  assert.ok(hata instanceof BeklenmeyenHata);
  assert.ok(!hataMesaji(hata, tr).includes('Firebase'));
  assert.ok(!hataMesaji(hata, enUS).includes('Firebase'));
  assert.ok(hata.teknikDetay?.includes('Firebase'));
});

test('400 alan açıklaması steril taşınır, URL/e-posta maskelenir', () => {
  const hata = siniflaHata(
    apiHatasi(400, 'bak https://ornek.com/a a@b.com'),
    'TST_009',
  );
  assert.ok(hata instanceof DogrulamaHatasi);
  assert.ok(!(hata.alanMesaji ?? '').includes('ornek.com'));
});

test('ekrana çıkan metin anahtar, URL ve yığın izini yutmaz', () => {
  const yedek = 'Bir şeyler ters gitti.';
  assert.equal(ekranaGuvenliMetin('Görev geçmiş bir güne taşınamaz.', yedek), 'Görev geçmiş bir güne taşınamaz.');
  assert.equal(ekranaGuvenliMetin('EXPO_PUBLIC_SUPABASE_URL eksik', yedek), yedek);
  assert.equal(ekranaGuvenliMetin('bak https://api.example/secret', yedek), yedek);
  assert.equal(ekranaGuvenliMetin('Internal Server Error', yedek), yedek);
  assert.equal(ekranaGuvenliMetin('', yedek), yedek);
});

test('hata kodu korunur', () => {
  const hata = siniflaHata(apiHatasi(500, 'down'), 'BUGUN_YUKLEME_001');
  assert.equal(hata.hataKodu, 'BUGUN_YUKLEME_001');
});
