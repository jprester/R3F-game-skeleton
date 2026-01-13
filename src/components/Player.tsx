import { useRef, useEffect } from "react";
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

// Player height settings (188cm tall, eye height ~173cm)
const PLAYER_CAPSULE_HALF_HEIGHT = 0.7; // Half of body height
const PLAYER_CAPSULE_RADIUS = 0.3;
const CAMERA_Y_OFFSET = 0.85; // Offset from capsule center to eye level

export default function Player({ position = [0, 2, 0] }: PlayerProps) {
  const rigidBodyRef = useRef<RapierRigidBody>(null);

  // Rotation state (not using React state to avoid re-renders)
  const rotation = useRef({ x: 0, y: 0 });
  const isPointerLocked = useRef(false);

  // Reusable Vector3 instances to avoid per-frame allocation
  const moveDirection = useRef(new Vector3());
  const upAxis = useRef(new Vector3(0, 1, 0));

  // Get keyboard state
  const [, getKeys] = useKeyboardControls();

  // Set up pointer lock listeners with proper cleanup
  useEffect(() => {
    // Handle pointer lock
    const handleCanvasClick = () => {
      document.body.requestPointerLock();
    };

    const handlePointerLockChange = () => {
      isPointerLocked.current = document.pointerLockElement !== null;
    };

    const handleMouseMove = (event: MouseEvent) => {
      if (!isPointerLocked.current) return;

      const sensitivity = 0.002;
      rotation.current.y -= event.movementX * sensitivity;
      rotation.current.x -= event.movementY * sensitivity;

      // Clamp vertical rotation
      rotation.current.x = Math.max(
        -Math.PI / 2 + 0.1,
        Math.min(Math.PI / 2 - 0.1, rotation.current.x)
      );
    };

    // Add event listeners
    document.addEventListener("click", handleCanvasClick);
    document.addEventListener("pointerlockchange", handlePointerLockChange);
    document.addEventListener("mousemove", handleMouseMove);

    // Cleanup function
    return () => {
      document.removeEventListener("click", handleCanvasClick);
      document.removeEventListener(
        "pointerlockchange",
        handlePointerLockChange
      );
      document.removeEventListener("mousemove", handleMouseMove);
    };
  }, []);

  useFrame((state) => {
    if (!rigidBodyRef.current) return;

    const { forward, backward, left, right } = getKeys();

    // Get current velocity
    const velocity = rigidBodyRef.current.linvel();

    // Calculate movement direction based on camera rotation
    const direction = moveDirection.current.set(0, 0, 0);

    if (forward) direction.z -= 1;
    if (backward) direction.z += 1;
    if (left) direction.x -= 1;
    if (right) direction.x += 1;

    // Normalize and rotate by camera Y rotation
    if (direction.length() > 0) {
      direction.normalize();
      direction.applyAxisAngle(upAxis.current, rotation.current.y);
    }

    // Apply horizontal movement
    rigidBodyRef.current.setLinvel(
      {
        x: direction.x * MOVE_SPEED,
        y: velocity.y, // Preserve vertical velocity
        z: direction.z * MOVE_SPEED,
      },
      true
    );

    // Update camera position and rotation (eye level for tall player)
    const position = rigidBodyRef.current.translation();
    state.camera.position.set(position.x, position.y + CAMERA_Y_OFFSET, position.z);
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
      {/* Capsule collider for player body (taller player) */}
      <CapsuleCollider args={[PLAYER_CAPSULE_HALF_HEIGHT, PLAYER_CAPSULE_RADIUS]} />
    </RigidBody>
  );
}
