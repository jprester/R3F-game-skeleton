import { useEffect, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { CapsuleCollider, RapierRigidBody, RigidBody, useRapier } from '@react-three/rapier';
import { Group, Mesh, Vector3 } from 'three';
import Environment from './Environment';
import { ARTIFACT, BLINK_COOLDOWN, BLINK_RANGE, clearSight, createGuards, EXTRACTION, Guard, LOCK_COOLDOWN, LOCK_DURATION, LOCK_RANGE, safeFloor, SPAWN, updateGuard } from './mechanics';

export interface HUD {
  locked: boolean; status: 'playing' | 'success' | 'failed'; carrying: boolean;
  blink: number; motor: number; suspicion: number; alarm: number;
  message: string; target: string; elapsed: number;
}
export const initialHUD: HUD = { locked: false, status: 'playing', carrying: false, blink: 0, motor: 0, suspicion: 0, alarm: 0, message: '', target: '', elapsed: 0 };

function GuardModel({ guard, index }: { guard: Guard; index: number }) {
  const body = useRef<RapierRigidBody>(null);
  const model = useRef<Group>(null);
  const marker = useRef<Mesh>(null);
  useFrame(() => {
    body.current?.setNextKinematicTranslation({ x: guard.position.x, y: .9, z: guard.position.z });
    if (model.current) model.current.rotation.y = guard.facing;
    if (marker.current) marker.current.visible = guard.locked > 0;
  });
  return <RigidBody ref={body} type="kinematicPosition" position={[guard.position.x, .9, guard.position.z]} colliders={false} userData={{ guard: index }} name={`guard-${index}`}>
    <CapsuleCollider args={[.55, .28]} />
    <group ref={model} position={[0, -.9, 0]}>
      <mesh position={[0, 1.1, 0]} castShadow><boxGeometry args={[.52, .68, .3]} /><meshStandardMaterial color="#263544" /></mesh>
      <mesh position={[0, 1.66, 0]} castShadow><sphereGeometry args={[.19, 16, 12]} /><meshStandardMaterial color="#a69788" /></mesh>
      <mesh position={[0, 1.69, .16]}><boxGeometry args={[.3, .07, .08]} /><meshStandardMaterial color="#121d28" /></mesh>
      {[-1, 1].map(side => <group key={side}>
        <mesh position={[side * .14, .4, 0]} castShadow><boxGeometry args={[.2, .8, .23]} /><meshStandardMaterial color="#202c37" /></mesh>
        <mesh position={[side * .34, 1.04, .06]} castShadow><boxGeometry args={[.15, .55, .18]} /><meshStandardMaterial color="#263544" /></mesh>
      </group>)}
      <mesh position={[.18, 1.13, .3]}><boxGeometry args={[.1, .12, .5]} /><meshStandardMaterial color="#111820" /></mesh>
      <mesh ref={marker} position={[0, 1.08, 0]}><boxGeometry args={[.8, 1.65, .65]} /><meshBasicMaterial color="#b1dcea" wireframe transparent opacity={.45} /></mesh>
    </group>
  </RigidBody>;
}

export default function Encounter({ onHUD, dragLook, onPause }: { onHUD: (hud: HUD) => void; dragLook: boolean; onPause: () => void }) {
  const player = useRef<RapierRigidBody>(null);
  const preview = useRef<Mesh>(null);
  const artifactMesh = useRef<Mesh>(null);
  const guards = useRef(createGuards());
  const input = useRef({ keys: new Set<string>(), yaw: 0, pitch: 0, locked: false, motor: false, blink: false, interact: false, jump: false });
  const game = useRef({ ...initialHUD, messageTime: 0, publish: 0 });
  const { camera, gl } = useThree();
  const { world, rapier } = useRapier();
  const say = (message: string) => { game.current.message = message; game.current.messageTime = 2.5; };

  useEffect(() => {
    const state = input.current;
    const lock = () => { state.locked = document.pointerLockElement === gl.domElement; if (!state.locked) { state.keys.clear(); state.motor = state.blink = state.interact = state.jump = false; } };
    const down = (e: KeyboardEvent) => {
      if (e.code === 'Escape') { onPause(); return; }
      if (!state.locked && !dragLook) return;
      if (['Space', 'KeyQ', 'KeyE', 'KeyW', 'KeyA', 'KeyS', 'KeyD'].includes(e.code)) e.preventDefault();
      state.keys.add(e.code);
      if (e.repeat) return;
      if (e.code === 'KeyQ') state.blink = true;
      if (e.code === 'KeyE') state.interact = true;
      if (e.code === 'Space') state.jump = true;
    };
    const up = (e: KeyboardEvent) => state.keys.delete(e.code);
    const move = (e: MouseEvent) => { if (state.locked || (dragLook && e.buttons === 2)) { state.yaw -= e.movementX * .002; state.pitch = Math.max(-1.45, Math.min(1.45, state.pitch - e.movementY * .002)); } };
    const mouse = (e: MouseEvent) => { if ((state.locked || dragLook) && e.button === 0) state.motor = true; };
    const context = (e: MouseEvent) => e.preventDefault();
    const blur = () => { onPause(); state.keys.clear(); state.motor = state.blink = state.interact = state.jump = false; if (document.pointerLockElement) document.exitPointerLock(); };
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
    g.locked = (state.locked || dragLook) && g.status === 'playing';
    if (active) {
      g.elapsed += dt; g.blink = Math.max(0, g.blink - dt); g.motor = Math.max(0, g.motor - dt);
      g.messageTime -= dt; if (g.messageTime <= 0) g.message = '';
      const movement = new Vector3(Number(state.keys.has('KeyD')) - Number(state.keys.has('KeyA')), 0, Number(state.keys.has('KeyS')) - Number(state.keys.has('KeyW')));
      movement.normalize().applyAxisAngle(new Vector3(0, 1, 0), state.yaw).multiplyScalar(state.keys.has('ShiftLeft') ? 2 : 3.6);
      const ground = world.castRay(new rapier.Ray(position, { x: 0, y: -1, z: 0 }), .97, true, undefined, undefined, undefined, body);
      body.setLinvel({ x: movement.x, y: state.jump && ground ? 5 : body.linvel().y, z: movement.z }, true);
      state.jump = false;
      guards.current.forEach(guard => updateGuard(guard, camera.position, dt));
      if (position.y < -4) { g.status = 'failed'; say('Arrival lost. Restart the operation.'); }
    } else body.setLinvel({ x: 0, y: body.linvel().y, z: 0 }, true);

    // First physical hit determines both spell targeting and the Blink surface.
    const hit = world.castRay(new rapier.Ray(camera.position, direction), LOCK_RANGE, true, undefined, undefined, undefined, body);
    const targetIndex = hit ? guards.current.findIndex((_, i) => hit.collider.parent()?.userData && (hit.collider.parent()?.userData as { guard?: number }).guard === i) : -1;
    // Guard bodies carry stable IDs; rays cannot select guards through walls.
    const target = targetIndex >= 0 ? guards.current[targetIndex] : undefined;
    g.target = target ? (target.locked > 0 ? `Motor locked · ${target.locked.toFixed(1)}s` : 'LMB · Motor Lock') : '';
    let destination: Vector3 | null = null;
    if (hit && direction.y < -.04 && hit.timeOfImpact <= BLINK_RANGE) {
      const point = camera.position.clone().addScaledVector(direction, hit.timeOfImpact);
      if (Math.abs(point.y) < .08 && safeFloor(point)) {
        const arrival = { x: point.x, y: .92, z: point.z };
        const occupied = world.intersectionWithShape(arrival, { x: 0, y: 0, z: 0, w: 1 }, new rapier.Capsule(.55, .33), undefined, undefined, undefined, body);
        if (!occupied) destination = point;
      }
    }
    if (preview.current) { preview.current.visible = active && !!destination && g.blink <= 0; if (destination) preview.current.position.set(destination.x, .025, destination.z); }
    if (active && state.motor) {
      if (g.motor > 0) say('Motor Lock recharging.');
      else if (!target) say('Aim at a guard within 10 m. Clear line of sight required.');
      else if (target.locked > 0) say('Target already immobilized.');
      else { target.locked = LOCK_DURATION; target.alerted = true; target.suspicion = 1; target.lastSeen = new Vector3(position.x, 0, position.z); target.search = 4; target.alarm = 0; g.motor = LOCK_COOLDOWN; say('Motor control suppressed · 6 seconds'); }
    }
    if (active && state.blink) {
      if (g.blink > 0) say('Blink recharging.');
      else if (!destination) say('Aim at clear floor within 7 m. Arrival must be unobstructed.');
      else { body.setTranslation({ x: destination.x, y: .92, z: destination.z }, true); body.setLinvel({ x: 0, y: 0, z: 0 }, true); g.blink = BLINK_COOLDOWN; say('Translation verified.'); }
    }
    const nearArtifact = camera.position.distanceTo(ARTIFACT) < 2.3 && clearSight(camera.position, ARTIFACT);
    const atExit = Math.hypot(position.x - EXTRACTION.x, position.z - EXTRACTION.z) < 1.4;
    if (nearArtifact && !g.carrying) g.target = 'E · Recover transit core';
    else if (atExit && g.carrying) g.target = 'E · Extract with transit core';
    if (active && state.interact) {
      if (nearArtifact && !g.carrying) { g.carrying = true; say('Core secured. Return to the insertion point.'); }
      else if (atExit && g.carrying) g.status = 'success';
      else say(g.carrying ? 'Return to the marked extraction circle.' : 'Find the transit core in Research.');
    }
    state.motor = state.blink = state.interact = false;
    if (artifactMesh.current) { artifactMesh.current.visible = !g.carrying; if (active) artifactMesh.current.rotation.y += dt * .5; }
    g.suspicion = Math.max(...guards.current.map(v => v.suspicion));
    g.alarm = Math.max(...guards.current.map(v => v.alarm));
    if (g.alarm >= 3 && g.status === 'playing') g.status = 'failed';
    if (g.status !== 'playing' && dragLook) onPause();
    if (g.status !== 'playing' && state.locked) document.exitPointerLock();
    g.publish += rawDelta;
    if (g.publish > .08) { g.publish = 0; onHUD({ ...g }); }
  });

  return <>
    <Environment />
    <RigidBody ref={player} position={SPAWN} colliders={false} enabledRotations={[false, false, false]} friction={0} ccd>
      <CapsuleCollider args={[.55, .3]} />
    </RigidBody>
    {guards.current.map((guard, index) => <GuardModel key={index} guard={guard} index={index} />)}
    <mesh ref={preview} rotation={[-Math.PI / 2, 0, 0]} visible={false}><ringGeometry args={[.3, .38, 40]} /><meshBasicMaterial color="#b9e2e5" /></mesh>
    <mesh ref={artifactMesh} position={ARTIFACT} castShadow><octahedronGeometry args={[.28]} /><meshStandardMaterial color="#162832" metalness={.8} roughness={.2} emissive="#6494a4" emissiveIntensity={.65} /></mesh>
  </>;
}

