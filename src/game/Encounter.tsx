import { useEffect, useRef, type RefObject } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { CapsuleCollider, RapierRigidBody, RigidBody, useRapier } from '@react-three/rapier';
import { Group, Mesh, MeshBasicMaterial, Quaternion, Vector3 } from 'three';
import Environment from './Environment';
import GuardCharacter from './GuardCharacter';
import { GuardFootsteps } from './GuardFootsteps';
import WorkerCharacter from './WorkerCharacter';
import { advanceFootsteps, advanceSeeker, BLINK_COOLDOWN, BLINK_RANGE, canGuardHit, clearSight, createGuards, hearFootstep, hearLure, LOCK_COOLDOWN, LOCK_DURATION, LOCK_RANGE, LURE_COOLDOWN, LURE_RANGE, PLAYER_MAX_HEALTH, safeFloor, SEEKER_COOLDOWN, SEEKER_LOCK_DURATION, SEEKER_RANGE, updateGuard, type Guard, type SeekerFlight } from './mechanics';
import { createWorker, lockWorker, updateWorker, WORKER_CALL_DURATION, type Worker } from './worker';
import type { Level } from './levels';

export interface HUD {
  locked: boolean; status: 'playing' | 'success' | 'failed'; carrying: boolean;
  failureReason: 'guard' | 'worker' | 'shot' | 'fall' | null;
  blink: number; motor: number; seeker: number; lure: number; seekerFlying: boolean; suspicion: number; alarm: number;
  health: number; shotWindup: number;
  workerMode: Worker['mode']; workerReport: number;
  message: string; target: string; elapsed: number;
  awareness: string; pulse: { id: number; kind: 'blink' | 'motor' | 'seeker' | 'lure' | 'hit' } | null; muted: boolean;
}
export const initialHUD: HUD = { locked: false, status: 'playing', carrying: false, failureReason: null, blink: 0, motor: 0, seeker: 0, lure: 0, seekerFlying: false, suspicion: 0, alarm: 0, health: PLAYER_MAX_HEALTH, shotWindup: 0, workerMode: 'working', workerReport: 0, message: '', target: '', elapsed: 0, awareness: '', pulse: null, muted: false };

