import { useRef, type RefObject } from 'react';
import { useFrame } from '@react-three/fiber';
import { CapsuleCollider, RigidBody, type RapierRigidBody } from '@react-three/rapier';
import { Group, Mesh, MeshBasicMaterial } from 'three';
import type { Worker } from './worker';
import SenseMarker, { SENSE_COLORS, type SenseState } from './SenseMarker';

const senseColor = (worker: Worker) => worker.locked > 0 || worker.restrained ? SENSE_COLORS.down
  : worker.mode === 'fleeing' || worker.mode === 'calling' ? SENSE_COLORS.alert
  : worker.mode === 'noticed' ? SENSE_COLORS.suspicious : SENSE_COLORS.calm;

/** A visibly unarmed office worker, separate from the armored security silhouette. */
export default function WorkerCharacter({ worker, sense }: { worker: Worker; sense: RefObject<SenseState> }) {
  const body = useRef<RapierRigidBody>(null);
  const facing = useRef<Group>(null);
  const leftLeg = useRef<Group>(null);
  const rightLeg = useRef<Group>(null);
  const leftArm = useRef<Group>(null);
  const rightArm = useRef<Group>(null);
  const marker = useRef<Mesh>(null);
  const beacon = useRef<Mesh>(null);
  const bindings = useRef<Group>(null);
  const previous = useRef(worker.position.clone());
  const stride = useRef(0);

  useFrame((_, dt) => {
    body.current?.setNextKinematicTranslation({ x: worker.position.x, y: .9, z: worker.position.z });
    if (facing.current) {
      facing.current.rotation.y = worker.facing;
      facing.current.position.y = worker.restrained ? -1.63 : -.9;
    }
    if (bindings.current) bindings.current.visible = worker.restrained;
    if (marker.current) marker.current.visible = worker.locked > 0;
    if (beacon.current) {
      beacon.current.visible = worker.mode !== 'working' && worker.mode !== 'locked' && worker.mode !== 'restrained';
      (beacon.current.material as MeshBasicMaterial).color.set(
        worker.mode === 'calling' ? '#f28c77' : '#e8c790',
      );
    }
    const traveled = previous.current.distanceTo(worker.position);
    previous.current.copy(worker.position);
    if (worker.restrained) {
      leftLeg.current?.rotation.set(-1.5, 0, 0); rightLeg.current?.rotation.set(-1.5, 0, 0);
      leftArm.current?.rotation.set(.45, 0, 0); rightArm.current?.rotation.set(.45, 0, 0);
      return;
    }
    if (worker.locked > 0) return;
    stride.current += traveled;
    const swing = traveled > .0001 ? Math.sin(stride.current * 8) * .6 : 0;
    const panic = worker.mode === 'fleeing' || worker.mode === 'calling';
    const blend = Math.min(1, dt * 12);
    if (leftLeg.current) leftLeg.current.rotation.x += (swing - leftLeg.current.rotation.x) * blend;
    if (rightLeg.current) rightLeg.current.rotation.x += (-swing - rightLeg.current.rotation.x) * blend;
    if (leftArm.current) leftArm.current.rotation.x += ((panic ? -.7 : -swing * .5) - leftArm.current.rotation.x) * blend;
    if (rightArm.current) rightArm.current.rotation.x += ((worker.mode === 'calling' ? -1.15 : panic ? -.45 : swing * .5) - rightArm.current.rotation.x) * blend;
  });

  return <RigidBody ref={body} type="kinematicPosition" position={[worker.position.x, .9, worker.position.z]} colliders={false} userData={{ worker: true }} name="office-worker">
    <CapsuleCollider args={[.55, .26]} />
    <group ref={facing} position={[0, -.9, 0]}>
      <mesh position={[0, 1.17, 0]} castShadow><boxGeometry args={[.44, .66, .26]} /><meshStandardMaterial color="#8d786f" roughness={.9} /></mesh>
      <mesh position={[0, 1.14, .145]}><boxGeometry args={[.23, .48, .025]} /><meshStandardMaterial color="#c8bcb0" /></mesh>
      <mesh position={[0, 1.61, 0]} castShadow><sphereGeometry args={[.18, 12, 10]} /><meshStandardMaterial color="#bc9e88" roughness={.92} /></mesh>
      <mesh position={[0, 1.74, -.025]} castShadow><sphereGeometry args={[.185, 12, 8, 0, Math.PI * 2, 0, Math.PI * .44]} /><meshStandardMaterial color="#302e31" roughness={.98} /></mesh>
      <mesh position={[0, 1.25, .174]}><boxGeometry args={[.055, .26, .02]} /><meshStandardMaterial color="#3b6176" /></mesh>
      {([-1, 1] as const).map(side => <group key={`leg-${side}`} ref={side < 0 ? leftLeg : rightLeg} position={[side * .13, .87, 0]}>
        <mesh position={[0, -.31, 0]} castShadow><boxGeometry args={[.18, .62, .2]} /><meshStandardMaterial color="#313d49" roughness={.9} /></mesh>
        <mesh position={[0, -.66, .08]} castShadow><boxGeometry args={[.2, .13, .31]} /><meshStandardMaterial color="#202831" /></mesh>
      </group>)}
      {([-1, 1] as const).map(side => <group key={`arm-${side}`} ref={side < 0 ? leftArm : rightArm} position={[side * .31, 1.44, 0]}>
        <mesh position={[0, -.28, 0]} castShadow><boxGeometry args={[.15, .56, .2]} /><meshStandardMaterial color="#8d786f" roughness={.9} /></mesh>
        <mesh position={[0, -.59, .02]} castShadow><boxGeometry args={[.13, .17, .16]} /><meshStandardMaterial color="#bc9e88" roughness={.92} /></mesh>
      </group>)}
      <group ref={bindings} visible={false}>
        {/* Thin black-silver restraint bands pinning the arms to the torso. */}
        {[1.02, 1.3].map(y => <mesh key={y} position={[0, y, -.03]} rotation={[Math.PI / 2, 0, 0]}><torusGeometry args={[.38, .014, 6, 32]} /><meshStandardMaterial color="#0d1418" emissive="#9fc3cc" emissiveIntensity={.55} metalness={.6} roughness={.3} /></mesh>)}
      </group>
      <SenseMarker sense={sense} read={() => ({ position: worker.position, color: senseColor(worker), watching: worker.locked <= 0 && !worker.restrained })} />
      <mesh ref={marker} visible={false} position={[0, 1.1, 0]}><boxGeometry args={[.7, 1.7, .55]} /><meshBasicMaterial color="#a7dbe5" wireframe transparent opacity={.46} /></mesh>
      <mesh ref={beacon} visible={false} position={[0, 2.03, 0]}><octahedronGeometry args={[.13]} /><meshBasicMaterial color="#e8c790" /></mesh>
    </group>
  </RigidBody>;
}
