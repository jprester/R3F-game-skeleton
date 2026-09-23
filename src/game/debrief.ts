import type { SpellId } from './spells/types.ts';

/** Every spell is counted; a new spell must be added to createStats, which the type enforces. */
export type CastKind = SpellId;

/** What happened during one attempt, counted by the encounter as it runs. */
export interface OperationStats {
  /** Times a guard or the worker confirmed the player (each re-acquisition counts). */
  spotted: number;
  /** Times someone became suspicious, glances included. Does not affect the rating. */
  noticed: number;
  /** Completed radio reports of any kind: contact, a colleague down, or a recovered guard's attack. */
  reports: number;
  /** Times a camera flagged the player; each also counts as a report. */
  cameraFlags: number;
  /** Radio calls stopped by immobilizing the caller. */
  callsCutOff: number;
  hitsTaken: number;
  restraints: number;
  casts: Record<CastKind, number>;
}

export const createStats = (): OperationStats => ({
  spotted: 0, noticed: 0, reports: 0, cameraFlags: 0, callsCutOff: 0, hitsTaken: 0, restraints: 0,
  casts: { motor: 0, blink: 0, seeker: 0, lure: 0, sense: 0, veil: 0 },
});

export type Rating = 'ghost' | 'discreet' | 'compromised';
export const RATINGS: Record<Rating, { title: string; summary: string }> = {
  ghost: { title: 'Ghost', summary: 'Never seen, nothing reported. Security never knew you were there.' },
  discreet: { title: 'Discreet', summary: 'Never seen, but security knew something was wrong.' },
  compromised: { title: 'Compromised', summary: 'Security saw you. The core is out, and so is word of the intrusion.' },
};
const RANK: Record<Rating, number> = { ghost: 0, discreet: 1, compromised: 2 };

/** Rating for a successful extraction. Being seen outranks everything; any report ends a ghost run. */
export function rateOperation(stats: OperationStats): Rating {
  if (stats.spotted > 0 || stats.hitsTaken > 0) return 'compromised';
  if (stats.reports > 0) return 'discreet';
  return 'ghost';
}

export interface BestRun { rating: Rating; elapsed: number }
/** A better rating always wins; the same rating wins on time. */
export const isBetterRun = (run: BestRun, best: BestRun | null) =>
  !best || RANK[run.rating] < RANK[best.rating] || (run.rating === best.rating && run.elapsed < best.elapsed);

export const formatTime = (seconds: number) => `${Math.floor(seconds / 60)}m ${String(Math.floor(seconds % 60)).padStart(2, '0')}s`;
