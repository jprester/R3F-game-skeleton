import { Box3, Vector3 } from 'three';

export type Position = [number, number, number];
export interface Solid { position: Position; size: Position; color: string }
export interface Level {
  id: 'demo' | 'annex';
  name: string;
  subtitle: string;
  spawn: Position;
  artifact: Position;
  extraction: Position;
  area: { minX: number; maxX: number; minZ: number; maxZ: number };
  solids: Solid[];
  bounds: Box3[];
  guards: { route: Position[]; armed: boolean }[];
  worker: { start: Position; alarm: Position; facing: number; panel: Position };
  lights: Position[];
  signs: { position: Position; text: string; rotation?: number }[];
}
const box = (position: Position, size: Position, color = '#666f75'): Solid => ({ position, size, color });
function level(data: Omit<Level, 'bounds'>): Level {
  return { ...data, bounds: data.solids.map(s => new Box3().setFromCenterAndSize(new Vector3(...s.position), new Vector3(...s.size))) };
}

export const DEMO_LEVEL = level({
  id: 'demo', name: 'Quiet entry', subtitle: 'CORPORATE ANNEX · TEST OFFICE',
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
  ],
  guards: [
    { route: [[-3, 0, -3], [-3, 0, -8]], armed: true },
    { route: [[-2.8, 0, -13], [3, 0, -13]], armed: false },
  ],
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
  id: 'annex', name: 'The records wing', subtitle: 'CORPORATE ANNEX · NIGHT',
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
    box([-5.7, .75, -14], [1.8, 1.5, 1.1], '#38454e'),
    box([0, .6, -22], [1.6, 1.2, 1.2], '#273b48'),
    box([2.8, .55, 5.2], [2.3, 1.1, 1], '#38454e'),
  ],
  guards: [
    { route: [[-5, 0, -3], [-5, 0, -8]], armed: true },
    { route: [[7, 0, -3], [7, 0, -8]], armed: false },
    { route: [[-5, 0, -12], [-5, 0, -17]], armed: true },
    { route: [[7, 0, -12], [7, 0, -17]], armed: false },
  ],
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

export const LEVELS = [ANNEX_LEVEL, DEMO_LEVEL] as const;
