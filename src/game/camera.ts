import { Vector3 } from 'three';
import { DEMO_LEVEL, type Level } from './levels.ts';
import { CROUCH_VISIBILITY, playerExposure, type Optics } from './mechanics.ts';

/**
 * Security cameras sweep a narrow cone on a fixed rhythm and see over low cover from above.
 * They are a readable timing problem rather than extra pressure: slower to flag than a guard,
 * and a flag sends a guard to look instead of raising the alarm.
 */
export const CAMERA_OPTICS: Optics = { range: 9, halfAngle: .45 };
export const CAMERA_DETECTION_TIME = 2;
/** Radians per second across the sweep, and seconds held at each end. */
export const CAMERA_SWEEP_RATE = .35;
export const CAMERA_HOLD = 1.5;
/** After flagging, monitoring is busy dispatching and the camera stops building suspicion. */
export const CAMERA_RESET = 6;

export interface SecurityCamera {
  /** Lens position, a little into the room from its wall mount. */
  position: Vector3;
  /** Centre of the sweep (atan2(x, z) convention, like guards) and how far it turns either side. */
  centre: number; sweep: number;
  facing: number; direction: 1 | -1; hold: number;
  suspicion: number; reset: number;
  /** How much of the player it currently sees (0–1), for the HUD. */
  exposure: number;
}

export function createCameras(level: Level = DEMO_LEVEL): SecurityCamera[] {
  return level.cameras.map(({ position, facing, sweep }) => ({
    position: new Vector3(...position), centre: facing, sweep,
    facing: facing - sweep, direction: 1, hold: 0, suspicion: 0, reset: 0, exposure: 0,
  }));
}

/** Advances the sweep and suspicion. Returns true on the frame the camera flags the player. */
export function updateCamera(camera: SecurityCamera, player: Vector3, dt: number, level: Level = DEMO_LEVEL, crouched = false, veiled = false) {
  if (camera.hold > 0) camera.hold = Math.max(0, camera.hold - dt);
  else {
    camera.facing += camera.direction * CAMERA_SWEEP_RATE * dt;
    const offset = camera.facing - camera.centre;
    if (Math.abs(offset) >= camera.sweep) {
      camera.facing = camera.centre + Math.sign(offset) * camera.sweep;
      camera.direction = -camera.direction as 1 | -1;
      camera.hold = CAMERA_HOLD;
    }
  }
  camera.reset = Math.max(0, camera.reset - dt);
  camera.exposure = veiled ? 0 : playerExposure(camera.position, camera.facing, player, crouched, level, CAMERA_OPTICS);
  if (camera.exposure > 0 && camera.reset === 0) {
    camera.suspicion = Math.min(1, camera.suspicion + dt * camera.exposure * (crouched ? CROUCH_VISIBILITY : 1) / CAMERA_DETECTION_TIME);
    if (camera.suspicion >= 1) {
      camera.suspicion = 0;
      camera.reset = CAMERA_RESET;
      return true;
    }
  } else camera.suspicion = Math.max(0, camera.suspicion - dt * .5);
  return false;
}
