import { RigidBody } from '@react-three/rapier';

// Simple table component
function Table({ position }: { position: [number, number, number] }) {
  const tableTopHeight = 0.8;
  const tableTopThickness = 0.08;
  const tableTopWidth = 1.5;
  const tableTopDepth = 0.8;
  const legHeight = tableTopHeight - tableTopThickness / 2;
  const legSize = 0.08;

  const legPositions: [number, number, number][] = [
    [tableTopWidth / 2 - legSize, legHeight / 2, tableTopDepth / 2 - legSize],
    [-tableTopWidth / 2 + legSize, legHeight / 2, tableTopDepth / 2 - legSize],
    [tableTopWidth / 2 - legSize, legHeight / 2, -tableTopDepth / 2 + legSize],
    [-tableTopWidth / 2 + legSize, legHeight / 2, -tableTopDepth / 2 + legSize],
  ];

  return (
    <RigidBody type="fixed" position={position} colliders="cuboid">
      <group>
        {/* Table top */}
        <mesh castShadow receiveShadow position={[0, tableTopHeight, 0]}>
          <boxGeometry args={[tableTopWidth, tableTopThickness, tableTopDepth]} />
          <meshStandardMaterial color="#8b5a2b" />
        </mesh>

        {/* Table legs */}
        {legPositions.map((legPos, index) => (
          <mesh key={index} castShadow position={legPos}>
            <boxGeometry args={[legSize, legHeight, legSize]} />
            <meshStandardMaterial color="#6b4423" />
          </mesh>
        ))}
      </group>
    </RigidBody>
  );
}

// Simple chair component
function Chair({
  position,
  rotation = 0,
}: {
  position: [number, number, number];
  rotation?: number;
}) {
  const seatHeight = 0.45;
  const seatSize = 0.45;
  const seatThickness = 0.05;
  const legHeight = seatHeight - seatThickness / 2;
  const legSize = 0.04;
  const backHeight = 0.5;
  const backThickness = 0.05;

  const legPositions: [number, number, number][] = [
    [seatSize / 2 - legSize, legHeight / 2, seatSize / 2 - legSize],
    [-seatSize / 2 + legSize, legHeight / 2, seatSize / 2 - legSize],
    [seatSize / 2 - legSize, legHeight / 2, -seatSize / 2 + legSize],
    [-seatSize / 2 + legSize, legHeight / 2, -seatSize / 2 + legSize],
  ];

  return (
    <RigidBody
      type="fixed"
      position={position}
      rotation={[0, rotation, 0]}
      colliders="cuboid"
    >
      <group>
        {/* Seat */}
        <mesh castShadow receiveShadow position={[0, seatHeight, 0]}>
          <boxGeometry args={[seatSize, seatThickness, seatSize]} />
          <meshStandardMaterial color="#cd853f" />
        </mesh>

        {/* Chair back */}
        <mesh
          castShadow
          receiveShadow
          position={[0, seatHeight + backHeight / 2, -seatSize / 2 + backThickness / 2]}
        >
          <boxGeometry args={[seatSize, backHeight, backThickness]} />
          <meshStandardMaterial color="#cd853f" />
        </mesh>

        {/* Legs */}
        {legPositions.map((legPos, index) => (
          <mesh key={index} castShadow position={legPos}>
            <boxGeometry args={[legSize, legHeight, legSize]} />
            <meshStandardMaterial color="#8b4513" />
          </mesh>
        ))}
      </group>
    </RigidBody>
  );
}

// Decorative box/crate
function Crate({ position }: { position: [number, number, number] }) {
  return (
    <RigidBody type="fixed" position={position} colliders="cuboid">
      <mesh castShadow receiveShadow>
        <boxGeometry args={[0.6, 0.6, 0.6]} />
        <meshStandardMaterial color="#a0522d" />
      </mesh>
    </RigidBody>
  );
}

// Tall pillar/column
function Pillar({ position }: { position: [number, number, number] }) {
  return (
    <RigidBody type="fixed" position={position} colliders="cuboid">
      <mesh castShadow receiveShadow>
        <boxGeometry args={[0.5, 3, 0.5]} />
        <meshStandardMaterial color="#696969" />
      </mesh>
    </RigidBody>
  );
}

// Sphere obstacle (uses hull collider)
function Sphere({ position }: { position: [number, number, number] }) {
  return (
    <RigidBody type="fixed" position={position} colliders="ball">
      <mesh castShadow receiveShadow>
        <sphereGeometry args={[0.4, 32, 32]} />
        <meshStandardMaterial color="#4169e1" />
      </mesh>
    </RigidBody>
  );
}

export default function Furniture() {
  return (
    <group>
      {/* Center table */}
      <Table position={[0, 0, 0]} />

      {/* Chairs around the table */}
      <Chair position={[0, 0, 1.2]} rotation={Math.PI} />
      <Chair position={[0, 0, -1.2]} rotation={0} />
      <Chair position={[1.2, 0, 0]} rotation={Math.PI / 2} />
      <Chair position={[-1.2, 0, 0]} rotation={-Math.PI / 2} />

      {/* Corner furniture */}
      <Table position={[-4, 0, -4]} />
      <Chair position={[-4, 0, -2.8]} rotation={Math.PI} />

      {/* Crates in corner */}
      <Crate position={[4, 0.3, -4]} />
      <Crate position={[4.5, 0.3, -4.5]} />
      <Crate position={[4.2, 0.9, -4.2]} />

      {/* Pillars */}
      <Pillar position={[3, 1.5, 3]} />
      <Pillar position={[-3, 1.5, 3]} />

      {/* Decorative spheres */}
      <Sphere position={[-4, 0.4, 3]} />
      <Sphere position={[4, 0.4, 0]} />
    </group>
  );
}
