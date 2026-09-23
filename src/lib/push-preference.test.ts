import assert from 'node:assert/strict';
import { test } from 'node:test';

import { resolvePushUi } from './push-preference.ts';

test('sistem izni açık ve tercih yoksa anahtar açık kalır', () => {
  const ui = resolvePushUi({
    supported: true,
    permission: 'granted',
    preference: null,
    hasToken: false,
  });
  assert.equal(ui.enabled, true);
  assert.equal(ui.state, 'granted_no_token');
});

test('token yazıldıysa hazır', () => {
  const ui = resolvePushUi({
    supported: true,
    permission: 'granted',
    preference: 'true',
    hasToken: true,
  });
  assert.equal(ui.enabled, true);
  assert.equal(ui.state, 'ready');
});

test('kullanıcı anahtarı kapattıysa sistem izni açık olsa da kapalı', () => {
  const ui = resolvePushUi({
    supported: true,
    permission: 'granted',
    preference: 'false',
    hasToken: false,
  });
  assert.equal(ui.enabled, false);
  assert.equal(ui.state, 'undetermined');
});

test('izin reddi anahtarı açmaz', () => {
  const ui = resolvePushUi({
    supported: true,
    permission: 'denied',
    preference: null,
    hasToken: false,
  });
  assert.equal(ui.enabled, false);
  assert.equal(ui.state, 'denied');
});
