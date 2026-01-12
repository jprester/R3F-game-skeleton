import { RigidBody } from "@react-three/rapier";
import { useModels } from "./ModelProvider";

// Desk component using GLB model
function Desk({
  position,
  rotation = 0,
}: {
  position: [number, number, number];
  rotation?: number;
}) {
  const { deskScene } = useModels();

  return (
    <RigidBody
      type="fixed"
      position={position}
      rotation={[0, rotation, 0]}
      colliders="cuboid">
      <primitive
        object={deskScene.clone()}
        scale={1}
        castShadow
        receiveShadow
      />
    </RigidBody>
  );
}

// Chair component using GLB model
function Chair({
  position,
  rotation = 0,
}: {
  position: [number, number, number];
  rotation?: number;
}) {
  const { chairScene } = useModels();

  return (
    <RigidBody
      type="fixed"
      position={position}
      rotation={[0, rotation, 0]}
      colliders="cuboid">
      <primitive
        object={chairScene.clone()}
        scale={1}
        castShadow
        receiveShadow
      />
    </RigidBody>
  );
}

// Folder component
function Folder({
  position,
  rotation = 0,
}: {
  position: [number, number, number];
  rotation?: number;
}) {
  const { folderScene } = useModels();

  return (
    <RigidBody
      type="fixed"
      position={position}
      rotation={[0, rotation, 0]}
      colliders="cuboid">
      <primitive
        object={folderScene.clone()}
        scale={1}
        castShadow
        receiveShadow
      />
    </RigidBody>
  );
}

// Cardboard Boxes component
function CardboardBoxes({
  position,
  rotation = 0,
}: {
  position: [number, number, number];
  rotation?: number;
}) {
  const { boxesScene } = useModels();

  return (
    <RigidBody
      type="fixed"
      position={position}
      rotation={[0, rotation, 0]}
      colliders="cuboid">
      <primitive
        object={boxesScene.clone()}
        scale={1}
        castShadow
        receiveShadow
      />
    </RigidBody>
  );
}

// Door component
function Door({
  position,
  rotation = 0,
  scale = 1,
}: {
  position: [number, number, number];
  rotation?: number;
  scale?: number;
}) {
  const { doorScene } = useModels();

  return (
    <RigidBody
      type="fixed"
      position={position}
      rotation={[0, rotation, 0]}
      colliders="cuboid">
      <primitive
        object={doorScene.clone()}
        scale={scale}
        castShadow
        receiveShadow
      />
    </RigidBody>
  );
}

// Decorative box/crate
// function Crate({ position }: { position: [number, number, number] }) {
//   const woodTextures = useTexture({
//     map: "/textures/wood/Wood094_2K-JPG_Color.jpg",
//     normalMap: "/textures/wood/Wood094_2K-JPG_NormalGL.jpg",
//     roughnessMap: "/textures/wood/Wood094_2K-JPG_Roughness.jpg",
//   });

//   Object.values(woodTextures).forEach((texture) => {
//     texture.wrapS = texture.wrapT = RepeatWrapping;
//   });

//   return (
//     <RigidBody type="fixed" position={position} colliders="cuboid">
//       <mesh castShadow receiveShadow>
//         <boxGeometry args={[0.6, 0.6, 0.6]} />
//         <meshStandardMaterial {...woodTextures} />
//       </mesh>
//     </RigidBody>
//   );
// }

// Tall pillar/column
// function Pillar({ position }: { position: [number, number, number] }) {
//   return (
//     <RigidBody type="fixed" position={position} colliders="cuboid">
//       <mesh castShadow receiveShadow>
//         <boxGeometry args={[0.5, 3, 0.5]} />
//         <meshStandardMaterial color="#696969" />
//       </mesh>
//     </RigidBody>
//   );
// }

// Sphere obstacle (uses hull collider)
// function Sphere({ position }: { position: [number, number, number] }) {
//   return (
//     <RigidBody type="fixed" position={position} colliders="ball">
//       <mesh castShadow receiveShadow>
//         <sphereGeometry args={[0.4, 32, 32]} />
//         <meshStandardMaterial color="#4169e1" />
//       </mesh>
//     </RigidBody>
//   );
// }

// Statue component using GLB model
// function Statue({
//   position,
//   rotation = 0,
//   scale = 1,
// }: {
//   position: [number, number, number];
//   rotation?: number;
//   scale?: number;
// }) {
//   const { scene } = useGLTF("/models/statue/garden_statue.glb");
//
//   return (
//     <RigidBody
//       type="fixed"
//       position={position}
//       rotation={[0, rotation, 0]}
//       colliders="cuboid">
//       <primitive
//         object={scene.clone()}
//         scale={scale}
//         castShadow
//         receiveShadow
//       />
//     </RigidBody>
//   );
// }

export default function Furniture() {
  return (
    <group>
      {/* Center desk */}
      <Desk position={[0, 0, 0]} />
      {/* Folder on central desk */}
      <Folder position={[0.6, 0.86, 0]} rotation={Math.PI / 6} />

      {/* Chairs around the desk */}
      <Chair position={[0, 0, 1.2]} rotation={Math.PI} />
      <Chair position={[0, 0, -1.2]} rotation={0} />
      <Chair position={[1.5, 0, 0]} rotation={Math.PI / 2} />
      <Chair position={[-1.2, 0, 0]} rotation={-Math.PI / 2} />

      {/* Corner furniture */}
      <Desk position={[-3, 0, -2]} />
      <Chair position={[-3, 0, -1]} rotation={Math.PI} />

      {/* Cardboard boxes in corner */}
      <CardboardBoxes position={[3.5, 0.45, 3.5]} rotation={-Math.PI / 4} />

      {/* Door on the wall */}
      <Door position={[4.885, 0, 0]} rotation={-Math.PI / 2} scale={0.5} />

      {/* Crates in corner */}
      {/* <Crate position={[4, 0.3, -4]} />
      <Crate position={[4.5, 0.3, -4.5]} />
      <Crate position={[4.2, 0.9, -4.2]} /> */}

      {/* Pillars */}
      {/* <Pillar position={[3, 1.5, 3]} />
      <Pillar position={[-3, 1.5, 3]} /> */}

      {/* Decorative spheres */}
      {/* <Sphere position={[-4, 0.4, 3]} />
      <Sphere position={[4, 0.4, 0]} /> */}

      {/* Statue */}
      {/* <Statue position={[2, -0.2, -1]} rotation={-Math.PI / 4} /> */}
    </group>
  );
}
