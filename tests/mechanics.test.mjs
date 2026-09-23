import test from 'node:test';
import assert from 'node:assert/strict';
import { Vector3 } from 'three';
import { advanceFootsteps, advanceSeeker, clearSight, safeFloor, seesPlayer, createGuards, updateGuard, pathTo, LOCK_DURATION } from '../src/game/mechanics.ts';
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
  const guard = createGuards()[0]; guard.facing = 0;
  for (let i = 0; i < 60; i++) updateGuard(guard, v(-3, 1.6, 2), .05);
  assert.equal(guard.alerted, true); assert.ok(guard.alarm > 1);
  for (let i = 0; i < 40; i++) updateGuard(guard, v(0, 1.6, 3), .05);
  assert.equal(guard.alarm, 0);
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
  const route = pathTo(v(-3, 0, -3), v(0, 0, 5.5));
  assert.ok(route.length > 0);
  assert.ok(route.some(point => Math.abs(point.z) < .6 && point.x < -2.8), 'uses the left doorway');
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
