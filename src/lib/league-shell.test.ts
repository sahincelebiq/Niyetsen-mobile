import assert from 'node:assert/strict';
import test from 'node:test';

import { EMPTY_LEAGUE, leagueLoadOutcome, normalizeLeague } from './league-shell.ts';

test('/league 404 kabuğu düşürmez, hata banner da yok', () => {
  const outcome = leagueLoadOutcome(404);
  assert.equal(outcome.keepShell, true);
  assert.equal(outcome.showError, false);
  assert.equal(outcome.unavailable, true);
  assert.equal(EMPTY_LEAGUE.opted_in, false);
  assert.deepEqual(EMPTY_LEAGUE.members, []);
});

test('ağ/5xx hatasında kabuk kalır, banner açılır', () => {
  const outcome = leagueLoadOutcome(503);
  assert.equal(outcome.keepShell, true);
  assert.equal(outcome.showError, true);
  assert.equal(outcome.unavailable, false);
});

test('eksik members dizisi boş diziye iner — FlatList düşmez', () => {
  const league = normalizeLeague({ opted_in: true, alias: 'Kartal', my_rank: 2 });
  assert.deepEqual(league.members, []);
  assert.equal(league.opted_in, true);
  assert.equal(normalizeLeague(null).alias, null);
});
