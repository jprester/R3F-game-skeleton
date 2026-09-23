import { Box3, Vector3 } from 'three';

export type Position = [number, number, number];
export interface Solid { position: Position; size: Position; color: string }
export interface Level {
  id: 'demo' | 'annex' | 'tower';
  name: string;
  subtitle: string;
  /** Level picker label, briefing eyebrow, where the core is, the insertion brief, and the nudge when E finds nothing. */
  kind: 'Mission' | 'Mechanics demo';
  operation: string;
  objective: string;
  brief: string;
  coreHint: string;
  spawn: Position;
  artifact: Position;
  extraction: Position;
  area: { minX: number; maxX: number; minZ: number; maxZ: number };
  solids: Solid[];
  bounds: Box3[];
  guards: { route: Position[]; armed: boolean }[];
  /** Ceiling-height security cameras: lens position, sweep centre (atan2(x, z) facing) and half-sweep in radians. */
  cameras: { position: Position; facing: number; sweep: number }[];
  worker: { start: Position; alarm: Position; facing: number; panel: Position };
  lights: Position[];
  signs: { position: Position; text: string; rotation?: number }[];
}
const box = (position: Position, size: Position, color = '#666f75'): Solid => ({ position, size, color });

/** Level kit: every wall is 3.6 m tall and 0.25 m thick; doorways are 2.8 m tall with a lintel above. */
const WALL_HEIGHT = 3.6, WALL_THICKNESS = .25, DOOR_HEIGHT = 2.8;
/** A doorway in a wall: its centre along the wall and its width. */
type Door = [centre: number, width: number];

/** Floor, ceiling and the four outer walls of a rectangular floor plate. */
function shell(minX: number, maxX: number, minZ: number, maxZ: number, floor = '#343c42', ceiling = '#52606a', wall = '#666f75'): Solid[] {
  const cx = (minX + maxX) / 2, cz = (minZ + maxZ) / 2, width = maxX - minX, depth = maxZ - minZ;
  return [
    box([cx, -.15, cz], [width, .3, depth], floor),
    box([cx, WALL_HEIGHT + .1, cz], [width, .2, depth], ceiling),
    box([minX, WALL_HEIGHT / 2, cz], [WALL_THICKNESS, WALL_HEIGHT, depth], wall), box([maxX, WALL_HEIGHT / 2, cz], [WALL_THICKNESS, WALL_HEIGHT, depth], wall),
    box([cx, WALL_HEIGHT / 2, minZ], [width, WALL_HEIGHT, WALL_THICKNESS], wall), box([cx, WALL_HEIGHT / 2, maxZ], [width, WALL_HEIGHT, WALL_THICKNESS], wall),
  ];
}
/** Wall segments between `from` and `to` along one axis, leaving the given doorways open under a lintel. */
function wallSpan(from: number, to: number, doors: Door[], place: (centre: number, length: number, y: number, height: number) => Solid) {
  const solids: Solid[] = [];
  let start = from;
  for (const [centre, width] of [...doors].sort((a, b) => a[0] - b[0])) {
    const open = centre - width / 2;
    if (open > start) solids.push(place((start + open) / 2, open - start, WALL_HEIGHT / 2, WALL_HEIGHT));
    solids.push(place(centre, width, (DOOR_HEIGHT + WALL_HEIGHT) / 2, WALL_HEIGHT - DOOR_HEIGHT));
    start = centre + width / 2;
  }
  if (to > start) solids.push(place((start + to) / 2, to - start, WALL_HEIGHT / 2, WALL_HEIGHT));
  return solids;
}
/** A wall running along x at depth `z`. */
const wallAlongX = (z: number, fromX: number, toX: number, doors: Door[] = [], color = '#666f75') =>
  wallSpan(fromX, toX, doors, (x, length, y, height) => box([x, y, z], [length, height, WALL_THICKNESS], color));
