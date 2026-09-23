import test from 'node:test';
import assert from 'node:assert/strict';
import { Vector3 } from 'three';
import { DEMO_LEVEL } from '../src/game/levels.ts';
import { canGuardHit, CHECK_DISTANCE, createGuards, hearFootstep, hearLure, hearShot, lockGuard, pathTo, RADIO_CALL_TIME, restrainGuard, safeFloor, updateGuard, WARY_DURATION } from '../src/game/mechanics.ts';
import { createSecurity, updateSecurity } from '../src/game/security.ts';
import { createWorker, lockWorker, restrainWorker, updateWorker, WORKER_CALL_DURATION } from '../src/game/worker.ts';

const v = (x, y, z) => new Vector3(x, y, z);
const hiddenPlayer = v(0, 1.5, 5.5);

/** Demo guards with the unarmed guard moved into Operations, looking at the armed guard's patrol start. */
function colleagueScene() {
  const guards = createGuards();
  guards[1].position.set(-3, 0, -8);
  guards[1].facing = 0;
  return { guards, worker: createWorker(), security: createSecurity() };
}
function run(scene, player, seconds, onEvents = () => {}) {
  for (let i = 0; i < seconds / .05; i++) onEvents(updateSecurity(scene.guards, scene.worker, player, .05, DEMO_LEVEL, scene.security));
}

test('a guard who sees an immobilized colleague walks over and radios it in', () => {
  const scene = colleagueScene();
  const [victim, finder] = scene.guards;
  lockGuard(victim, 12);
  const reports = [];
  let checked = false;
  run(scene, hiddenPlayer, 7, events => {
    reports.push(...events.reports);
    checked ||= finder.mode === 'check';
    assert.equal(safeFloor(finder.position), true, 'checking guard stays out of solids');
  });
  assert.equal(checked, true);
  assert.ok(finder.position.distanceTo(victim.position) <= CHECK_DISTANCE + .05, 'stops beside the colleague');
  assert.deepEqual(reports, [{ guard: 1, reason: 'down' }], 'reported exactly once');
  assert.equal(victim.reported, true);
  assert.ok(scene.security.wary > WARY_DURATION - 7, 'facility is now wary');
  assert.equal(finder.checking, null, 'returns to searching after the report');
});

test('immobilizing the guard mid-call cuts off the radio report', () => {
  const scene = colleagueScene();
  const [victim, finder] = scene.guards;
  lockGuard(victim, 20);
  run(scene, hiddenPlayer, 7, () => { if (finder.radio?.time > RADIO_CALL_TIME / 2) lockGuard(finder, 6); });
  assert.equal(victim.reported, false);
  assert.equal(scene.security.wary, 0);
});

test('a colleague who recovers before discovery reports the attack himself', () => {
  const scene = colleagueScene();
  const [victim, finder] = scene.guards;
  lockGuard(victim, 1);
  const reports = [];
  run(scene, hiddenPlayer, 6, events => reports.push(...events.reports));
  assert.deepEqual(reports, [{ guard: 0, reason: 'attacked' }], 'only the victim radios, once');
  assert.equal(finder.checking, null);
  assert.equal(victim.reported, true);
  assert.ok(scene.security.wary > 0);
});

test('locking a recovered guard again cuts off his attack report', () => {
  const scene = colleagueScene();
  const [victim] = scene.guards;
  scene.guards[1].position.set(4, 0, -16); // out of sight of the victim
  lockGuard(victim, 1);
  const reports = [];
  run(scene, hiddenPlayer, 6, events => {
    reports.push(...events.reports);
    if (victim.radio?.reason === 'attacked' && victim.radio.time > 1) lockGuard(victim, 20);
  });
  assert.deepEqual(reports, []);
  assert.equal(victim.reported, false);
});

test('Restraint needs an immobilized target and binds it for the rest of the mission', () => {
  const guard = createGuards()[0];
  assert.equal(restrainGuard(guard), false, 'a free guard cannot be restrained');
  lockGuard(guard, 6);
  assert.equal(restrainGuard(guard), true);
  const where = guard.position.clone();
  const reports = [];
  const scene = { guards: [guard], worker: createWorker(), security: createSecurity() };
  // Stand in the open where the guard would see and shoot.
  guard.facing = Math.PI;
  run(scene, v(-3, 1.5, -6), 60, events => reports.push(...events.reports));
  assert.equal(guard.mode, 'restrained');
  assert.deepEqual(guard.position, where);
  assert.equal(guard.suspicion, 0);
  assert.deepEqual(reports, [], 'a restrained guard never radios');
  assert.equal(hearFootstep(guard, v(-3, 0, -4), 'walk'), false);
  lockGuard(guard, 6);
  assert.equal(guard.locked, 0, 'Motor Lock has no effect on a bound guard');
  guard.alerted = true;
  assert.equal(canGuardHit(guard, v(-3, 1.5, -6)), false);
});

test('a restrained body can still be discovered and reported', () => {
  const scene = colleagueScene();
  const [victim] = scene.guards;
  lockGuard(victim, 6);
  restrainGuard(victim);
  const reports = [];
  run(scene, hiddenPlayer, 7, events => reports.push(...events.reports));
  assert.deepEqual(reports, [{ guard: 1, reason: 'down' }]);
  assert.equal(victim.reported, true);
});

