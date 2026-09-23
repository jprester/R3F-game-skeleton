import { blink } from './blink.ts';
import { echoLure } from './echoLure.ts';
import { lifeSense } from './lifeSense.ts';
import { motorLock } from './motorLock.ts';
import { seekerCrystal } from './seekerCrystal.ts';
import { veil } from './veil.ts';
import type { Aim, CastResult, Spell, SpellId, SpellWorld } from './types.ts';

export * from './types.ts';

/** Every spell, in HUD order. Adding a spell means a new module and a line here. */
export const SPELLS: readonly Spell[] = [motorLock, blink, seekerCrystal, echoLure, lifeSense, veil];

export const createCooldowns = (): Record<SpellId, number> =>
  Object.fromEntries(SPELLS.map(spell => [spell.id, 0])) as Record<SpellId, number>;

/** Casts if off cooldown, and starts the cooldown only when the cast succeeds. */
export function tryCast(spell: Spell, cooldowns: Record<SpellId, number>, aim: Aim, world: SpellWorld): CastResult {
  if (cooldowns[spell.id] > 0) return { cast: false, message: `${spell.name} recharging.` };
  const result = spell.cast(aim, world);
  if (result.cast) cooldowns[spell.id] = spell.cooldown;
  return result;
}

/** Crosshair prompt listing the spells the current aim offers, e.g. "LMB · Motor Lock  /  F · Seeker Crystal". */
export function aimPrompt(aim: Aim) {
  const offered = SPELLS.filter(spell => spell.offered(aim)).map(spell => `${spell.key} · ${spell.name}`).join('  /  ');
  return aim.target?.kind === 'worker' && offered ? `Worker · ${offered}` : offered;
}
