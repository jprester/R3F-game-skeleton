import { Vector3 } from 'three';
import { LOCK_COOLDOWN, LOCK_DURATION, LOCK_RANGE, lockGuard, type Guard } from '../mechanics.ts';
import { lockWorker, type Worker } from '../worker.ts';
import { fail, targetLabel, unavailableTarget, type Spell } from './types.ts';

/** Instant, line-of-sight immobilization. Cuts off a radio call in progress. */
export const motorLock: Spell = {
  id: 'motor', name: 'Motor Lock', key: 'LMB', code: 'Mouse0', cooldown: LOCK_COOLDOWN,
  offered: aim => !!aim.target && aim.target.distance <= LOCK_RANGE,
  cast(aim, world) {
    const target = aim.target;
    if (!target || target.distance > LOCK_RANGE) return fail(`Aim at a guard within ${LOCK_RANGE} m. Clear line of sight required.`);
    const refusal = unavailableTarget(target);
    if (refusal) return fail(refusal);
    let cutOff = false;
    if (target.kind === 'worker') lockWorker(target.npc as Worker, LOCK_DURATION);
    else {
      const guard = target.npc as Guard;
      cutOff = !!guard.radio;
      lockGuard(guard, LOCK_DURATION, world.body);
    }
    return {
      cast: true,
      message: `${targetLabel(target)} immobilized · ${LOCK_DURATION} seconds${cutOff ? ' · radio call cut off' : ''}`,
      effect: { kind: 'lock', from: world.eye.clone(), to: target.npc.position.clone().add(new Vector3(0, 1.15, 0)) },
    };
  },
};
