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
export const SHOT_HEARING_RANGE = 14;
export const PLAYER_MAX_HEALTH = 3;
export const DETECTION_TIME = 1.2;
/** After a radio report, security is primed and confirms contact faster. */
export const WARY_DETECTION_TIME = .8;
export const WARY_DURATION = 30;
export const RADIO_CALL_TIME = 2;
/** How close a guard walks to an incapacitated colleague before radioing it in. */
export const CHECK_DISTANCE = 1.4;

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

/** Direct grid lookup, widening in rings only when the position sits inside furniture. */
function closestCell(position: Vector3, level: Level) {
  const { cells, width, depth } = navigation(level);
  const col = Math.max(0, Math.min(width - 1, Math.round((position.x - level.area.minX) / CELL)));
  const row = Math.max(0, Math.min(depth - 1, Math.round((position.z - level.area.minZ) / CELL)));
  if (cells[row * width + col]) return row * width + col;
  for (let ring = 1; ring < Math.max(width, depth); ring++) {
    let nearest = -1, distance = Infinity;
    for (let r = row - ring; r <= row + ring; r++) {
      for (let c = col - ring; c <= col + ring; c++) {
        if (r < 0 || r >= depth || c < 0 || c >= width) continue;
        if (Math.max(Math.abs(r - row), Math.abs(c - col)) !== ring) continue;
        const cell = cells[r * width + c];
        const d = cell?.distanceToSquared(position) ?? Infinity;
        if (d < distance) { distance = d; nearest = r * width + c; }
      }
    }
    if (nearest >= 0) return nearest;
  }
  return -1;
}

/** True when a guard-sized body can walk the straight segment between two floor points. */
function segmentWalkable(from: Vector3, to: Vector3, level: Level) {
  const steps = Math.ceil(Math.hypot(to.x - from.x, to.z - from.z) / (CELL / 2));
  for (let i = 1; i <= steps; i++) {
    const t = i / steps;
    if (!walkable(from.x + (to.x - from.x) * t, from.z + (to.z - from.z) * t, level)) return false;
  }
  return true;
}

/** Drops grid waypoints that a straight walk can skip, so NPCs cut corners instead of zigzagging. */
function smoothRoute(start: Vector3, route: Vector3[], level: Level) {
  const smoothed: Vector3[] = [];
  let anchor = start;
  for (let i = 0; i < route.length;) {
    let far = i;
    while (far + 1 < route.length && segmentWalkable(anchor, route[far + 1], level)) far++;
    smoothed.push(route[far]);
    anchor = route[far];
    i = far + 1;
  }
  return smoothed;
}

