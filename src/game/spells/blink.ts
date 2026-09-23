import { BLINK_COOLDOWN, BLINK_RANGE } from '../mechanics.ts';
import { fail, type Spell } from './types.ts';

/** Short teleport to visible floor. Fails closed: no clear arrival volume, no translation. */
export const blink: Spell = {
  id: 'blink', name: 'Blink', key: 'Q', code: 'KeyQ', cooldown: BLINK_COOLDOWN,
  offered: aim => !!aim.floor && aim.floorDistance <= BLINK_RANGE && aim.arrivalClear,
  cast(aim) {
    if (!aim.floor || aim.floorDistance > BLINK_RANGE || !aim.arrivalClear) return fail(`Aim at clear floor within ${BLINK_RANGE} m. Arrival must be unobstructed.`);
    return { cast: true, message: 'Translation verified.', effect: { kind: 'blink', destination: aim.floor.clone() } };
  },
};