test('a seated restrained body hides behind low cover where a standing one is seen', () => {
  const discovers = restrained => {
    const guards = createGuards();
    const [victim, finder] = guards;
    // Victim behind the low entry-room crate (1.1 m tall), finder on the other side looking at it.
    victim.position.set(-4.5, 0, 5.5);
    finder.position.set(-4.5, 0, 1); finder.facing = 0;
    lockGuard(victim, 6);
    if (restrained) restrainGuard(victim);
    // The player waits out of view in Research, so the finder's attention is on the body.
    updateSecurity(guards, createWorker(), v(0, 1.5, -16), .05, DEMO_LEVEL, createSecurity());
    return finder.mode === 'check';
  };
  assert.equal(discovers(false), true, 'a frozen, standing guard shows over the crate');
  assert.equal(discovers(true), false, 'a bound, seated guard is hidden by it');
});

test('a restrained worker never reports', () => {
  const worker = createWorker();
  lockWorker(worker, 6);
  assert.equal(restrainWorker(worker), true);
  for (let i = 0; i < 400; i++) updateWorker(worker, v(2.8, 1.5, -12), .05);
  assert.equal(worker.mode, 'restrained');
  assert.ok(worker.report < WORKER_CALL_DURATION);
  lockWorker(worker, 6);
  assert.equal(worker.locked, 0);
});

test('an Echo Lure pulls a checking guard away before the report', () => {
  const scene = colleagueScene();
  const [victim, finder] = scene.guards;
  lockGuard(victim, 20);
  run(scene, hiddenPlayer, .5);
  assert.equal(finder.mode, 'check');
  assert.equal(hearLure(finder, v(-3, 0, -9.5)), true, 'lure behind the guard, toward Research');
  run(scene, hiddenPlayer, 1.5);
  assert.equal(finder.radio, null, 'no call while diverted');
  assert.equal(victim.reported, false);
});

test('an immobilized worker is found and reported the same way', () => {
  const scene = colleagueScene();
  const finder = scene.guards[1];
  finder.position.set(2.8, 0, -11);
  finder.facing = Math.PI;
  lockWorker(scene.worker, 12);
  run(scene, hiddenPlayer, 7);
  assert.equal(scene.worker.reported, true);
  assert.ok(scene.security.wary > 0);
});

test('an armed guard radios confirmed contact and colleagues converge on it', () => {
  const guards = createGuards();
  const scene = { guards, worker: createWorker(), security: createSecurity() };
  guards[0].facing = Math.PI;
  const player = v(-3, 1.5, -6);
  let contact = null;
  run(scene, player, 4, events => {
    if (!contact && events.reports.some(r => r.reason === 'contact')) contact = guards[1].lastSeen?.clone() ?? null;
  });
  assert.ok(contact, 'second guard received the reported position');
  assert.ok(contact.distanceTo(v(-3, 0, -6)) < .01);
  assert.equal(guards[0].radioed, true, 'one report per engagement');
});

test('Motor Lock during a contact call prevents the broadcast', () => {
  const guards = createGuards();
  const scene = { guards, worker: createWorker(), security: createSecurity() };
  guards[0].facing = Math.PI;
  const reports = [];
  run(scene, v(-3, 1.5, -6), 4, events => {
    reports.push(...events.reports);
    if (guards[0].radio?.time > 1) lockGuard(guards[0], 6, v(-3, 0, -6));
  });
  assert.deepEqual(reports, []);
});

test('wary security confirms contact faster', () => {
  const timeToConfirm = wary => {
    const guard = createGuards()[0]; guard.facing = Math.PI;
    for (let i = 1; i < 60; i++) {
      updateGuard(guard, v(-3, 1.5, -6), .05, DEMO_LEVEL, { downed: [], wary });
      if (guard.alerted) return i * .05;
    }
    return Infinity;
  };
  assert.ok(timeToConfirm(true) < timeToConfirm(false) - .3);
});

test('gunfire draws guards who are not already engaged, and walls muffle it', () => {
  const guard = createGuards()[1];
  assert.equal(hearShot(guard, v(-3, 0, -3)), true, 'heard through the Research doorway');
  assert.equal(guard.mode, 'investigate');
  const engaged = createGuards()[1]; engaged.mode = 'alert';
  assert.equal(hearShot(engaged, v(-3, 0, -3)), false);
  const muffled = createGuards()[1]; muffled.position.set(0, 0, -14);
  assert.equal(hearShot(muffled, v(0, 0, -3)), false, 'the Research wall muffles an 11 m shot');
});

test('navigation starts from off-grid positions and walks open floor in straight lines', () => {
  const route = pathTo(v(-3.13, 0, -1.07), v(-4.4, 0, -8.6));
  assert.ok(route.length > 0 && route.length <= 2, `expected a near-straight route, got ${route.length} waypoints`);
  assert.ok(pathTo(v(-1, 0, -4), v(3.5, 0, -5)).length > 0, 'a start inside furniture snaps to nearby floor');
});
