import test from 'node:test';
import assert from 'node:assert/strict';
import { Vector3 } from 'three';
import { threats } from '../src/game/awareness.ts';
import { CAMERA_DETECTION_TIME, CAMERA_HOLD, createCameras, updateCamera } from '../src/game/camera.ts';
import { ANNEX_LEVEL, DEMO_LEVEL } from '../src/game/levels.ts';
import { createGuards, lockGuard, updateGuard, VEIL_BREAK_RANGE, WARY_DURATION } from '../src/game/mechanics.ts';
import { createSecurity, updateSecurity, veilPierced } from '../src/game/security.ts';
import { SPELLS } from '../src/game/spells/index.ts';
import { createWorker } from '../src/game/worker.ts';

const v = (x, y, z) => new Vector3(x, y, z);
const hidden = v(0, 1.5, 5.5);
/** A fixed camera on the Quiet Entry right lane wall, staring across the lane. */
const fixedCamera = () => ({ ...createCameras(DEMO_LEVEL)[0], facing: -Math.PI / 2, centre: -Math.PI / 2, sweep: 0 });
const acrossLane = v(3, 1.56, -5);

test('a camera sweeps between its limits and holds at each end', () => {
  const camera = createCameras(DEMO_LEVEL)[0];
  const { centre, sweep } = camera;
  let min = Infinity, max = -Infinity, held = 0;
  for (let t = 0; t < 20; t += .05) {
    updateCamera(camera, hidden, .05);
    min = Math.min(min, camera.facing); max = Math.max(max, camera.facing);
    if (camera.hold > 0) held += .05;
  }
  assert.ok(Math.abs(min - (centre - sweep)) < 1e-6 && Math.abs(max - (centre + sweep)) < 1e-6);
  assert.ok(held > CAMERA_HOLD * 2, 'pauses at the ends');
});

test('a camera flags only after sustained view, and a brief pass is forgiven', () => {
  const camera = fixedCamera();
  let flaggedAt = null;
  for (let t = 0; t < 4 && flaggedAt === null; t += .05) if (updateCamera(camera, acrossLane, .05)) flaggedAt = t;
  assert.ok(flaggedAt >= CAMERA_DETECTION_TIME - .1 && flaggedAt <= CAMERA_DETECTION_TIME + .1, `flagged at ${flaggedAt}`);
  assert.equal(camera.suspicion, 0, 'then resets while monitoring dispatches');

  const pass = fixedCamera();
  for (let t = 0; t < 1; t += .05) assert.equal(updateCamera(pass, acrossLane, .05), false);
  for (let t = 0; t < 3; t += .05) updateCamera(pass, hidden, .05);
  assert.equal(pass.suspicion, 0, 'suspicion drains once out of view');
});

test('the strip along the wall under the Quiet Entry camera is a blind spot for its whole sweep', () => {
  const camera = createCameras(DEMO_LEVEL)[0];
  for (let t = 0; t < 14; t += .05) {
    updateCamera(camera, v(5.1, 1.56, -3), .05);
    assert.equal(camera.exposure, 0, `seen at facing ${camera.facing.toFixed(2)}`);
  }
});

test('a camera flag sends the nearest free guard to look and makes security wary, without an alarm', () => {
  const guards = createGuards(DEMO_LEVEL);
  const worker = createWorker();
  const security = createSecurity(DEMO_LEVEL);
  Object.assign(security.cameras[0], { facing: -Math.PI / 2, centre: -Math.PI / 2, sweep: 0 });
  lockGuard(guards[0], 20); // the nearest guard is unavailable, so the next one is sent
  let flags = [];
  for (let t = 0; t < 3 && flags.length === 0; t += .05) flags = updateSecurity(guards, worker, acrossLane, .05, DEMO_LEVEL, security).cameraFlags;
  assert.deepEqual(flags, [{ camera: 0, dispatched: 1 }]);
  assert.ok(guards[1].lastSeen.distanceTo(v(3, 0, -5)) < 1e-6);
  assert.equal(guards[1].mode, 'investigate');
  assert.equal(security.wary, WARY_DURATION);
  assert.ok(guards.every(g => g.alarm === 0));
});

test('both maps have a camera, and the Records Wing camera replaced a guard', () => {
  assert.equal(createCameras(DEMO_LEVEL).length, 1);
  assert.equal(createCameras(ANNEX_LEVEL).length, 1);
  assert.equal(createGuards(ANNEX_LEVEL).length, 3);
});

test('Veil makes cameras, guards and the worker overlook the player', () => {
  const camera = fixedCamera();
  for (let t = 0; t < 4; t += .05) assert.equal(updateCamera(camera, acrossLane, .05, DEMO_LEVEL, false, true), false);
  const guard = createGuards()[0]; guard.facing = Math.PI;
  for (let t = 0; t < 3; t += .05) updateGuard(guard, v(-3, 1.5, -7.5), .05, DEMO_LEVEL, { downed: [], wary: false, veiled: true });
  assert.equal(guard.suspicion, 0);
});

test('Veil breaks only when someone who can see the player is within reach', () => {
  const guards = createGuards();
  const worker = createWorker();
  guards[0].facing = Math.PI; // (-3, -3) looking down -z
  const close = v(-3, 1.5, -3 - (VEIL_BREAK_RANGE - .5));
  const far = v(-3, 1.5, -3 - (VEIL_BREAK_RANGE + 1.5));
  assert.equal(veilPierced(guards, worker, close, false, DEMO_LEVEL), true);
  assert.equal(veilPierced(guards, worker, far, false, DEMO_LEVEL), false, 'seen, but too far to notice');
  guards[0].facing = 0;
  assert.equal(veilPierced(guards, worker, close, false, DEMO_LEVEL), false, 'close, but looking away');
  guards[0].facing = Math.PI; lockGuard(guards[0], 6);
  assert.equal(veilPierced(guards, worker, close, false, DEMO_LEVEL), false, 'an immobilized guard notices nothing');
});

test('Veil cannot be stacked', () => {
  const veil = SPELLS.find(s => s.id === 'veil');
  const world = { guards: [], worker: createWorker(), level: DEMO_LEVEL, body: v(0, 0, 5.5), eye: v(0, 1.56, 5.5), seekerInFlight: false, veiled: false };
  assert.equal(veil.cast({}, world).cast, true);
  assert.equal(veil.cast({}, { ...world, veiled: true }).message, 'Veil already active.');
});

test('a tracking camera gets an awareness arc', () => {
  const camera = fixedCamera();
  camera.suspicion = .4;
  const [threat] = threats([], createWorker(), v(0, 1.5, 5.5), 0, [camera]);
  assert.equal(threat.id, 'camera-0');
  assert.equal(threat.state, 'suspicious');
});
