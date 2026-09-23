import test from 'node:test';
import assert from 'node:assert/strict';
import { Vector3 } from 'three';
import { safeFloor } from '../src/game/mechanics.ts';
import { createWorker, lockWorker, updateWorker, WORKER_ALARM_POINT, WORKER_CALL_DURATION } from '../src/game/worker.ts';

const coreApproach = new Vector3(0, 1.5, -16);
const insertion = new Vector3(0, 1.5, 5.5);

test('worker and alarm panel occupy walkable positions; entry stays safe', () => {
  const worker = createWorker();
  assert.equal(safeFloor(worker.position), true);
  assert.equal(safeFloor(WORKER_ALARM_POINT), true);
  for (let i = 0; i < 200; i++) updateWorker(worker, insertion, .05);
  assert.equal(worker.mode, 'working');
  assert.equal(worker.suspicion, 0);
});

test('worker spots intrusion, runs through Research, and completes a report', () => {
  const worker = createWorker();
  let fled = false, called = false;
  for (let i = 0; i < 240; i++) {
    updateWorker(worker, coreApproach, .05);
    assert.equal(safeFloor(worker.position), true, `worker left walkable space at step ${i}`);
    fled ||= worker.mode === 'fleeing';
    called ||= worker.mode === 'calling';
  }
  assert.equal(fled, true);
  assert.equal(called, true);
  assert.equal(worker.report, WORKER_CALL_DURATION);
  assert.ok(worker.position.distanceTo(WORKER_ALARM_POINT) < .7);
});

test('immobilization freezes worker and cancels an active report', () => {
  const worker = createWorker();
  for (let i = 0; i < 150; i++) updateWorker(worker, coreApproach, .05);
  assert.equal(worker.mode, 'calling');
  assert.ok(worker.report > 0);
  const stoppedAt = worker.position.clone();
  lockWorker(worker, 6);
  for (let i = 0; i < 100; i++) updateWorker(worker, insertion, .05);
  assert.equal(worker.mode, 'locked');
  assert.equal(worker.report, 0);
  assert.deepEqual(worker.position, stoppedAt);
  for (let i = 0; i < 40; i++) updateWorker(worker, insertion, .05);
  assert.equal(worker.mode, 'calling', 'worker resumes reporting after release');
  assert.ok(worker.report > 0);
});
