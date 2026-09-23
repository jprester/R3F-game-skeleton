import test from 'node:test';
import assert from 'node:assert/strict';
import { Vector3 } from 'three';
import { screenAngle, threats } from '../src/game/awareness.ts';
import { createGuards, LIFE_SENSE_RANGE, lockGuard, RADIO_CALL_TIME, restrainGuard, senses } from '../src/game/mechanics.ts';
import { createWorker, lockWorker } from '../src/game/worker.ts';

const v = (x, y, z) => new Vector3(x, y, z);
const close = (actual, expected) => assert.ok(Math.abs(actual - expected) < 1e-6, `${actual} ≈ ${expected}`);

test('indicator angles are relative to where the camera looks', () => {
  const at = v(0, 1.5, 0);
  // Yaw 0 looks down -z.
  close(screenAngle(at, 0, v(0, 0, -5)), 0);
  close(screenAngle(at, 0, v(5, 0, 0)), Math.PI / 2);
  close(screenAngle(at, 0, v(-5, 0, 0)), -Math.PI / 2);
  close(Math.abs(screenAngle(at, 0, v(0, 0, 5))), Math.PI);
  // Turning left by 90 degrees puts the -x guard straight ahead.
  close(screenAngle(at, Math.PI / 2, v(-5, 0, 0)), 0);
});

test('only observers whose attention is on the player get an indicator, most urgent state first', () => {
  const guards = createGuards();
  const worker = createWorker();
  const at = v(0, 1.5, 5.5);
  assert.deepEqual(threats(guards, worker, at, 0), [], 'calm patrols show nothing');

  guards[0].suspicion = .3;
  guards[1].mode = 'investigate'; guards[1].suspicion = .1;
  worker.mode = 'fleeing';
  const list = threats(guards, worker, at, 0);
  assert.deepEqual(list.map(t => [t.id, t.state]), [['guard-0', 'suspicious'], ['guard-1', 'investigating'], ['worker', 'alert']]);
  assert.equal(list[0].level, .3);

  guards[0].radio = { reason: 'contact', time: RADIO_CALL_TIME / 2, position: v(0, 0, 0), victim: null };
  assert.equal(threats(guards, worker, at, 0)[0].state, 'radio');
  assert.equal(threats(guards, worker, at, 0)[0].level, .5);
  guards[0].alerted = true;
  assert.equal(threats(guards, worker, at, 0)[0].state, 'alert');
});

test('incapacitated observers drop their indicator', () => {
  const guards = createGuards();
  const worker = createWorker();
  guards[0].alerted = true; guards[1].suspicion = .5; worker.suspicion = .5;
  lockGuard(guards[0], 6);
  lockGuard(guards[1], 6); restrainGuard(guards[1]);
  lockWorker(worker, 6);
  assert.deepEqual(threats(guards, worker, v(0, 1.5, 5.5), 0), []);
});

test('a glance shows even after suspicion has drained', () => {
  const guards = createGuards();
  guards[0].glance = 1;
  assert.equal(threats(guards, createWorker(), v(0, 1.5, 5.5), 0)[0]?.state, 'suspicious');
});

test('Life Sense reaches a fixed radius from where it was cast, through walls', () => {
  const origin = v(0, 0, 5.5);
  assert.equal(senses(origin, v(0, 0, 5.5 - LIFE_SENSE_RANGE + .1)), true);
  assert.equal(senses(origin, v(0, 0, 5.5 - LIFE_SENSE_RANGE - .1)), false);
});
