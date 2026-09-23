import { Vector3 } from 'three';
import { pathTo, playerExposure, sightRate } from './mechanics.ts';
import { DEMO_LEVEL, type Level } from './levels.ts';

export const WORKER_START = new Vector3(...DEMO_LEVEL.worker.start);
export const WORKER_ALARM_POINT = new Vector3(...DEMO_LEVEL.worker.alarm);
export const WORKER_CALL_DURATION = 4;

export interface Worker {
  position: Vector3;
  alarmPoint: Vector3;
  facing: number;
  suspicion: number;
  locked: number;
  witnessed: boolean;
  route: Vector3[];
  report: number;
  /** This incapacitation has already been radioed in by security. */
  reported: boolean;
  /** Bound for the rest of the mission; never recovers. */
  restrained: boolean;
  /** How much of the player the worker currently sees (0–1), for the HUD. */
  exposure: number;
  mode: 'working' | 'noticed' | 'fleeing' | 'calling' | 'locked' | 'restrained';
}

export function createWorker(level: Level = DEMO_LEVEL): Worker {
  return {
    position: new Vector3(...level.worker.start), alarmPoint: new Vector3(...level.worker.alarm), facing: level.worker.facing,
    suspicion: 0, locked: 0, witnessed: false, route: [], report: 0, reported: false, restrained: false, exposure: 0,
    mode: 'working',
  };
}

export function lockWorker(worker: Worker, duration: number) {
  if (worker.restrained) return;
  if (worker.locked <= 0) worker.reported = false;
  worker.locked = Math.max(worker.locked, duration);
  worker.report = 0;
  worker.mode = 'locked';
}

/** Binds an immobilized worker for the rest of the mission, ending any report for good. */
export function restrainWorker(worker: Worker) {
  if (worker.locked <= 0 || worker.restrained) return false;
  worker.restrained = true;
  worker.locked = 0; worker.report = 0; worker.route = []; worker.mode = 'restrained';
  return true;
}

export function updateWorker(worker: Worker, player: Vector3, dt: number, level: Level = DEMO_LEVEL, crouched = false, veiled = false) {
  worker.exposure = 0;
  if (worker.restrained) return;
  if (worker.locked > 0) {
    worker.locked = Math.max(0, worker.locked - dt);
    worker.report = 0;
    worker.mode = 'locked';
    return;
  }
  if (!worker.witnessed) {
    const eye = worker.position.clone().add(new Vector3(0, 1.55, 0));
    worker.exposure = veiled ? 0 : playerExposure(eye, worker.facing, player, crouched, level);
    const rate = sightRate(eye, worker.facing, player, crouched, level, worker.exposure);
    if (rate > 0) {
      worker.suspicion = Math.min(1, worker.suspicion + dt * rate / .7);
      worker.mode = 'noticed';
      if (worker.suspicion >= 1) {
        worker.witnessed = true;
        worker.route = pathTo(worker.position, worker.alarmPoint, level);
        worker.mode = 'fleeing';
      }
    } else {
      worker.suspicion = Math.max(0, worker.suspicion - dt * .7);
      worker.mode = worker.suspicion > 0 ? 'noticed' : 'working';
    }
    if (!worker.witnessed) return;
  }
  if (worker.position.distanceTo(worker.alarmPoint) < .7) {
    worker.mode = 'calling';
    worker.facing = -Math.PI / 2;
    worker.report = Math.min(WORKER_CALL_DURATION, worker.report + dt);
    return;
  }
  worker.mode = 'fleeing';
  if (worker.route.length === 0) worker.route = pathTo(worker.position, worker.alarmPoint, level);
  if (worker.route.length === 0) return;
  const delta = worker.route[0].clone().sub(worker.position);
  const distance = delta.length();
  if (distance < .04) { worker.route.shift(); return; }
  worker.facing = Math.atan2(delta.x, delta.z);
  worker.position.addScaledVector(delta.normalize(), Math.min(distance, dt * 2.2));
}
