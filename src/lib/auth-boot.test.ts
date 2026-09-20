import assert from 'node:assert/strict';
import test from 'node:test';

import { AUTH_HOLD_MAX_MS, isAuthUiLocked } from './auth-boot.ts';

test('oturum varken splash kilidi yok', () => {
  assert.equal(
    isAuthUiLocked({
      bootLoading: true,
      oauthHold: true,
      deepLinkHold: true,
      hasSession: true,
      holdElapsedMs: 0,
    }),
    false,
  );
});

test('OAuth/deep link hold spinner üretir; süre dolunca giriş ekranı açılır', () => {
  const base = {
    bootLoading: false,
    oauthHold: true,
    deepLinkHold: false,
    hasSession: false,
  };
  assert.equal(isAuthUiLocked({ ...base, holdElapsedMs: 1_000 }), true);
  assert.equal(isAuthUiLocked({ ...base, holdElapsedMs: AUTH_HOLD_MAX_MS }), false);
});

test('boot loading oturumsuzken kilitler', () => {
  assert.equal(
    isAuthUiLocked({
      bootLoading: true,
      oauthHold: false,
      deepLinkHold: false,
      hasSession: false,
      holdElapsedMs: 0,
    }),
    true,
  );
});
