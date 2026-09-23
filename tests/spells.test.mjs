import test from 'node:test';
import assert from 'node:assert/strict';
import { Vector3 } from 'three';
import { DEMO_LEVEL } from '../src/game/levels.ts';
import { createStats } from '../src/game/debrief.ts';
import { BLINK_COOLDOWN, createGuards, LOCK_COOLDOWN, LOCK_DURATION, restrainGuard } from '../src/game/mechanics.ts';
import { aimPrompt, createCooldowns, SPELLS, tryCast } from '../src/game/spells/index.ts';
import { createWorker } from '../src/game/worker.ts';

const v = (x, y, z) => new Vector3(x, y, z);
const spell = id => SPELLS.find(s => s.id === id);
const noAim = () => ({ target: null, floor: null, floorDistance: Infinity, arrivalClear: false });
const aimAtGuard = (guard, index, distance) => ({ ...noAim(), target: { kind: 'guard', index, npc: guard, distance } });
const aimAtFloor = (point, distance, arrivalClear = true) => ({ ...noAim(), floor: point, floorDistance: distance, arrivalClear });
function scene() {
  const guards = createGuards();
  const worker = createWorker();
  return { guards, worker, world: { guards, worker, level: DEMO_LEVEL, body: v(0, 0, 5.5), eye: v(0, 1.56, 5.5), seekerInFlight: false } };
}

test('the registry has unique ids and inputs, and every spell is counted in the debrief', () => {
  assert.deepEqual(SPELLS.map(s => s.id), ['motor', 'blink', 'seeker', 'lure', 'sense'], 'HUD order');
  assert.equal(new Set(SPELLS.map(s => s.code)).size, SPELLS.length);
  assert.deepEqual(Object.keys(createStats().casts).sort(), SPELLS.map(s => s.id).sort());
});

test('a successful cast starts the cooldown; a refused one does not; recharging blocks casting', () => {
  const { guards, world } = scene();
  const cooldowns = createCooldowns();
  assert.equal(tryCast(spell('motor'), cooldowns, noAim(), world).cast, false);
  assert.equal(cooldowns.motor, 0, 'a miss costs nothing');
  assert.equal(tryCast(spell('motor'), cooldowns, aimAtGuard(guards[0], 0, 5), world).cast, true);
  assert.equal(cooldowns.motor, LOCK_COOLDOWN);
  const again = tryCast(spell('motor'), cooldowns, aimAtGuard(guards[1], 1, 5), world);
  assert.deepEqual(again, { cast: false, message: 'Motor Lock recharging.' });
});

test('Motor Lock respects range, immobilizes, remembers the caster, and reports a cut-off call', () => {
  const { guards, world } = scene();
  assert.equal(spell('motor').cast(aimAtGuard(guards[0], 0, 10.5), world).cast, false, 'out of range');
  guards[0].radio = { reason: 'contact', time: 1, position: v(0, 0, 0), victim: null };
  const result = spell('motor').cast(aimAtGuard(guards[0], 0, 6), world);
  assert.equal(result.cast, true);
  assert.equal(guards[0].locked, LOCK_DURATION);
  assert.equal(guards[0].radio, null);
  assert.ok(guards[0].lastSeen.distanceTo(v(0, 0, 5.5)) < 1e-6, 'he knows where the spell came from');
  assert.match(result.message, /radio call cut off/);
  assert.equal(result.effect.kind, 'lock');
  assert.equal(spell('motor').cast(aimAtGuard(guards[0], 0, 6), world).message, 'Target already immobilized.');
  restrainGuard(guards[0]);
  assert.equal(spell('motor').cast(aimAtGuard(guards[0], 0, 6), world).message, 'Target already restrained.');
});

test('Seeker Crystal launches one flight at a time toward the aimed target', () => {
  const { guards, world } = scene();
  const result = spell('seeker').cast(aimAtGuard(guards[1], 1, 12), world);
  assert.equal(result.cast, true);
  assert.equal(result.effect.flight.targetIndex, 1);
  assert.equal(result.effect.flight.targetKind, 'guard');
  assert.equal(spell('seeker').cast(aimAtGuard(guards[1], 1, 12), { ...world, seekerInFlight: true }).message, 'Seeker Crystal already in flight.');
});

test('Echo Lure sends guards in earshot to the point, and needs floor in range', () => {
  const { guards, world } = scene();
  assert.equal(spell('lure').cast(aimAtFloor(v(-3, 0, -6), 12.5), world).cast, false);
  const result = spell('lure').cast(aimAtFloor(v(-3, 0, -6), 11), world);
  assert.equal(result.cast, true);
  assert.equal(guards[0].mode, 'investigate');
  assert.ok(guards[0].lastHeard.distanceTo(v(-3, 0, -6)) < 1e-6);
});

test('Blink needs close floor with a clear arrival volume', () => {
  const { world } = scene();
  const cooldowns = createCooldowns();
  assert.equal(tryCast(spell('blink'), cooldowns, aimAtFloor(v(-3, 0, 1), 5, false), world).cast, false, 'occupied arrival');
  assert.equal(tryCast(spell('blink'), cooldowns, aimAtFloor(v(-3, 0, 1), 8), world).cast, false, 'too far');
  const result = tryCast(spell('blink'), cooldowns, aimAtFloor(v(-3, 0, 1), 5), world);
  assert.equal(result.effect.kind, 'blink');
  assert.ok(result.effect.destination.distanceTo(v(-3, 0, 1)) < 1e-6);
  assert.equal(cooldowns.blink, BLINK_COOLDOWN);
});

test('Life Sense needs no aim and pulses from the player', () => {
  const { world } = scene();
  const result = spell('sense').cast(noAim(), world);
  assert.equal(result.cast, true);
  assert.ok(result.effect.origin.distanceTo(v(0, 0, 5.5)) < 1e-6);
});

test('the crosshair prompt lists exactly the spells the aim offers', () => {
  const { guards, worker } = scene();
  assert.equal(aimPrompt(aimAtGuard(guards[0], 0, 6)), 'LMB · Motor Lock  /  F · Seeker Crystal');
  assert.equal(aimPrompt(aimAtGuard(guards[0], 0, 12)), 'F · Seeker Crystal');
  assert.equal(aimPrompt({ ...noAim(), target: { kind: 'worker', index: 0, npc: worker, distance: 4 } }), 'Worker · LMB · Motor Lock  /  F · Seeker Crystal');
  assert.equal(aimPrompt(aimAtFloor(v(0, 0, 0), 5)), 'Q · Blink  /  R · Echo Lure');
  assert.equal(aimPrompt(aimAtFloor(v(0, 0, 0), 9)), 'R · Echo Lure');
  assert.equal(aimPrompt(aimAtFloor(v(0, 0, 0), 5, false)), 'R · Echo Lure', 'occupied arrival hides Blink');
  assert.equal(aimPrompt(noAim()), '');
});
