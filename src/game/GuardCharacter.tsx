import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { CapsuleCollider, RigidBody, type RapierRigidBody } from '@react-three/rapier';
import { Group, Mesh, MeshBasicMaterial } from 'three';
import { GUARD_STRIDE, type Guard } from './mechanics';

const uniform = '#263645';
const armor = '#17242f';
const trim = '#82949b';

/** An articulated prototype guard that can later be replaced by a rigged GLB. */
export default function GuardCharacter({ guard, index }: { guard: Guard; index: number }) {
  const body = useRef<RapierRigidBody>(null);
  const facing = useRef<Group>(null);
  const torso = useRef<Group>(null);
  const head = useRef<Group>(null);
  const leftLeg = useRef<Group>(null);
  const rightLeg = useRef<Group>(null);
  const leftArm = useRef<Group>(null);
  const rightArm = useRef<Group>(null);
  const marker = useRef<Mesh>(null);
  const beacon = useRef<Mesh>(null);
  const muzzle = useRef<Mesh>(null);
  const bindings = useRef<Group>(null);
  const lastPosition = useRef(guard.position.clone());
  const strideDistance = useRef(0);

  useFrame((_, delta) => {
    body.current?.setNextKinematicTranslation({ x: guard.position.x, y: .9, z: guard.position.z });
    if (facing.current) {
      facing.current.rotation.y = guard.facing;
      facing.current.position.y = guard.restrained ? -1.62 : -.9;
    }
    if (bindings.current) bindings.current.visible = guard.restrained;
    if (marker.current) marker.current.visible = guard.locked > 0;
    if (muzzle.current) muzzle.current.visible = guard.muzzleFlash > 0 && guard.locked <= 0;
    if (beacon.current) {
      // A radio call blinks the beacon so the player can see who to silence.
      const radioBlink = guard.radio && Math.floor(guard.radio.time * 6) % 2 === 0;
      beacon.current.visible = guard.mode !== 'patrol' || !!guard.radio;
      (beacon.current.material as MeshBasicMaterial).color.set(
        guard.locked > 0 ? '#a7dbe5' : radioBlink ? '#f1f4f5' : guard.mode === 'alert' ? '#ee806e' : '#d8c68c',
      );
    }

    const traveled = lastPosition.current.distanceTo(guard.position);
    lastPosition.current.copy(guard.position);
    if (guard.restrained) {
      // Seated on the floor, legs forward, arms bound behind the back.
      if (beacon.current) beacon.current.visible = false;
      leftLeg.current?.rotation.set(-1.5, 0, 0); rightLeg.current?.rotation.set(-1.5, 0, 0);
      leftArm.current?.rotation.set(.5, 0, 0); rightArm.current?.rotation.set(.5, 0, 0);
      torso.current?.rotation.set(.12, 0, 0); head.current?.rotation.set(.25, 0, 0);
      return;
    }
    if (guard.locked > 0) return; // Motor Lock holds the exact pose in which it struck.
    strideDistance.current += traveled;
    const moving = traveled > .0001;
    const gait = Math.sin((strideDistance.current / GUARD_STRIDE) * Math.PI);
    const swing = moving ? gait * .48 : 0;
    const alert = guard.mode === 'alert';
    const aiming = guard.armed && alert && guard.shotCooldown <= 0;
    const searching = guard.mode === 'search';
    const radioing = !!guard.radio && !aiming;
    const blend = Math.min(1, delta * 12);
    if (leftLeg.current) leftLeg.current.rotation.x += (swing - leftLeg.current.rotation.x) * blend;
    if (rightLeg.current) rightLeg.current.rotation.x += (-swing - rightLeg.current.rotation.x) * blend;
    if (leftArm.current) leftArm.current.rotation.x +=
      ((aiming ? -1.05 : radioing ? -2.55 : alert ? -.55 : -swing * .55) - leftArm.current.rotation.x) * blend;
    if (rightArm.current) rightArm.current.rotation.x +=
      ((aiming ? -1.15 : alert ? -1.25 : swing * .55) - rightArm.current.rotation.x) * blend;
    if (torso.current) torso.current.rotation.x +=
      ((moving ? -.06 : 0) - torso.current.rotation.x) * blend;
    if (head.current) head.current.rotation.y +=
      ((searching ? Math.sin(guard.search * 2) * .5 : 0) - head.current.rotation.y) * blend;
  });

  return <RigidBody ref={body} type="kinematicPosition" position={[guard.position.x, .9, guard.position.z]} colliders={false} userData={{ guard: index }} name={`guard-${index}`}>
    <CapsuleCollider args={[.55, .28]} />
    <group ref={facing} position={[0, -.9, 0]}>
      {/* Hips and torso are separate pivots so alert and locomotion read at a distance. */}
      <mesh position={[0, .9, 0]} castShadow><boxGeometry args={[.42, .25, .27]} /><meshStandardMaterial color={armor} roughness={.9} /></mesh>
      <group ref={torso} position={[0, .95, 0]}>
        <mesh position={[0, .29, 0]} castShadow><boxGeometry args={[.57, .62, .32]} /><meshStandardMaterial color={uniform} roughness={.82} /></mesh>
        <mesh position={[0, .3, .18]}><boxGeometry args={[.39, .35, .045]} /><meshStandardMaterial color={armor} metalness={.28} roughness={.72} /></mesh>
        <mesh position={[-.14, .48, .21]}><boxGeometry args={[.12, .035, .012]} /><meshStandardMaterial color="#b7c4c7" emissive="#526b72" emissiveIntensity={.3} /></mesh>
        <mesh position={[.15, .48, .21]}><boxGeometry args={[.08, .055, .018]} /><meshStandardMaterial color="#d5ad81" emissive="#9d714a" emissiveIntensity={.35} /></mesh>
        <mesh position={[0, .02, .2]}><boxGeometry args={[.5, .09, .05]} /><meshStandardMaterial color="#101b24" /></mesh>
        <mesh position={[0, .64, -.035]}><cylinderGeometry args={[.11, .12, .18, 8]} /><meshStandardMaterial color="#8e8783" /></mesh>
        <group ref={head} position={[0, .61, 0]}>
          <mesh castShadow><sphereGeometry args={[.19, 12, 10]} /><meshStandardMaterial color="#b49e8d" roughness={.95} /></mesh>
          <mesh position={[0, .12, -.035]} castShadow><sphereGeometry args={[.197, 12, 8, 0, Math.PI * 2, 0, Math.PI * .48]} /><meshStandardMaterial color={armor} roughness={.8} /></mesh>
          <mesh position={[0, .025, .175]}><boxGeometry args={[.31, .065, .055]} /><meshStandardMaterial color="#111a20" metalness={.3} roughness={.4} /></mesh>
          <mesh position={[-.19, .025, 0]}><boxGeometry args={[.055, .16, .1]} /><meshStandardMaterial color={armor} /></mesh>
          <mesh position={[.19, .025, 0]}><boxGeometry args={[.055, .16, .1]} /><meshStandardMaterial color={armor} /></mesh>
        </group>
      </group>
      {([-1, 1] as const).map(side => <group key={`leg-${side}`} ref={side < 0 ? leftLeg : rightLeg} position={[side * .16, .86, 0]}>
        <mesh position={[0, -.22, 0]} castShadow><boxGeometry args={[.21, .48, .24]} /><meshStandardMaterial color={uniform} roughness={.85} /></mesh>
        <mesh position={[0, -.52, .015]} castShadow><boxGeometry args={[.195, .19, .235]} /><meshStandardMaterial color={armor} /></mesh>
        <mesh position={[0, -.72, 0]} castShadow><boxGeometry args={[.17, .35, .2]} /><meshStandardMaterial color={uniform} roughness={.85} /></mesh>
        <mesh position={[0, -.83, .085]} castShadow><boxGeometry args={[.22, .17, .35]} /><meshStandardMaterial color="#10191f" roughness={.95} /></mesh>
      </group>)}
      {([-1, 1] as const).map(side => <group key={`arm-${side}`} ref={side < 0 ? leftArm : rightArm} position={[side * .37, 1.51, 0]}>
        <mesh position={[0, -.14, 0]} castShadow><boxGeometry args={[.22, .29, .3]} /><meshStandardMaterial color={armor} roughness={.8} /></mesh>
        <mesh position={[0, -.37, 0]} castShadow><boxGeometry args={[.16, .43, .2]} /><meshStandardMaterial color={uniform} roughness={.85} /></mesh>
        <mesh position={[0, -.67, .025]} castShadow><boxGeometry args={[.16, .27, .19]} /><meshStandardMaterial color={armor} roughness={.8} /></mesh>
        <mesh position={[side * .005, -.76, .035]} castShadow><boxGeometry args={[.14, .14, .18]} /><meshStandardMaterial color="#141d24" /></mesh>
        <mesh position={[side * -.06, -.22, .157]}><boxGeometry args={[.035, .17, .01]} /><meshStandardMaterial color={trim} /></mesh>
        {side === 1 && guard.armed && <group position={[0, -.83, .1]}>
          <mesh castShadow><boxGeometry args={[.12, .18, .2]} /><meshStandardMaterial color="#11191f" metalness={.45} roughness={.42} /></mesh>
          <mesh position={[0, .075, .23]} castShadow><boxGeometry args={[.15, .11, .39]} /><meshStandardMaterial color="#20282c" metalness={.55} roughness={.38} /></mesh>
          <mesh ref={muzzle} visible={false} position={[0, .075, .49]}><sphereGeometry args={[.11, 8, 6]} /><meshBasicMaterial color="#f5c783" /></mesh>
        </group>}
      </group>)}
      <group ref={bindings} visible={false}>
        {/* Thin black-silver restraint bands pinning the arms to the torso. */}
        {[1.02, 1.3].map(y => <mesh key={y} position={[0, y, -.03]} rotation={[Math.PI / 2, 0, 0]}><torusGeometry args={[.45, .014, 6, 32]} /><meshStandardMaterial color="#0d1418" emissive="#9fc3cc" emissiveIntensity={.55} metalness={.6} roughness={.3} /></mesh>)}
      </group>
      <mesh ref={marker} visible={false} position={[0, 1.13, 0]}><boxGeometry args={[.75, 1.75, .59]} /><meshBasicMaterial color="#a7dbe5" wireframe transparent opacity={.46} /></mesh>
      <mesh ref={beacon} visible={false} position={[0, 2.04, 0]}><octahedronGeometry args={[.13]} /><meshBasicMaterial color="#d8c68c" /></mesh>
    </group>
  </RigidBody>;
}
