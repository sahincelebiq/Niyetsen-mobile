import assert from 'node:assert/strict';
import test from 'node:test';

import { classifyAuthFailure } from './auth-errors.ts';

test('hatalı OTP süresi doldu sanılmaz', () => {
  assert.equal(
    classifyAuthFailure({ message: 'Invalid OTP', code: 'otp_invalid' }),
    'gecersiz_otp',
  );
  assert.equal(
    classifyAuthFailure({ message: 'Token not found' }),
    'gecersiz_otp',
  );
});

test('süresi dolmuş OTP ayrı kod döner', () => {
  assert.equal(
    classifyAuthFailure({ message: 'Token has expired', code: 'otp_expired' }),
    'baglanti_suresi_doldu',
  );
});

test('email not confirmed OTP ekranına düşer', () => {
  assert.equal(
    classifyAuthFailure({ message: 'Email not confirmed', code: 'email_not_confirmed' }),
    'mail_dogrulanmadi',
  );
});

test('SMTP gönderim hatası sunucu hatasıdır', () => {
  assert.equal(
    classifyAuthFailure({
      message: 'Error sending recovery email',
      status: 500,
      code: 'unexpected_failure',
    }),
    'sunucu_hatasi',
  );
});
