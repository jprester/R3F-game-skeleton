import { useEffect, useRef, type RefObject } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { CapsuleCollider, RapierRigidBody, RigidBody, useRapier } from '@react-three/rapier';
import { Group, Mesh, MeshBasicMaterial, Quaternion, Vector3 } from 'three';
import Environment from './Environment';
import GuardCharacter from './GuardCharacter';
import { GuardFootsteps } from './GuardFootsteps';
import WorkerCharacter from './WorkerCharacter';
import { advanceFootsteps, advanceSeeker, canGuardHit, clearSight, createGuards, CROUCH_EYE_OFFSET, CROUCH_SPEED, hearFootstep, LIFE_SENSE_DURATION, LIFE_SENSE_RANGE, lockGuard, PLAYER_MAX_HEALTH, RADIO_CALL_TIME, RESTRAIN_RANGE, RESTRAIN_TIME, restrainGuard, safeFloor, SEEKER_LOCK_DURATION, SEEKER_RANGE, STAND_EYE_OFFSET, VEIL_DURATION, type Gait, type Guard, type RadioCall, type SeekerFlight } from './mechanics';
import { createSecurity, updateSecurity, veilPierced } from './security';
import CameraRig from './CameraRig';
import { awarenessLabel, leadingCall, threats, type Threat } from './awareness';
import { createStats, type OperationStats } from './debrief';
import { playCue, playLure, playShot, type CueKind } from './audio';
import { aimPrompt, createCooldowns, SPELLS, tryCast, type Aim, type SpellEffect, type SpellId, type SpellWorld } from './spells';
import { blink } from './spells/blink';
import { echoLure } from './spells/echoLure';
import type { SenseState } from './SenseMarker';
import { createWorker, lockWorker, restrainWorker, updateWorker, WORKER_CALL_DURATION, type Worker } from './worker';
import type { Level } from './levels';

export interface HUD {
  locked: boolean; status: 'playing' | 'success' | 'failed'; carrying: boolean;
  failureReason: 'guard' | 'worker' | 'shot' | 'fall' | null;
  /** Seconds until each spell is ready again. */
  cooldowns: Record<SpellId, number>;
  senseActive: number; seekerFlying: boolean; suspicion: number; alarm: number;
  /** Seconds of Veil left. */
  veiled: number;
  health: number; shotWindup: number;
  /** Progress (0–1) of the Restraint currently being applied. */
  restrain: number;
  /** Progress (0–1) of the most advanced guard radio call, and what it reports. */
  radio: number; radioReason: RadioCall['reason'] | null; wary: number;
  workerMode: Worker['mode']; workerReport: number;
  message: string; target: string; elapsed: number;
  awareness: string; pulse: { id: number; kind: SpellId | 'restrain' | 'hit' } | null; muted: boolean;
  /** Stance, and how much of the player the most-exposed observer can see (0–1). */
  crouched: boolean; exposure: number;
  /** Screen-edge indicators for every observer whose attention is on the player. */
  threats: Threat[];
  /** Running tally for the end-of-operation debrief. */
  stats: OperationStats;
}
export const initialHUD: HUD = { locked: false, status: 'playing', carrying: false, failureReason: null, cooldowns: createCooldowns(), senseActive: 0, veiled: 0, seekerFlying: false, suspicion: 0, alarm: 0, health: PLAYER_MAX_HEALTH, shotWindup: 0, restrain: 0, radio: 0, radioReason: null, wary: 0, workerMode: 'working', workerReport: 0, message: '', target: '', elapsed: 0, awareness: '', pulse: null, muted: false, crouched: false, exposure: 0, threats: [], stats: createStats() };

/** Enough tracers for every armed guard in a level to fire in the same frame. */
const TRACER_POOL = 4;
/** Keys the game consumes, so the browser does not scroll or search on them. */
const GAME_KEYS = new Set(['Space', 'KeyE', 'KeyC', 'KeyW', 'KeyA', 'KeyS', 'KeyD', ...SPELLS.map(spell => spell.code)]);

