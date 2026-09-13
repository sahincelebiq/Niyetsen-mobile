import assert from 'node:assert/strict';
import test, { beforeEach } from 'node:test';

import { ScoringRules } from '@/constants/scoring';
import {
  configureDomainEvents,
  emitGorevTamamlandi,
  getLedger,
  getLocalStreak,
  gorevTamamlandiInvalidationKeys,
  resetDomainEventsForTests,
  subscribeGorevTamamlandi,
  type GorevTamamlandiOlayi,
} from '@/lib/domain-events';
import {
  CacheKeys,
  keyToString,
  resetInvalidationForTests,
  subscribeInvalidation,
} from '@/lib/query-cache';

const TZ = 'Europe/Istanbul';
const NOW = Date.parse('2026-09-13T09:00:00Z'); // 12:00 İstanbul

function olay(overrides: Partial<GorevTamamlandiOlayi> = {}): GorevTamamlandiOlayi {
  return {
    olayId: 'proof-1',
    kaynak: 'plan_gorev',
    planId: 'plan-A',
    planAdimiId: 'adim-3',
    hedefId: 'task-9',
    kategoriler: ['İrade'],
    tamamlandiAt: '2026-09-13T08:59:00Z',
    puan: ScoringRules.planGorevi,
    ...overrides,
  };
}

beforeEach(() => {
  resetDomainEventsForTests();
  resetInvalidationForTests();
  configureDomainEvents({ timeZone: TZ });
});

test('aynı olay iki kez yayınlanınca puan bir kez yazılır (çift dokunma / retry)', () => {
  const first = emitGorevTamamlandi(olay(), { now: NOW });
  const second = emitGorevTamamlandi(olay(), { now: NOW + 500 });
  assert.equal(first.applied, true);
  assert.equal(second.applied, false);
  assert.equal(second.invalidated.length, 0);
  assert.equal(Object.keys(getLedger()).length, 1);
  assert.equal(getLocalStreak().streakLen, 1);
});

test('çevrimdışı kuyruk tekrar oynatması: kalıcı defterden yüklenen olay tekrar uygulanmaz', () => {
  const persisted: string[] = [];
  configureDomainEvents({
    timeZone: TZ,
    persistLedger: (next) => persisted.push(JSON.stringify(next)),
  });
  emitGorevTamamlandi(olay(), { now: NOW });
  assert.equal(persisted.length, 1);

  // Uygulama yeniden açıldı: defter diskten geldi, kuyruk aynı olayı tekrar gönderdi.
  resetDomainEventsForTests();
  resetInvalidationForTests();
  configureDomainEvents({ timeZone: TZ, ledger: JSON.parse(persisted[0]) });
  const replay = emitGorevTamamlandi(olay(), { now: NOW + 60_000 });
  assert.equal(replay.applied, false);
});

test('invalidation listesi eksiksiz: gün, zincir, puan özeti, rapor, plan', () => {
  const keys = gorevTamamlandiInvalidationKeys({ planId: 'plan-A' }, '2026-09-13').map(keyToString);
  assert.deepEqual(keys, ['gun/2026-09-13', 'zincir', 'puan/ozet', 'rapor', 'plan/plan-A']);
});

test('tamamlama tüm ekranların anahtarlarını aynı anda bayatlatır; dönemli rapor da yakalanır', () => {
  const hits: string[] = [];
  subscribeInvalidation([CacheKeys.gun('2026-09-13')], () => hits.push('bugun'));
  subscribeInvalidation([CacheKeys.zincir(), CacheKeys.puanOzet()], () => hits.push('zincir'));
  subscribeInvalidation([CacheKeys.rapor('7d')], () => hits.push('rapor7'));
  subscribeInvalidation([CacheKeys.plan('plan-A')], () => hits.push('plan'));
  subscribeInvalidation([CacheKeys.plan('plan-B')], () => hits.push('plan-B'));

  emitGorevTamamlandi(olay(), { now: NOW });
  assert.deepEqual(hits.sort(), ['bugun', 'plan', 'rapor7', 'zincir']);
});

test('bonus görev puan yazar ama zinciri değiştirmez', () => {
  const sonuc = emitGorevTamamlandi(
    olay({ olayId: 'bonus-1', kaynak: 'bonus', planId: null, planAdimiId: null, puan: ScoringRules.bonusGorev }),
    { now: NOW },
  );
  assert.equal(sonuc.applied, true);
  assert.equal(sonuc.puan, ScoringRules.bonusGorev);
  assert.equal(sonuc.extended, false);
  assert.equal(getLocalStreak().streakLen, 0);
});

test('kilometre taşı olayla bir kez bildirilir ve aboneler uyandırılır', () => {
  configureDomainEvents({
    timeZone: TZ,
    streak: { streakLen: 6, bestStreak: 6, lastActiveDay: '2026-09-12' },
  });
  const seen: number[] = [];
  subscribeGorevTamamlandi((_olay, sonuc) => {
    if (sonuc.milestone) seen.push(sonuc.milestone);
  });
  const seventh = emitGorevTamamlandi(olay({ olayId: 'p7' }), { now: NOW });
  assert.equal(seventh.milestone, 7);
  const again = emitGorevTamamlandi(olay({ olayId: 'p7-again' }), { now: NOW + 1000 });
  assert.equal(again.milestone, null);
  assert.deepEqual(seen, [7]);
});
