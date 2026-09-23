import test from 'node:test';
import assert from 'node:assert/strict';
import { Vector3 } from 'three';
import { clearSight, safeFloor, seesPlayer, createGuards, updateGuard, LOCK_DURATION } from '../src/game/mechanics.ts';
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
