import { Vector3 } from 'three';
import { LIFE_SENSE_COOLDOWN, LIFE_SENSE_DURATION, LIFE_SENSE_RANGE } from '../mechanics.ts';
import type { Spell } from './types.ts';

/** Reveals everyone within range of where it was cast; needs no aim. */
export const lifeSense: Spell = {
  id: 'sense', name: 'Life Sense', key: 'V', code: 'KeyV', cooldown: LIFE_SENSE_COOLDOWN,
  offered: () => false,
  cast(_aim, world) {
    return {
      cast: true,
      message: `Life Sense · everyone within ${LIFE_SENSE_RANGE} m, for ${LIFE_SENSE_DURATION} seconds`,
      effect: { kind: 'sense', origin: new Vector3(world.body.x, 0, world.body.z) },
    };
  },
};
