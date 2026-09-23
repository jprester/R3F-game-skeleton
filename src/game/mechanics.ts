import { Box3, Ray, Vector3 } from 'three';
import { DEMO_LEVEL, type Level } from './levels.ts';

// Keep the demo defaults available to the small mechanics tests and prototype tools.
export const solids = DEMO_LEVEL.solids;
export const bounds = DEMO_LEVEL.bounds;
export const SPAWN = DEMO_LEVEL.spawn;
export const ARTIFACT = new Vector3(...DEMO_LEVEL.artifact);
export const EXTRACTION = new Vector3(...DEMO_LEVEL.extraction);
export const BLINK_RANGE = 7;
export const LOCK_RANGE = 10;
export const LOCK_DURATION = 6;
export const BLINK_COOLDOWN = 3;
export const LOCK_COOLDOWN = 4;
export const SEEKER_RANGE = 14;
export const SEEKER_COOLDOWN = 9;
export const SEEKER_LOCK_DURATION = 10;
export const SEEKER_SPEED = 5;
export const LURE_RANGE = 12;
export const LURE_COOLDOWN = 8;
export const LURE_HEARING_RANGE = 8;
export const GUARD_STRIDE = .56;
export const WALK_HEARING_RANGE = 5;
export const QUIET_HEARING_RANGE = 1.5;
export const SHOT_WINDUP = .6;
export const SHOT_COOLDOWN = 1;
export const PLAYER_MAX_HEALTH = 3;

/** Walk distance drives the sound, so a stationary or immobilized guard stays quiet. */
export function advanceFootsteps(distanceSinceStep: number, distanceMoved: number) {
  const total = distanceSinceStep + Math.max(0, distanceMoved);
  const count = Math.floor((total + 1e-8) / GUARD_STRIDE);
  return { distanceSinceStep: total - count * GUARD_STRIDE, count };
}
const GUARD_RADIUS = .34;
const CELL = .5;
const STEP_DIRECTIONS: [number, number][] = [[1, 0], [-1, 0], [0, 1], [0, -1]];

function walkable(x: number, z: number, level: Level) {
  if (x < level.area.minX || x > level.area.maxX || z < level.area.minZ || z > level.area.maxZ) return false;
  const minX = x - GUARD_RADIUS, maxX = x + GUARD_RADIUS;
  const minZ = z - GUARD_RADIUS, maxZ = z + GUARD_RADIUS;
  return !level.bounds.some(b => b.max.y > .2 && b.min.y < 1.7 &&
    minX < b.max.x && maxX > b.min.x && minZ < b.max.z && maxZ > b.min.z);
}

const navCache = new WeakMap<Level, { cells: (Vector3 | null)[]; width: number; depth: number }>();
function navigation(level: Level) {
  let nav = navCache.get(level);
  if (nav) return nav;
  const width = Math.round((level.area.maxX - level.area.minX) / CELL) + 1;
  const depth = Math.round((level.area.maxZ - level.area.minZ) / CELL) + 1;
  const cells = Array.from({ length: width * depth }, (_, index) => {
    const x = level.area.minX + (index % width) * CELL;
    const z = level.area.minZ + Math.floor(index / width) * CELL;
    return walkable(x, z, level) ? new Vector3(x, 0, z) : null;
  });
  nav = { cells, width, depth };
  navCache.set(level, nav);
  return nav;
}

