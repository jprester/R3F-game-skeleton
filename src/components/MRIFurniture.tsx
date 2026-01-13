import { RigidBody } from "@react-three/rapier";
import { useMRIModels } from "./MRIModelProvider";

// MRI Machine component
function MRIMachine({
  position,
  rotation = 0,
  scale = 1,
}: {
  position: [number, number, number];
  rotation?: number;
  scale?: number;
}) {
  const { mriMachineScene } = useMRIModels();

  return (
    <RigidBody
      type="fixed"
      position={position}
      rotation={[0, rotation, 0]}
      colliders="cuboid">
      <primitive
        object={mriMachineScene.clone()}
        scale={scale}
        castShadow
        receiveShadow
      />
    </RigidBody>
  );
}

// MRI Bed component
function MRIBed({
  position,
  rotation = 0,
  scale = 1,
}: {
  position: [number, number, number];
  rotation?: number;
  scale?: number;
}) {
  const { mriMachineBedScene } = useMRIModels();

  return (
    <RigidBody
      type="fixed"
      position={position}
      rotation={[0, rotation, 0]}
      colliders="cuboid">
      <primitive
        object={mriMachineBedScene.clone()}
        scale={scale}
        castShadow
        receiveShadow
      />
    </RigidBody>
  );
}

// Patient lying on bed
function Patient({
  position,
  rotation = 0,
  scale = 1,
}: {
  position: [number, number, number];
  rotation?: number;
  scale?: number;
}) {
  const { patientScene } = useMRIModels();

  return (
    <group position={position} rotation={[0, rotation, 0]}>
      <primitive
        object={patientScene.clone()}
        scale={scale}
        castShadow
        receiveShadow
      />
    </group>
  );
}

// Computer monitor with MRI display
function ComputerMonitor({
  position,
  rotation = 0,
  scale = 1,
}: {
  position: [number, number, number];
  rotation?: number;
  scale?: number;
}) {
  const { computerMonitorScene } = useMRIModels();

  return (
    <RigidBody
      type="fixed"
      position={position}
      rotation={[0, rotation, 0]}
      colliders="cuboid">
      <primitive
        object={computerMonitorScene.clone()}
        scale={scale}
        castShadow
        receiveShadow
      />
    </RigidBody>
  );
}

// Simple desk/table for the control room
function ControlDesk({
  position,
  rotation = 0,
}: {
  position: [number, number, number];
  rotation?: number;
}) {
  const deskWidth = 2;
  const deskDepth = 0.8;
  const deskHeight = 0.75;
  const legThickness = 0.05;

  return (
    <RigidBody
      type="fixed"
      position={position}
      rotation={[0, rotation, 0]}
      colliders="cuboid">
      <group>
        {/* Desktop surface */}
        <mesh castShadow receiveShadow position={[0, deskHeight, 0]}>
          <boxGeometry args={[deskWidth, 0.04, deskDepth]} />
          <meshStandardMaterial color="#4a4a4a" roughness={0.4} />
        </mesh>

        {/* Desk legs */}
        {/* Front left */}
        <mesh
          castShadow
          receiveShadow
          position={[
            -deskWidth / 2 + legThickness,
            deskHeight / 2,
            deskDepth / 2 - legThickness,
          ]}>
          <boxGeometry
            args={[legThickness * 2, deskHeight, legThickness * 2]}
          />
          <meshStandardMaterial color="#3a3a3a" />
        </mesh>
        {/* Front right */}
        <mesh
          castShadow
          receiveShadow
          position={[
            deskWidth / 2 - legThickness,
            deskHeight / 2,
            deskDepth / 2 - legThickness,
          ]}>
          <boxGeometry
            args={[legThickness * 2, deskHeight, legThickness * 2]}
          />
          <meshStandardMaterial color="#3a3a3a" />
        </mesh>
        {/* Back left */}
        <mesh
          castShadow
          receiveShadow
          position={[
            -deskWidth / 2 + legThickness,
            deskHeight / 2,
            -deskDepth / 2 + legThickness,
          ]}>
          <boxGeometry
            args={[legThickness * 2, deskHeight, legThickness * 2]}
          />
          <meshStandardMaterial color="#3a3a3a" />
        </mesh>
        {/* Back right */}
        <mesh
          castShadow
          receiveShadow
          position={[
            deskWidth / 2 - legThickness,
            deskHeight / 2,
            -deskDepth / 2 + legThickness,
          ]}>
          <boxGeometry
            args={[legThickness * 2, deskHeight, legThickness * 2]}
          />
          <meshStandardMaterial color="#3a3a3a" />
        </mesh>
      </group>
    </RigidBody>
  );
}

