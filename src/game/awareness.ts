import type { Vector3 } from 'three';
import { RADIO_CALL_TIME, type Guard, type RadioCall } from './mechanics.ts';
import type { Worker } from './worker.ts';
import { CAMERA_RESET, type SecurityCamera } from './camera.ts';

/** A camera shows as dispatching for this long after it flags the player. */
const CAMERA_FLAG_SHOWN = 2;
const cameraFlagging = (camera: SecurityCamera) => camera.reset > CAMERA_RESET - CAMERA_FLAG_SHOWN;

/** Most urgent first: alert beats an active radio call beats an investigation beats a glance. */
export type ThreatState = 'alert' | 'radio' | 'investigating' | 'suspicious';
export interface Threat { id: string; angle: number; level: number; state: ThreatState }

/**
 * Where a world point sits around the crosshair: 0 is straight ahead, positive is clockwise
 * (to the right), ±π is directly behind. `yaw` is the camera yaw; at yaw 0 the camera looks down -z.
 */
export function screenAngle(from: Vector3, yaw: number, to: Vector3) {
  const relative = Math.atan2(to.x - from.x, to.z - from.z) - (yaw + Math.PI);
  return -Math.atan2(Math.sin(relative), Math.cos(relative));
}

function guardThreat(g: Guard): Omit<Threat, 'id' | 'angle'> | null {
  if (g.locked > 0 || g.restrained) return null;
  if (g.alerted) return { state: 'alert', level: 1 };
  if (g.radio) return { state: 'radio', level: Math.min(1, g.radio.time / RADIO_CALL_TIME) };
  if (g.mode === 'investigate' || g.mode === 'search' || g.mode === 'check') return { state: 'investigating', level: Math.max(.5, g.suspicion) };
  if (g.suspicion > .01 || g.glance > 0) return { state: 'suspicious', level: Math.max(.15, g.suspicion) };
  return null;
}

function workerThreat(w: Worker): Omit<Threat, 'id' | 'angle'> | null {
  if (w.locked > 0 || w.restrained) return null;
  if (w.mode === 'fleeing' || w.mode === 'calling') return { state: 'alert', level: 1 };
  if (w.suspicion > .01) return { state: 'suspicious', level: Math.max(.15, w.suspicion) };
  return null;
}

function cameraThreat(camera: SecurityCamera): Omit<Threat, 'id' | 'angle'> | null {
  if (cameraFlagging(camera)) return { state: 'radio', level: 1 };
  if (camera.suspicion > .01) return { state: 'suspicious', level: Math.max(.15, camera.suspicion) };
  return null;
}

/** One screen-edge indicator per guard, worker or camera whose attention is on the player, wherever they are. */
export function threats(guards: Guard[], worker: Worker, from: Vector3, yaw: number, cameras: SecurityCamera[] = []): Threat[] {
  const list: Threat[] = [];
  guards.forEach((g, index) => {
    const threat = guardThreat(g);
    if (threat) list.push({ id: `guard-${index}`, angle: screenAngle(from, yaw, g.position), ...threat });
  });
  const threat = workerThreat(worker);
  if (threat) list.push({ id: 'worker', angle: screenAngle(from, yaw, worker.position), ...threat });
  cameras.forEach((camera, index) => {
    const threat = cameraThreat(camera);
    if (threat) list.push({ id: `camera-${index}`, angle: screenAngle(from, yaw, camera.position), ...threat });
  });
  return list;
}

/** The radio call closest to completing, if any guard is calling. */
export const leadingCall = (guards: Guard[]) =>
  guards.reduce<RadioCall | null>((best, g) => g.radio && (!best || g.radio.time > best.time) ? g.radio : best, null);

/** The single most urgent security state, for the label above the detection meter. */
export function awarenessLabel(guards: Guard[], worker: Worker, wary: number, cameras: SecurityCamera[] = []) {
  const call = leadingCall(guards);
  const investigating = (clue: 'lastSeen' | 'lastHeard') => guards.some(g => (g.mode === 'investigate' || g.mode === 'search') && g[clue]);
  return guards.some(g => g.alarm > 0) ? 'ALARM CALL' :
    worker.mode === 'calling' ? 'WORKER REPORT' :
    call ? (call.reason === 'contact' ? 'RADIO · CONTACT REPORT' : call.reason === 'attacked' ? 'RADIO · GUARD REPORTING ATTACK' : 'RADIO · COLLEAGUE DOWN') :
    cameras.some(cameraFlagging) ? 'CAMERA FLAG · GUARD SENT TO CHECK' :
    worker.mode === 'fleeing' ? 'WORKER RUNNING TO ALARM' :
    guards.some(g => g.mode === 'alert') ? 'CONTACT CONFIRMED' :
    guards.some(g => g.mode === 'check') ? 'GUARD CHECKING A COLLEAGUE' :
    investigating('lastSeen') ? 'INVESTIGATING LAST CONTACT' :
    investigating('lastHeard') ? 'INVESTIGATING A SOUND' :
    guards.some(g => g.mode === 'suspicious') ? 'SECURITY ATTENTION' :
    cameras.some(camera => camera.suspicion > .01) ? 'CAMERA TRACKING' :
    worker.mode === 'noticed' ? 'WORKER NOTICED MOVEMENT' :
    wary > 0 ? 'SECURITY WARY' : '';
}
