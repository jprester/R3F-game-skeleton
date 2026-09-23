import { VEIL_BREAK_RANGE, VEIL_COOLDOWN, VEIL_DURATION } from '../mechanics.ts';
import { fail, type Spell } from './types.ts';

/**
 * Suppresses attention rather than sight: observers and cameras overlook the operative.
 * Anyone who can see them within VEIL_BREAK_RANGE notices, and casting another spell drops it.
 */
export const veil: Spell = {
  id: 'veil', name: 'Veil', key: 'X', code: 'KeyX', cooldown: VEIL_COOLDOWN,
  offered: () => false,
  cast(_aim, world) {
    if (world.veiled) return fail('Veil already active.');
    return {
      cast: true,
      message: `Veil · overlooked for ${VEIL_DURATION} s. Closer than ${VEIL_BREAK_RANGE} m, or casting, breaks it.`,
      effect: { kind: 'veil' },
    };
  },
};