/** A wall running along z at `x`. */
const wallAlongZ = (x: number, fromZ: number, toZ: number, doors: Door[] = [], color = '#666f75') =>
  wallSpan(fromZ, toZ, doors, (z, length, y, height) => box([x, y, z], [WALL_THICKNESS, height, length], color));
function level(data: Omit<Level, 'bounds'>): Level {
  return { ...data, bounds: data.solids.map(s => new Box3().setFromCenterAndSize(new Vector3(...s.position), new Vector3(...s.size))) };
}

export const DEMO_LEVEL = level({
  id: 'demo', name: 'Quiet entry', subtitle: 'CORPORATE ANNEX · TEST OFFICE',
  kind: 'Mechanics demo', operation: 'FIELD TRIAL 01', objective: 'Research chamber · beyond Operations',
  brief: 'Enter the test office, recover the transit core from Research, and return here. Two guards, a camera and an office worker stand between you and the objective.',
  coreHint: 'Find the transit core in Research.',
  spawn: [0, .91, 5.5], artifact: [0, 1.65, -16], extraction: [0, 0, 5.5],
  area: { minX: -5.5, maxX: 5.5, minZ: -17.5, maxZ: 7.5 },
  solids: [
    box([0, -.15, -5], [12, .3, 26], '#343c42'),
    box([0, 3.7, -5], [12, .2, 26], '#52606a'),
    box([-6, 1.8, -5], [.25, 3.6, 26]), box([6, 1.8, -5], [.25, 3.6, 26]),
    box([0, 1.8, 8], [12, 3.6, .25]), box([0, 1.8, -18], [12, 3.6, .25]),
    ...[0, -10].flatMap(z => [
      box([-5.1, 1.8, z], [1.8, 3.6, .25]), box([0, 1.8, z], [5, 3.6, .25]), box([5.1, 1.8, z], [1.8, 3.6, .25]),
      box([-3.35, 3.2, z], [1.7, .8, .25]), box([3.35, 3.2, z], [1.7, .8, .25]),
    ]),
    box([1.8, 1.8, -5], [.2, 3.6, 6], '#46545e'),
    box([-1, .75, -4], [2.2, 1.5, 1], '#38454e'), box([-1, .75, -7], [2.2, 1.5, 1], '#38454e'),
    box([-5.3, 1.1, -5], [.8, 2.2, 3], '#29343e'),
    box([0, .6, -16], [1.6, 1.2, 1.2], '#273b48'),
    box([-4.7, 1.1, -16], [1.5, 2.2, 2], '#29343e'),
    box([-4.5, .55, 4], [2, 1.1, 1], '#38454e'),
    // Research lab bench: crouch cover beside the alarm guard's patrol, reached from the right doorway.
    box([4.2, .7, -13.4], [1.1, 1.4, 2.4], '#34424b'),
  ],
  guards: [
    { route: [[-3, 0, -3], [-3, 0, -8]], armed: true },
    { route: [[-2.8, 0, -13], [3, 0, -13]], armed: false },
  ],
  // Sweeps across the right lane behind the partition, which has no guard. The strip along
  // the right wall under the lens is a blind spot a careful player can read from the floor cone.
  cameras: [{ position: [5.3, 2.9, -5], facing: -Math.PI / 2, sweep: .75 }],
  worker: { start: [2.8, 0, -15.2], alarm: [-4.7, 0, -12.7], facing: -Math.PI / 2, panel: [-5.77, 1.31, -12.7] },
  lights: [[0, 3.1, 4], [0, 3.1, -5], [0, 3.1, -14]],
  signs: [
    { position: [0, 2.45, .14], text: '01 / OPERATIONS' },
    { position: [0, 2.45, -9.85], text: '02 / RESEARCH' },
    { position: [0, 2.4, 7.85], text: 'EXTRACTION', rotation: Math.PI },
    { position: [-5.7, 2.06, -12.7], text: 'ALARM PANEL', rotation: Math.PI / 2 },
  ],
});

