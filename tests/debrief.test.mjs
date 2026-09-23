import test from 'node:test';
import assert from 'node:assert/strict';
import { createStats, formatTime, isBetterRun, rateOperation } from '../src/game/debrief.ts';

const withStats = changes => ({ ...createStats(), ...changes });

test('a run nobody saw or reported is a ghost run, even with glances and spells', () => {
  assert.equal(rateOperation(withStats({ noticed: 4, restraints: 2, callsCutOff: 1, casts: { motor: 3, blink: 5, seeker: 1, lure: 2, sense: 2 } })), 'ghost');
});

test('any completed report without being seen makes the run discreet', () => {
  assert.equal(rateOperation(withStats({ reports: 1 })), 'discreet');
});

test('being spotted or hit makes the run compromised, whatever else happened', () => {
  assert.equal(rateOperation(withStats({ spotted: 1 })), 'compromised');
  assert.equal(rateOperation(withStats({ hitsTaken: 1 })), 'compromised');
  assert.equal(rateOperation(withStats({ spotted: 1, reports: 0 })), 'compromised');
});

test('a better rating beats a faster time; equal ratings compare time', () => {
  assert.equal(isBetterRun({ rating: 'discreet', elapsed: 300 }, null), true, 'first completion is always a best');
  assert.equal(isBetterRun({ rating: 'ghost', elapsed: 400 }, { rating: 'discreet', elapsed: 90 }), true);
  assert.equal(isBetterRun({ rating: 'compromised', elapsed: 30 }, { rating: 'discreet', elapsed: 300 }), false);
  assert.equal(isBetterRun({ rating: 'ghost', elapsed: 120 }, { rating: 'ghost', elapsed: 150 }), true);
  assert.equal(isBetterRun({ rating: 'ghost', elapsed: 150 }, { rating: 'ghost', elapsed: 150 }), false, 'a tie keeps the old best');
});

test('times read as minutes and zero-padded seconds', () => {
  assert.equal(formatTime(0), '0m 00s');
  assert.equal(formatTime(125.9), '2m 05s');
});

test('each attempt starts from a fresh tally', () => {
  const a = createStats(), b = createStats();
  a.casts.motor++;
  assert.equal(b.casts.motor, 0);
});
