import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { DoubleSide, Group, Mesh, MeshBasicMaterial } from 'three';
import { CAMERA_OPTICS, CAMERA_RESET, type SecurityCamera } from './camera';

const CONE_COLORS = { calm: '#9fc6d2', tracking: '#e3cf96', flagged: '#ee806e' };
/** Horizontal reach of the floor footprint: the lens is 2.9 m up and sees about head height at full range. */
const FOOTPRINT = Math.sqrt(CAMERA_OPTICS.range ** 2 - 1.4 ** 2);

/**
 * A ceiling camera and the floor footprint of its view. The footprint is always drawn:
 * cameras are meant to be read and timed, never to surprise.
 */
export default function CameraRig({ camera }: { camera: SecurityCamera }) {
  const head = useRef<Group>(null);
  const cone = useRef<Mesh>(null);
  const light = useRef<Mesh>(null);

  useFrame(({ clock }) => {
    if (head.current) head.current.rotation.y = camera.facing;
    if (cone.current) cone.current.rotation.y = camera.facing;
    const flagged = camera.reset > CAMERA_RESET - 2;
    const tracking = camera.suspicion > .01;
    const color = flagged ? CONE_COLORS.flagged : tracking ? CONE_COLORS.tracking : CONE_COLORS.calm;
    if (cone.current) {
      const material = (cone.current.children[0] as Mesh).material as MeshBasicMaterial;
      material.color.set(color);
      material.opacity = flagged ? .3 : tracking ? .18 + .14 * camera.suspicion : .13;
    }
    if (light.current) {
      const blink = flagged || tracking ? Math.sin(clock.elapsedTime * 14) > 0 : Math.sin(clock.elapsedTime * 3) > .6;
      (light.current.material as MeshBasicMaterial).color.set(blink ? (flagged || tracking ? '#ff6b5a' : '#9fd8c2') : '#28343a');
    }
  });

  const [x, y, z] = camera.position.toArray();
  return <>
    <group ref={head} position={[x, y, z]}>
      {/* Mount rises to the ceiling; the housing looks along local +z. */}
      <mesh position={[0, .38, 0]}><cylinderGeometry args={[.03, .03, .7, 8]} /><meshStandardMaterial color="#20292f" metalness={.5} roughness={.5} /></mesh>
      <mesh position={[0, 0, .05]} rotation={[.35, 0, 0]}><boxGeometry args={[.2, .16, .36]} /><meshStandardMaterial color="#1a2329" metalness={.45} roughness={.45} /></mesh>
      <mesh position={[0, -.06, .23]} rotation={[.35, 0, 0]}><cylinderGeometry args={[.055, .055, .04, 16]} /><meshStandardMaterial color="#0b1115" metalness={.8} roughness={.15} emissive="#304d5a" emissiveIntensity={.6} /></mesh>
      <mesh ref={light} position={[.07, .07, .1]}><sphereGeometry args={[.018, 8, 6]} /><meshBasicMaterial color="#28343a" /></mesh>
    </group>
    <group ref={cone} position={[x, .02, z]}>
      {/* Sector around local +z: circle sectors lie in XY around +y until turned a quarter about x. */}
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <circleGeometry args={[FOOTPRINT, 32, Math.PI / 2 - CAMERA_OPTICS.halfAngle, 2 * CAMERA_OPTICS.halfAngle]} />
        <meshBasicMaterial transparent side={DoubleSide} depthWrite={false} polygonOffset polygonOffsetFactor={-2} />
      </mesh>
    </group>
  </>;
}
