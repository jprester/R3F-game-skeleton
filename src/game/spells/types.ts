import type { Vector3 } from 'three';
import type { Level } from '../levels.ts';
import type { Guard, SeekerFlight } from '../mechanics.ts';
import type { Worker } from '../worker.ts';

export type SpellId = 'motor' | 'blink' | 'seeker' | 'lure' | 'sense';

/** The character under the crosshair: the first physical ray hit, so walls block targeting. */
export interface AimTarget { kind: 'guard' | 'worker'; index: number; npc: Guard | Worker; distance: number }
/**
 * What the crosshair rests on this frame, resolved by the encounter with Rapier. Spells read
 * it and apply their own ranges, so ranges live with the spells rather than in the encounter.
 */
export interface Aim {
  target: AimTarget | null;
  /** Clear, walkable floor under the crosshair, and how far away it is. */
  floor: Vector3 | null;
  floorDistance: number;
  /** A standing body fits at the floor point (no character or furniture in the arrival volume). */
  arrivalClear: boolean;
}
export interface SpellWorld {
  guards: Guard[];
  worker: Worker;
  level: Level;
  /** Player body centre on the floor plane, and camera eye. */
  body: Vector3;
  eye: Vector3;
  seekerInFlight: boolean;
}

/** What the encounter should present after a successful cast; game state is already applied. */
export type SpellEffect =
  | { kind: 'lock'; from: Vector3; to: Vector3 }
  | { kind: 'seeker'; flight: SeekerFlight }
  | { kind: 'lure'; point: Vector3 }
  | { kind: 'sense'; origin: Vector3 }
  | { kind: 'blink'; destination: Vector3 };
export type CastResult = { cast: false; message: string } | { cast: true; message: string; effect: SpellEffect };

export interface Spell {
  id: SpellId;
  name: string;
  /** Key label for the HUD, and the input code that casts it ('Mouse0' is the left button). */
  key: string;
  code: string;
  cooldown: number;
  /** Whether the current aim offers this spell, for the crosshair prompt. */
  offered(aim: Aim): boolean;
  /** Validates the aim and applies the spell to the world. */
  cast(aim: Aim, world: SpellWorld): CastResult;
}

export const fail = (message: string): CastResult => ({ cast: false, message });
/** Motor Lock and Seeker Crystal share these refusals. */
export function unavailableTarget(target: AimTarget) {
  if (target.npc.restrained) return 'Target already restrained.';
  if (target.npc.locked > 0) return 'Target already immobilized.';
  return null;
}
export const targetLabel = (target: AimTarget) => target.kind === 'worker' ? 'Worker' : 'Guard';