export default function Encounter({ onHUD, dragLook, onPause, audio, level }: { onHUD: (hud: HUD) => void; dragLook: boolean; onPause: () => void; audio: RefObject<AudioContext | null>; level: Level }) {
  const player = useRef<RapierRigidBody>(null);
  const preview = useRef<Mesh>(null);
  const lurePreview = useRef<Mesh>(null);
  const lureEffect = useRef<Mesh>(null);
  const lureEffectTime = useRef(0);
  const senseState = useRef<SenseState>({ time: 0, origin: new Vector3() });
  const senseWave = useRef<Mesh>(null);
  const lockBeam = useRef<Mesh>(null);
  const shotTracers = useRef<(Group | null)[]>([]);
  const seekerMesh = useRef<Group>(null);
  const seekerFlight = useRef<SeekerFlight | null>(null);
  const lockEffect = useRef({ time: 0, from: new Vector3(), to: new Vector3() });
  const tracerEffects = useRef(Array.from({ length: TRACER_POOL }, () => ({ time: 0, from: new Vector3(), to: new Vector3() })));
  const artifactMesh = useRef<Mesh>(null);
  const guards = useRef(createGuards(level));
  const worker = useRef(createWorker(level));
  const security = useRef(createSecurity(level));
  const restraint = useRef<{ target: Guard | Worker | null; progress: number }>({ target: null, progress: 0 });
  const radioActive = useRef(guards.current.map(() => false));
  const previousModes = useRef(guards.current.map(g => g.mode));
  const previousWorkerMode = useRef(worker.current.mode);
  const lastGuardPositions = useRef(guards.current.map(g => g.position.clone()));
  const stepDistances = useRef(guards.current.map(() => 0));
  const lastPlayerPosition = useRef(new Vector3(...level.spawn));
  const artifact = useRef(new Vector3(...level.artifact)).current;
  const playerStepDistance = useRef(0);
  const footstepAudio = useRef<GuardFootsteps | null>(null);
  // Spells pressed since the last frame, cast once each in the frame loop.
  const input = useRef({ keys: new Set<string>(), yaw: 0, pitch: 0, locked: false, casts: new Set<SpellId>(), interact: false, jump: false, crouch: false });
  // Eye height above the body centre, eased between standing and crouched.
  const eyeOffset = useRef(STAND_EYE_OFFSET);
  // Fresh stats and cooldowns per mount: initialHUD is shared, so its objects must not be mutated.
  const game = useRef({ ...initialHUD, stats: createStats(), cooldowns: createCooldowns(), messageTime: 0, publish: 0 });
  const workerWitnessed = useRef(false);
  const { camera, gl } = useThree();
  const { world, rapier } = useRapier();
  /** Screen pulse for a spell, restraint or hit, counted for the debrief. */
  const pulse = (kind: NonNullable<HUD['pulse']>['kind']) => {
    const g = game.current;
    g.pulse = { id: g.pulse ? g.pulse.id + 1 : 1, kind };
    if (kind === 'restrain') g.stats.restraints++;
    else if (kind === 'hit') g.stats.hitsTaken++;
    else g.stats.casts[kind]++;
  };
  const say = (message: string) => { game.current.message = message; game.current.messageTime = 2.5; };
  const unlockAudio = () => {
    if (audio.current?.state === 'suspended') void audio.current.resume();
  };
  /** Plays a sound only when audio is running and not muted. */
  const sound = (play: (context: AudioContext) => void) => {
    const context = audio.current;
    if (context && context.state === 'running' && !game.current.muted) play(context);
  };
  const cue = (kind: CueKind) => sound(context => playCue(context, kind));
  useEffect(() => () => footstepAudio.current?.dispose(), []);

  useEffect(() => {
    const state = input.current;
    const lock = () => { state.locked = document.pointerLockElement === gl.domElement; if (!state.locked) { state.keys.clear(); state.casts.clear(); state.interact = state.jump = false; } };
    const down = (e: KeyboardEvent) => {
      if (e.code === 'Escape') { onPause(); return; }
      if (!state.locked && !dragLook) return;
      unlockAudio();
      if (GAME_KEYS.has(e.code)) e.preventDefault();
      state.keys.add(e.code);
      if (e.repeat) return;
      if (e.code === 'KeyM') game.current.muted = !game.current.muted;
      if (e.code === 'KeyC') state.crouch = !state.crouch;
      const spell = SPELLS.find(candidate => candidate.code === e.code);
      if (spell) state.casts.add(spell.id);
      if (e.code === 'KeyE') state.interact = true;
      if (e.code === 'Space') state.jump = true;
    };
    const up = (e: KeyboardEvent) => state.keys.delete(e.code);
    const move = (e: MouseEvent) => { if (state.locked || (dragLook && e.buttons === 2)) { state.yaw -= e.movementX * .002; state.pitch = Math.max(-1.45, Math.min(1.45, state.pitch - e.movementY * .002)); } };
    const mouse = (e: MouseEvent) => {
      if (!state.locked && !dragLook) return;
      const spell = SPELLS.find(candidate => candidate.code === `Mouse${e.button}`);
      if (spell) { unlockAudio(); state.casts.add(spell.id); }
    };
    const context = (e: MouseEvent) => e.preventDefault();
    const blur = () => { onPause(); state.keys.clear(); state.casts.clear(); state.interact = state.jump = false; if (document.pointerLockElement) document.exitPointerLock(); };
    document.addEventListener('pointerlockchange', lock);
    window.addEventListener('keydown', down); window.addEventListener('keyup', up);
    window.addEventListener('mousemove', move); gl.domElement.addEventListener('mousedown', mouse);
    window.addEventListener('blur', blur); gl.domElement.addEventListener('contextmenu', context);
    return () => {
      document.removeEventListener('pointerlockchange', lock);
      window.removeEventListener('keydown', down); window.removeEventListener('keyup', up);
      window.removeEventListener('mousemove', move); gl.domElement.removeEventListener('mousedown', mouse); window.removeEventListener('blur', blur); gl.domElement.removeEventListener('contextmenu', context);
    };
  }, [gl, dragLook, onPause]);

  useFrame((_, rawDelta) => {
    if (!player.current) return;
    const body = player.current;
    const state = input.current;
    const g = game.current;
    const dt = Math.min(rawDelta, .05);
    const position = body.translation();
    const eyeTarget = state.crouch ? CROUCH_EYE_OFFSET : STAND_EYE_OFFSET;
    eyeOffset.current += Math.sign(eyeTarget - eyeOffset.current) * Math.min(Math.abs(eyeTarget - eyeOffset.current), dt * 3.5);
    camera.position.set(position.x, position.y + eyeOffset.current, position.z);
    camera.rotation.set(state.pitch, state.yaw, 0, 'YXZ');
    const direction = camera.getWorldDirection(new Vector3());
    const active = (state.locked || dragLook) && g.status === 'playing';
    const shots: Guard[] = [];
    if (active && audio.current && !footstepAudio.current) {
      footstepAudio.current = new GuardFootsteps(audio.current, guards.current.length);
    }
    if (active) footstepAudio.current?.updateListener(camera.position, direction);
    if (lockBeam.current) {
      const effect = lockEffect.current;
      effect.time = Math.max(0, effect.time - dt);
      lockBeam.current.visible = effect.time > 0;
      if (effect.time > 0) {
        const delta = effect.to.clone().sub(effect.from);
        lockBeam.current.position.copy(effect.from).addScaledVector(delta, .5);
        lockBeam.current.quaternion.copy(new Quaternion().setFromUnitVectors(new Vector3(0, 1, 0), delta.clone().normalize()));
        lockBeam.current.scale.y = delta.length();
        (lockBeam.current.material as MeshBasicMaterial).opacity = effect.time / .22 * .5;
      }
    }
    tracerEffects.current.forEach((effect, index) => {
      const tracer = shotTracers.current[index];
      if (!tracer) return;
      effect.time = Math.max(0, effect.time - dt);
      tracer.visible = effect.time > 0;
      if (effect.time > 0) {
        const delta = effect.to.clone().sub(effect.from);
        const distance = delta.length();
        const progress = 1 - effect.time / .18;
        const head = Math.min(distance, distance * progress);
        const tail = Math.max(0, head - 1.5);
        const length = Math.max(.04, head - tail);
        tracer.position.copy(effect.from).addScaledVector(delta, (head + tail) / (2 * distance));
        tracer.quaternion.setFromUnitVectors(new Vector3(0, 1, 0), delta.normalize());
        tracer.scale.y = length;
      }
    });
    if (senseWave.current) {
      // The pulse sweeps out to its full range in the first 0.8 s.
      const elapsed = LIFE_SENSE_DURATION - senseState.current.time;
      senseWave.current.visible = senseState.current.time > 0 && elapsed < .8;
      senseWave.current.position.set(senseState.current.origin.x, .03, senseState.current.origin.z);
      senseWave.current.scale.setScalar(Math.max(.01, elapsed / .8 * LIFE_SENSE_RANGE));
      (senseWave.current.material as MeshBasicMaterial).opacity = .35 * (1 - elapsed / .8);
    }
    if (lureEffect.current) {
      if (active) lureEffectTime.current = Math.max(0, lureEffectTime.current - dt);
      lureEffect.current.visible = lureEffectTime.current > 0;
      lureEffect.current.scale.setScalar(1 + (1 - lureEffectTime.current / .7) * 2.5);
      (lureEffect.current.material as MeshBasicMaterial).opacity = lureEffectTime.current / .7 * .65;
    }
    g.locked = (state.locked || dragLook) && g.status === 'playing';
    if (active) {
      g.elapsed += dt;
      for (const spell of SPELLS) g.cooldowns[spell.id] = Math.max(0, g.cooldowns[spell.id] - dt);
      senseState.current.time = Math.max(0, senseState.current.time - dt);
      g.veiled = Math.max(0, g.veiled - dt);
      // Veil suppresses attention, not presence: someone close who can see you notices.
      if (g.veiled > 0 && veilPierced(guards.current, worker.current, camera.position, state.crouch, level)) {
        g.veiled = 0;
        cue('veilBroken');
        say('Veil broken · someone close looked right at you');
      }
      g.messageTime -= dt; if (g.messageTime <= 0) g.message = '';
      const movement = new Vector3(Number(state.keys.has('KeyD')) - Number(state.keys.has('KeyA')), 0, Number(state.keys.has('KeyS')) - Number(state.keys.has('KeyW')));
      movement.normalize().applyAxisAngle(new Vector3(0, 1, 0), state.yaw).multiplyScalar(state.crouch ? CROUCH_SPEED : state.keys.has('ShiftLeft') ? 2 : 3.6);
      const gait: Gait = state.crouch ? 'crouch' : state.keys.has('ShiftLeft') ? 'quiet' : 'walk';
      const ground = world.castRay(new rapier.Ray(position, { x: 0, y: -1, z: 0 }), .97, true, undefined, undefined, undefined, body);
      const traveled = Math.hypot(position.x - lastPlayerPosition.current.x, position.z - lastPlayerPosition.current.z);
      lastPlayerPosition.current.set(position.x, position.y, position.z);
      const footfalls = ground && movement.lengthSq() > 0 && traveled < 1
        ? advanceFootsteps(playerStepDistance.current, traveled)
        : { distanceSinceStep: playerStepDistance.current, count: 0 };
      playerStepDistance.current = footfalls.distanceSinceStep;
      // Jumping from a crouch stands up first.
      const jump = state.jump && ground && !state.crouch;
      if (state.jump && state.crouch) state.crouch = false;
      body.setLinvel({ x: movement.x, y: jump ? 5 : body.linvel().y, z: movement.z }, true);
      state.jump = false;
      if (footfalls.count > 0) {
        for (const guard of guards.current) hearFootstep(guard, new Vector3(position.x, 0, position.z), gait, level);
      }
      const beforeWindups = guards.current.map(guard => guard.shotWindup);
      const events = updateSecurity(guards.current, worker.current, camera.position, dt, level, security.current, { crouched: state.crouch, veiled: g.veiled > 0 });
      for (const flag of events.cameraFlags) {
        g.stats.cameraFlags++;
        g.stats.reports++;
        cue('radioDone');
        say(flag.dispatched >= 0 ? 'Camera flagged you · a guard is coming to check' : 'Camera flagged you · security is wary');
      }
      shots.push(...events.shots);
      g.stats.reports += events.reports.length;
      for (const report of events.reports) {
        cue('radioDone');
        say(report.reason === 'contact' ? 'Contact radioed · security converging on your position'
          : report.reason === 'attacked' ? 'Recovered guard reported the attack · security is wary'
          : 'Incapacitation reported · security is wary');
      }
      guards.current.forEach((guard, index) => {
        if (guard.armed && guard.shotWindup > 0 && beforeWindups[index] === 0) cue('aim');
        if (guard.radio && !radioActive.current[index]) cue('radio');
        // A call that vanished without completing was cut off (the lock lands later in the previous frame).
        if (!guard.radio && radioActive.current[index] && !events.reports.some(report => report.guard === index)) g.stats.callsCutOff++;
        radioActive.current[index] = !!guard.radio;
        const distanceMoved = lastGuardPositions.current[index].distanceTo(guard.position);
        lastGuardPositions.current[index].copy(guard.position);
        const step = advanceFootsteps(stepDistances.current[index], distanceMoved);
        stepDistances.current[index] = step.distanceSinceStep;
        if (!g.muted && step.count > 0 && footstepAudio.current) {
          const soundPosition = guard.position.clone().add(new Vector3(0, 1.2, 0));
          const throughWall = !clearSight(camera.position, soundPosition, level);
          for (let i = 0; i < step.count; i++) footstepAudio.current.play(index, guard.position, throughWall);
        }
        const before = previousModes.current[index];
        if (guard.mode === 'suspicious' && before === 'patrol') { cue('notice'); g.stats.noticed++; }
        if ((guard.mode === 'investigate' || guard.mode === 'check') && before === 'patrol') cue('notice');
        if (guard.mode === 'alert' && before !== 'alert') { cue('alert'); g.stats.spotted++; }
        previousModes.current[index] = guard.mode;
      });
      updateWorker(worker.current, camera.position, dt, level, state.crouch, g.veiled > 0);
      if (worker.current.mode === 'noticed' && previousWorkerMode.current === 'working') { cue('notice'); g.stats.noticed++; }
      if (worker.current.witnessed && !workerWitnessed.current) g.stats.spotted++;
      workerWitnessed.current = worker.current.witnessed;
      if (worker.current.mode === 'fleeing' && previousWorkerMode.current !== 'fleeing') cue('panic');
      if (worker.current.mode === 'calling' && previousWorkerMode.current !== 'calling') cue('report');
      previousWorkerMode.current = worker.current.mode;
      if (seekerFlight.current) {
        const flight = seekerFlight.current;
        const flightTarget = flight.targetKind === 'worker' ? worker.current : guards.current[flight.targetIndex];
        const result = advanceSeeker(flight, flightTarget.position, dt, level);
        if (result !== 'flying') {
          seekerFlight.current = null;
          g.seekerFlying = false;
          if (result === 'hit') {
            if (flight.targetKind === 'worker') lockWorker(worker.current, SEEKER_LOCK_DURATION);
            else lockGuard(guards.current[flight.targetIndex], SEEKER_LOCK_DURATION);
            cue('motor'); say('Crystal impact · target held for 10 seconds');
          } else say('Seeker Crystal lost its route.');
        }
      }
      if (position.y < -4) { g.status = 'failed'; g.failureReason = 'fall'; say('Arrival lost. Restart the operation.'); }
    } else {
      lastPlayerPosition.current.set(position.x, position.y, position.z);
      body.setLinvel({ x: 0, y: body.linvel().y, z: 0 }, true);
    }

    // First physical hit: characters carry stable IDs, so a wall in front blocks targeting,
    // and a floor hit is the surface for Blink and Echo Lure. Spells apply their own ranges.
    const hit = world.castRay(new rapier.Ray(camera.position, direction), SEEKER_RANGE, true, undefined, undefined, undefined, body);
    const hitData = hit?.collider.parent()?.userData as { guard?: number; worker?: boolean } | undefined;
    const aim: Aim = { target: null, floor: null, floorDistance: Infinity, arrivalClear: false };
    if (hit && hitData?.guard !== undefined) aim.target = { kind: 'guard', index: hitData.guard, npc: guards.current[hitData.guard], distance: hit.timeOfImpact };
    else if (hit && hitData?.worker) aim.target = { kind: 'worker', index: 0, npc: worker.current, distance: hit.timeOfImpact };
    else if (hit && direction.y < -.04) {
      const point = camera.position.clone().addScaledVector(direction, hit.timeOfImpact);
      if (Math.abs(point.y) < .08 && safeFloor(point, level)) {
        aim.floor = point;
        aim.floorDistance = hit.timeOfImpact;
        aim.arrivalClear = !world.intersectionWithShape({ x: point.x, y: .92, z: point.z }, { x: 0, y: 0, z: 0, w: 1 }, new rapier.Capsule(.55, .33), undefined, undefined, undefined, body);
      }
    }
    const target = aim.target;
    const label = target?.kind === 'worker' ? 'Worker' : 'Guard';
    const canRestrain = !!target && target.npc.locked > 0 && !target.npc.restrained && target.distance <= RESTRAIN_RANGE;
    g.target = target?.npc.restrained ? `${label} restrained`
      : canRestrain ? `Hold E · Restrain  ·  ${target.npc.locked.toFixed(1)}s`
      : target && target.npc.locked > 0 ? `${label} immobilized · ${target.npc.locked.toFixed(1)}s · get close to restrain`
      : aimPrompt(aim);
    // Restraint needs the button held on the same immobilized target until it completes.
    if (active && canRestrain && state.keys.has('KeyE')) {
      if (restraint.current.target !== target.npc) restraint.current = { target: target.npc, progress: 0 };
      restraint.current.progress += dt;
      if (restraint.current.progress >= RESTRAIN_TIME) {
        if (target.kind === 'worker') restrainWorker(worker.current); else restrainGuard(target.npc as Guard);
        restraint.current = { target: null, progress: 0 };
        pulse('restrain');
        cue('restrain');
        say(`${label} restrained · out of the operation, but can still be found`);
      }
    } else restraint.current = { target: null, progress: 0 };
    g.restrain = restraint.current.progress / RESTRAIN_TIME;
    if (preview.current) { preview.current.visible = active && blink.offered(aim) && g.cooldowns.blink <= 0; if (aim.floor) preview.current.position.set(aim.floor.x, .025, aim.floor.z); }
    if (lurePreview.current) { lurePreview.current.visible = active && echoLure.offered(aim) && g.cooldowns.lure <= 0; if (aim.floor) lurePreview.current.position.set(aim.floor.x, .028, aim.floor.z); }
    /** Presentation for a successful cast; the spell has already changed the game state. */
    const present = (effect: SpellEffect) => {
      switch (effect.kind) {
        case 'lock':
          lockEffect.current = { time: .22, from: effect.from, to: effect.to };
          cue('motor');
          break;
        case 'seeker':
          seekerFlight.current = effect.flight;
          g.seekerFlying = true;
          cue('seeker');
          break;
        case 'lure':
          lureEffectTime.current = .7;
          lureEffect.current?.position.set(effect.point.x, .03, effect.point.z);
          sound(context => playLure(context, effect.point));
          break;
        case 'sense':
          senseState.current = { time: LIFE_SENSE_DURATION, origin: effect.origin };
          cue('sense');
          break;
        case 'veil':
          g.veiled = VEIL_DURATION;
          cue('veil');
          break;
        case 'blink':
          body.setTranslation({ x: effect.destination.x, y: .92, z: effect.destination.z }, true);
          lastPlayerPosition.current.set(effect.destination.x, .92, effect.destination.z);
          body.setLinvel({ x: 0, y: 0, z: 0 }, true);
          cue('blink');
          break;
      }
    };
    if (active && state.casts.size > 0) {
      const spellWorld: SpellWorld = {
        guards: guards.current, worker: worker.current, level,
        body: new Vector3(position.x, 0, position.z), eye: camera.position.clone(), seekerInFlight: !!seekerFlight.current, veiled: g.veiled > 0,
      };
      for (const spell of SPELLS) {
        if (!state.casts.has(spell.id)) continue;
        const result = tryCast(spell, g.cooldowns, aim, spellWorld);
        if (!result.cast) { say(result.message); continue; }
        // Acting draws attention: any other spell drops an active Veil.
        const dropsVeil = spell.id !== 'veil' && g.veiled > 0;
        if (dropsVeil) g.veiled = 0;
        say(dropsVeil ? `${result.message} · Veil dropped` : result.message);
        pulse(spell.id);
        present(result.effect);
      }
    }
    const nearArtifact = camera.position.distanceTo(artifact) < 2.3 && clearSight(camera.position, artifact, level);
    const atExit = Math.hypot(position.x - level.extraction[0], position.z - level.extraction[2]) < 1.4;
    if (canRestrain) { /* the Restraint prompt takes E */ }
    else if (nearArtifact && !g.carrying) g.target = 'E · Recover transit core';
    else if (atExit && g.carrying) g.target = 'E · Extract with transit core';
    if (active && state.interact && !canRestrain) {
      if (nearArtifact && !g.carrying) { g.carrying = true; cue('core'); say('Core secured. Return to the insertion point.'); }
      else if (atExit && g.carrying) g.status = 'success';
      else say(g.carrying ? 'Return to the marked extraction circle.' : 'Find the transit core in Research.');
    }
    for (const shooter of shots) {
      sound(context => playShot(context, shooter.position));
      const tracer = tracerEffects.current.reduce((oldest, effect) => effect.time < oldest.time ? effect : oldest);
      tracer.from.copy(shooter.position).add(new Vector3(
        Math.cos(shooter.facing) * .37 + Math.sin(shooter.facing) * .93,
        1.7,
        -Math.sin(shooter.facing) * .37 + Math.cos(shooter.facing) * .93,
      ));
      tracer.to.copy(camera.position).add(new Vector3(0, -.28, 0));
      tracer.time = .18;
      const finalPosition = body.translation();
      const finalEye = new Vector3(finalPosition.x, finalPosition.y + eyeOffset.current, finalPosition.z);
      if (g.status === 'playing' && canGuardHit(shooter, finalEye, level, state.crouch)) {
        g.health = Math.max(0, g.health - 1);
        pulse('hit');
        say(`Guard fire · ${g.health}/${PLAYER_MAX_HEALTH} vitality`);
        if (g.health === 0) { g.status = 'failed'; g.failureReason = 'shot'; }
      }
    }
    state.casts.clear();
    state.interact = false;
    if (seekerMesh.current) {
      seekerMesh.current.visible = !!seekerFlight.current;
      if (seekerFlight.current) {
        seekerMesh.current.position.copy(seekerFlight.current.position);
        seekerMesh.current.rotation.y += dt * 6;
        seekerMesh.current.rotation.z += dt * 3;
      }
    }
    if (artifactMesh.current) { artifactMesh.current.visible = !g.carrying; if (active) artifactMesh.current.rotation.y += dt * .5; }
    const cameras = security.current.cameras;
    g.suspicion = Math.max(worker.current.suspicion, ...guards.current.map(v => v.suspicion), ...cameras.map(c => c.suspicion));
    g.alarm = Math.max(...guards.current.map(v => v.alarm));
    g.shotWindup = Math.max(...guards.current.map(v => v.shotWindup));
    const call = leadingCall(guards.current);
    g.radio = call ? Math.min(1, call.time / RADIO_CALL_TIME) : 0;
    g.radioReason = call?.reason ?? null;
    g.wary = security.current.wary;
    g.workerMode = worker.current.mode;
    g.crouched = state.crouch;
    g.senseActive = senseState.current.time;
    g.threats = threats(guards.current, worker.current, camera.position, state.yaw, cameras);
    g.exposure = Math.max(worker.current.exposure, ...guards.current.map(v => v.exposure), ...cameras.map(c => c.exposure));
    g.workerReport = worker.current.report;
    g.awareness = awarenessLabel(guards.current, worker.current, security.current.wary, cameras);
    if (g.alarm >= 3 && g.status === 'playing') { g.status = 'failed'; g.failureReason = 'guard'; }
    if (g.workerReport >= WORKER_CALL_DURATION && g.status === 'playing') { g.status = 'failed'; g.failureReason = 'worker'; say('The office worker reported the intrusion.'); }
    if (g.status !== 'playing' && dragLook) onPause();
    if (g.status !== 'playing' && state.locked) document.exitPointerLock();
    g.publish += rawDelta;
    if (g.publish > .08) { g.publish = 0; onHUD({ ...g, cooldowns: { ...g.cooldowns }, stats: { ...g.stats, casts: { ...g.stats.casts } } }); }
  });

  return <>
    <Environment worker={worker.current} level={level} />
    <RigidBody ref={player} position={level.spawn} colliders={false} enabledRotations={[false, false, false]} friction={0} ccd>
      <CapsuleCollider args={[.55, .3]} />
    </RigidBody>
    {guards.current.map((guard, index) => <GuardCharacter key={index} guard={guard} index={index} sense={senseState} />)}
    <WorkerCharacter worker={worker.current} sense={senseState} />
    {security.current.cameras.map((securityCamera, index) => <CameraRig key={index} camera={securityCamera} />)}
    <mesh ref={senseWave} rotation={[-Math.PI / 2, 0, 0]} visible={false}><ringGeometry args={[.97, 1, 64]} /><meshBasicMaterial color="#cfe6ec" transparent opacity={0} depthWrite={false} /></mesh>
    <mesh ref={preview} rotation={[-Math.PI / 2, 0, 0]} visible={false}><ringGeometry args={[.3, .38, 40]} /><meshBasicMaterial color="#b9e2e5" /></mesh>
    <mesh ref={lurePreview} rotation={[-Math.PI / 2, 0, 0]} visible={false}><ringGeometry args={[.46, .5, 40]} /><meshBasicMaterial color="#d9ba83" transparent opacity={.75} depthWrite={false} /></mesh>
    <mesh ref={lureEffect} rotation={[-Math.PI / 2, 0, 0]} visible={false}><ringGeometry args={[.33, .37, 40]} /><meshBasicMaterial color="#e8c993" transparent opacity={0} depthWrite={false} /></mesh>
    <mesh ref={lockBeam} visible={false}><cylinderGeometry args={[.012, .012, 1, 6]} /><meshBasicMaterial color="#c2dbe1" transparent opacity={0} depthWrite={false} /></mesh>
    {tracerEffects.current.map((_, index) => <group key={index} ref={node => { shotTracers.current[index] = node; }} visible={false}>
      <mesh><cylinderGeometry args={[.025, .025, 1, 6]} /><meshBasicMaterial color="#ffd797" toneMapped={false} depthWrite={false} /></mesh>
      <mesh><cylinderGeometry args={[.075, .075, 1, 8]} /><meshBasicMaterial color="#f6a54f" transparent opacity={.23} toneMapped={false} depthWrite={false} /></mesh>
    </group>)}
    <group ref={seekerMesh} visible={false}>
      <mesh castShadow><octahedronGeometry args={[.16]} /><meshStandardMaterial color="#16232c" metalness={.7} roughness={.16} emissive="#668b99" emissiveIntensity={.7} /></mesh>
      <mesh scale={1.25}><octahedronGeometry args={[.16]} /><meshBasicMaterial color="#c5e5ed" wireframe transparent opacity={.7} depthWrite={false} /></mesh>
      <pointLight color="#b5d8e5" intensity={1.1} distance={2.5} />
    </group>
    <mesh ref={artifactMesh} position={artifact} castShadow><octahedronGeometry args={[.28]} /><meshStandardMaterial color="#162832" metalness={.8} roughness={.2} emissive="#6494a4" emissiveIntensity={.65} /></mesh>
  </>;
}
