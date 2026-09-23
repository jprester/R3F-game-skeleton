import { useRef, type RefObject } from 'react';
import { useFrame } from '@react-three/fiber';
import { DoubleSide, Group, Mesh, MeshBasicMaterial, Vector3 } from 'three';
import { FOCUS_HALF_ANGLE, FOCUS_RANGE, senses, SIGHT_HALF_ANGLE, SIGHT_RANGE } from './mechanics';

/** Active Life Sense pulse: seconds remaining and where it was cast. */
export interface SenseState { time: number; origin: Vector3 }
export interface SenseReading { position: Vector3; color: string; watching: boolean }

export const SENSE_COLORS = { calm: '#bfe3ea', suspicious: '#e3cf96', alert: '#ee806e', down: '#6f8a94' };
const FADE = .5;

/**
 * Life Sense overlay for one NPC, placed inside its facing group so local +z is where it looks.
 * Drawn without depth testing so it reads through walls: a silhouette with a gaze line, the full
 * view cone, and the brighter focus cone where sight confirms at full speed.
 */
export default function SenseMarker({ sense, read }: { sense: RefObject<SenseState>; read: () => SenseReading }) {
  const group = useRef<Group>(null);
  const body = useRef<Mesh>(null);
  const gaze = useRef<Mesh>(null);
  const view = useRef<Mesh>(null);
  const focus = useRef<Mesh>(null);

  useFrame(() => {
    if (!group.current) return;
    const pulse = sense.current;
    const reading = read();
    const on = pulse.time > 0 && senses(pulse.origin, reading.position);
    group.current.visible = on;
    if (!on) return;
    const fade = Math.min(1, pulse.time / FADE);
    const bodyMaterial = body.current!.material as MeshBasicMaterial;
    bodyMaterial.color.set(reading.color);
    bodyMaterial.opacity = .55 * fade;
    view.current!.visible = focus.current!.visible = gaze.current!.visible = reading.watching;
    const gazeMaterial = gaze.current!.material as MeshBasicMaterial;
    gazeMaterial.color.set(reading.color);
    gazeMaterial.opacity = .8 * fade;
    (view.current!.material as MeshBasicMaterial).opacity = .07 * fade;
    (focus.current!.material as MeshBasicMaterial).opacity = .15 * fade;
  });

  return <group ref={group} visible={false}>
    <mesh ref={body} position={[0, .92, 0]} renderOrder={20}>
      <capsuleGeometry args={[.3, 1.1, 4, 10]} />
      <meshBasicMaterial transparent depthTest={false} depthWrite={false} />
    </mesh>
    {/* Gaze line at head height: reads at eye level, where the floor cones flatten out. */}
    <mesh ref={gaze} position={[0, 1.62, .75]} renderOrder={21}>
      <boxGeometry args={[.035, .035, 1.1]} />
      <meshBasicMaterial transparent depthTest={false} depthWrite={false} />
    </mesh>
    {/* Circle sectors lie in XY around +y; rotating a quarter turn about x lays them on the floor around +z. */}
    <mesh ref={view} position={[0, .04, 0]} rotation={[Math.PI / 2, 0, 0]} renderOrder={19}>
      <circleGeometry args={[SIGHT_RANGE, 40, Math.PI / 2 - SIGHT_HALF_ANGLE, 2 * SIGHT_HALF_ANGLE]} />
      <meshBasicMaterial color="#d8eef2" transparent side={DoubleSide} depthTest={false} depthWrite={false} />
    </mesh>
    <mesh ref={focus} position={[0, .05, 0]} rotation={[Math.PI / 2, 0, 0]} renderOrder={19}>
      <circleGeometry args={[FOCUS_RANGE, 24, Math.PI / 2 - FOCUS_HALF_ANGLE, 2 * FOCUS_HALF_ANGLE]} />
      <meshBasicMaterial color="#d8eef2" transparent side={DoubleSide} depthTest={false} depthWrite={false} />
    </mesh>
  </group>;
}
