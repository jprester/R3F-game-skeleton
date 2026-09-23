import test from 'node:test';
import assert from 'node:assert/strict';
import { Vector3 } from 'three';
import { DEMO_LEVEL } from '../src/game/levels.ts';
import { canGuardHit, CROUCH_EYE_OFFSET, createGuards, GLANCE_TIME, hearFootstep, INVESTIGATE_AT, playerExposure, sightRate, STAND_EYE_OFFSET, updateGuard } from '../src/game/mechanics.ts';

const v = (x, y, z) => new Vector3(x, y, z);
const BODY_Y = .91;
const standing = (x, z) => v(x, BODY_Y + STAND_EYE_OFFSET, z);
const crouching = (x, z) => v(x, BODY_Y + CROUCH_EYE_OFFSET, z);
// A guard in Operations looking down the room at the 1.5 m desk at (-1, -4).
const guardEye = v(-1, 1.65, -1);
const facingDesk = Math.PI;

test('a desk hides a crouched player and all but the head of a standing one', () => {
  assert.equal(playerExposure(guardEye, facingDesk, standing(-1, -5.3), false), .25, 'head shows over the desk');
  assert.equal(playerExposure(guardEye, facingDesk, crouching(-1, -5.3), true), 0);
  assert.equal(playerExposure(guardEye, facingDesk, standing(-3.5, -5.3), false), 1, 'in the open everything shows');
});

test('peripheral vision, distance and crouching each slow confirmation', () => {
  const eye = v(-3, 1.65, -8.5);
  const ahead = sightRate(eye, 0, standing(-3, -5.5), false);
  assert.equal(ahead, 1, 'close and head-on is full speed');
  assert.ok(sightRate(eye, .7, standing(-3, -5.5), false) < ahead, 'off to the side is slower');
  assert.ok(sightRate(eye, 0, standing(-3, 1), false) < .6, 'near the edge of range is slower');
  assert.ok(sightRate(eye, 0, crouching(-3, -5.5), true) < ahead, 'a crouched silhouette is slower');
});

test('crouching behind cover prevents confirmation; standing there is only delayed', () => {
  const timeToConfirm = (player, crouched) => {
    const guard = createGuards()[0];
    guard.position.set(-1, 0, -1); guard.route = [guard.position.clone(), guard.position.clone()];
    guard.facing = facingDesk;
    for (let i = 1; i <= 200; i++) {
      updateGuard(guard, player, .05, DEMO_LEVEL, { downed: [], wary: false, crouched });
      if (guard.alerted) return i * .05;
    }
    return Infinity;
  };
  assert.equal(timeToConfirm(crouching(-1, -5.3), true), Infinity);
  const behindDesk = timeToConfirm(standing(-1, -5.3), false);
  const inTheOpen = timeToConfirm(standing(-3.5, -5.3), false);
  assert.ok(Number.isFinite(behindDesk) && behindDesk > inTheOpen * 2, `head above cover confirms slower (${behindDesk}s vs ${inTheOpen}s)`);
});

test('full cover also stops gunfire; any exposed part can be hit', () => {
  const guard = createGuards()[0];
  guard.position.set(-1, 0, -1); guard.facing = facingDesk; guard.alerted = true;
  assert.equal(canGuardHit(guard, crouching(-1, -5.3), DEMO_LEVEL, true), false);
  assert.equal(canGuardHit(guard, standing(-1, -5.3), DEMO_LEVEL, false), true);
});

test('crouched movement is the quietest gait', () => {
  const guard = createGuards()[0];
  const at = distance => v(guard.position.x, 0, guard.position.z + distance);
  assert.equal(hearFootstep(guard, at(1.3), 'crouch'), false);
  assert.equal(hearFootstep(createGuards()[0], at(1.3), 'quiet'), true);
  assert.equal(hearFootstep(createGuards()[0], at(.8), 'crouch'), true, 'still audible right beside a guard');
});

