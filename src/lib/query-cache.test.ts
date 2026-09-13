import assert from 'node:assert/strict';
import test, { beforeEach } from 'node:test';

import {
  CacheKeys,
  invalidate,
  keysOverlap,
  lastInvalidatedAt,
  resetInvalidationForTests,
  subscribeInvalidation,
} from '@/lib/query-cache';

beforeEach(() => resetInvalidationForTests());

test('ön ek eşleşmesi iki yönlü çalışır', () => {
  assert.equal(keysOverlap(['rapor'], ['rapor', '7d']), true);
  assert.equal(keysOverlap(['rapor', '7d'], ['rapor']), true);
  assert.equal(keysOverlap(['rapor', '7d'], ['rapor', '30d']), false);
  assert.equal(keysOverlap(['plan', 'A'], ['plan', 'B']), false);
  assert.equal(keysOverlap(['puan', 'ozet'], ['puan']), true);
});

test('dinleyici aynı yayında en fazla bir kez çağrılır; abonelikten çıkınca susar', () => {
  let count = 0;
  const unsubscribe = subscribeInvalidation([CacheKeys.zincir(), CacheKeys.puanOzet()], () => {
    count += 1;
  });
  invalidate([CacheKeys.zincir(), CacheKeys.puanOzet(), CacheKeys.rapor()]);
  assert.equal(count, 1);
  unsubscribe();
  invalidate([CacheKeys.zincir()]);
  assert.equal(count, 1);
});

test("'all' dinleyicisi her geçersiz kılmada uyanır; zaman damgası anahtara göre okunur", () => {
  let hits = 0;
  subscribeInvalidation('all', () => {
    hits += 1;
  });
  invalidate([CacheKeys.plan('X')], 1_000);
  invalidate([CacheKeys.gun('2026-09-13')], 2_000);
  assert.equal(hits, 2);
  assert.equal(lastInvalidatedAt(), 2_000);
  assert.equal(lastInvalidatedAt([CacheKeys.plan()]), 1_000);
  assert.equal(lastInvalidatedAt([CacheKeys.rapor()]), 0);
});

test("Bugün ekranı ['gun'] ön ekini dinler; hangi gün geçersiz kılınırsa kılınsın uyanır", () => {
  let hits = 0;
  subscribeInvalidation([CacheKeys.gun(), CacheKeys.plan()], () => {
    hits += 1;
  });
  invalidate([CacheKeys.gun('2026-09-13')]);
  invalidate([CacheKeys.gun('2026-09-14')]);
  invalidate([CacheKeys.zincir()]);
  assert.equal(hits, 2);
  assert.deepEqual(CacheKeys.gun(), ['gun']);
});