export default function Encounter({ onHUD, dragLook, onPause, audio, level }: { onHUD: (hud: HUD) => void; dragLook: boolean; onPause: () => void; audio: RefObject<AudioContext | null>; level: Level }) {
  const player = useRef<RapierRigidBody>(null);
  const preview = useRef<Mesh>(null);
  const lurePreview = useRef<Mesh>(null);
  const lureEffect = useRef<Mesh>(null);
  const lureEffectTime = useRef(0);
  const lockBeam = useRef<Mesh>(null);
  const shotTracer = useRef<Group>(null);
  const seekerMesh = useRef<Group>(null);
  const seekerFlight = useRef<SeekerFlight | null>(null);
  const lockEffect = useRef({ time: 0, from: new Vector3(), to: new Vector3() });
  const tracerEffect = useRef({ time: 0, from: new Vector3(), to: new Vector3() });
  const artifactMesh = useRef<Mesh>(null);
  const guards = useRef(createGuards(level));
  const worker = useRef(createWorker(level));
  const previousModes = useRef(guards.current.map(g => g.mode));
  const previousWorkerMode = useRef(worker.current.mode);
  const lastGuardPositions = useRef(guards.current.map(g => g.position.clone()));
  const stepDistances = useRef(guards.current.map(() => 0));
  const lastPlayerPosition = useRef(new Vector3(...level.spawn));
  const artifact = useRef(new Vector3(...level.artifact)).current;
  const playerStepDistance = useRef(0);
  const footstepAudio = useRef<GuardFootsteps | null>(null);
  const input = useRef({ keys: new Set<string>(), yaw: 0, pitch: 0, locked: false, motor: false, seeker: false, lure: false, blink: false, interact: false, jump: false });
  const game = useRef({ ...initialHUD, messageTime: 0, publish: 0 });
  const { camera, gl } = useThree();
  const { world, rapier } = useRapier();
  const say = (message: string) => { game.current.message = message; game.current.messageTime = 2.5; };
  const unlockAudio = () => {
    if (audio.current?.state === 'suspended') void audio.current.resume();
  };
  const cue = (kind: 'notice' | 'alert' | 'motor' | 'blink' | 'core' | 'seeker' | 'panic' | 'report' | 'aim') => {
    const context = audio.current;
    if (!context || context.state !== 'running' || game.current.muted) return;
    const now = context.currentTime;
    const settings = {
      notice: [390, 495, .16, .025], alert: [280, 185, .32, .045],
      motor: [560, 230, .22, .055], blink: [155, 410, .24, .06],
      core: [330, 660, .42, .035], seeker: [720, 340, .3, .04],
      panic: [480, 760, .3, .04], report: [680, 520, .35, .05], aim: [350, 490, .21, .035],
    }[kind];
    const [start, end, duration, volume] = settings;
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = kind === 'alert' ? 'sawtooth' : 'sine';
    oscillator.frequency.setValueAtTime(start, now);
    oscillator.frequency.exponentialRampToValueAtTime(end, now + duration);
    gain.gain.setValueAtTime(.0001, now);
    gain.gain.exponentialRampToValueAtTime(volume, now + .025);
    gain.gain.exponentialRampToValueAtTime(.0001, now + duration);
    oscillator.connect(gain).connect(context.destination);
    oscillator.start(now); oscillator.stop(now + duration + .02);
  };
  const cueLure = (point: Vector3) => {
    const context = audio.current;
    if (!context || context.state !== 'running' || game.current.muted) return;
    const now = context.currentTime;
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    const panner = context.createPanner();
    panner.panningModel = 'HRTF';
    panner.distanceModel = 'inverse';
    panner.refDistance = 3;
    panner.maxDistance = 22;
    panner.rolloffFactor = .65;
    panner.positionX.setValueAtTime(point.x, now);
    panner.positionY.setValueAtTime(.7, now);
    panner.positionZ.setValueAtTime(point.z, now);
    oscillator.type = 'triangle';
    oscillator.frequency.setValueAtTime(680, now);
    oscillator.frequency.exponentialRampToValueAtTime(270, now + .36);
    gain.gain.setValueAtTime(.0001, now);
    gain.gain.exponentialRampToValueAtTime(.075, now + .02);
    gain.gain.exponentialRampToValueAtTime(.0001, now + .42);
    oscillator.connect(gain).connect(panner).connect(context.destination);
    oscillator.start(now); oscillator.stop(now + .44);
  };
  const cueShot = (point: Vector3) => {
    const context = audio.current;
    if (!context || context.state !== 'running' || game.current.muted) return;
    const now = context.currentTime;
    const length = Math.floor(context.sampleRate * .14);
    const buffer = context.createBuffer(1, length, context.sampleRate);
    const samples = buffer.getChannelData(0);
    for (let i = 0; i < length; i++) samples[i] = (Math.random() * 2 - 1) * (1 - i / length);
    const source = context.createBufferSource();
    source.buffer = buffer;
    const filter = context.createBiquadFilter();
    filter.type = 'highpass'; filter.frequency.value = 220;
    const gain = context.createGain();
    gain.gain.setValueAtTime(.08, now);
    gain.gain.exponentialRampToValueAtTime(.0001, now + .14);
    const panner = context.createPanner();
    panner.panningModel = 'HRTF'; panner.distanceModel = 'inverse';
    panner.refDistance = 4; panner.maxDistance = 25; panner.rolloffFactor = .7;
    panner.positionX.setValueAtTime(point.x, now);
    panner.positionY.setValueAtTime(1.4, now);
    panner.positionZ.setValueAtTime(point.z, now);
    source.connect(filter).connect(gain).connect(panner).connect(context.destination);
    source.start(now); source.stop(now + .14);
  };
  useEffect(() => () => footstepAudio.current?.dispose(), []);

  useEffect(() => {
    const state = input.current;
    const lock = () => { state.locked = document.pointerLockElement === gl.domElement; if (!state.locked) { state.keys.clear(); state.motor = state.seeker = state.lure = state.blink = state.interact = state.jump = false; } };
    const down = (e: KeyboardEvent) => {
      if (e.code === 'Escape') { onPause(); return; }
      if (!state.locked && !dragLook) return;
      unlockAudio();
      if (['Space', 'KeyQ', 'KeyE', 'KeyF', 'KeyR', 'KeyW', 'KeyA', 'KeyS', 'KeyD'].includes(e.code)) e.preventDefault();
      state.keys.add(e.code);
      if (e.repeat) return;
      if (e.code === 'KeyM') game.current.muted = !game.current.muted;
      if (e.code === 'KeyQ') state.blink = true;
      if (e.code === 'KeyF') state.seeker = true;
      if (e.code === 'KeyR') state.lure = true;
      if (e.code === 'KeyE') state.interact = true;
      if (e.code === 'Space') state.jump = true;
    };
    const up = (e: KeyboardEvent) => state.keys.delete(e.code);
    const move = (e: MouseEvent) => { if (state.locked || (dragLook && e.buttons === 2)) { state.yaw -= e.movementX * .002; state.pitch = Math.max(-1.45, Math.min(1.45, state.pitch - e.movementY * .002)); } };
    const mouse = (e: MouseEvent) => { if ((state.locked || dragLook) && e.button === 0) { unlockAudio(); state.motor = true; } };
    const context = (e: MouseEvent) => e.preventDefault();
    const blur = () => { onPause(); state.keys.clear(); state.motor = state.seeker = state.lure = state.blink = state.interact = state.jump = false; if (document.pointerLockElement) document.exitPointerLock(); };
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
    camera.position.set(position.x, position.y + .65, position.z);
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
    if (shotTracer.current) {
      const effect = tracerEffect.current;
      effect.time = Math.max(0, effect.time - dt);
      shotTracer.current.visible = effect.time > 0;
      if (effect.time > 0) {
        const delta = effect.to.clone().sub(effect.from);
        const distance = delta.length();
        const progress = 1 - effect.time / .18;
        const head = Math.min(distance, distance * progress);
        const tail = Math.max(0, head - 1.5);
        const length = Math.max(.04, head - tail);
        shotTracer.current.position.copy(effect.from).addScaledVector(delta, (head + tail) / (2 * distance));
        shotTracer.current.quaternion.setFromUnitVectors(new Vector3(0, 1, 0), delta.normalize());
        shotTracer.current.scale.y = length;
      }
    }
    if (lureEffect.current) {
      if (active) lureEffectTime.current = Math.max(0, lureEffectTime.current - dt);
      lureEffect.current.visible = lureEffectTime.current > 0;
      lureEffect.current.scale.setScalar(1 + (1 - lureEffectTime.current / .7) * 2.5);
      (lureEffect.current.material as MeshBasicMaterial).opacity = lureEffectTime.current / .7 * .65;
    }
    g.locked = (state.locked || dragLook) && g.status === 'playing';
    if (active) {
      g.elapsed += dt; g.blink = Math.max(0, g.blink - dt); g.motor = Math.max(0, g.motor - dt); g.seeker = Math.max(0, g.seeker - dt); g.lure = Math.max(0, g.lure - dt);
      g.messageTime -= dt; if (g.messageTime <= 0) g.message = '';
      const movement = new Vector3(Number(state.keys.has('KeyD')) - Number(state.keys.has('KeyA')), 0, Number(state.keys.has('KeyS')) - Number(state.keys.has('KeyW')));
      movement.normalize().applyAxisAngle(new Vector3(0, 1, 0), state.yaw).multiplyScalar(state.keys.has('ShiftLeft') ? 2 : 3.6);
      const ground = world.castRay(new rapier.Ray(position, { x: 0, y: -1, z: 0 }), .97, true, undefined, undefined, undefined, body);
      const traveled = Math.hypot(position.x - lastPlayerPosition.current.x, position.z - lastPlayerPosition.current.z);
      lastPlayerPosition.current.set(position.x, position.y, position.z);
      const footfalls = ground && movement.lengthSq() > 0 && traveled < 1
        ? advanceFootsteps(playerStepDistance.current, traveled)
        : { distanceSinceStep: playerStepDistance.current, count: 0 };
      playerStepDistance.current = footfalls.distanceSinceStep;
      body.setLinvel({ x: movement.x, y: state.jump && ground ? 5 : body.linvel().y, z: movement.z }, true);
      state.jump = false;
      guards.current.forEach((guard, index) => {
        if (footfalls.count > 0) hearFootstep(guard, new Vector3(position.x, 0, position.z), state.keys.has('ShiftLeft'), level);
        const beforeWindup = guard.shotWindup;
        if (updateGuard(guard, camera.position, dt, level)) shots.push(guard);
        if (guard.armed && guard.shotWindup > 0 && beforeWindup === 0) cue('aim');
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
        if (guard.mode === 'suspicious' && before === 'patrol') cue('notice');
        if (guard.mode === 'investigate' && before === 'patrol') cue('notice');
        if (guard.mode === 'alert' && before !== 'alert') cue('alert');
        previousModes.current[index] = guard.mode;
      });
      updateWorker(worker.current, camera.position, dt, level);
      if (worker.current.mode === 'noticed' && previousWorkerMode.current === 'working') cue('notice');
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
            else {
              const targetGuard = guards.current[flight.targetIndex];
              targetGuard.locked = Math.max(targetGuard.locked, SEEKER_LOCK_DURATION);
              targetGuard.alerted = true; targetGuard.suspicion = 1;
              targetGuard.alarm = 0; targetGuard.mode = 'locked';
            }
            cue('motor'); say('Crystal impact · target held for 10 seconds');
          } else say('Seeker Crystal lost its route.');
        }
      }
      if (position.y < -4) { g.status = 'failed'; g.failureReason = 'fall'; say('Arrival lost. Restart the operation.'); }
    } else {
      lastPlayerPosition.current.set(position.x, position.y, position.z);
      body.setLinvel({ x: 0, y: body.linvel().y, z: 0 }, true);
    }

    // First physical hit determines both spell targeting and the Blink surface.
    const hit = world.castRay(new rapier.Ray(camera.position, direction), SEEKER_RANGE, true, undefined, undefined, undefined, body);
    const hitData = hit?.collider.parent()?.userData as { guard?: number; worker?: boolean } | undefined;
    const targetIndex = hitData?.guard ?? -1;
    const targetGuard = targetIndex >= 0 ? guards.current[targetIndex] : undefined;
    const targetWorker = hitData?.worker ? worker.current : undefined;
    // Character bodies carry stable IDs; the first ray hit prevents targeting through walls.
    const target = targetGuard ?? targetWorker;
    g.target = target ? (target.locked > 0 ? `${targetWorker ? 'Worker' : 'Guard'} immobilized · ${target.locked.toFixed(1)}s` : `${targetWorker ? 'Worker · ' : ''}${hit!.timeOfImpact <= LOCK_RANGE ? 'LMB · Motor Lock  /  ' : ''}F · Seeker Crystal`) : '';
    let destination: Vector3 | null = null;
    let lurePoint: Vector3 | null = null;
    if (hit && direction.y < -.04 && hit.timeOfImpact <= LURE_RANGE) {
      const point = camera.position.clone().addScaledVector(direction, hit.timeOfImpact);
      if (Math.abs(point.y) < .08 && safeFloor(point, level)) {
        lurePoint = point;
        if (hit.timeOfImpact <= BLINK_RANGE) {
          const arrival = { x: point.x, y: .92, z: point.z };
          const occupied = world.intersectionWithShape(arrival, { x: 0, y: 0, z: 0, w: 1 }, new rapier.Capsule(.55, .33), undefined, undefined, undefined, body);
          if (!occupied) destination = point;
        }
      }
    }
    if (preview.current) { preview.current.visible = active && !!destination && g.blink <= 0; if (destination) preview.current.position.set(destination.x, .025, destination.z); }
    if (lurePreview.current) { lurePreview.current.visible = active && !!lurePoint && g.lure <= 0; if (lurePoint) lurePreview.current.position.set(lurePoint.x, .028, lurePoint.z); }
    if (!target && lurePoint) g.target = `${destination ? 'Q · Blink  /  ' : ''}R · Echo Lure`;
    if (active && state.motor) {
      if (g.motor > 0) say('Motor Lock recharging.');
      else if (!target || hit!.timeOfImpact > LOCK_RANGE) say('Aim at a guard within 10 m. Clear line of sight required.');
      else if (target.locked > 0) say('Target already immobilized.');
      else {
        if (targetWorker) lockWorker(targetWorker, LOCK_DURATION);
        else if (targetGuard) {
          targetGuard.locked = LOCK_DURATION; targetGuard.alerted = true; targetGuard.suspicion = 1;
          targetGuard.lastSeen = new Vector3(position.x, 0, position.z); targetGuard.search = 4;
          targetGuard.alarm = 0; targetGuard.shotWindup = 0; targetGuard.muzzleFlash = 0; targetGuard.mode = 'locked';
        }
        g.motor = LOCK_COOLDOWN;
        lockEffect.current = { time: .22, from: camera.position.clone(), to: target.position.clone().add(new Vector3(0, 1.15, 0)) };
        g.pulse = { id: g.pulse ? g.pulse.id + 1 : 1, kind: 'motor' };
        cue('motor');
        say(`${targetWorker ? 'Worker' : 'Guard'} immobilized · 6 seconds`);
      }
    }
    if (active && state.seeker) {
      if (g.seeker > 0) say('Seeker Crystal recharging.');
      else if (seekerFlight.current) say('Seeker Crystal already in flight.');
      else if (!target) say('Aim at a visible guard or worker within 14 m.');
      else if (target.locked > 0) say('Target already immobilized.');
      else {
        seekerFlight.current = { position: new Vector3(camera.position.x, 1.25, camera.position.z), targetKind: targetWorker ? 'worker' : 'guard', targetIndex: targetWorker ? 0 : targetIndex, route: [], replan: 0, life: 8 };
        g.seeker = SEEKER_COOLDOWN; g.seekerFlying = true;
        g.pulse = { id: g.pulse ? g.pulse.id + 1 : 1, kind: 'seeker' };
        cue('seeker'); say('Seeker Crystal tracking target.');
      }
    }
    if (active && state.lure) {
      if (g.lure > 0) say('Echo Lure recharging.');
      else if (!lurePoint) say('Aim at clear, visible floor within 12 m.');
      else {
        guards.current.forEach(guard => hearLure(guard, lurePoint, level));
        g.lure = LURE_COOLDOWN;
        g.pulse = { id: g.pulse ? g.pulse.id + 1 : 1, kind: 'lure' };
        lureEffectTime.current = .7;
        lureEffect.current?.position.set(lurePoint.x, .03, lurePoint.z);
        cueLure(lurePoint);
        say('Echo Lure placed. Security may investigate the sound.');
      }
    }
    if (active && state.blink) {
      if (g.blink > 0) say('Blink recharging.');
      else if (!destination) say('Aim at clear floor within 7 m. Arrival must be unobstructed.');
      else { body.setTranslation({ x: destination.x, y: .92, z: destination.z }, true); lastPlayerPosition.current.set(destination.x, .92, destination.z); body.setLinvel({ x: 0, y: 0, z: 0 }, true); g.blink = BLINK_COOLDOWN; g.pulse = { id: g.pulse ? g.pulse.id + 1 : 1, kind: 'blink' }; cue('blink'); say('Translation verified.'); }
    }
    const nearArtifact = camera.position.distanceTo(artifact) < 2.3 && clearSight(camera.position, artifact, level);
    const atExit = Math.hypot(position.x - level.extraction[0], position.z - level.extraction[2]) < 1.4;
    if (nearArtifact && !g.carrying) g.target = 'E · Recover transit core';
    else if (atExit && g.carrying) g.target = 'E · Extract with transit core';
    if (active && state.interact) {
      if (nearArtifact && !g.carrying) { g.carrying = true; cue('core'); say('Core secured. Return to the insertion point.'); }
      else if (atExit && g.carrying) g.status = 'success';
      else say(g.carrying ? 'Return to the marked extraction circle.' : 'Find the transit core in Research.');
    }
    for (const shooter of shots) {
      cueShot(shooter.position);
      tracerEffect.current.from.copy(shooter.position).add(new Vector3(
        Math.cos(shooter.facing) * .37 + Math.sin(shooter.facing) * .93,
        1.7,
        -Math.sin(shooter.facing) * .37 + Math.cos(shooter.facing) * .93,
      ));
      tracerEffect.current.to.copy(camera.position).add(new Vector3(0, -.28, 0));
      tracerEffect.current.time = .18;
      const finalPosition = body.translation();
      const finalEye = new Vector3(finalPosition.x, finalPosition.y + .65, finalPosition.z);
      if (g.status === 'playing' && canGuardHit(shooter, finalEye, level)) {
        g.health = Math.max(0, g.health - 1);
        g.pulse = { id: g.pulse ? g.pulse.id + 1 : 1, kind: 'hit' };
        say(`Guard fire · ${g.health}/${PLAYER_MAX_HEALTH} vitality`);
        if (g.health === 0) { g.status = 'failed'; g.failureReason = 'shot'; }
      }
    }
    state.motor = state.seeker = state.lure = state.blink = state.interact = false;
    if (seekerMesh.current) {
      seekerMesh.current.visible = !!seekerFlight.current;
      if (seekerFlight.current) {
        seekerMesh.current.position.copy(seekerFlight.current.position);
        seekerMesh.current.rotation.y += dt * 6;
        seekerMesh.current.rotation.z += dt * 3;
      }
    }
    if (artifactMesh.current) { artifactMesh.current.visible = !g.carrying; if (active) artifactMesh.current.rotation.y += dt * .5; }
    g.suspicion = Math.max(worker.current.suspicion, ...guards.current.map(v => v.suspicion));
    g.alarm = Math.max(...guards.current.map(v => v.alarm));
    g.shotWindup = Math.max(...guards.current.map(v => v.shotWindup));
    g.workerMode = worker.current.mode;
    g.workerReport = worker.current.report;
    g.awareness = g.alarm > 0 ? 'ALARM CALL' :
      worker.current.mode === 'calling' ? 'WORKER REPORT' :
      worker.current.mode === 'fleeing' ? 'WORKER RUNNING TO ALARM' :
      guards.current.some(v => v.mode === 'alert') ? 'CONTACT CONFIRMED' :
      guards.current.some(v => (v.mode === 'investigate' || v.mode === 'search') && v.lastSeen) ? 'INVESTIGATING LAST CONTACT' :
      guards.current.some(v => (v.mode === 'investigate' || v.mode === 'search') && v.lastHeard) ? 'INVESTIGATING A SOUND' :
      guards.current.some(v => v.mode === 'suspicious') ? 'SECURITY ATTENTION' :
      worker.current.mode === 'noticed' ? 'WORKER NOTICED MOVEMENT' : '';
    if (g.alarm >= 3 && g.status === 'playing') { g.status = 'failed'; g.failureReason = 'guard'; }
    if (g.workerReport >= WORKER_CALL_DURATION && g.status === 'playing') { g.status = 'failed'; g.failureReason = 'worker'; say('The office worker reported the intrusion.'); }
    if (g.status !== 'playing' && dragLook) onPause();
    if (g.status !== 'playing' && state.locked) document.exitPointerLock();
    g.publish += rawDelta;
    if (g.publish > .08) { g.publish = 0; onHUD({ ...g }); }
  });

  return <>
    <Environment worker={worker.current} level={level} />
    <RigidBody ref={player} position={level.spawn} colliders={false} enabledRotations={[false, false, false]} friction={0} ccd>
      <CapsuleCollider args={[.55, .3]} />
    </RigidBody>
    {guards.current.map((guard, index) => <GuardCharacter key={index} guard={guard} index={index} />)}
    <WorkerCharacter worker={worker.current} />
    <mesh ref={preview} rotation={[-Math.PI / 2, 0, 0]} visible={false}><ringGeometry args={[.3, .38, 40]} /><meshBasicMaterial color="#b9e2e5" /></mesh>
    <mesh ref={lurePreview} rotation={[-Math.PI / 2, 0, 0]} visible={false}><ringGeometry args={[.46, .5, 40]} /><meshBasicMaterial color="#d9ba83" transparent opacity={.75} depthWrite={false} /></mesh>
    <mesh ref={lureEffect} rotation={[-Math.PI / 2, 0, 0]} visible={false}><ringGeometry args={[.33, .37, 40]} /><meshBasicMaterial color="#e8c993" transparent opacity={0} depthWrite={false} /></mesh>
    <mesh ref={lockBeam} visible={false}><cylinderGeometry args={[.012, .012, 1, 6]} /><meshBasicMaterial color="#c2dbe1" transparent opacity={0} depthWrite={false} /></mesh>
    <group ref={shotTracer} visible={false}>
      <mesh><cylinderGeometry args={[.025, .025, 1, 6]} /><meshBasicMaterial color="#ffd797" toneMapped={false} depthWrite={false} /></mesh>
      <mesh><cylinderGeometry args={[.075, .075, 1, 8]} /><meshBasicMaterial color="#f6a54f" transparent opacity={.23} toneMapped={false} depthWrite={false} /></mesh>
    </group>
    <group ref={seekerMesh} visible={false}>
      <mesh castShadow><octahedronGeometry args={[.16]} /><meshStandardMaterial color="#16232c" metalness={.7} roughness={.16} emissive="#668b99" emissiveIntensity={.7} /></mesh>
      <mesh scale={1.25}><octahedronGeometry args={[.16]} /><meshBasicMaterial color="#c5e5ed" wireframe transparent opacity={.7} depthWrite={false} /></mesh>
      <pointLight color="#b5d8e5" intensity={1.1} distance={2.5} />
    </group>
    <mesh ref={artifactMesh} position={artifact} castShadow><octahedronGeometry args={[.28]} /><meshStandardMaterial color="#162832" metalness={.8} roughness={.2} emissive="#6494a4" emissiveIntensity={.65} /></mesh>
  </>;
}
