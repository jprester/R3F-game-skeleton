import { RigidBody } from '@react-three/rapier';
import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { CanvasTexture, Mesh, MeshBasicMaterial, RepeatWrapping, SRGBColorSpace } from 'three';
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
    {level.id === 'tower' && <TowerDressing />}
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

/** Warm linear LED strip along a wall face, as in the Kaeldyn concept art. [x, z] ends, height 2.75 m. */
const LED_STRIPS: [from: [number, number], to: [number, number]][] = [
  [[7.14, 7.8], [7.14, -13.8]], [[11.86, 7.8], [11.86, -13.8]],   // service corridor, both walls
  [[-11.8, -13.86], [6.8, -13.86]],                                  // open office, north wall
  [[.14, -14.2], [.14, -21.8]], [[11.86, -14.2], [11.86, -21.8]],   // security office
];

/** Kaeldyn Tower set dressing: night-city glass on the outer walls and warm LED strips. Decoration only. */
function TowerDressing() {
  return <>
    {/* Floor-to-ceiling glass on the outer walls of the open office and break room. */}
    <CityWindow position={[-11.86, 1.95, 0]} rotation={Math.PI / 2} length={28} seed={7} />
    <CityWindow position={[-2.5, 1.95, 13.86]} rotation={Math.PI} length={19} seed={19} />
    {LED_STRIPS.map(([[x0, z0], [x1, z1]], index) => {
      const length = Math.hypot(x1 - x0, z1 - z0);
      const alongX = Math.abs(x1 - x0) > Math.abs(z1 - z0);
      return <mesh key={index} position={[(x0 + x1) / 2, 2.75, (z0 + z1) / 2]}>
        <boxGeometry args={alongX ? [length, .035, .02] : [.02, .035, length]} />
        <meshBasicMaterial color="#e6bd7e" toneMapped={false} />
      </mesh>;
    })}
  </>;
}

/**
 * A band of window glass looking out on a generated night skyline: dark towers, scattered lit
 * windows, a warm glow near the street, and mullions every few metres.
 */
function CityWindow({ position, rotation, length, seed }: { position: [number, number, number]; rotation: number; length: number; seed: number }) {
  const texture = useMemo(() => {
    let state = seed;
    const random = () => (state = (state * 16807) % 2147483647) / 2147483647;
    const canvas = document.createElement('canvas'); canvas.width = 1024; canvas.height = 256;
    const context = canvas.getContext('2d')!;
    const sky = context.createLinearGradient(0, 0, 0, 256);
    sky.addColorStop(0, '#060c13'); sky.addColorStop(.7, '#0e1b28'); sky.addColorStop(1, '#2a3440');
    context.fillStyle = sky; context.fillRect(0, 0, 1024, 256);
    for (let layer = 0; layer < 2; layer++) {
      for (let x = -20; x < 1024;) {
        const width = 30 + random() * 70, top = (layer ? 90 : 40) + random() * 120;
        context.fillStyle = layer ? '#0b141c' : '#101c27';
        context.fillRect(x, top, width, 256 - top);
        for (let wy = top + 6; wy < 250; wy += 9) for (let wx = x + 4; wx < x + width - 4; wx += 7) {
          if (random() < (layer ? .16 : .08)) {
            context.fillStyle = random() < .8 ? '#d9c79a' : '#9fc6d2';
            context.globalAlpha = .45 + random() * .5;
            context.fillRect(wx, wy, 3, 4);
            context.globalAlpha = 1;
          }
        }
        x += width + random() * 10;
      }
    }
    context.fillStyle = '#05090d';
    for (let x = 0; x < 1024; x += 128) context.fillRect(x, 0, 5, 256);
    const map = new CanvasTexture(canvas);
    map.colorSpace = SRGBColorSpace;
    map.wrapS = RepeatWrapping;
    map.repeat.x = length / 8;
    return map;
  }, [seed, length]);
  useEffect(() => () => texture.dispose(), [texture]);
  return <mesh position={position} rotation={[0, rotation, 0]}>
    <planeGeometry args={[length, 2.3]} />
    <meshBasicMaterial map={texture} toneMapped={false} />
  </mesh>;
}
