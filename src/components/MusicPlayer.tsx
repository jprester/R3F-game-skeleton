import { Color } from "three";

// Procedural boombox + table. Audio playback was removed; the music files in
// public/sounds/music/ are kept on disk for the next pass. The exported
// position/footprint constants are consumed by Scene.tsx for player collision.

const FLOOR_TOP_Y = 5.2; // must match FLOOR_HEIGHT in Scene.tsx

export const BOOMBOX_CENTER_X = 15;
export const BOOMBOX_CENTER_Z = 18;
export const BOOMBOX_TABLE_WIDTH = 3.4;
export const BOOMBOX_TABLE_DEPTH = 2.4;
const TABLE_HEIGHT = 1.4;
const TABLE_TOP_Y = FLOOR_TOP_Y + TABLE_HEIGHT;

const BODY_WIDTH = 3.0;
const BODY_HEIGHT = 1.5;
const BODY_DEPTH = 1.0;
const BODY_CENTER_Y = TABLE_TOP_Y + BODY_HEIGHT / 2;

const SPEAKER_RADIUS = 0.45;
const SPEAKER_OFFSET_X = 0.9;
const SPEAKER_FRONT_Z = BODY_DEPTH / 2 + 0.06;

export default function MusicPlayer() {
  return (
    <group position={[BOOMBOX_CENTER_X, 0, BOOMBOX_CENTER_Z]}>
      <mesh
        position={[0, FLOOR_TOP_Y + TABLE_HEIGHT / 2, 0]}
        castShadow
        receiveShadow>
        <boxGeometry
          args={[BOOMBOX_TABLE_WIDTH, TABLE_HEIGHT, BOOMBOX_TABLE_DEPTH]}
        />
        <meshStandardMaterial
          color="#2a1c2e"
          roughness={0.55}
          metalness={0.2}
        />
      </mesh>
      <mesh
        position={[
          0,
          FLOOR_TOP_Y + TABLE_HEIGHT - 0.05,
          BOOMBOX_TABLE_DEPTH / 2 + 0.005,
        ]}>
        <planeGeometry args={[BOOMBOX_TABLE_WIDTH - 0.2, 0.08]} />
        <meshBasicMaterial
          color={new Color(2.4, 0.6, 1.6)}
          toneMapped={false}
        />
      </mesh>

      <mesh position={[0, BODY_CENTER_Y, 0]} castShadow>
        <boxGeometry args={[BODY_WIDTH, BODY_HEIGHT, BODY_DEPTH]} />
        <meshStandardMaterial
          color="#1a1322"
          roughness={0.5}
          metalness={0.35}
        />
      </mesh>

      <mesh
        position={[-SPEAKER_OFFSET_X, BODY_CENTER_Y, SPEAKER_FRONT_Z]}
        rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[SPEAKER_RADIUS, SPEAKER_RADIUS, 0.04, 24]} />
        <meshStandardMaterial color="#0a0510" roughness={0.7} metalness={0.4} />
      </mesh>
      <mesh
        position={[-SPEAKER_OFFSET_X, BODY_CENTER_Y, SPEAKER_FRONT_Z + 0.01]}
        rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry
          args={[SPEAKER_RADIUS * 0.7, SPEAKER_RADIUS * 0.55, 0.05, 24]}
        />
        <meshStandardMaterial
          color="#211326"
          emissive="#ff5cb0"
          emissiveIntensity={0.4}
          roughness={0.6}
        />
      </mesh>

      <mesh
        position={[SPEAKER_OFFSET_X, BODY_CENTER_Y, SPEAKER_FRONT_Z]}
        rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[SPEAKER_RADIUS, SPEAKER_RADIUS, 0.04, 24]} />
        <meshStandardMaterial color="#0a0510" roughness={0.7} metalness={0.4} />
      </mesh>
      <mesh
        position={[SPEAKER_OFFSET_X, BODY_CENTER_Y, SPEAKER_FRONT_Z + 0.01]}
        rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry
          args={[SPEAKER_RADIUS * 0.7, SPEAKER_RADIUS * 0.55, 0.05, 24]}
        />
        <meshStandardMaterial
          color="#211326"
          emissive="#ff5cb0"
          emissiveIntensity={0.4}
          roughness={0.6}
        />
      </mesh>

      <mesh
        position={[0, BODY_CENTER_Y + BODY_HEIGHT / 2 + 0.18, 0]}
        castShadow>
        <boxGeometry args={[1.6, 0.08, 0.12]} />
        <meshStandardMaterial color="#181020" roughness={0.6} metalness={0.4} />
      </mesh>

      <mesh
        position={[
          BODY_WIDTH / 2 - 0.15,
          BODY_CENTER_Y + BODY_HEIGHT / 2 + 0.55,
          0,
        ]}>
        <cylinderGeometry args={[0.02, 0.02, 1.1, 8]} />
        <meshStandardMaterial color="#404048" metalness={0.7} roughness={0.4} />
      </mesh>

      <mesh
        position={[
          -BODY_WIDTH / 2 + 0.25,
          BODY_CENTER_Y + BODY_HEIGHT / 2 - 0.15,
          SPEAKER_FRONT_Z,
        ]}>
        <sphereGeometry args={[0.06, 12, 12]} />
        <meshBasicMaterial
          color={new Color(0.25, 0.08, 0.18)}
          toneMapped={false}
        />
      </mesh>

      <mesh position={[0, BODY_CENTER_Y + 0.35, SPEAKER_FRONT_Z]}>
        <planeGeometry args={[0.9, 0.32]} />
        <meshBasicMaterial
          color={new Color(0.2, 1.4, 1.9)}
          toneMapped={false}
        />
      </mesh>
    </group>
  );
}
