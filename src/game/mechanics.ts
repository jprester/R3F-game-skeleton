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
export const SEEKER_RANGE = 14;
export const SEEKER_COOLDOWN = 9;
export const SEEKER_LOCK_DURATION = 10;
export const SEEKER_SPEED = 5;
export const GUARD_STRIDE = .56;

/** Walk distance drives the sound, so a stationary or immobilized guard stays quiet. */
export function advanceFootsteps(distanceSinceStep: number, distanceMoved: number) {
  const total = distanceSinceStep + Math.max(0, distanceMoved);
  const count = Math.floor((total + 1e-8) / GUARD_STRIDE);
  return { distanceSinceStep: total - count * GUARD_STRIDE, count };
}
const GUARD_RADIUS = .34;
const CELL = .5;
const GRID_MIN_X = -5.5;
const GRID_MIN_Z = -17.5;
const GRID_WIDTH = 23;
const GRID_DEPTH = 51;
const STEP_DIRECTIONS: [number, number][] = [[1, 0], [-1, 0], [0, 1], [0, -1]];

function walkable(x: number, z: number) {
  if (Math.abs(x) > 5.5 || z < -17.5 || z > 7.5) return false;
  const minX = x - GUARD_RADIUS, maxX = x + GUARD_RADIUS;
  const minZ = z - GUARD_RADIUS, maxZ = z + GUARD_RADIUS;
  return !bounds.some(b => b.max.y > .2 && b.min.y < 1.7 &&
    minX < b.max.x && maxX > b.min.x && minZ < b.max.z && maxZ > b.min.z);
}

const navCells = Array.from({ length: GRID_WIDTH * GRID_DEPTH }, (_, index) => {
  const x = GRID_MIN_X + (index % GRID_WIDTH) * CELL;
  const z = GRID_MIN_Z + Math.floor(index / GRID_WIDTH) * CELL;
  return walkable(x, z) ? new Vector3(x, 0, z) : null;
});

function closestCell(position: Vector3) {
  let nearest = -1;
  let distance = Infinity;
  navCells.forEach((cell, index) => {
    if (!cell) return;
    const d = cell.distanceToSquared(position);
    if (d < distance) { distance = d; nearest = index; }
  });
  return nearest;
}

/** Returns a route through the authored doorways, avoiding furniture and walls. */
export function pathTo(start: Vector3, goal: Vector3): Vector3[] {
  const first = closestCell(start), last = closestCell(goal);
  if (first < 0 || last < 0) return [];
  const queue = [first];
  const cameFrom = new Int32Array(navCells.length).fill(-1);
  cameFrom[first] = first;
  for (let head = 0; head < queue.length && cameFrom[last] < 0; head++) {
    const index = queue[head], col = index % GRID_WIDTH, row = Math.floor(index / GRID_WIDTH);
    for (const [dx, dz] of STEP_DIRECTIONS) {
      const nx = col + dx, nz = row + dz;
      if (nx < 0 || nx >= GRID_WIDTH || nz < 0 || nz >= GRID_DEPTH) continue;
      const next = nz * GRID_WIDTH + nx;
      if (!navCells[next] || cameFrom[next] >= 0) continue;
      cameFrom[next] = index;
      queue.push(next);
    }
  }
  if (cameFrom[last] < 0) return [];
  const route: Vector3[] = [];
  for (let step = last; step !== first; step = cameFrom[step]) route.push(navCells[step]!.clone());
  route.reverse();
  return route;
}

export function clearSight(from: Vector3, to: Vector3) {
  const delta = to.clone().sub(from);
  const distance = delta.length();
  if (distance < .001) return true;
  const ray = new Ray(from, delta.normalize());
  const hit = new Vector3();
  return !bounds.some(b => ray.intersectBox(b, hit) && hit.distanceTo(from) < distance - .05);
}
export interface SeekerFlight {
  position: Vector3;
  targetIndex: number;
  route: Vector3[];
  replan: number;
  life: number;
}

