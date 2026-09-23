import { hearLure, LURE_COOLDOWN, LURE_RANGE } from '../mechanics.ts';
import { fail, type Spell } from './types.ts';

/** Projects a sound onto visible floor; guards in earshot investigate it without learning who cast it. */
export const echoLure: Spell = {
  id: 'lure', name: 'Echo Lure', key: 'R', code: 'KeyR', cooldown: LURE_COOLDOWN,
  offered: aim => !!aim.floor && aim.floorDistance <= LURE_RANGE,
  cast(aim, world) {
    const point = aim.floor;
    if (!point || aim.floorDistance > LURE_RANGE) return fail(`Aim at clear, visible floor within ${LURE_RANGE} m.`);
    for (const guard of world.guards) hearLure(guard, point, world.level);
    return { cast: true, message: 'Echo Lure placed. Security may investigate the sound.', effect: { kind: 'lure', point: point.clone() } };
  },
};
