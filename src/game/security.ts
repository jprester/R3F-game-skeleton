import { Vector3 } from 'three';
import { createCameras, updateCamera, type SecurityCamera } from './camera.ts';
import type { Level } from './levels.ts';
import { hearShot, incapacitated, playerExposure, RADIO_CALL_TIME, receiveContact, SEATED_BODY_HEIGHT, STANDING_BODY_HEIGHT, updateGuard, VEIL_BREAK_RANGE, WARY_DURATION, type Downed, type Guard, type RadioCall } from './mechanics.ts';
import type { Worker } from './worker.ts';

/** Facility-wide state shared by the guard force over radio, and the monitored cameras. */
export interface Security { wary: number; cameras: SecurityCamera[] }
export interface SecurityEvents {
  shots: Guard[];
  reports: { guard: number; reason: RadioCall['reason'] }[];
  /** Cameras that flagged the player this frame, and the guard sent to check (-1 if none was free). */
  cameraFlags: { camera: number; dispatched: number }[];
}
/** How the player presents to observers this frame. */
export interface Observed { crouched?: boolean; veiled?: boolean }

export const createSecurity = (level?: Level): Security => ({ wary: 0, cameras: level ? createCameras(level) : [] });

/** Veil holds unless a conscious guard or the worker within reach can actually see the player. */
export function veilPierced(guards: Guard[], worker: Worker, player: Vector3, crouched: boolean, level: Level) {
  const sees = (position: Vector3, eyeHeight: number, facing: number) => {
    const eye = position.clone().setY(eyeHeight);
    return eye.distanceTo(player) <= VEIL_BREAK_RANGE && playerExposure(eye, facing, player, crouched, level) > 0;
  };
  return guards.some(g => !incapacitated(g) && sees(g.position, 1.65, g.facing))
    || (worker.locked <= 0 && !worker.restrained && sees(worker.position, 1.55, worker.facing));
}

/** The closest guard free to check a camera flag: conscious and not already engaged with the player. */
function nearestFreeGuard(guards: Guard[], to: Vector3) {
  let best = -1, distance = Infinity;
  guards.forEach((g, index) => {
    if (incapacitated(g) || g.mode === 'alert' || g.mode === 'suspicious') return;
    const d = g.position.distanceTo(to);
    if (d < distance) { distance = d; best = index; }
  });
  return best;
}

export function downedList(guards: Guard[], worker: Worker): Downed[] {
  const downed: Downed[] = guards.flatMap((g, index) => incapacitated(g)
    ? [{ kind: 'guard' as const, index, position: g.position, reported: g.reported, height: g.restrained ? SEATED_BODY_HEIGHT : STANDING_BODY_HEIGHT }] : []);
  if (worker.locked > 0 || worker.restrained) {
    downed.push({ kind: 'worker', index: 0, position: worker.position, reported: worker.reported, height: worker.restrained ? SEATED_BODY_HEIGHT : STANDING_BODY_HEIGHT });
  }
  return downed;
}

/**
 * Advances every guard, then resolves what they share: gunfire is heard by colleagues,
 * a completed contact call converges the others on the reported position, and a
 * completed downed-colleague or recovered-guard call puts the whole facility on wary footing.
 */
export function updateSecurity(guards: Guard[], worker: Worker, player: Vector3, dt: number, level: Level, security: Security, observed: Observed = {}): SecurityEvents {
  const { crouched = false, veiled = false } = observed;
  security.wary = Math.max(0, security.wary - dt);
  const context = { downed: downedList(guards, worker), wary: security.wary > 0, crouched, veiled };
  const events: SecurityEvents = { shots: [], reports: [], cameraFlags: [] };
  security.cameras.forEach((camera, index) => {
    if (!updateCamera(camera, player, dt, level, crouched, veiled)) return;
    // Monitoring sends someone to look; it does not raise the alarm.
    const spot = new Vector3(player.x, 0, player.z);
    const dispatched = nearestFreeGuard(guards, spot);
    if (dispatched >= 0) receiveContact(guards[dispatched], spot);
    security.wary = WARY_DURATION;
    events.cameraFlags.push({ camera: index, dispatched });
  });
  for (const guard of guards) if (updateGuard(guard, player, dt, level, context)) events.shots.push(guard);
  for (const shooter of events.shots) {
    for (const guard of guards) if (guard !== shooter) hearShot(guard, shooter.position, level);
  }
  guards.forEach((guard, index) => {
    const call = guard.radio;
    if (!call || call.time < RADIO_CALL_TIME) return;
    guard.radio = null;
    security.wary = WARY_DURATION;
    if (call.reason === 'contact') {
      guard.radioed = true;
      for (const other of guards) if (other !== guard) receiveContact(other, call.position);
    } else if (call.reason === 'attacked') guard.reported = true;
    else if (call.victim?.kind === 'worker') worker.reported = true;
    else if (call.victim) guards[call.victim.index].reported = true;
    events.reports.push({ guard: index, reason: call.reason });
  });
  return events;
}