const splitWall = (z: number, rightDoor = 4.25): Solid[] => {
  const rightOpening = rightDoor - .75;
  return [
    box([-7, 1.8, z], [4, 3.6, .25]),
    box([(-3.5 + rightOpening) / 2, 1.8, z], [rightOpening + 3.5, 3.6, .25]),
    box([(rightDoor + .75 + 9) / 2, 1.8, z], [9 - (rightDoor + .75), 3.6, .25]),
    box([-4.25, 3.2, z], [1.5, .8, .25]),
    box([rightDoor, 3.2, z], [1.5, .8, .25]),
  ];
};
export const ANNEX_LEVEL = level({
  id: 'annex', name: 'Records wing', subtitle: 'CORPORATE ANNEX · NIGHT',
  kind: 'Mission', operation: 'OPERATION 01', objective: 'Vault · beyond the records wing',
  brief: 'Enter the records wing, take the direct security route on the left or the longer covered service route on the right, recover the core from the vault, and return here. Armed guards hold the left; an alarm guard and a camera watch the right.',
  coreHint: 'Find the transit core in the vault.',
  spawn: [0, .91, 7], artifact: [0, 1.65, -22], extraction: [0, 0, 7],
  area: { minX: -8.5, maxX: 8.5, minZ: -23.5, maxZ: 8.5 },
  solids: [
    box([0, -.15, -7.5], [18, .3, 33], '#343c42'),
    box([0, 3.7, -7.5], [18, .2, 33], '#52606a'),
    box([-9, 1.8, -7.5], [.25, 3.6, 33]), box([9, 1.8, -7.5], [.25, 3.6, 33]),
    box([0, 1.8, 9], [18, 3.6, .25]), box([0, 1.8, -24], [18, 3.6, .25]),
    ...splitWall(0), ...splitWall(-10, 6.5), ...splitWall(-18, 6.5),
    box([0, 1.8, -2], [.25, 3.6, 4]), box([0, 1.8, -8], [.25, 3.6, 4]),
    box([0, 1.8, -11.5], [.25, 3.6, 3]), box([0, 1.8, -16.5], [.25, 3.6, 3]),
    box([-7.7, 1.1, -6.5], [1.2, 2.2, 2.2], '#29343e'),
    box([-7.2, .75, -3.5], [1.8, 1.5, 1.1], '#38454e'),
    box([4.9, .95, -5.4], [2.2, 1.9, 1.5], '#2d4953'),
    box([4.9, .95, -14.2], [2.2, 1.9, 1.5], '#2d4953'),
    box([2.2, 1.1, -7.7], [1.3, 2.2, 1.6], '#29343e'),
    box([2.2, 1.1, -16.8], [1.3, 2.2, 1.6], '#29343e'),
    // Kept clear of the armed guard's lane at x = -5.
    box([-7.1, .75, -14], [1.8, 1.5, 1.1], '#38454e'),
    // Direct route: low desk runs beside the armed lanes. Crouched behind them the player is hidden;
    // standing, the head still shows, so the left stays fast-and-exposed or slow-and-covered.
    box([-3.2, .75, -5.6], [.8, 1.5, 3.6], '#38454e'),
    box([-3.2, .75, -14.6], [.8, 1.5, 3.6], '#38454e'),
    // Vault crate: lets the player approach the worker from the right doorway unseen.
    box([5.3, .65, -20.2], [1.9, 1.3, 1], '#34424b'),
    box([0, .6, -22], [1.6, 1.2, 1.2], '#273b48'),
    box([2.8, .55, 5.2], [2.3, 1.1, 1], '#38454e'),
  ],
  guards: [
    { route: [[-5, 0, -3], [-5, 0, -8]], armed: true },
    { route: [[7, 0, -3], [7, 0, -8]], armed: false },
    { route: [[-5, 0, -12], [-5, 0, -17]], armed: true },
  ],
  // Replaces the right Records room's alarm guard: a sweep to time instead of a patrol to read.
  // The right wall below it and the vault doorway are watched least.
  cameras: [{ position: [8.3, 2.9, -10.45], facing: Math.PI + .8, sweep: .5 }],
  worker: { start: [3, 0, -21], alarm: [-8.1, 0, -20.5], facing: Math.PI / 2, panel: [-8.75, 1.31, -20.5] },
  lights: [[0, 3.1, 6], [-5, 3.1, -5], [5, 3.1, -5], [-5, 3.1, -14], [5, 3.1, -14], [0, 3.1, -21]],
  signs: [
    { position: [0, 2.45, .14], text: '01 / OPERATIONS' },
    { position: [-4.25, 2.5, .16], text: 'DIRECT / SECURITY' },
    { position: [4.25, 2.5, .16], text: 'SERVICE / COVER' },
    { position: [0, 2.45, -9.85], text: '02 / RECORDS' },
    { position: [0, 2.45, -17.85], text: '03 / VAULT' },
    { position: [0, 2.4, 8.85], text: 'EXTRACTION', rotation: Math.PI },
    { position: [-8.7, 2.06, -20.5], text: 'ALARM PANEL', rotation: Math.PI / 2 },
  ],
});

