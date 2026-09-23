import type { Vector3 } from 'three';
import type { Level } from './levels.ts';
import { hearShot, RADIO_CALL_TIME, receiveContact, updateGuard, WARY_DURATION, type Downed, type Guard, type RadioCall } from './mechanics.ts';
import type { Worker } from './worker.ts';

/** Facility-wide state shared by the guard force over radio. */
export interface Security { wary: number }
export interface SecurityEvents {
  shots: Guard[];
  reports: { guard: number; reason: RadioCall['reason'] }[];
}

export const createSecurity = (): Security => ({ wary: 0 });

export function downedList(guards: Guard[], worker: Worker): Downed[] {
  const downed: Downed[] = guards.flatMap((g, index) => g.locked > 0
    ? [{ kind: 'guard' as const, index, position: g.position, reported: g.reported }] : []);
  if (worker.locked > 0) downed.push({ kind: 'worker', index: 0, position: worker.position, reported: worker.reported });
  return downed;
}

/**
 * Advances every guard, then resolves what they share: gunfire is heard by colleagues,
 * a completed contact call converges the others on the reported position, and a
 * completed downed-colleague call puts the whole facility on wary footing.
 */
export function updateSecurity(guards: Guard[], worker: Worker, player: Vector3, dt: number, level: Level, security: Security): SecurityEvents {
  security.wary = Math.max(0, security.wary - dt);
  const context = { downed: downedList(guards, worker), wary: security.wary > 0 };
  const events: SecurityEvents = { shots: [], reports: [] };
  for (const guard of guards) if (updateGuard(guard, player, dt, level, context)) events.shots.push(guard);
  for (const shooter of events.shots) {
    for (const guard of guards) if (guard !== shooter) hearShot(guard, shooter.position, level);
  }
  guards.forEach((guard, index) => {
    const call = guard.radio;
    if (!call || call.time < RADIO_CALL_TIME) return;
    guard.radio = null;
    security.wary = WARY_DURATION;
    if (call.reason === 'contact') {
      guard.radioed = true;
      for (const other of guards) if (other !== guard) receiveContact(other, call.position);
    } else if (call.victim?.kind === 'worker') worker.reported = true;
    else if (call.victim) guards[call.victim.index].reported = true;
    events.reports.push({ guard: index, reason: call.reason });
  });
  return events;
}
