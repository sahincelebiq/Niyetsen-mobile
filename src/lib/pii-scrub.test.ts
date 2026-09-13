import assert from 'node:assert/strict';
import test from 'node:test';

import { metniTemizle, veriyiTemizle } from './pii-scrub.ts';

test('e-posta ve token maskelenir', () => {
  const temiz = metniTemizle('yaz user@ornek.com ve eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxIn0.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c');
  assert.ok(!temiz.includes('user@ornek.com'));
  assert.ok(!temiz.includes('eyJhbGci'));
});

test('hassas anahtarlar derinlemesine maskelenir, id korunur', () => {
  const temiz = veriyiTemizle({
    userId: 'abc-123',
    content: 'bugün çok üzgünüm',
    photo: 'base64...',
    ic: { email: 'a@b.com', puan: 50 },
  }) as Record<string, unknown>;
  assert.equal(temiz.userId, 'abc-123');
  assert.equal(temiz.content, '[maskelendi]');
  assert.equal(temiz.photo, '[maskelendi]');
  assert.equal((temiz.ic as Record<string, unknown>).puan, 50);
});