/**
 * Kaeldyn Tower, 41st floor. North is -z. Insertion is through the roof-access stairwell (south-east),
 * which is also extraction. Two routes to the server room: east through the service corridor and the
 * security office (armed guards, tall cover), or west through the break room and the open office
 * (ceiling cameras, an alarm guard, low desk partitions that hide you from him but not from above).
 */
const STONE = '#1c2328', TOWER_WALL = '#3a4349', DESK = '#38454e', CABINET = '#29343e', RACK = '#1f2a33', SOFT = '#3d4a52', PLANTER = '#2b3a33';
export const TOWER_LEVEL = level({
  id: 'tower', name: 'Kaeldyn tower', subtitle: 'KAELDYN INDUSTRIES · 41ST FLOOR · NIGHT',
  kind: 'Mission', operation: 'OPERATION 02', objective: 'Server room · north side of the floor',
  brief: 'Come down from the roof access, recover the core from the server room, and return to the stairwell. East, the service corridor and security office are held by armed KSEC guards. West, the open office is watched by ceiling cameras and an alarm guard, and the sysadmin faces its server-room door.',
  coreHint: 'Find the transit core in the server room.',
  spawn: [8.2, .91, 10], artifact: [-10.3, 1.65, -19], extraction: [8.2, 0, 10],
  area: { minX: -11.5, maxX: 11.5, minZ: -21.5, maxZ: 13.5 },
  solids: [
    ...shell(-12, 12, -22, 14, STONE, '#3b454c', TOWER_WALL),
    // Rooms: stairwell (SE), break room (S), service corridor (E), open office (centre), security (NE), server room (NW).
    // The stairwell's corridor door sits at the far east so the corridor guard cannot see the insertion point.
    ...wallAlongX(8, -12, 12, [[-4, 1.5], [11, 1.5]], TOWER_WALL),
    ...wallAlongZ(7, 8, 14, [[11, 1.5]], TOWER_WALL),
    ...wallAlongZ(7, -14, 8, [[-4, 1.5]], TOWER_WALL),
    ...wallAlongX(-14, -12, 12, [[-6, 1.5], [9.5, 1.5]], TOWER_WALL),
    ...wallAlongZ(0, -22, -14, [[-18, 1.5]], TOWER_WALL),
    // Stairwell: the stair core up to the roof.
    box([10.3, 1.8, 12.4], [2.8, 3.6, 2.4], '#2c3439'),
    // Break room.
    box([-11.3, 1, 12.9], [.9, 2, .9], '#2f4a55'), box([-7, .4, 12.9], [3, .8, .9], SOFT),
    box([-2, .5, 11], [1.4, 1, 1.4], DESK), box([2.5, .5, 11], [1.4, 1, 1.4], DESK),
    box([-10.8, .55, 10], [1.2, 1.1, 2.5], DESK),
    // Service corridor: tall alcove cabinets on the far wall, one low crate by the inner wall.
    box([11.35, 1.1, 3], [.9, 2.2, 1.6], CABINET), box([11.35, 1.1, -7], [.9, 2.2, 1.6], CABINET),
    box([7.8, .55, -9], [1, 1.1, 1.4], DESK),
    // Open office: six desk clusters with 1.2 m partitions, a meeting table, planters and a printer station.
    ...[-8.2, -1.8].flatMap(x => [3.5, -2.5, -8.5].map(z => box([x, .6, z], [3.4, 1.2, 2.2], DESK))),
    box([3.5, .5, -6], [2.5, 1, 1.4], DESK), box([5.8, .8, 2], [1, 1.6, 1], PLANTER),
    box([4.5, .6, -11.5], [1.4, 1.2, .9], CABINET),
    // Security office: monitor desk and lockers.
    box([6, .75, -20.6], [3.4, 1.5, 1], DESK), box([11.35, 1.1, -18.5], [.9, 2.2, 3], CABINET),
    // Server room: two rack rows; the core stands in the west aisle.
    box([-8.6, 1.1, -18.2], [.9, 2.2, 6], RACK), box([-3.4, 1.1, -18.2], [.9, 2.2, 6], RACK),
    box([-10.3, .6, -19], [1.2, 1.2, 1.2], '#273b48'),
  ],
  guards: [
    { route: [[9.5, 0, 2], [9.5, 0, -12]], armed: true },
    { route: [[3, 0, -17.5], [8.5, 0, -17.5]], armed: true },
    { route: [[-5, 0, 6], [-5, 0, -12]], armed: false },
  ],
  // Ceiling-hung over the centre line: one sweeps the entry from the break room, one the approach
  // to the server-room door. Each has a blind spot beneath it, and the band between them is quieter.
  cameras: [
    { position: [-5, 2.9, 2.5], facing: 0, sweep: 1.1 },
    { position: [-5, 2.9, -8], facing: Math.PI, sweep: 1.1 },
  ],
  // The sysadmin watches the centre aisle toward the open-office door; the racks hide the security door.
  worker: { start: [-6, 0, -21], alarm: [-11.1, 0, -15], facing: 0, panel: [-11.82, 1.31, -15] },
  lights: [[8.2, 3.1, 11], [-3, 3.1, 11], [9.5, 3.1, -3], [-5, 3.1, 2], [-5, 3.1, -8], [2.5, 3.1, -3], [6, 3.1, -18], [-6, 3.1, -18]],
  signs: [
    { position: [11, 3.2, 8.14], text: 'SERVICE CORRIDOR' },
    { position: [7.14, 3.2, 11], text: 'BREAK ROOM', rotation: Math.PI / 2 },
    { position: [11.84, 2.3, 10.2], text: 'ROOF ACCESS · EXTRACTION', rotation: -Math.PI / 2 },
    { position: [-4, 3.2, 8.14], text: '41 / OPEN OFFICE' },
    { position: [7.14, 3.2, -4], text: 'OPEN OFFICE', rotation: Math.PI / 2 },
    { position: [-6, 3.2, -13.86], text: 'SERVER ROOM' },
    { position: [9.5, 3.2, -13.86], text: 'SECURITY · KSEC' },
    { position: [.14, 3.2, -18], text: 'SERVER ROOM', rotation: Math.PI / 2 },
    { position: [-11.84, 2.06, -15], text: 'ALARM PANEL', rotation: Math.PI / 2 },
    // Corporate voice, as in the concept art.
    { position: [2, 2.3, 8.14], text: 'KAELDYN · A CLEARER TOMORROW' },
    { position: [7.14, 2.3, -9.5], text: 'TRUST · STABILITY · PROGRESS', rotation: Math.PI / 2 },
  ],
});

export const LEVELS = [ANNEX_LEVEL, TOWER_LEVEL, DEMO_LEVEL] as const;