/** A stationary guard in Operations facing the desk, shown the player for `seconds`, then left alone. */
function glimpse(seconds, { wary = false, player = standing(-3.5, -5.3), crouched = false } = {}) {
  const guard = createGuards()[0];
  guard.position.set(-1, 0, -1); guard.route = [guard.position.clone(), guard.position.clone()];
  guard.facing = facingDesk;
  const context = { downed: [], wary, crouched };
  for (let t = 0; t < seconds; t += .05) updateGuard(guard, player, .05, DEMO_LEVEL, context);
  const peak = guard.suspicion;
  const start = guard.position.clone();
  let maxMove = 0, glanced = false;
  for (let t = 0; t < GLANCE_TIME + 3; t += .05) {
    updateGuard(guard, v(0, 1.5, 5.5), .05, DEMO_LEVEL, context);
    glanced ||= guard.glance > 0;
    maxMove = Math.max(maxMove, guard.position.distanceTo(start));
  }
  return { peak, glanced, investigated: maxMove > .5, guard };
}

test('a brief glimpse earns a glance, not an investigation', () => {
  const { peak, glanced, investigated, guard } = glimpse(.25);
  assert.ok(peak > 0 && peak < INVESTIGATE_AT, `peak suspicion ${peak}`);
  assert.equal(glanced, true);
  assert.equal(investigated, false, 'guard stays at his post');
  assert.equal(guard.mode, 'patrol', 'and resumes patrol afterward');
});

test('a longer look past the threshold sends the guard to investigate', () => {
  const { peak, investigated } = glimpse(1);
  assert.ok(peak >= INVESTIGATE_AT);
  assert.equal(investigated, true);
});

test('wary security investigates the same glimpse that calm security only glances at', () => {
  assert.equal(glimpse(.4).investigated, false);
  assert.equal(glimpse(.4, { wary: true }).investigated, true);
});

test('crouched peeking past cover stays below the investigate threshold for seconds; standing does not', () => {
  // One shoulder past the end of the Quiet Entry desk, 4.7 m from the guard.
  const crouchedPeek = glimpse(3, { player: crouching(-2.8, -5.3), crouched: true });
  assert.ok(crouchedPeek.peak < INVESTIGATE_AT, `crouched peak suspicion ${crouchedPeek.peak}`);
  assert.equal(crouchedPeek.investigated, false);
  assert.equal(glimpse(3, { player: standing(-2.8, -5.3) }).investigated, true, 'standing at the same spot draws him over');
});

test('suspicious guards turn toward a glimpse gradually', () => {
  const guard = createGuards()[0];
  guard.position.set(-1, 0, -1); guard.route = [guard.position.clone(), guard.position.clone()];
  guard.facing = Math.PI + 1; // 57 degrees off, still inside the view cone
  updateGuard(guard, standing(-1, -5.3), .05);
  assert.ok(Math.abs(guard.facing - (Math.PI + 1)) < .2, 'no instant snap');
});

test('reciprocity: a shoulder past a corner the player cannot see around never gives them away', async () => {
  const { ANNEX_LEVEL: level } = await import('../src/game/levels.ts');
  const { clearSight, safeFloor } = await import('../src/game/mechanics.ts');
  const eyes = createGuards(level).flatMap(g => [0, .5, 1].map(t => g.route[0].clone().lerp(g.route[1], t).setY(1.65)));
  let cornerPeeks = 0;
  for (let x = level.area.minX; x <= level.area.maxX; x += .5) for (let z = level.area.minZ; z <= level.area.maxZ; z += .5) {
    if (!safeFloor(v(x, 0, z), level)) continue;
    const head = v(x, 1.01, z);
    for (const eye of eyes) {
      if (head.distanceTo(eye) > 10 || clearSight(eye, head, level) || clearSight(eye, v(x, .66, z), level)) continue;
      const across = v(head.z - eye.z, 0, eye.x - head.x).normalize().multiplyScalar(.24);
      const shoulder = head.clone().setY(.76);
      if (!clearSight(eye, shoulder.clone().add(across), level) && !clearSight(eye, shoulder.clone().sub(across), level)) continue;
      cornerPeeks++;
      assert.equal(playerExposure(eye, Math.atan2(head.x - eye.x, head.z - eye.z), head, true, level), 0, `shoulder leak at ${x}, ${z}`);
    }
  }
  assert.ok(cornerPeeks > 50, `the scenario is common in the Records Wing (${cornerPeeks} cases)`);
});
