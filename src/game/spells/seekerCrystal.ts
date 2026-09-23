import { Vector3 } from 'three';
import { SEEKER_COOLDOWN, SEEKER_RANGE } from '../mechanics.ts';
import { fail, unavailableTarget, type Spell } from './types.ts';

/** Guided crystal that follows its target around cover; the hit is resolved by the flight in the encounter. */
export const seekerCrystal: Spell = {
  id: 'seeker', name: 'Seeker Crystal', key: 'F', code: 'KeyF', cooldown: SEEKER_COOLDOWN,
  offered: aim => !!aim.target && aim.target.distance <= SEEKER_RANGE,
  cast(aim, world) {
    if (world.seekerInFlight) return fail('Seeker Crystal already in flight.');
    const target = aim.target;
    if (!target || target.distance > SEEKER_RANGE) return fail(`Aim at a visible guard or worker within ${SEEKER_RANGE} m.`);
    const refusal = unavailableTarget(target);
    if (refusal) return fail(refusal);
    const flight = { position: new Vector3(world.eye.x, 1.25, world.eye.z), targetKind: target.kind, targetIndex: target.index, route: [], replan: 0, life: 8 };
    return { cast: true, message: 'Seeker Crystal tracking target.', effect: { kind: 'seeker', flight } };
  },
};
