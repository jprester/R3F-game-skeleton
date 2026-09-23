import { RigidBody } from '@react-three/rapier';
import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { CanvasTexture, Mesh, MeshBasicMaterial } from 'three';
import { WORKER_CALL_DURATION, type Worker } from './worker';
import type { Level } from './levels';

export default function Environment({ worker, level }: { worker: Worker; level: Level }) {
  const panelLight = useRef<Mesh>(null);
  const panelProgress = useRef<Mesh>(null);
  useFrame(() => {
    if (panelLight.current) (panelLight.current.material as MeshBasicMaterial).color.set(worker.mode === 'calling' ? '#ff6557' : '#b84f45');
    if (panelProgress.current) {
      const progress = worker.report / WORKER_CALL_DURATION;
      panelProgress.current.scale.y = Math.max(.001, progress);
      panelProgress.current.position.y = 1.15 + .15 * progress;
    }
  });
  return <>
    <color attach="background" args={['#111a23']} />
    <fog attach="fog" args={['#111a23', 16, 40]} />
    <ambientLight intensity={.85} color="#b8cde0" />
    <hemisphereLight args={['#d6e7f4', '#28313a', 1]} />
    {level.solids.map((s, i) => <RigidBody key={i} type="fixed" colliders="cuboid" position={s.position}>
      <mesh receiveShadow castShadow><boxGeometry args={s.size} /><meshStandardMaterial color={s.color} roughness={.8} /></mesh>
    </RigidBody>)}
    {level.lights.map(([x, y, z], i) => <group key={i} position={[x, y, z]}>
      <pointLight intensity={28} distance={13} color={level.id === 'annex' && x > 0 ? '#a9d4e3' : i === level.lights.length - 1 ? '#b2d8ed' : '#ede6d7'} />
      <mesh position={[0, .4, 0]}><boxGeometry args={[3, .06, .3]} /><meshStandardMaterial emissive={level.id === 'annex' && x > 0 ? '#9ac8da' : '#d2e6ee'} emissiveIntensity={3} /></mesh>
    </group>)}
    {level.id === 'annex' && [-1, 1].map(side => <group key={`route-${side}`}>
      <mesh position={[side * 4.25, .013, 2.4]}><boxGeometry args={[1.1, .012, 3.5]} /><meshBasicMaterial color={side < 0 ? '#826c55' : '#4d7480'} /></mesh>
      <mesh position={[side * 4.25, 2.82, .21]}><boxGeometry args={[1.55, .045, .08]} /><meshBasicMaterial color={side < 0 ? '#d8aa76' : '#91c9d9'} /></mesh>
    </group>)}
    {/* Monitors and desk feet give the blockout familiar human scale. */}
    {level.id === 'demo' && [-4, -7].map(z => <group key={z}>
      <mesh position={[-1, 1.8, z]}><boxGeometry args={[.85, .48, .07]} /><meshStandardMaterial color="#0e1b24" emissive="#49748c" emissiveIntensity={.5} /></mesh>
    </group>)}
    {level.signs.map((sign, index) => <Sign key={index} {...sign} />)}
    <mesh position={level.worker.panel}><boxGeometry args={[.12, .55, .46]} /><meshStandardMaterial color="#2c363d" metalness={.35} /></mesh>
    <mesh ref={panelLight} position={[level.worker.panel[0] + .09, level.worker.panel[1] + .12, level.worker.panel[2]]}><boxGeometry args={[.045, .13, .3]} /><meshBasicMaterial color="#b84f45" /></mesh>
    <mesh ref={panelProgress} position={[level.worker.panel[0] + .1, 1.15, level.worker.panel[2]]}><boxGeometry args={[.05, .3, .09]} /><meshBasicMaterial color="#f38c72" /></mesh>
    <mesh position={[worker.alarmPoint.x, .016, worker.alarmPoint.z]} rotation={[-Math.PI / 2, 0, 0]}><ringGeometry args={[.52, .59, 40]} /><meshBasicMaterial color="#bf7165" /></mesh>
    <mesh position={[level.extraction[0], .012, level.extraction[2]]} rotation={[-Math.PI / 2, 0, 0]}><ringGeometry args={[1.15, 1.22, 48]} /><meshBasicMaterial color="#91cbbb" /></mesh>
  </>;
}

function Sign({ position, text, rotation = 0 }: { position: [number, number, number]; text: string; rotation?: number }) {
  const texture = useMemo(() => {
    const canvas = document.createElement('canvas'); canvas.width = 512; canvas.height = 64;
    const context = canvas.getContext('2d')!;
    context.fillStyle = '#d5e3eb'; context.font = '32px sans-serif'; context.textAlign = 'center';
    context.fillText(text, 256, 44);
    return new CanvasTexture(canvas);
  }, [text]);
  useEffect(() => () => texture.dispose(), [texture]);
  return <mesh position={position} rotation={[0, rotation, 0]}><planeGeometry args={[2.6, .325]} /><meshBasicMaterial map={texture} transparent /></mesh>;
}