function closestCell(position: Vector3, navCells: (Vector3 | null)[]) {
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
export function pathTo(start: Vector3, goal: Vector3, level: Level = DEMO_LEVEL): Vector3[] {
  const { cells: navCells, width, depth } = navigation(level);
  const first = closestCell(start, navCells), last = closestCell(goal, navCells);
  if (first < 0 || last < 0) return [];
  const queue = [first];
  const cameFrom = new Int32Array(navCells.length).fill(-1);
  cameFrom[first] = first;
  for (let head = 0; head < queue.length && cameFrom[last] < 0; head++) {
    const index = queue[head], col = index % width, row = Math.floor(index / width);
    for (const [dx, dz] of STEP_DIRECTIONS) {
      const nx = col + dx, nz = row + dz;
      if (nx < 0 || nx >= width || nz < 0 || nz >= depth) continue;
      const next = nz * width + nx;
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

export function clearSight(from: Vector3, to: Vector3, level: Level = DEMO_LEVEL) {
  const delta = to.clone().sub(from);
  const distance = delta.length();
  if (distance < .001) return true;
  const ray = new Ray(from, delta.normalize());
  const hit = new Vector3();
  return !level.bounds.some(b => ray.intersectBox(b, hit) && hit.distanceTo(from) < distance - .05);
}
export interface SeekerFlight {
  position: Vector3;
  targetKind: 'guard' | 'worker';
  targetIndex: number;
  route: Vector3[];
  replan: number;
  life: number;
}

export function advanceSeeker(flight: SeekerFlight, target: Vector3, dt: number, level: Level = DEMO_LEVEL): 'flying' | 'hit' | 'expired' {
  flight.life -= dt;
  if (flight.life <= 0) return 'expired';
  const goal = new Vector3(target.x, 1.25, target.z);
  if (flight.position.distanceTo(goal) < .3) return 'hit';
  flight.replan -= dt;
  if (clearSight(flight.position, goal, level)) flight.route = [];
  else if (flight.replan <= 0 || flight.route.length === 0) {
    flight.route = pathTo(new Vector3(flight.position.x, 0, flight.position.z), target, level);
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
export function seesPlayer(eye: Vector3, facing: number, player: Vector3, level: Level = DEMO_LEVEL) {
  const delta = player.clone().sub(eye);
  if (delta.length() > 10) return false;
  const horizontal = Math.hypot(delta.x, delta.z);
  const dot = horizontal < .001 ? 1 : (Math.sin(facing) * delta.x + Math.cos(facing) * delta.z) / horizontal;
  return dot > Math.cos(Math.PI / 3) && clearSight(eye, player, level);
}
export function safeFloor(point: Vector3, level: Level = DEMO_LEVEL) {
  if (point.x < level.area.minX || point.x > level.area.maxX || point.z < level.area.minZ || point.z > level.area.maxZ) return false;
  const volume = new Box3().setFromCenterAndSize(new Vector3(point.x, .92, point.z), new Vector3(.7, 1.78, .7));
  return !level.bounds.some(b => volume.intersectsBox(b));
}
export interface Guard {
  position: Vector3; route: Vector3[]; waypoint: number; facing: number;
  suspicion: number; alarm: number; locked: number; alerted: boolean;
  armed: boolean; shotWindup: number; shotCooldown: number; muzzleFlash: number;
  lastSeen: Vector3 | null; lastHeard: Vector3 | null; search: number; investigation: Vector3[];
  mode: 'patrol' | 'suspicious' | 'alert' | 'investigate' | 'search' | 'locked';
}
export function createGuards(level: Level = DEMO_LEVEL): Guard[] {
  return level.guards.map(({ route, armed }) => ({
    position: new Vector3(...route[0]), route: route.map(p => new Vector3(...p)), waypoint: 1,
    facing: Math.atan2(route[1][0] - route[0][0], route[1][2] - route[0][2]),
    suspicion: 0, alarm: 0, locked: 0, alerted: false, lastSeen: null, lastHeard: null, search: 0,
    armed, shotWindup: 0, shotCooldown: 0, muzzleFlash: 0,
    investigation: [], mode: 'patrol' as const,
  }));
}
function hearNoise(g: Guard, soundAt: Vector3, radius: number, searchTime: number, level: Level) {
  if (g.locked > 0) return false;
  const distance = Math.hypot(g.position.x - soundAt.x, g.position.z - soundAt.z);
  const openPath = clearSight(g.position.clone().setY(1.2), soundAt.clone().setY(1.2), level);
  if (distance > radius * (openPath ? 1 : .4)) return false;
  g.lastHeard = new Vector3(soundAt.x, 0, soundAt.z);
  g.lastSeen = null;
  g.investigation = [];
  g.search = searchTime;
  g.mode = 'investigate';
  return true;
}
/** Footsteps provide a location to check, never visual confirmation or alarm progress. */
export function hearFootstep(g: Guard, soundAt: Vector3, quiet: boolean, level: Level = DEMO_LEVEL) {
  return hearNoise(g, soundAt, quiet ? QUIET_HEARING_RANGE : WALK_HEARING_RANGE, 3, level);
}
/** A projected sound can redirect guards without revealing the caster. */
export function hearLure(g: Guard, soundAt: Vector3, level: Level = DEMO_LEVEL) {
  return hearNoise(g, soundAt, LURE_HEARING_RANGE, 3.5, level);
}
function moveToward(g: Guard, target: Vector3, speed: number, dt: number) {
  const delta = target.clone().sub(g.position);
  if (delta.length() < .01) return true;
  const step = Math.min(dt * speed, delta.length());
  g.facing = Math.atan2(delta.x, delta.z);
  g.position.addScaledVector(delta.normalize(), step);
  return false;
}
/** Returns true exactly when this guard fires. Damage is resolved after player abilities. */
export function updateGuard(g: Guard, player: Vector3, dt: number, level: Level = DEMO_LEVEL): boolean {
  g.muzzleFlash = Math.max(0, g.muzzleFlash - dt);
  if (g.locked > 0) { g.locked = Math.max(0, g.locked - dt); g.alarm = 0; g.shotWindup = 0; g.muzzleFlash = 0; g.mode = 'locked'; return false; }
  g.shotCooldown = Math.max(0, g.shotCooldown - dt);
  const visible = seesPlayer(g.position.clone().add(new Vector3(0, 1.65, 0)), g.facing, player, level);
  if (visible) {
    g.lastSeen = new Vector3(player.x, 0, player.z);
    g.lastHeard = null;
    g.investigation = [];
    g.suspicion = Math.min(1, g.suspicion + dt / 1.2);
    if (g.suspicion >= 1) g.alerted = true;
    g.search = 4;
    g.mode = g.alerted ? 'alert' : 'suspicious';
    g.facing = Math.atan2(player.x - g.position.x, player.z - g.position.z);
  } else { g.suspicion = Math.max(0, g.suspicion - dt * .25); }
  let fired = false;
  if (g.armed) {
    g.alarm = 0;
    if (g.alerted && visible && g.shotCooldown <= 0) {
      g.shotWindup += dt;
      if (g.shotWindup >= SHOT_WINDUP) {
        g.shotWindup = 0;
        g.shotCooldown = SHOT_COOLDOWN;
        g.muzzleFlash = .13;
        fired = true;
      }
    } else if (!visible || !g.alerted) g.shotWindup = 0;
  } else if (g.alerted && visible) g.alarm += dt;
  else g.alarm = Math.max(0, g.alarm - dt * 2);
  if (visible) return fired;
  const investigationTarget = g.lastSeen ?? g.lastHeard;
  if (investigationTarget && g.search > 0) {
    if (g.investigation.length === 0 && g.mode !== 'search') g.investigation = pathTo(g.position, investigationTarget, level);
    if (g.investigation.length > 0) {
      g.mode = 'investigate';
      if (moveToward(g, g.investigation[0], 1.2, dt)) g.investigation.shift();
      return false;
    }
    g.mode = 'search';
    g.search = Math.max(0, g.search - dt);
    g.facing += Math.sin(g.search * 2) * dt * .65;
    return false;
  }
  const target = g.route[g.waypoint];
  if (g.mode !== 'patrol') g.investigation = pathTo(g.position, target, level);
  g.lastSeen = null;
  g.lastHeard = null;
  g.alerted = false;
  g.mode = 'patrol';
  if (g.investigation.length > 0) {
    if (moveToward(g, g.investigation[0], .85, dt)) g.investigation.shift();
    return false;
  }
  if (moveToward(g, target, .85, dt)) g.waypoint = (g.waypoint + 1) % g.route.length;
  return false;
}
export function canGuardHit(g: Guard, player: Vector3, level: Level = DEMO_LEVEL) {
  return g.armed && g.alerted && g.locked <= 0 && seesPlayer(g.position.clone().add(new Vector3(0, 1.65, 0)), g.facing, player, level);
}
