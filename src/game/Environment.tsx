import { RigidBody } from '@react-three/rapier';
import { useEffect, useMemo } from 'react';
import { CanvasTexture } from 'three';
import { solids } from './mechanics';

export default function Environment() {
  return <>
    <color attach="background" args={['#111a23']} />
    <fog attach="fog" args={['#111a23', 16, 40]} />
    <ambientLight intensity={.85} color="#b8cde0" />
    <hemisphereLight args={['#d6e7f4', '#28313a', 1]} />
    {solids.map((s, i) => <RigidBody key={i} type="fixed" colliders="cuboid" position={s.position}>
      <mesh receiveShadow castShadow><boxGeometry args={s.size} /><meshStandardMaterial color={s.color} roughness={.8} /></mesh>
    </RigidBody>)}
    {[4, -5, -14].map((z, i) => <group key={z}>
      <pointLight position={[0, 3.1, z]} intensity={28} distance={13} color={i === 2 ? '#b2d8ed' : '#ede6d7'} />
      <mesh position={[0, 3.5, z]}><boxGeometry args={[3, .06, .3]} /><meshStandardMaterial emissive="#d2e6ee" emissiveIntensity={3} /></mesh>
    </group>)}
    {/* Monitors and desk feet give the blockout familiar human scale. */}
    {[-4, -7].map(z => <group key={z}>
      <mesh position={[-1, 1.8, z]}><boxGeometry args={[.85, .48, .07]} /><meshStandardMaterial color="#0e1b24" emissive="#49748c" emissiveIntensity={.5} /></mesh>
    </group>)}
    <Sign position={[0, 2.45, .14]} text="01 / OPERATIONS" />
    <Sign position={[0, 2.45, -9.85]} text="02 / RESEARCH" />
    <Sign position={[0, 2.4, 7.85]} text="EXTRACTION" rotation={Math.PI} />
    <mesh position={[0, .012, 5.5]} rotation={[-Math.PI / 2, 0, 0]}><ringGeometry args={[1.15, 1.22, 48]} /><meshBasicMaterial color="#91cbbb" /></mesh>
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