export function advanceSeeker(flight: SeekerFlight, target: Vector3, dt: number): 'flying' | 'hit' | 'expired' {
  flight.life -= dt;
  if (flight.life <= 0) return 'expired';
  const goal = new Vector3(target.x, 1.25, target.z);
  if (flight.position.distanceTo(goal) < .3) return 'hit';
  flight.replan -= dt;
  if (clearSight(flight.position, goal)) flight.route = [];
  else if (flight.replan <= 0 || flight.route.length === 0) {
    flight.route = pathTo(new Vector3(flight.position.x, 0, flight.position.z), target);
    flight.replan = .3;
    if (flight.route.length === 0) return 'expired';
  }
  let remaining = SEEKER_SPEED * dt;
  while (remaining > 0) {
    const waypoint = flight.route.length > 0
      ? new Vector3(flight.route[0].x, 1.25, flight.route[0].z) : goal;
    const distance = flight.position.distanceTo(waypoint);
    if (distance < .001) {
      if (flight.route.length) flight.route.shift();
      else break;
      continue;
    }
    const step = Math.min(remaining, distance);
    flight.position.addScaledVector(waypoint.sub(flight.position).normalize(), step);
    remaining -= step;
    if (step >= distance - .001 && flight.route.length) flight.route.shift();
    else break;
  }
  return flight.position.distanceTo(goal) < .3 ? 'hit' : 'flying';
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
  lastSeen: Vector3 | null; search: number; investigation: Vector3[];
  mode: 'patrol' | 'suspicious' | 'alert' | 'investigate' | 'search' | 'locked';
}
export function createGuards(): Guard[] {
  return [ [[-3, 0, -3], [-3, 0, -8]], [[-2.8, 0, -13], [3, 0, -13]] ].map(route => ({
    position: new Vector3(...route[0]), route: route.map(p => new Vector3(...p)), waypoint: 1,
    facing: Math.atan2(route[1][0] - route[0][0], route[1][2] - route[0][2]),
    suspicion: 0, alarm: 0, locked: 0, alerted: false, lastSeen: null, search: 0,
    investigation: [], mode: 'patrol' as const,
  }));
}
function moveToward(g: Guard, target: Vector3, speed: number, dt: number) {
  const delta = target.clone().sub(g.position);
  if (delta.length() < .01) return true;
  const step = Math.min(dt * speed, delta.length());
  g.facing = Math.atan2(delta.x, delta.z);
  g.position.addScaledVector(delta.normalize(), step);
  return false;
}
export function updateGuard(g: Guard, player: Vector3, dt: number) {
  if (g.locked > 0) { g.locked = Math.max(0, g.locked - dt); g.alarm = 0; g.mode = 'locked'; return; }
  const visible = seesPlayer(g.position.clone().add(new Vector3(0, 1.65, 0)), g.facing, player);
  if (visible) {
    g.lastSeen = new Vector3(player.x, 0, player.z);
    g.investigation = [];
    g.suspicion = Math.min(1, g.suspicion + dt / 1.2);
    if (g.suspicion >= 1) g.alerted = true;
    g.search = 4;
    g.mode = g.alerted ? 'alert' : 'suspicious';
    g.facing = Math.atan2(player.x - g.position.x, player.z - g.position.z);
  } else { g.suspicion = Math.max(0, g.suspicion - dt * .25); }
  if (g.alerted && visible) g.alarm += dt;
  else g.alarm = Math.max(0, g.alarm - dt * 2);
  if (visible) return;
  if (g.lastSeen && g.search > 0) {
    if (g.investigation.length === 0 && g.mode !== 'search') g.investigation = pathTo(g.position, g.lastSeen);
    if (g.investigation.length > 0) {
      g.mode = 'investigate';
      if (moveToward(g, g.investigation[0], 1.2, dt)) g.investigation.shift();
      return;
    }
    g.mode = 'search';
    g.search = Math.max(0, g.search - dt);
    g.facing += Math.sin(g.search * 2) * dt * .65;
    return;
  }
  const target = g.route[g.waypoint];
  if (g.mode !== 'patrol') g.investigation = pathTo(g.position, target);
  g.lastSeen = null;
  g.alerted = false;
  g.mode = 'patrol';
  if (g.investigation.length > 0) {
    if (moveToward(g, g.investigation[0], .85, dt)) g.investigation.shift();
    return;
  }
  if (moveToward(g, target, .85, dt)) g.waypoint = (g.waypoint + 1) % g.route.length;
}
