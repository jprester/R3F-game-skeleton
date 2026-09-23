import test from 'node:test';
import assert from 'node:assert/strict';
import { Vector3 } from 'three';
import { advanceFootsteps, advanceSeeker, canGuardHit, clearSight, hearFootstep, hearLure, safeFloor, seesPlayer, createGuards, updateGuard, pathTo, LOCK_DURATION, SHOT_COOLDOWN, SHOT_WINDUP } from '../src/game/mechanics.ts';
const v = (x, y, z) => new Vector3(x, y, z);

test('walls occlude sight, while open doorways allow it', () => {
  assert.equal(clearSight(v(0, 1.6, 3), v(0, 1.6, -3)), false);
  assert.equal(clearSight(v(-3, 1.6, 3), v(-3, 1.6, -3)), true);
  assert.equal(clearSight(v(3, 1.6, -5), v(-3, 1.6, -5)), false);
});
test('Blink rejects walls, furniture, edges, and accepts doorway and service passage', () => {
  assert.equal(safeFloor(v(0, 0, 0)), false);
  assert.equal(safeFloor(v(-1, 0, -4)), false);
  assert.equal(safeFloor(v(6, 0, -4)), false);
  assert.equal(safeFloor(v(-3, 0, 0)), true);
  assert.equal(safeFloor(v(3.5, 0, -5)), true);
});
test('guard perception respects facing, range and obstruction', () => {
  const eye = v(-3, 1.6, -3);
  assert.equal(seesPlayer(eye, 0, v(-3, 1.6, 2)), true);
  assert.equal(seesPlayer(eye, Math.PI, v(-3, 1.6, 2)), false);
  assert.equal(seesPlayer(eye, 0, v(-3, 1.6, 8)), false);
  assert.equal(seesPlayer(v(0, 1.6, -3), 0, v(0, 1.6, 2)), false);
});
test('confirmed contact starts alarm, losing sight interrupts it', () => {
  const guard = createGuards()[1]; guard.facing = Math.PI / 2;
  for (let i = 0; i < 60; i++) updateGuard(guard, v(0, 1.6, -13), .05);
  assert.equal(guard.alerted, true); assert.ok(guard.alarm > 1);
  for (let i = 0; i < 40; i++) updateGuard(guard, v(0, 1.6, 3), .05);
  assert.equal(guard.alarm, 0);
});
test('armed guard telegraphs fire after confirmation and never starts an alarm call', () => {
  const [guard, alarmGuard] = createGuards();
  assert.equal(guard.armed, true);
  assert.equal(alarmGuard.armed, false);
  guard.facing = Math.PI;
  const player = v(-3, 1.5, -6);
  let shots = 0, sawWindup = false;
  for (let i = 0; i < 45; i++) {
    shots += Number(updateGuard(guard, player, .05));
    sawWindup ||= guard.shotWindup > 0;
  }
  assert.equal(sawWindup, true);
  assert.equal(shots, 1);
  assert.equal(guard.alarm, 0);
  assert.ok(guard.shotCooldown > 0);
  assert.ok(SHOT_WINDUP > .5, 'windup gives time to react');
});
test('armed guard repeats fire promptly while contact remains clear', () => {
  const guard = createGuards()[0]; guard.facing = Math.PI;
  const player = v(-3, 1.5, -6);
  let shots = 0;
  for (let i = 0; i < 105; i++) shots += Number(updateGuard(guard, player, .05));
  assert.equal(shots, 3);
  assert.ok(SHOT_COOLDOWN <= 1);
});
test('breaking sight or immobilizing the armed guard cancels a shot', () => {
  const guard = createGuards()[0]; guard.facing = Math.PI;
  for (let i = 0; i < 32; i++) updateGuard(guard, v(-3, 1.5, -6), .05);
  assert.ok(guard.shotWindup > 0);
  for (let i = 0; i < 30; i++) assert.equal(updateGuard(guard, v(0, 1.5, 3), .05), false);
  assert.equal(guard.shotWindup, 0);
  guard.locked = LOCK_DURATION;
  for (let i = 0; i < 25; i++) assert.equal(updateGuard(guard, v(-3, 1.5, -6), .05), false);
  assert.equal(canGuardHit(guard, v(-3, 1.5, -6)), false);
  guard.locked = 0; guard.position.set(0, 0, -3); guard.facing = 0; guard.alerted = true;
  assert.equal(canGuardHit(guard, v(0, 1.5, 3)), false, 'the central wall blocks a shot');
});
test('Motor Lock freezes patrol and interrupts alarm, then expires', () => {
  const guard = createGuards()[0]; const original = guard.position.clone();
  guard.locked = LOCK_DURATION; guard.alarm = 2;
  for (let i = 0; i < 100; i++) updateGuard(guard, v(-3, 1.6, 2), .05);
  assert.equal(guard.alarm, 0); assert.deepEqual(guard.position, original); assert.ok(guard.locked > 0);
  for (let i = 0; i < 40; i++) updateGuard(guard, v(0, 1.6, 5), .05);
  assert.equal(guard.locked, 0); assert.notDeepEqual(guard.position, original);
});
test('insertion point remains safe throughout both patrol routes', () => {
  const guards = createGuards(); const player = v(0, 1.5, 5.5);
  for (let i = 0; i < 2400; i++) {
    for (const guard of guards) {
      updateGuard(guard, player, .05);
      assert.equal(guard.suspicion, 0, 'no detection while waiting at insertion');
    }
  }
});
test('investigation routes through doorways and avoids furniture', () => {
  const start = v(-3, 0, -3);
  const route = pathTo(start, v(0, 0, 5.5));
  assert.ok(route.length > 0);
  // Smoothed routes skip grid cells, so check where the walked line crosses the wall at z = 0.
  const legs = [start, ...route].slice(0, -1).map((from, i) => [from, route[i]]);
  const [from, to] = legs.find(([a, b]) => a.z < 0 && b.z >= 0);
  const doorwayX = from.x + (to.x - from.x) * (-from.z / (to.z - from.z));
  assert.ok(doorwayX > -4.2 && doorwayX < -2.5, 'crosses through the left doorway');
  assert.ok(route.every(point => safeFloor(point)), 'every stop has body clearance');

  const guard = createGuards()[0];
  guard.lastSeen = v(0, 0, 5.5);
  guard.search = 4;
  guard.alerted = true;
  guard.mode = 'alert';
  guard.facing = Math.PI;
  let reachedEntry = false;
  for (let i = 0; i < 500; i++) {
    updateGuard(guard, v(0, 1.5, -16), .05);
    assert.equal(safeFloor(guard.position), true, `guard entered a solid at step ${i}`);
    if (guard.position.z > .5) reachedEntry = true;
  }
  assert.ok(reachedEntry, 'guard physically reaches the last known room');
});
test('footsteps follow distance walked and stop under Motor Lock', () => {
  const guard = createGuards()[0];
  const hiddenPlayer = v(0, 1.5, 5.5);
  let distanceSinceStep = 0;
  let heard = 0;
  for (let i = 0; i < 100; i++) {
    const before = guard.position.clone();
    updateGuard(guard, hiddenPlayer, .05);
    const step = advanceFootsteps(distanceSinceStep, before.distanceTo(guard.position));
    distanceSinceStep = step.distanceSinceStep;
    heard += step.count;
  }
  assert.ok(heard >= 3, 'patrol produces an audible cadence');
  guard.locked = LOCK_DURATION;
  for (let i = 0; i < 100; i++) {
    const before = guard.position.clone();
    updateGuard(guard, hiddenPlayer, .05);
    const step = advanceFootsteps(distanceSinceStep, before.distanceTo(guard.position));
    distanceSinceStep = step.distanceSinceStep;
    assert.equal(step.count, 0);
  }
});
test('heard footsteps cause investigation without confirming sight or starting an alarm', () => {
  const guard = createGuards()[0];
  const sound = v(-3, 0, -1);
  assert.equal(hearFootstep(guard, sound, true), false, 'slow movement stays quiet at 2 m');
  assert.equal(hearFootstep(guard, sound, false), true);
  assert.equal(guard.mode, 'investigate');
  assert.equal(guard.lastSeen, null);
  for (let i = 0; i < 35; i++) updateGuard(guard, v(0, 1.5, 5.5), .05);
  assert.ok(guard.position.z > -3, 'guard approaches the sound');
  assert.equal(guard.alerted, false);
  assert.equal(guard.alarm, 0);
});
test('walls muffle footsteps and immobilized guards ignore them', () => {
  const guard = createGuards()[0];
  guard.position.set(0, 0, -2);
  assert.equal(hearFootstep(guard, v(0, 0, 1), false), false, 'wall muffles a 3 m footstep');
  guard.position.set(-3, 0, -2);
  assert.equal(hearFootstep(guard, v(-3, 0, 1), false), true, 'open doorway carries the same sound');
  guard.locked = LOCK_DURATION;
  assert.equal(hearFootstep(guard, v(-3, 0, -2), false), false);
});
test('Echo Lure redirects investigation without revealing its caster', () => {
  const guard = createGuards()[0];
  guard.lastSeen = v(0, 0, 5.5);
  guard.search = 4;
  guard.mode = 'investigate';
  const lure = v(-3, 0, -7);
  assert.equal(hearLure(guard, lure), true);
  assert.equal(guard.lastSeen, null);
  assert.deepEqual(guard.lastHeard, lure);
  for (let i = 0; i < 50; i++) updateGuard(guard, v(0, 1.5, 5.5), .05);
  assert.ok(guard.position.z < -3.5, 'guard moves toward lure');
  assert.equal(guard.alarm, 0);
});
test('Echo Lure is muffled by walls and ignored under immobilization', () => {
  const guard = createGuards()[0];
  guard.position.set(0, 0, -3);
  assert.equal(hearLure(guard, v(0, 0, 1)), false);
  guard.position.set(-3, 0, -3);
  assert.equal(hearLure(guard, v(-3, 0, 1)), true);
  guard.locked = LOCK_DURATION;
  assert.equal(hearLure(guard, v(-3, 0, -4)), false);
});
test('Seeker Crystal tracks a guard around cover without cutting through solids', () => {
  const flight = { position: v(-3, 1.25, -3), targetIndex: 0, route: [], replan: 0, life: 8 };
  let target = v(-3, 0, -7);
  let result = 'flying';
  for (let i = 0; i < 150 && result === 'flying'; i++) {
    if (i === 8) target = v(3, 0, -7);
    const before = flight.position.clone();
    result = advanceSeeker(flight, target, .05);
    assert.equal(clearSight(before, flight.position), true, `clipped geometry at step ${i}`);
  }
  assert.equal(result, 'hit');
  assert.ok(flight.position.distanceTo(v(3, 1.25, -7)) < .3);
});
