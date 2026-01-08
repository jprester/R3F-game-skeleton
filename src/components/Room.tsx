import { CuboidCollider, RigidBody } from "@react-three/rapier";
import { useTexture } from "@react-three/drei";
import { RepeatWrapping } from "three";

// Room dimensions
const ROOM_WIDTH = 10;
const ROOM_DEPTH = 10;
const ROOM_HEIGHT = 4;
const WALL_THICKNESS = 0.3;

export default function Room() {
  // Load floor textures
  const floorTextures = useTexture({
    map: "/textures/floor/Carpet016_1K-JPG_Color.jpg",
    normalMap: "/textures/floor/Carpet016_1K-JPG_NormalGL.jpg",
    roughnessMap: "/textures/floor/Carpet016_1K-JPG_Roughness.jpg",
    displacementMap: "/textures/floor/Carpet016_1K-JPG_Displacement.jpg",
  });

  // Configure texture tiling for floor
  Object.values(floorTextures).forEach((texture) => {
    texture.wrapS = texture.wrapT = RepeatWrapping;
    texture.repeat.set(4, 4);
  });

  // Load wall textures
  const wallTextures = useTexture({
    map: "/textures/wall/Wallpaper002A_1K-JPG_Color.jpg",
    normalMap: "/textures/wall/Wallpaper002A_1K-JPG_NormalGL.jpg",
    roughnessMap: "/textures/wall/Wallpaper002A_1K-JPG_Roughness.jpg",
    displacementMap: "/textures/wall/Wallpaper002A_1K-JPG_Displacement.jpg",
  });

  // Configure texture tiling for walls (horizontal x vertical)
  Object.values(wallTextures).forEach((texture) => {
    texture.wrapS = texture.wrapT = RepeatWrapping;
    texture.repeat.set(4, 1.5);
  });

  // Load ceiling textures
  const ceilingTextures = useTexture({
    map: "/textures/ceiling/OfficeCeiling002_2K-JPG_Color.jpg",
    normalMap: "/textures/ceiling/OfficeCeiling002_2K-JPG_NormalGL.jpg",
    roughnessMap: "/textures/ceiling/OfficeCeiling002_2K-JPG_Roughness.jpg",
    displacementMap:
      "/textures/ceiling/OfficeCeiling002_2K-JPG_Displacement.jpg",
    aoMap: "/textures/ceiling/OfficeCeiling002_2K-JPG_AmbientOcclusion.jpg",
    emissiveMap: "/textures/ceiling/OfficeCeiling002_2K-JPG_Emission.jpg",
  });

  // Configure texture tiling for ceiling
  Object.values(ceilingTextures).forEach((texture) => {
    texture.wrapS = texture.wrapT = RepeatWrapping;
    texture.repeat.set(1.5, 1.5);
    // // Offset to center the pattern and avoid lights being cut at walls
    texture.offset.set(0.7, 0.7);
  });

  // Load painting texture
  const paintingTextures = useTexture({
    map: "/textures/painting/Painting001_2K-JPG_Color.jpg",
    normalMap: "/textures/painting/Painting001_2K-JPG_NormalGL.jpg",
    roughnessMap: "/textures/painting/Painting001_2K-JPG_Roughness.jpg",
  });

  return (
    <group>
      {/* Floor */}
      <RigidBody type="fixed" colliders={false}>
        <CuboidCollider
          args={[ROOM_WIDTH / 2, 0.1, ROOM_DEPTH / 2]}
          position={[0, -0.1, 0]}
        />
        <mesh receiveShadow position={[0, -0.1, 0]}>
          <boxGeometry args={[ROOM_WIDTH, 0.2, ROOM_DEPTH]} />
          <meshStandardMaterial {...floorTextures} displacementScale={0.02} />
        </mesh>
      </RigidBody>

      {/* Ceiling */}
      <RigidBody type="fixed" colliders="cuboid">
        <mesh position={[0, ROOM_HEIGHT, 0]}>
          <boxGeometry args={[ROOM_WIDTH, 0.2, ROOM_DEPTH]} />
          <meshStandardMaterial
            {...ceilingTextures}
            emissive="#ffffff"
            emissiveIntensity={1}
            displacementScale={0.02}
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
          <meshStandardMaterial {...wallTextures} displacementScale={0.02} />
        </mesh>
      </RigidBody>

      {/* Painting on back wall */}
      <mesh
        position={[0, 2.2, -ROOM_DEPTH / 2 + WALL_THICKNESS / 2 + 0.01]}
        receiveShadow>
        <planeGeometry args={[2, 1.5]} />
        <meshStandardMaterial {...paintingTextures} />
      </mesh>

      {/* Front wall */}
      <RigidBody type="fixed" colliders="cuboid">
        <mesh
          receiveShadow
          castShadow
          position={[0, ROOM_HEIGHT / 2, ROOM_DEPTH / 2]}>
          <boxGeometry args={[ROOM_WIDTH, ROOM_HEIGHT, WALL_THICKNESS]} />
          <meshStandardMaterial {...wallTextures} displacementScale={0.02} />
        </mesh>
      </RigidBody>

      {/* Left wall */}
      <RigidBody type="fixed" colliders="cuboid">
        <mesh
          receiveShadow
          castShadow
          position={[-ROOM_WIDTH / 2, ROOM_HEIGHT / 2, 0]}>
          <boxGeometry args={[WALL_THICKNESS, ROOM_HEIGHT, ROOM_DEPTH]} />
          <meshStandardMaterial {...wallTextures} displacementScale={0.02} />
        </mesh>
      </RigidBody>

      {/* Right wall */}
      <RigidBody type="fixed" colliders="cuboid">
        <mesh
          receiveShadow
          castShadow
          position={[ROOM_WIDTH / 2, ROOM_HEIGHT / 2, 0]}>
          <boxGeometry args={[WALL_THICKNESS, ROOM_HEIGHT, ROOM_DEPTH]} />
          <meshStandardMaterial {...wallTextures} displacementScale={0.02} />
        </mesh>
      </RigidBody>
    </group>
  );
}
