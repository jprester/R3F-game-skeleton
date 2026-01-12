import { useMemo } from "react";
import { CuboidCollider, RigidBody } from "@react-three/rapier";
import { useTexture } from "@react-three/drei";
import { RepeatWrapping, BoxGeometry, PlaneGeometry } from "three";

// Room dimensions
const ROOM_WIDTH = 10;
const ROOM_DEPTH = 10;
const ROOM_HEIGHT = 4;
const WALL_THICKNESS = 0.3;

export default function Room() {
  // Memoize texture configurations to prevent recreation on re-renders
  const floorTextureConfig = useMemo(
    () => ({
      map: "/textures/floor/Carpet016_1K-JPG_Color.jpg",
      normalMap: "/textures/floor/Carpet016_1K-JPG_NormalGL.jpg",
      roughnessMap: "/textures/floor/Carpet016_1K-JPG_Roughness.jpg",
    }),
    []
  );

  const wallTextureConfig = useMemo(
    () => ({
      map: "/textures/wall/Wallpaper002A_1K-JPG_Color.jpg",
      normalMap: "/textures/wall/Wallpaper002A_1K-JPG_NormalGL.jpg",
      roughnessMap: "/textures/wall/Wallpaper002A_1K-JPG_Roughness.jpg",
    }),
    []
  );

  const ceilingTextureConfig = useMemo(
    () => ({
      map: "/textures/ceiling/OfficeCeiling002_2K-JPG_Color.jpg",
      normalMap: "/textures/ceiling/OfficeCeiling002_2K-JPG_NormalGL.jpg",
      roughnessMap: "/textures/ceiling/OfficeCeiling002_2K-JPG_Roughness.jpg",
      aoMap: "/textures/ceiling/OfficeCeiling002_2K-JPG_AmbientOcclusion.jpg",
      emissiveMap: "/textures/ceiling/OfficeCeiling002_2K-JPG_Emission.jpg",
    }),
    []
  );

  const paintingTextureConfig = useMemo(
    () => ({
      map: "/textures/painting/Painting001_2K-JPG_Color.jpg",
      normalMap: "/textures/painting/Painting001_2K-JPG_NormalGL.jpg",
      roughnessMap: "/textures/painting/Painting001_2K-JPG_Roughness.jpg",
    }),
    []
  );

  const abstractDrawingTextureConfig = useMemo(
    () => ({
      map: "/textures/painting/abstract-drawing/maxfabris_single_continuous_line_drawing_belle_epoque_little_ch_8e5a236c-ee61-4951-b52a-da2a89910853.png",
    }),
    []
  );

  // Load textures with memoized configs
  const floorTextures = useTexture(floorTextureConfig);
  const wallTextures = useTexture(wallTextureConfig);
  const ceilingTextures = useTexture(ceilingTextureConfig);
  const paintingTextures = useTexture(paintingTextureConfig);
  const abstractDrawingTextures = useTexture(abstractDrawingTextureConfig);

  // Memoize texture configuration callbacks
  useMemo(() => {
    Object.values(floorTextures).forEach((texture) => {
      texture.wrapS = texture.wrapT = RepeatWrapping;
      texture.repeat.set(4, 4);
    });

    Object.values(wallTextures).forEach((texture) => {
      texture.wrapS = texture.wrapT = RepeatWrapping;
      texture.repeat.set(4, 1.5);
    });

    Object.values(ceilingTextures).forEach((texture) => {
      texture.wrapS = texture.wrapT = RepeatWrapping;
      texture.repeat.set(1.5, 1.5);
      // Offset to center the pattern and avoid lights being cut at walls
      texture.offset.set(0.7, 0.7);
    });
  }, [floorTextures, wallTextures, ceilingTextures]);

  // Create shared geometry instances
  const floorGeometry = useMemo(
    () => new BoxGeometry(ROOM_WIDTH, 0.2, ROOM_DEPTH),
    []
  );

  const ceilingGeometry = useMemo(
    () => new BoxGeometry(ROOM_WIDTH, 0.2, ROOM_DEPTH),
    []
  );

  const wallHorizontalGeometry = useMemo(
    () => new BoxGeometry(ROOM_WIDTH, ROOM_HEIGHT, WALL_THICKNESS),
    []
  );

  const wallVerticalGeometry = useMemo(
    () => new BoxGeometry(WALL_THICKNESS, ROOM_HEIGHT, ROOM_DEPTH),
    []
  );

  const paintingGeometry = useMemo(() => new PlaneGeometry(2, 1.5), []);

  // Abstract drawing: 1792x2688 = 2:3 aspect ratio (portrait)
  const abstractDrawingGeometry = useMemo(() => new PlaneGeometry(1, 1.5), []);
  // Frame slightly larger than the drawing for border effect
  const abstractFrameGeometry = useMemo(
    () => new PlaneGeometry(1.12, 1.62),
    []
  );

  return (
    <group>
      {/* Floor */}
      <RigidBody type="fixed" colliders={false}>
        <CuboidCollider
          args={[ROOM_WIDTH / 2, 0.1, ROOM_DEPTH / 2]}
          position={[0, -0.1, 0]}
        />
        <mesh receiveShadow position={[0, -0.1, 0]}>
          <primitive object={floorGeometry} attach="geometry" />
          <meshStandardMaterial {...floorTextures} />
        </mesh>
      </RigidBody>

      {/* Ceiling */}
      <RigidBody type="fixed" colliders="cuboid">
        <mesh position={[0, ROOM_HEIGHT, 0]}>
          <primitive object={ceilingGeometry} attach="geometry" />
          <meshStandardMaterial
            {...ceilingTextures}
            emissive="#ffffff"
            emissiveIntensity={1}
          />
        </mesh>
      </RigidBody>

      {/* Back wall */}
      <RigidBody type="fixed" colliders="cuboid">
        <mesh
          receiveShadow
          castShadow
          position={[0, ROOM_HEIGHT / 2, -ROOM_DEPTH / 2]}>
          <primitive object={wallHorizontalGeometry} attach="geometry" />
          <meshStandardMaterial {...wallTextures} />
        </mesh>
      </RigidBody>

      {/* Painting on back wall */}
      <mesh
        position={[0, 2.2, -ROOM_DEPTH / 2 + WALL_THICKNESS / 2 + 0.01]}
        receiveShadow>
        <primitive object={paintingGeometry} attach="geometry" />
        <meshStandardMaterial {...paintingTextures} />
      </mesh>

      {/* Front wall */}
      <RigidBody type="fixed" colliders="cuboid">
        <mesh
          receiveShadow
          castShadow
          position={[0, ROOM_HEIGHT / 2, ROOM_DEPTH / 2]}>
          <primitive object={wallHorizontalGeometry} attach="geometry" />
          <meshStandardMaterial {...wallTextures} />
        </mesh>
      </RigidBody>

      {/* Left wall */}
      <RigidBody type="fixed" colliders="cuboid">
        <mesh
          receiveShadow
          castShadow
          position={[-ROOM_WIDTH / 2, ROOM_HEIGHT / 2, 0]}>
          <primitive object={wallVerticalGeometry} attach="geometry" />
          <meshStandardMaterial {...wallTextures} />
        </mesh>
      </RigidBody>

      {/* Abstract drawing with frame on left wall */}
      <group
        position={[-ROOM_WIDTH / 2 + WALL_THICKNESS / 2 + 0.01, 2, 0]}
        rotation={[0, Math.PI / 2, 0]}>
        {/* Black frame (behind the drawing) */}
        <mesh receiveShadow>
          <primitive object={abstractFrameGeometry} attach="geometry" />
          <meshStandardMaterial color="#1a1a1a" />
        </mesh>
        {/* Drawing (slightly in front of frame) */}
        <mesh position={[0, 0, 0.005]} receiveShadow>
          <primitive object={abstractDrawingGeometry} attach="geometry" />
          <meshStandardMaterial {...abstractDrawingTextures} />
        </mesh>
      </group>

      {/* Right wall */}
      <RigidBody type="fixed" colliders="cuboid">
        <mesh
          receiveShadow
          castShadow
          position={[ROOM_WIDTH / 2, ROOM_HEIGHT / 2, 0]}>
          <primitive object={wallVerticalGeometry} attach="geometry" />
          <meshStandardMaterial {...wallTextures} />
        </mesh>
      </RigidBody>
    </group>
  );
}
