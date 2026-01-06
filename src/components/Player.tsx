import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import {
  RigidBody,
  CapsuleCollider,
  RapierRigidBody,
} from "@react-three/rapier";
import { useKeyboardControls } from "@react-three/drei";
import { Vector3 } from "three";

interface PlayerProps {
  position?: [number, number, number];
}

// Movement settings
const MOVE_SPEED = 5;
const JUMP_FORCE = 3;

export default function Player({ position = [0, 2, 0] }: PlayerProps) {
  const rigidBodyRef = useRef<RapierRigidBody>(null);
  const isOnGround = useRef(true);

  // Rotation state (not using React state to avoid re-renders)
  const rotation = useRef({ x: 0, y: 0 });
  const isPointerLocked = useRef(false);

  // Get keyboard state
  const [, getKeys] = useKeyboardControls();

  // Handle pointer lock
  const handleCanvasClick = () => {
    document.body.requestPointerLock();
  };

  // Set up pointer lock listeners
  if (typeof window !== "undefined") {
    document.addEventListener("click", handleCanvasClick);

    document.addEventListener("pointerlockchange", () => {
      isPointerLocked.current = document.pointerLockElement !== null;
    });

    document.addEventListener("mousemove", (event) => {
      if (!isPointerLocked.current) return;

      const sensitivity = 0.002;
      rotation.current.y -= event.movementX * sensitivity;
      rotation.current.x -= event.movementY * sensitivity;

      // Clamp vertical rotation
      rotation.current.x = Math.max(
        -Math.PI / 2 + 0.1,
        Math.min(Math.PI / 2 - 0.1, rotation.current.x)
      );
    });
  }

  useFrame((state) => {
    if (!rigidBodyRef.current) return;

    const { forward, backward, left, right, jump } = getKeys();

    // Get current velocity
    const velocity = rigidBodyRef.current.linvel();

    // Calculate movement direction based on camera rotation
    const moveDirection = new Vector3();

    if (forward) moveDirection.z -= 1;
    if (backward) moveDirection.z += 1;
    if (left) moveDirection.x -= 1;
    if (right) moveDirection.x += 1;

    // Normalize and rotate by camera Y rotation
    if (moveDirection.length() > 0) {
      moveDirection.normalize();
      moveDirection.applyAxisAngle(new Vector3(0, 1, 0), rotation.current.y);
    }

    // Apply horizontal movement
    rigidBodyRef.current.setLinvel(
      {
        x: moveDirection.x * MOVE_SPEED,
        y: velocity.y, // Preserve vertical velocity
        z: moveDirection.z * MOVE_SPEED,
      },
      true
    );

    // Jump logic
    const position = rigidBodyRef.current.translation();

    // Simple ground check (player starts at y ~= 1 when on floor due to capsule)
    if (position.y < 1.1) {
      isOnGround.current = true;
    }

    if (jump && isOnGround.current) {
      rigidBodyRef.current.setLinvel(
        { x: velocity.x, y: JUMP_FORCE, z: velocity.z },
        true
      );
      isOnGround.current = false;
    }

    // Update camera position and rotation
    state.camera.position.set(position.x, position.y + 0.5, position.z);
    state.camera.rotation.order = "YXZ";
    state.camera.rotation.y = rotation.current.y;
    state.camera.rotation.x = rotation.current.x;
  });

  return (
    <RigidBody
      ref={rigidBodyRef}
      position={position}
      enabledRotations={[false, false, false]} // Prevent tumbling
      linearDamping={0.5}
      mass={1}
      colliders={false}>
      {/* Capsule collider for player body */}
      <CapsuleCollider args={[0.35, 0.3]} />
    </RigidBody>
  );
}
