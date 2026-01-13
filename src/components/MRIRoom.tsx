import { useMemo } from "react";
import { CuboidCollider, RigidBody } from "@react-three/rapier";
import { DoubleSide } from "three";

// Room dimensions - based on Blender screenshots
// MRI scanning room on the left, control room on the right
const ROOM_WIDTH = 14; // Total width (both rooms combined)
const ROOM_DEPTH = 10;
const ROOM_HEIGHT = 4;
const WALL_THICKNESS = 0.2;

// Dividing wall position (separates scanning room from control room)
const DIVIDER_X = 3; // Position on X axis where divider sits
const WINDOW_WIDTH = 3;
const WINDOW_HEIGHT = 1.8;
const WINDOW_BOTTOM = 0.8; // Height from floor to bottom of window (lowered for better visibility)

// Doorway in the dividing wall (at the back, positive Z)
const DIVIDER_DOOR_WIDTH = 1.2;
const DIVIDER_DOOR_HEIGHT = 2.4;
const DIVIDER_DOOR_Z = 3.5; // Position on Z axis (in the back section)

// Floor tile appearance
const TILE_COLOR = "#e8e8e8";
const WALL_COLOR = "#f5f5f5";
const CEILING_COLOR = "#ffffff";

export default function MRIRoom() {
  // Create geometry instances
  const floorGeometry = useMemo(() => {
    return { args: [ROOM_WIDTH, 0.2, ROOM_DEPTH] as [number, number, number] };
  }, []);

  const ceilingGeometry = useMemo(() => {
    return { args: [ROOM_WIDTH, 0.2, ROOM_DEPTH] as [number, number, number] };
  }, []);

  return (
    <group>
      {/* Floor - tiled medical floor */}
      <RigidBody type="fixed" colliders={false}>
        <CuboidCollider
          args={[ROOM_WIDTH / 2, 0.1, ROOM_DEPTH / 2]}
          position={[0, -0.1, 0]}
        />
        <mesh receiveShadow position={[0, -0.1, 0]}>
          <boxGeometry args={floorGeometry.args} />
          <meshStandardMaterial color={TILE_COLOR} roughness={0.3} />
        </mesh>
      </RigidBody>

      {/* Ceiling */}
      <RigidBody type="fixed" colliders="cuboid">
        <mesh position={[0, ROOM_HEIGHT, 0]}>
          <boxGeometry args={ceilingGeometry.args} />
          <meshStandardMaterial
            color={CEILING_COLOR}
            emissive="#ffffff"
            emissiveIntensity={0.3}
          />
        </mesh>
      </RigidBody>

      {/* Back wall */}
      <RigidBody type="fixed" colliders="cuboid">
        <mesh
          receiveShadow
          castShadow
          position={[0, ROOM_HEIGHT / 2, -ROOM_DEPTH / 2]}>
          <boxGeometry args={[ROOM_WIDTH, ROOM_HEIGHT, WALL_THICKNESS]} />
          <meshStandardMaterial color={WALL_COLOR} />
        </mesh>
      </RigidBody>

      {/* Front wall */}
      <RigidBody type="fixed" colliders="cuboid">
        <mesh
          receiveShadow
          castShadow
          position={[0, ROOM_HEIGHT / 2, ROOM_DEPTH / 2]}>
          <boxGeometry args={[ROOM_WIDTH, ROOM_HEIGHT, WALL_THICKNESS]} />
          <meshStandardMaterial color={WALL_COLOR} />
        </mesh>
      </RigidBody>

      {/* Left wall (MRI scanning room side) */}
      <RigidBody type="fixed" colliders="cuboid">
        <mesh
          receiveShadow
          castShadow
          position={[-ROOM_WIDTH / 2, ROOM_HEIGHT / 2, 0]}>
          <boxGeometry args={[WALL_THICKNESS, ROOM_HEIGHT, ROOM_DEPTH]} />
          <meshStandardMaterial color={WALL_COLOR} />
        </mesh>
      </RigidBody>

      {/* Right wall (control room side) */}
      <RigidBody type="fixed" colliders="cuboid">
        <mesh
          receiveShadow
          castShadow
          position={[ROOM_WIDTH / 2, ROOM_HEIGHT / 2, 0]}>
          <boxGeometry args={[WALL_THICKNESS, ROOM_HEIGHT, ROOM_DEPTH]} />
          <meshStandardMaterial color={WALL_COLOR} />
        </mesh>
      </RigidBody>

      {/* Dividing wall between MRI room and control room - with window cutout */}
      <DividingWall />

      {/* Observation window glass */}
      <ObservationWindow />
    </group>
  );
}