/** Returns a route through the authored doorways, avoiding furniture and walls. */
export function pathTo(start: Vector3, goal: Vector3, level: Level = DEMO_LEVEL): Vector3[] {
  const { cells: navCells, width, depth } = navigation(level);
  const first = closestCell(start, level), last = closestCell(goal, level);
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
  return smoothRoute(start, route, level);
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
/** An incapacitated guard or worker that security may find. */
export interface Victim { kind: 'guard' | 'worker'; index: number }
export interface Downed extends Victim { position: Vector3; reported: boolean }
/** A radio call completes after RADIO_CALL_TIME unless the caller is immobilized first. */
export interface RadioCall { reason: 'contact' | 'down'; time: number; position: Vector3; victim: Victim | null }
export interface GuardContext { downed: Downed[]; wary: boolean }
const CALM: GuardContext = { downed: [], wary: false };

export interface Guard {
  position: Vector3; route: Vector3[]; waypoint: number; facing: number;
  suspicion: number; alarm: number; locked: number; alerted: boolean;
  armed: boolean; shotWindup: number; shotCooldown: number; muzzleFlash: number;
  lastSeen: Vector3 | null; lastHeard: Vector3 | null; search: number; investigation: Vector3[];
  /** Colleague this guard is walking over to check. */
  checking: (Victim & { position: Vector3 }) | null;
  radio: RadioCall | null;
  /** Contact already radioed during this engagement; cleared when the guard returns to patrol. */
  radioed: boolean;
  /** As a victim: this incapacitation has already been radioed in. */
  reported: boolean;
  mode: 'patrol' | 'suspicious' | 'alert' | 'investigate' | 'search' | 'check' | 'locked';
}
export function createGuards(level: Level = DEMO_LEVEL): Guard[] {
  return level.guards.map(({ route, armed }) => ({
    position: new Vector3(...route[0]), route: route.map(p => new Vector3(...p)), waypoint: 1,
    facing: Math.atan2(route[1][0] - route[0][0], route[1][2] - route[0][2]),
    suspicion: 0, alarm: 0, locked: 0, alerted: false, lastSeen: null, lastHeard: null, search: 0,
    armed, shotWindup: 0, shotCooldown: 0, muzzleFlash: 0,
    investigation: [], checking: null, radio: null, radioed: false, reported: false, mode: 'patrol' as const,
  }));
}
/** Immobilizes a guard. A caster position means the guard saw where the spell came from. */
export function lockGuard(g: Guard, duration: number, caster: Vector3 | null = null) {
  if (g.locked <= 0) g.reported = false;
  g.locked = Math.max(g.locked, duration);
  g.alerted = true; g.suspicion = 1;
  if (caster) { g.lastSeen = new Vector3(caster.x, 0, caster.z); g.search = 4; }
  g.alarm = 0; g.shotWindup = 0; g.muzzleFlash = 0;
  g.radio = null; g.checking = null; g.mode = 'locked';
}
function hearNoise(g: Guard, soundAt: Vector3, radius: number, searchTime: number, level: Level) {
  if (g.locked > 0) return false;
  const distance = Math.hypot(g.position.x - soundAt.x, g.position.z - soundAt.z);
  const openPath = clearSight(g.position.clone().setY(1.2), soundAt.clone().setY(1.2), level);
  if (distance > radius * (openPath ? 1 : .4)) return false;
  g.lastHeard = new Vector3(soundAt.x, 0, soundAt.z);
  g.lastSeen = null;
  g.checking = null;
  g.investigation = [];
  g.search = searchTime;
  g.mode = 'investigate';
  return true;
}
/** Gunfire pulls guards who are not already engaged toward the shooter. */
export function hearShot(g: Guard, shooterAt: Vector3, level: Level = DEMO_LEVEL) {
  if (g.mode === 'alert' || g.mode === 'suspicious') return false;
  return hearNoise(g, shooterAt, SHOT_HEARING_RANGE, 4, level);
}
/** A colleague's contact report sends this guard to the reported position. */
export function receiveContact(g: Guard, reportedAt: Vector3) {
  if (g.locked > 0 || g.mode === 'alert' || g.mode === 'suspicious') return false;
  g.lastSeen = new Vector3(reportedAt.x, 0, reportedAt.z);
  g.lastHeard = null;
  g.checking = null;
  g.investigation = [];
  g.search = 4;
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
/** Walks to an incapacitated colleague, then radios it in from beside them. */
function checkColleague(g: Guard, dt: number, level: Level, context: GuardContext) {
  const check = g.checking!;
  const victim = context.downed.find(d => d.kind === check.kind && d.index === check.index);
  if (!victim || victim.reported) {
    // The colleague recovered or was already reported: look around the spot, then resume.
    g.checking = null;
    g.lastHeard = check.position.clone();
    g.investigation = [];
    g.search = 4;
    g.mode = 'search';
    return;
  }
  g.mode = 'check';
  const offset = victim.position.clone().sub(g.position).setY(0);
  if (offset.length() <= CHECK_DISTANCE) {
    g.investigation = [];
    g.facing = Math.atan2(offset.x, offset.z);
    g.radio ??= { reason: 'down', time: 0, position: victim.position.clone(), victim: { kind: victim.kind, index: victim.index } };
    return;
  }
  if (g.investigation.length === 0) g.investigation = pathTo(g.position, victim.position, level);
  if (g.investigation.length === 0) { g.checking = null; return; }
  if (moveToward(g, g.investigation[0], 1.2, dt)) g.investigation.shift();
}

/** Returns true exactly when this guard fires. Damage is resolved after player abilities. */
export function updateGuard(g: Guard, player: Vector3, dt: number, level: Level = DEMO_LEVEL, context: GuardContext = CALM): boolean {
  g.muzzleFlash = Math.max(0, g.muzzleFlash - dt);
  if (g.locked > 0) {
    g.locked = Math.max(0, g.locked - dt);
    g.alarm = 0; g.shotWindup = 0; g.muzzleFlash = 0; g.radio = null; g.checking = null; g.mode = 'locked';
    return false;
  }
  g.shotCooldown = Math.max(0, g.shotCooldown - dt);
  const eye = g.position.clone().add(new Vector3(0, 1.65, 0));
  const visible = seesPlayer(eye, g.facing, player, level);
  if (visible) {
    g.lastSeen = new Vector3(player.x, 0, player.z);
    g.lastHeard = null;
    g.investigation = [];
    g.checking = null;
    g.suspicion = Math.min(1, g.suspicion + dt / (context.wary ? WARY_DETECTION_TIME : DETECTION_TIME));
    if (g.suspicion >= 1) g.alerted = true;
    g.search = 4;
    g.mode = g.alerted ? 'alert' : 'suspicious';
    g.facing = Math.atan2(player.x - g.position.x, player.z - g.position.z);
    // Armed guards radio confirmed contact; unarmed guards make the facility alarm call instead.
    if (g.armed && g.alerted && !g.radioed) g.radio ??= { reason: 'contact', time: 0, position: g.lastSeen.clone(), victim: null };
    if (g.radio?.reason === 'contact') g.radio.position.copy(g.lastSeen);
  } else { g.suspicion = Math.max(0, g.suspicion - dt * .25); }
  // Once started, a call continues without sight; only immobilizing the caller stops it.
  if (g.radio) g.radio.time += dt;
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
  if (!g.checking && (g.mode === 'patrol' || g.mode === 'search')) {
    // Sound investigations take priority, so an Echo Lure can pull a guard away before discovery.
    const found = context.downed.find(d => !d.reported && seesPlayer(eye, g.facing, d.position.clone().setY(1.2), level));
    if (found) {
      g.checking = { kind: found.kind, index: found.index, position: found.position.clone() };
      g.lastSeen = null; g.lastHeard = null; g.investigation = [];
    }
  }
  if (g.checking) { checkColleague(g, dt, level, context); return false; }
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
  g.radioed = false;
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
