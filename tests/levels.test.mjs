import test from 'node:test';
import assert from 'node:assert/strict';
import { Vector3 } from 'three';
import { ANNEX_LEVEL, DEMO_LEVEL, TOWER_LEVEL } from '../src/game/levels.ts';
import { CAMERA_OPTICS, createCameras, updateCamera } from '../src/game/camera.ts';
import { clearSight, createGuards, pathTo, playerExposure, safeFloor, updateGuard } from '../src/game/mechanics.ts';
import { createWorker, updateWorker, WORKER_CALL_DURATION } from '../src/game/worker.ts';

const v = ([x, y, z]) => new Vector3(x, y, z);

test('both levels keep their entrance, NPC starts, and alarm destination clear', () => {
  for (const level of [DEMO_LEVEL, ANNEX_LEVEL, TOWER_LEVEL]) {
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
  for (const level of [DEMO_LEVEL, ANNEX_LEVEL, TOWER_LEVEL]) {
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

test('the tower insertion point is safe from every guard, the sysadmin and both cameras', () => {
  const level = TOWER_LEVEL;
  const player = new Vector3(level.spawn[0], 1.56, level.spawn[2]);
  const guards = createGuards(level), worker = createWorker(level), cameras = createCameras(level);
  for (let t = 0; t < 120; t += .05) {
    for (const guard of guards) updateGuard(guard, player, .05, level);
    updateWorker(worker, player, .05, level);
    for (const camera of cameras) assert.equal(updateCamera(camera, player, .05, level), false);
    assert.ok(guards.every(g => g.suspicion === 0) && worker.suspicion === 0 && cameras.every(c => c.exposure === 0), `noticed at ${t.toFixed(2)} s`);
  }
});

test('the tower offers two routes to the core: east past both armed guards, west away from them', () => {
  const level = TOWER_LEVEL;
  const spawn = v(level.spawn).setY(0), core = new Vector3(-10.3, 0, -17.2);
  const legs = (...points) => points.slice(1).map((p, i) => pathTo(points[i], p, level));
  const east = legs(spawn, new Vector3(9.5, 0, -15.5), new Vector3(-1.5, 0, -18), core);
  const west = legs(spawn, new Vector3(-4, 0, 6.5), new Vector3(-6, 0, -15.5), core);
  for (const route of [east, west]) assert.ok(route.every(leg => leg.length > 0 && leg.every(p => safeFloor(p, level))), 'route connects over clear floor');
  // Sample the walked path, and measure distance to each armed guard's patrol segment.
  const walked = route => { const points = []; let at = spawn; for (const p of route.flat()) { for (let t = 0; t <= 1; t += .1) points.push(at.clone().lerp(p, t)); at = p; } return points; };
  const toSegment = (p, a, b) => { const ab = b.clone().sub(a); const t = Math.max(0, Math.min(1, p.clone().sub(a).dot(ab) / ab.lengthSq())); return p.distanceTo(a.clone().addScaledVector(ab, t)); };
  const armedLanes = createGuards(level).filter(g => g.armed).map(g => g.route);
  assert.ok(armedLanes.every(([a, b]) => walked(east).some(p => toSegment(p, a, b) < 1.5)), 'east passes both armed guards');
  assert.ok(!walked(west).some(p => armedLanes.some(([a, b]) => toSegment(p, a, b) < 1.5)), 'west avoids the armed lanes');
  assert.ok(clearSight(new Vector3(-10.3, 1.56, -17.2), v(level.artifact), level), 'core visible from its pickup spot');
});

test('tower cameras watch the office entry and the server-room approach part of the time, and leave the middle quiet', () => {
  const level = TOWER_LEVEL;
  const cameras = createCameras(level);
  const facings = [];
  for (let t = 0; t < 30; t += .1) { for (const c of cameras) updateCamera(c, new Vector3(0, -50, 0), .1, level); facings.push(cameras.map(c => c.facing)); }
  const watched = (x, z) => {
    const p = new Vector3(x, 1.56, z);
    return facings.filter(f => cameras.some((c, i) => playerExposure(c.position, f[i], p, false, level, CAMERA_OPTICS) > 0)).length / facings.length;
  };
  for (const [x, z] of [[-4, 6.8], [-6, -12]]) {
    const share = watched(x, z);
    assert.ok(share > .1 && share < .6, `(${x}, ${z}) watched ${Math.round(share * 100)}% of the time`);
  }
  assert.equal(watched(-5, -3), 0, 'the middle of the office is left to the guard');
});

test('the sysadmin watches the open-office door but not the security door', () => {
  const worker = createWorker(TOWER_LEVEL);
  const eye = worker.position.clone().setY(1.55);
  assert.ok(playerExposure(eye, worker.facing, new Vector3(-6, 1.56, -15), false, TOWER_LEVEL) > 0);
  assert.equal(playerExposure(eye, worker.facing, new Vector3(-1.2, 1.56, -18), false, TOWER_LEVEL), 0);
});