// Dividing wall component with window cutout and doorway
function DividingWall() {
  // Wall segments around the window
  const bottomHeight = WINDOW_BOTTOM;
  const topHeight = ROOM_HEIGHT - WINDOW_BOTTOM - WINDOW_HEIGHT;
  const sideWidth = (ROOM_DEPTH - WINDOW_WIDTH) / 2; // 3.5 each side

  // Door is in the back section (positive Z side)
  // Back section spans from Z = WINDOW_WIDTH/2 to Z = ROOM_DEPTH/2
  // Door is at Z = DIVIDER_DOOR_Z
  const backSectionStart = WINDOW_WIDTH / 2; // 1.5
  const backSectionEnd = ROOM_DEPTH / 2; // 5

  // Segments around the door in the back section
  const doorLeftWidth = DIVIDER_DOOR_Z - DIVIDER_DOOR_WIDTH / 2 - backSectionStart;
  const doorRightWidth = backSectionEnd - (DIVIDER_DOOR_Z + DIVIDER_DOOR_WIDTH / 2);
  const doorTopHeight = ROOM_HEIGHT - DIVIDER_DOOR_HEIGHT;

  return (
    <group position={[DIVIDER_X, 0, 0]}>
      {/* Bottom section below window - spans front section + window area */}
      <RigidBody type="fixed" colliders="cuboid">
        <mesh
          receiveShadow
          castShadow
          position={[0, bottomHeight / 2, -sideWidth / 2]}>
          <boxGeometry args={[WALL_THICKNESS, bottomHeight, ROOM_DEPTH - sideWidth]} />
          <meshStandardMaterial color={WALL_COLOR} />
        </mesh>
      </RigidBody>

      {/* Top section above window - spans front section + window area */}
      <RigidBody type="fixed" colliders="cuboid">
        <mesh
          receiveShadow
          castShadow
          position={[0, WINDOW_BOTTOM + WINDOW_HEIGHT + topHeight / 2, -sideWidth / 2]}>
          <boxGeometry args={[WALL_THICKNESS, topHeight, ROOM_DEPTH - sideWidth]} />
          <meshStandardMaterial color={WALL_COLOR} />
        </mesh>
      </RigidBody>

      {/* Front side section (negative Z, no door) */}
      <RigidBody type="fixed" colliders="cuboid">
        <mesh
          receiveShadow
          castShadow
          position={[0, WINDOW_BOTTOM + WINDOW_HEIGHT / 2, -ROOM_DEPTH / 2 + sideWidth / 2]}>
          <boxGeometry args={[WALL_THICKNESS, WINDOW_HEIGHT, sideWidth]} />
          <meshStandardMaterial color={WALL_COLOR} />
        </mesh>
      </RigidBody>

      {/* Back section with door cutout */}
      {/* Left of door (from window edge to door) */}
      {doorLeftWidth > 0 && (
        <RigidBody type="fixed" colliders="cuboid">
          <mesh
            receiveShadow
            castShadow
            position={[0, ROOM_HEIGHT / 2, backSectionStart + doorLeftWidth / 2]}>
            <boxGeometry args={[WALL_THICKNESS, ROOM_HEIGHT, doorLeftWidth]} />
            <meshStandardMaterial color={WALL_COLOR} />
          </mesh>
        </RigidBody>
      )}

      {/* Right of door (from door to wall edge) */}
      {doorRightWidth > 0 && (
        <RigidBody type="fixed" colliders="cuboid">
          <mesh
            receiveShadow
            castShadow
            position={[0, ROOM_HEIGHT / 2, DIVIDER_DOOR_Z + DIVIDER_DOOR_WIDTH / 2 + doorRightWidth / 2]}>
            <boxGeometry args={[WALL_THICKNESS, ROOM_HEIGHT, doorRightWidth]} />
            <meshStandardMaterial color={WALL_COLOR} />
          </mesh>
        </RigidBody>
      )}

      {/* Above door */}
      <RigidBody type="fixed" colliders="cuboid">
        <mesh
          receiveShadow
          castShadow
          position={[0, DIVIDER_DOOR_HEIGHT + doorTopHeight / 2, DIVIDER_DOOR_Z]}>
          <boxGeometry args={[WALL_THICKNESS, doorTopHeight, DIVIDER_DOOR_WIDTH]} />
          <meshStandardMaterial color={WALL_COLOR} />
        </mesh>
      </RigidBody>
    </group>
  );
}

// Observation window - transparent glass
function ObservationWindow() {
  return (
    <mesh
      position={[DIVIDER_X, WINDOW_BOTTOM + WINDOW_HEIGHT / 2, 0]}>
      <boxGeometry args={[0.05, WINDOW_HEIGHT, WINDOW_WIDTH]} />
      <meshPhysicalMaterial
        color="#88ccff"
        transparent
        opacity={0.3}
        roughness={0}
        metalness={0.1}
        side={DoubleSide}
      />
    </mesh>
  );
}
