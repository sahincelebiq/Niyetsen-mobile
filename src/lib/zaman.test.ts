import assert from 'node:assert/strict';
import test from 'node:test';

import {
  addDaysIso,
  bugunIso,
  dakikaToHhmm,
  formatIsoDate,
  geceYarisinaKalanMs,
  gunBaslangic,
  gunBitis,
  gununBolumu,
  hhmmToMinutes,
  isPastIso,
  parseIsoDate,
} from './zaman.ts';

test('formatIsoDate: yerel takvim günü, UTC kayması yok', () => {
  // 23:30 yerel — UTC'ye çevrilse gün değişebilirdi; yerel kalmalı.
  const date = new Date(2026, 8, 13, 23, 30, 0);
  assert.equal(formatIsoDate(date), '2026-09-13');
});

test('bugunIso: şu anın yerel günüyle birebir', () => {
  assert.equal(bugunIso(), formatIsoDate(new Date()));
});

test('parseIsoDate + addDaysIso: ay ve yıl sınırı taşması', () => {
  assert.equal(addDaysIso('2026-01-31', 1), '2026-02-01');
  assert.equal(addDaysIso('2026-12-31', 1), '2027-01-01');
  assert.equal(addDaysIso('2026-03-01', -1), '2026-02-28');
});

test('parseIsoDate: öğlen çapası — hangi saat diliminde olursa olsun gün sabit', () => {
  const parsed = parseIsoDate('2026-09-13');
  assert.equal(parsed.getFullYear(), 2026);
  assert.equal(parsed.getMonth(), 8);
  assert.equal(parsed.getDate(), 13);
  assert.equal(parsed.getHours(), 12);
});

test('gün sınırları: yerel 00:00 → 23:59:59.999 (madde B sözleşmesi)', () => {
  const start = gunBaslangic('2026-09-13');
  const end = gunBitis('2026-09-13');
  assert.equal(formatIsoDate(start), '2026-09-13');
  assert.equal(formatIsoDate(end), '2026-09-13');
  assert.equal(start.getHours() * 3600 + start.getMinutes() * 60 + start.getSeconds(), 0);
  assert.equal(end.getHours(), 23);
  assert.equal(end.getMinutes(), 59);
  assert.equal(end.getSeconds(), 59);
  assert.equal(end.getMilliseconds(), 999);
});

test('geceYarisinaKalanMs: pozitif ve bir sonraki yerel gece yarısına iner', () => {
  const now = new Date();
  const ms = geceYarisinaKalanMs(now);
  assert.ok(ms >= 1_000);
  const hedef = new Date(now.getTime() + ms);
  assert.equal(hedef.getHours(), 0);
  assert.equal(hedef.getMinutes(), 0);
  assert.ok(hedef.getDate() !== now.getDate() || ms >= 1_000);
});

test('hhmmToMinutes: geçerli/geçersiz girişler', () => {
  assert.equal(hhmmToMinutes('09:00'), 540);
  assert.equal(hhmmToMinutes('23:59'), 1439);
  assert.equal(hhmmToMinutes('00:00'), 0);
  assert.equal(hhmmToMinutes('24:00'), null);
  assert.equal(hhmmToMinutes('9:60'), null);
  assert.equal(hhmmToMinutes('sabah'), null);
});

test('dakikaToHhmm: yuvarlama ve kelepçe', () => {
  assert.equal(dakikaToHhmm(540), '09:00');
  assert.equal(dakikaToHhmm(0), '00:00');
  assert.equal(dakikaToHhmm(1439), '23:59');
  assert.equal(dakikaToHhmm(1500), '23:59');
  assert.equal(dakikaToHhmm(-5), '00:00');
});

test('gununBolumu: Sabah 00–12 · Öğle 12–17 · Akşam 17–24', () => {
  assert.equal(gununBolumu(0), 'sabah');
  assert.equal(gununBolumu(11 * 60 + 59), 'sabah');
  assert.equal(gununBolumu(12 * 60), 'ogle');
  assert.equal(gununBolumu(16 * 60 + 59), 'ogle');
  assert.equal(gununBolumu(17 * 60), 'aksam');
  assert.equal(gununBolumu(23 * 60 + 59), 'aksam');
});

test('isPastIso: dün geçmiş, bugün geçmiş değil', () => {
  assert.equal(isPastIso('2026-09-12', '2026-09-13'), true);
  assert.equal(isPastIso('2026-09-13', '2026-09-13'), false);
  assert.equal(isPastIso('2026-09-14', '2026-09-13'), false);
});
