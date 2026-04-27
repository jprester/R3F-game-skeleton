import { useRef, useEffect } from "react";
import { useFrame } from "@react-three/fiber";
import {
  RigidBody,
  CapsuleCollider,
  RapierRigidBody,
} from "@react-three/rapier";
import { useKeyboardControls } from "@react-three/drei";
import { Vector3 } from "three";
import { useAudio } from "./AudioProvider";
import { updatePlayerState } from "../gameState";

interface PlayerProps {
  position?: [number, number, number];
}

// Movement settings
const MOVE_SPEED = 5;
const JUMP_FORCE = 3;
const FOOTSTEP_INTERVAL = 0.4; // seconds between footstep sounds
const GROUND_CHECK_Y = 1.25;

export default function Player({ position = [0, 2, 0] }: PlayerProps) {
  const rigidBodyRef = useRef<RapierRigidBody>(null);
  const isOnGround = useRef(true);

  // Rotation state (not using React state to avoid re-renders)
  const rotation = useRef({ x: 0, y: 0 });
  const isPointerLocked = useRef(false);

  // Audio
  const { playFootstep, stopFootsteps } = useAudio();
  const lastFootstepTime = useRef(0);
  const wasMoving = useRef(false);

  // Reusable Vector3 instances to avoid per-frame allocation
  const moveDirection = useRef(new Vector3());
  const upAxis = useRef(new Vector3(0, 1, 0));

  // Get keyboard state
  const [, getKeys] = useKeyboardControls();

  // Set up pointer lock listeners with proper cleanup
  useEffect(() => {
    // Handle pointer lock
    const handleCanvasClick = () => {
      try {
        const pointerLockRequest = document.body.requestPointerLock();
        if (pointerLockRequest) {
          pointerLockRequest.catch(() => {
            isPointerLocked.current = false;
          });
        }
      } catch {
        isPointerLocked.current = false;
      }
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

    const { forward, backward, left, right, jump } = getKeys();

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

    // Footstep sounds - play when moving on ground
    const isMoving = direction.length() > 0;
    const currentTime = state.clock.getElapsedTime();

    if (isMoving && isOnGround.current) {
      if (currentTime - lastFootstepTime.current > FOOTSTEP_INTERVAL) {
        playFootstep();
        lastFootstepTime.current = currentTime;
      }
    } else if (wasMoving.current && !isMoving) {
      // Stop footstep sounds when player stops moving
      stopFootsteps();
    }

    wasMoving.current = isMoving;

    // Jump logic
    const position = rigidBodyRef.current.translation();

    // Simple ground check for the low tiled platforms in this scene.
    if (position.y < GROUND_CHECK_Y) {
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

    updatePlayerState({
      x: position.x,
      y: position.y,
      z: position.z,
      velocity: {
        x: velocity.x,
        y: velocity.y,
        z: velocity.z,
      },
      yaw: rotation.current.y,
      pitch: rotation.current.x,
      onGround: isOnGround.current,
    });
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
