import { Box3, Ray, Vector3 } from 'three';

export type Position = [number, number, number];
export interface Solid { position: Position; size: Position; color: string }
const box = (position: Position, size: Position, color = '#666f75'): Solid => ({ position, size, color });
// One source of truth for visible architecture, collision and visibility queries.
export const solids: Solid[] = [
  box([0, -.15, -5], [12, .3, 26], '#343c42'),
  box([0, 3.7, -5], [12, .2, 26], '#52606a'),
  box([-6, 1.8, -5], [.25, 3.6, 26]), box([6, 1.8, -5], [.25, 3.6, 26]),
  box([0, 1.8, 8], [12, 3.6, .25]), box([0, 1.8, -18], [12, 3.6, .25]),
  ...[0, -10].flatMap(z => [
    box([-5.1, 1.8, z], [1.8, 3.6, .25]),
    box([0, 1.8, z], [5, 3.6, .25]),
    box([5.1, 1.8, z], [1.8, 3.6, .25]),
    box([-3.35, 3.2, z], [1.7, .8, .25]), box([3.35, 3.2, z], [1.7, .8, .25]),
  ]),
  box([1.8, 1.8, -5], [.2, 3.6, 6], '#46545e'),
  box([-1, .75, -4], [2.2, 1.5, 1], '#38454e'),
  box([-1, .75, -7], [2.2, 1.5, 1], '#38454e'),
  box([-5.3, 1.1, -5], [.8, 2.2, 3], '#29343e'),
  box([0, .6, -16], [1.6, 1.2, 1.2], '#273b48'),
  box([-4.7, 1.1, -16], [1.5, 2.2, 2], '#29343e'),
  box([-4.5, .55, 4], [2, 1.1, 1], '#38454e'),
];
export const bounds = solids.map(s => new Box3().setFromCenterAndSize(new Vector3(...s.position), new Vector3(...s.size)));
export const SPAWN: Position = [0, .91, 5.5];
export const ARTIFACT = new Vector3(0, 1.65, -16);
export const EXTRACTION = new Vector3(0, 0, 5.5);
export const BLINK_RANGE = 7;
export const LOCK_RANGE = 10;
export const LOCK_DURATION = 6;
export const BLINK_COOLDOWN = 3;
export const LOCK_COOLDOWN = 4;

export function clearSight(from: Vector3, to: Vector3) {
  const delta = to.clone().sub(from);
  const distance = delta.length();
  if (distance < .001) return true;
  const ray = new Ray(from, delta.normalize());
  const hit = new Vector3();
  return !bounds.some(b => ray.intersectBox(b, hit) && hit.distanceTo(from) < distance - .05);
}
export function seesPlayer(eye: Vector3, facing: number, player: Vector3) {
  const delta = player.clone().sub(eye);
  if (delta.length() > 10) return false;
  const horizontal = Math.hypot(delta.x, delta.z);
  const dot = horizontal < .001 ? 1 : (Math.sin(facing) * delta.x + Math.cos(facing) * delta.z) / horizontal;
  return dot > Math.cos(Math.PI / 3) && clearSight(eye, player);
}
export function safeFloor(point: Vector3) {
  if (Math.abs(point.x) > 5.5 || point.z < -17.5 || point.z > 7.5) return false;
  const volume = new Box3().setFromCenterAndSize(new Vector3(point.x, .92, point.z), new Vector3(.7, 1.78, .7));
  return !bounds.some(b => volume.intersectsBox(b));
}
export interface Guard {
  position: Vector3; route: Vector3[]; waypoint: number; facing: number;
  suspicion: number; alarm: number; locked: number; alerted: boolean;
  lastSeen: Vector3 | null; search: number;
}
export function createGuards(): Guard[] {
  return [ [[-3, 0, -3], [-3, 0, -8]], [[-2.8, 0, -13], [3, 0, -13]] ].map(route => ({
    position: new Vector3(...route[0]), route: route.map(p => new Vector3(...p)), waypoint: 1,
    facing: Math.atan2(route[1][0] - route[0][0], route[1][2] - route[0][2]),
    suspicion: 0, alarm: 0, locked: 0, alerted: false, lastSeen: null, search: 0,
  }));
}
export function updateGuard(g: Guard, player: Vector3, dt: number) {
  if (g.locked > 0) { g.locked = Math.max(0, g.locked - dt); g.alarm = 0; return; }
  const visible = seesPlayer(g.position.clone().add(new Vector3(0, 1.65, 0)), g.facing, player);
  if (visible) {
    g.lastSeen = new Vector3(player.x, 0, player.z);
    g.suspicion = Math.min(1, g.suspicion + dt / 1.2);
    if (g.suspicion >= 1) g.alerted = true;
    g.search = 4;
  } else { g.suspicion = Math.max(0, g.suspicion - dt * .25); }
  if (g.alerted && visible) g.alarm += dt;
  else g.alarm = Math.max(0, g.alarm - dt * 2);
  if (visible || g.search > 0) {
    const target = g.lastSeen;
    if (target) g.facing = Math.atan2(target.x - g.position.x, target.z - g.position.z);
    // First prototype: investigate by watching the last contact, without unvalidated pathfinding.
    if (!visible) g.search = Math.max(0, g.search - dt);
    return;
  }
  g.alerted = false;
  const target = g.route[g.waypoint];
  const delta = target.clone().sub(g.position);
  if (delta.length() < .08) g.waypoint = (g.waypoint + 1) % g.route.length;
  else { const step = Math.min(dt * .85, delta.length()); g.facing = Math.atan2(delta.x, delta.z); g.position.addScaledVector(delta.normalize(), step); }
}
