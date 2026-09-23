import test from 'node:test';
import assert from 'node:assert/strict';
import { Vector3 } from 'three';
import { ANNEX_LEVEL, DEMO_LEVEL } from '../src/game/levels.ts';
import { clearSight, createGuards, pathTo, playerExposure, safeFloor, updateGuard } from '../src/game/mechanics.ts';
import { createWorker, updateWorker, WORKER_CALL_DURATION } from '../src/game/worker.ts';

const v = ([x, y, z]) => new Vector3(x, y, z);

test('both levels keep their entrance, NPC starts, and alarm destination clear', () => {
  for (const level of [DEMO_LEVEL, ANNEX_LEVEL]) {
    assert.ok(safeFloor(v(level.spawn), level), `${level.id} entrance`);
    for (const guard of createGuards(level)) {
      for (const stop of guard.route) assert.ok(safeFloor(stop, level), `${level.id} guard stop`);
    }
    const worker = createWorker(level);
    assert.ok(safeFloor(worker.position, level), `${level.id} worker start`);
    assert.ok(safeFloor(worker.alarmPoint, level), `${level.id} alarm destination`);
    assert.ok(pathTo(worker.position, worker.alarmPoint, level).length > 0, `${level.id} worker can report`);
  }
});

test('guard patrols never pass through furniture', () => {
  for (const level of [DEMO_LEVEL, ANNEX_LEVEL]) {
    for (const guard of createGuards(level)) {
      const [a, b] = guard.route;
      for (let i = 0; i <= 20; i++) {
        const point = a.clone().lerp(b, i / 20);
        assert.ok(safeFloor(point, level), `${level.id} patrol blocked at ${point.x.toFixed(1)}, ${point.z.toFixed(1)}`);
      }
    }
  }
});

test('crouching behind the added low cover hides the player from the nearest observer', () => {
  const crouchedAt = (x, z) => new Vector3(x, 1.01, z);
  const hidden = (level, eyes, spot) => eyes.every(eye =>
    playerExposure(eye, Math.atan2(spot.x - eye.x, spot.z - eye.z), spot, true, level) === 0);
  const lane = (x, z0, z1) => Array.from({ length: 11 }, (_, i) => new Vector3(x, 1.65, z0 + (z1 - z0) * i / 10));
  for (const z of [-4.2, -5.6, -7]) assert.ok(hidden(ANNEX_LEVEL, lane(-5, -3, -8), crouchedAt(-2.4, z)), `operations desk run at z ${z}`);
  for (const z of [-13.2, -14.6, -16]) assert.ok(hidden(ANNEX_LEVEL, lane(-5, -12, -17), crouchedAt(-2.4, z)), `records desk run at z ${z}`);
  assert.ok(hidden(ANNEX_LEVEL, [new Vector3(3, 1.55, -21)], crouchedAt(5.3, -19.2)), 'vault crate hides the doorway from the worker');
  const researchLane = Array.from({ length: 11 }, (_, i) => new Vector3(-2.8 + 5.8 * i / 10, 1.65, -13));
  assert.ok(hidden(DEMO_LEVEL, researchLane, crouchedAt(5.15, -13.4)), 'Quiet Entry lab bench');
  for (const spot of [[-2.4, -5.6], [-2.4, -14.6], [5.3, -19.2]]) assert.ok(safeFloor(new Vector3(spot[0], 0, spot[1]), ANNEX_LEVEL));
  assert.ok(safeFloor(new Vector3(5.15, 0, -13.4), DEMO_LEVEL));
});

test('the records wing has two usable approaches to the vault', () => {
  const level = ANNEX_LEVEL;
  const destination = v(level.artifact);
  const distances = [];
  for (const side of [-1, 1]) {
    const first = new Vector3(side * 4.3, 0, -5);
    const second = new Vector3(side * 4.3, 0, -14);
    const legs = [pathTo(v(level.spawn), first, level), pathTo(first, second, level), pathTo(second, destination, level)];
    assert.ok(legs.every(route => route.length > 0), `${side < 0 ? 'left' : 'right'} approach connects`);
    assert.ok(legs.flat().every(point => safeFloor(point, level)), 'route avoids furniture and walls');
    let at = v(level.spawn), length = 0;
    for (const point of legs.flat()) { length += Math.hypot(point.x - at.x, point.z - at.z); at = point; }
    distances.push(length);
  }
  assert.ok(distances[1] > distances[0] + 5, 'the covered right route takes a real detour');
  assert.equal(clearSight(new Vector3(-5, 1.65, -6), new Vector3(-3.5, 1.55, -6), level), true, 'direct route is exposed');
  assert.equal(clearSight(new Vector3(7, 1.65, -5.5), new Vector3(3.5, 1.55, -5.5), level), false, 'service shelving provides cover');
});

test('the mission starts safe and the vault worker can reach and use the alarm', () => {
  const level = ANNEX_LEVEL;
  const guards = createGuards(level);
  const playerAtEntry = v(level.spawn);
  for (let i = 0; i < 400; i++) {
    for (const guard of guards) {
      assert.equal(updateGuard(guard, playerAtEntry, .05, level), false);
      assert.equal(guard.suspicion, 0);
    }
  }
  const worker = createWorker(level);
  const witness = new Vector3(5, 1.5, -21);
  for (let i = 0; i < 400 && worker.report < WORKER_CALL_DURATION; i++) updateWorker(worker, witness, .05, level);
  assert.equal(worker.mode, 'calling');
  assert.equal(worker.report, WORKER_CALL_DURATION);
});
