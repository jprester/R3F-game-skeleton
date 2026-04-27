import { useCallback, useEffect, useRef, useState } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import {
  BallCollider,
  RapierRigidBody,
  RigidBody,
} from "@react-three/rapier";
import { Vector3 } from "three";
import { getGameState, updateBallState } from "../gameState";

type Vec3 = [number, number, number];

interface BallData {
  id: number;
  position: Vec3;
  impulse: Vec3;
}

const BALL_RADIUS = 0.22;
const MAX_BALLS = 28;

function isBrowserQaMode() {
  return (
    typeof window !== "undefined" &&
    new URLSearchParams(window.location.search).has("qa")
  );
}

function toVec3Tuple(vector: Vector3): Vec3 {
  return [vector.x, vector.y, vector.z];
}

function PhysicsBall({
  ball,
  onPosition,
  onExpired,
}: {
  ball: BallData;
  onPosition: (id: number, position: Vec3) => void;
  onExpired: (id: number) => void;
}) {
  const rigidBodyRef = useRef<RapierRigidBody>(null);

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      rigidBodyRef.current?.applyImpulse(
        {
          x: ball.impulse[0],
          y: ball.impulse[1],
          z: ball.impulse[2],
        },
        true
      );
      rigidBodyRef.current?.applyTorqueImpulse(
        {
          x: ball.impulse[2] * 0.03,
          y: ball.impulse[1] * 0.015,
          z: -ball.impulse[0] * 0.03,
        },
        true
      );
    });

    return () => cancelAnimationFrame(frame);
  }, [ball.impulse]);

  useFrame(() => {
    const position = rigidBodyRef.current?.translation();
    if (!position) return;

    if (
      position.y < -24 ||
      Math.abs(position.x) > 80 ||
      Math.abs(position.z) > 80
    ) {
      onExpired(ball.id);
      return;
    }

    onPosition(ball.id, [position.x, position.y, position.z]);
  });

  return (
    <RigidBody
      ref={rigidBodyRef}
      position={ball.position}
      colliders={false}
      restitution={0.48}
      friction={0.36}
      linearDamping={0.18}
      angularDamping={0.18}
      canSleep={false}
      ccd
      softCcdPrediction={0.8}
      mass={1}>
      <BallCollider args={[BALL_RADIUS]} />
      <mesh castShadow receiveShadow>
        <icosahedronGeometry args={[BALL_RADIUS, 4]} />
        <meshStandardMaterial
          color="#d8e58e"
          roughness={0.3}
          metalness={0.04}
        />
      </mesh>
    </RigidBody>
  );
}

export default function ThrowableBalls() {
  const camera = useThree((state) => state.camera);
  const [balls, setBalls] = useState<BallData[]>([]);
  const nextId = useRef(1);
  const mouseDownAt = useRef(0);
  const wasLockedOnMouseDown = useRef(false);
  const ballPositions = useRef(new Map<number, Vec3>());

  const syncBallState = useCallback(() => {
    updateBallState(
      Array.from(ballPositions.current.entries()).map(([id, position]) => ({
        id,
        x: position[0],
        y: position[1],
        z: position[2],
      }))
    );
  }, []);

  const handleBallPosition = useCallback(
    (id: number, position: Vec3) => {
      ballPositions.current.set(id, position);
      syncBallState();
    },
    [syncBallState]
  );

  const handleBallExpired = useCallback(
    (id: number) => {
      ballPositions.current.delete(id);
      setBalls((currentBalls) =>
        currentBalls.filter((ball) => ball.id !== id)
      );
      syncBallState();
    },
    [syncBallState]
  );

  const throwBall = useCallback(() => {
    const direction = new Vector3();
    camera.getWorldDirection(direction).normalize();

    const origin = camera.position
      .clone()
      .addScaledVector(direction, 0.78)
      .add(new Vector3(0, -0.1, 0));

    const heldSeconds = Math.min(
      1.2,
      Math.max(0, (performance.now() - mouseDownAt.current) / 1000)
    );
    const throwStrength = 8.5 + heldSeconds * 13;
    const impulse = direction.multiplyScalar(throwStrength);
    const playerVelocity = getGameState().player.velocity;

    impulse.x += playerVelocity.x * 0.55;
    impulse.y += Math.max(0, playerVelocity.y) * 0.3;
    impulse.z += playerVelocity.z * 0.55;

    const ball: BallData = {
      id: nextId.current,
      position: toVec3Tuple(origin),
      impulse: toVec3Tuple(impulse),
    };

    nextId.current += 1;

    setBalls((currentBalls) => {
      const nextBalls = [...currentBalls, ball].slice(-MAX_BALLS);
      const activeIds = new Set(nextBalls.map((activeBall) => activeBall.id));

      for (const id of ballPositions.current.keys()) {
        if (!activeIds.has(id)) {
          ballPositions.current.delete(id);
        }
      }

      ballPositions.current.set(ball.id, ball.position);
      syncBallState();

      return nextBalls;
    });
  }, [camera, syncBallState]);

  useEffect(() => {
    const handleMouseDown = (event: MouseEvent) => {
      if (event.button !== 0) return;

      mouseDownAt.current = performance.now();
      wasLockedOnMouseDown.current =
        document.pointerLockElement !== null || isBrowserQaMode();
    };

    const handleMouseUp = (event: MouseEvent) => {
      if (event.button !== 0) return;
      if (!wasLockedOnMouseDown.current) return;
      if (document.pointerLockElement === null && !isBrowserQaMode()) return;

      throwBall();
    };

    document.addEventListener("mousedown", handleMouseDown);
    document.addEventListener("mouseup", handleMouseUp);

    return () => {
      document.removeEventListener("mousedown", handleMouseDown);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [throwBall]);

  return (
    <group>
      {balls.map((ball) => (
        <PhysicsBall
          key={ball.id}
          ball={ball}
          onPosition={handleBallPosition}
          onExpired={handleBallExpired}
        />
      ))}
    </group>
  );
}
