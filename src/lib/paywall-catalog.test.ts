import assert from 'node:assert/strict';
import test from 'node:test';

import { paywallCatalogFromPrices } from './paywall-catalog.ts';

test('iki fiyat da yoksa unavailable — uydurma fiyat yok', () => {
  assert.deepEqual(paywallCatalogFromPrices(null, null), {
    state: 'unavailable',
    showMonthly: false,
    showYearly: false,
  });
});

test('yalnız yıllık varsa aylık kart gizlenir (priceLoading sahte kart yok)', () => {
  assert.deepEqual(paywallCatalogFromPrices(null, '1.200,00 ₺'), {
    state: 'ready',
    showMonthly: false,
    showYearly: true,
  });
});

test('yalnız aylık varsa yıllık kart gizlenir', () => {
  assert.deepEqual(paywallCatalogFromPrices('150,00 ₺', null), {
    state: 'ready',
    showMonthly: true,
    showYearly: false,
  });
});
