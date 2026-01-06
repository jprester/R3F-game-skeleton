import { RigidBody } from '@react-three/rapier';

// Room dimensions
const ROOM_WIDTH = 12;
const ROOM_DEPTH = 12;
const ROOM_HEIGHT = 4;
const WALL_THICKNESS = 0.3;

export default function Room() {
  return (
    <group>
      {/* Floor */}
      <RigidBody type="fixed" colliders="cuboid">
        <mesh receiveShadow position={[0, -0.1, 0]}>
          <boxGeometry args={[ROOM_WIDTH, 0.2, ROOM_DEPTH]} />
          <meshStandardMaterial color="#3d3d5c" />
        </mesh>
      </RigidBody>

      {/* Ceiling */}
      <RigidBody type="fixed" colliders="cuboid">
        <mesh position={[0, ROOM_HEIGHT, 0]}>
          <boxGeometry args={[ROOM_WIDTH, 0.2, ROOM_DEPTH]} />
          <meshStandardMaterial color="#2a2a4a" />
        </mesh>
      </RigidBody>

      {/* Back wall */}
      <RigidBody type="fixed" colliders="cuboid">
        <mesh
          receiveShadow
          castShadow
          position={[0, ROOM_HEIGHT / 2, -ROOM_DEPTH / 2]}
        >
          <boxGeometry args={[ROOM_WIDTH, ROOM_HEIGHT, WALL_THICKNESS]} />
          <meshStandardMaterial color="#4a4a6a" />
        </mesh>
      </RigidBody>

      {/* Front wall */}
      <RigidBody type="fixed" colliders="cuboid">
        <mesh
          receiveShadow
          castShadow
          position={[0, ROOM_HEIGHT / 2, ROOM_DEPTH / 2]}
        >
          <boxGeometry args={[ROOM_WIDTH, ROOM_HEIGHT, WALL_THICKNESS]} />
          <meshStandardMaterial color="#4a4a6a" />
        </mesh>
      </RigidBody>

      {/* Left wall */}
      <RigidBody type="fixed" colliders="cuboid">
        <mesh
          receiveShadow
          castShadow
          position={[-ROOM_WIDTH / 2, ROOM_HEIGHT / 2, 0]}
        >
          <boxGeometry args={[WALL_THICKNESS, ROOM_HEIGHT, ROOM_DEPTH]} />
          <meshStandardMaterial color="#454570" />
        </mesh>
      </RigidBody>

      {/* Right wall */}
      <RigidBody type="fixed" colliders="cuboid">
        <mesh
          receiveShadow
          castShadow
          position={[ROOM_WIDTH / 2, ROOM_HEIGHT / 2, 0]}
        >
          <boxGeometry args={[WALL_THICKNESS, ROOM_HEIGHT, ROOM_DEPTH]} />
          <meshStandardMaterial color="#454570" />
        </mesh>
      </RigidBody>
    </group>
  );
}