// Simple office chair for operator
function OperatorChair({
  position,
  rotation = 0,
}: {
  position: [number, number, number];
  rotation?: number;
}) {
  return (
    <RigidBody
      type="fixed"
      position={position}
      rotation={[0, rotation, 0]}
      colliders="cuboid">
      <group>
        {/* Seat */}
        <mesh castShadow receiveShadow position={[0, 0.45, 0]}>
          <boxGeometry args={[0.45, 0.08, 0.45]} />
          <meshStandardMaterial color="#2a2a2a" />
        </mesh>
        {/* Backrest */}
        <mesh castShadow receiveShadow position={[0, 0.75, -0.2]}>
          <boxGeometry args={[0.42, 0.5, 0.05]} />
          <meshStandardMaterial color="#2a2a2a" />
        </mesh>
        {/* Base/pedestal */}
        <mesh castShadow receiveShadow position={[0, 0.22, 0]}>
          <cylinderGeometry args={[0.03, 0.03, 0.4, 8]} />
          <meshStandardMaterial color="#333333" metalness={0.8} />
        </mesh>
        {/* Wheel base */}
        <mesh castShadow receiveShadow position={[0, 0.05, 0]}>
          <cylinderGeometry args={[0.25, 0.25, 0.03, 5]} />
          <meshStandardMaterial color="#333333" metalness={0.8} />
        </mesh>
      </group>
    </RigidBody>
  );
}

export default function MRIFurniture() {
  // Position constants based on room layout and Blender screenshots
  // Room: Width=14, Depth=10, Divider at X=3
  // MRI scanning room: X from -7 to 3 (left side)
  // Control room: X from 3 to 7 (right side)

  // MRI machine against the left wall, facing the control room
  // Machine opening should face towards positive X (towards control room window)
  const mriMachinePos: [number, number, number] = [-5, 0, 0];
  const mriMachineRotation = Math.PI / 2;

  // MRI bed extends from machine towards control room
  const mriBedPos: [number, number, number] = [-3, 0, 0];
  const mriBedRotation = Math.PI / 2;

  // Patient on the bed
  const patientPos: [number, number, number] = [-3.1, 1.2, 0.1];
  const patientRotation = Math.PI / 1.95;

  // Control desk in observation room, facing the window (towards negative X)
  const controlDeskPos: [number, number, number] = [4.2, 0, 0];
  const controlDeskRotation = Math.PI / 2;

  // Computer monitor on the desk
  const monitorPos: [number, number, number] = [4.3, 0.79, 0];
  const monitorRotation = Math.PI / 2;

  // Operator chair behind the desk
  const chairPos: [number, number, number] = [5, 0, 0];
  const chairRotation = -Math.PI / 2;

  return (
    <group>
      {/* MRI Scanning Room */}
      {/* MRI models likely exported in cm or mm - need large scale */}
      <MRIMachine
        position={mriMachinePos}
        rotation={mriMachineRotation}
        scale={0.5}
      />
      <MRIBed position={mriBedPos} rotation={mriBedRotation} scale={0.4} />
      {/* Patient was visible but tiny at 0.01, try 1 */}
      <Patient position={patientPos} rotation={patientRotation} scale={0.38} />

      {/* Control Room */}
      <ControlDesk position={controlDeskPos} rotation={controlDeskRotation} />
      <ComputerMonitor
        position={monitorPos}
        rotation={monitorRotation}
        scale={0.5}
      />
      <OperatorChair position={chairPos} rotation={chairRotation} />
    </group>
  );
}
