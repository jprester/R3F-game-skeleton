import { useMemo, useRef } from "react";
import { useFrame, useLoader } from "@react-three/fiber";
import { CuboidCollider, RigidBody } from "@react-three/rapier";
import {
  AdditiveBlending,
  BoxGeometry,
  BufferAttribute,
  CanvasTexture,
  Color,
  DoubleSide,
  MeshStandardMaterial,
  RepeatWrapping,
  ShaderMaterial,
  SRGBColorSpace,
  Texture,
  TextureLoader,
  Vector2,
} from "three";

type Vec3 = [number, number, number];

const WORLD_WIDTH = 30;
const WORLD_DEPTH = 44;
const WALL_HEIGHT = 7.2;
const WALL_THICKNESS = 0.5;
const POOL_WIDTH = 16.4;
const POOL_DEPTH = 35;
const DEFAULT_TEXTURE_WORLD_SIZE = 2.6;
const WALL_TILE_PATH = "/textures/wall/bahtroom-walls2";
const POOL_TILE_PATH = "/textures/floor/pool-tiles";

type TileVariant = "deck" | "wall" | "pool" | "coping" | "ceiling" | "shadow";
type MaterialTextureSet = {
  map: Texture;
  normalMap?: Texture;
  roughnessMap?: Texture;
  textureWorldSize?: number;
  normalStrength?: number;
};

function createTileTexture(
  base: string,
  grout: string,
  accent: string,
  tileSize = 42
) {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 512;

  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("Unable to create tile texture context");
  }

  const baseColor = new Color(base);
  const accentColor = new Color(accent);

  context.fillStyle = base;
  context.fillRect(0, 0, canvas.width, canvas.height);

  for (let y = 0; y < canvas.height; y += tileSize) {
    for (let x = 0; x < canvas.width; x += tileSize) {
      const variation = ((x / tileSize + y / tileSize) % 5) * 0.01;
      const color = baseColor.clone().lerp(accentColor, variation);
      context.fillStyle = `#${color.getHexString()}`;
      context.fillRect(x + 1, y + 1, tileSize - 2, tileSize - 2);
    }
  }

  context.strokeStyle = grout;
  context.lineWidth = 2;

  for (let x = 0; x <= canvas.width; x += tileSize) {
    context.beginPath();
    context.moveTo(x, 0);
    context.lineTo(x, canvas.height);
    context.stroke();
  }

  for (let y = 0; y <= canvas.height; y += tileSize) {
    context.beginPath();
    context.moveTo(0, y);
    context.lineTo(canvas.width, y);
    context.stroke();
  }

  const texture = new CanvasTexture(canvas);
  texture.wrapS = texture.wrapT = RepeatWrapping;
  texture.colorSpace = SRGBColorSpace;
  texture.anisotropy = 8;

  return texture;
}

function createCausticTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 512;

  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("Unable to create caustic texture context");
  }

  context.clearRect(0, 0, canvas.width, canvas.height);
  context.strokeStyle = "rgba(255, 255, 255, 0.34)";
  context.lineWidth = 1.1;

  for (let row = 0; row < 18; row += 1) {
    const y = row * 31 + 8;
    context.beginPath();

    for (let x = 0; x <= canvas.width; x += 8) {
      const wave =
        Math.sin((x + row * 21) * 0.033) * 5 +
        Math.sin((x + row * 11) * 0.067) * 2;

      if (x === 0) {
        context.moveTo(x, y + wave);
      } else {
        context.lineTo(x, y + wave);
      }
    }

    context.stroke();
  }

  const texture = new CanvasTexture(canvas);
  texture.wrapS = texture.wrapT = RepeatWrapping;
  texture.colorSpace = SRGBColorSpace;
  texture.repeat.set(4, 7);
  texture.anisotropy = 8;

  return texture;
}

function configureSourceTexture(texture: Texture, isColorMap = false) {
  texture.wrapS = texture.wrapT = RepeatWrapping;
  texture.anisotropy = 8;
  if (isColorMap) {
    texture.colorSpace = SRGBColorSpace;
  }
  texture.needsUpdate = true;

  return texture;
}

function proceduralTextureSet(
  texture: Texture,
  textureWorldSize = DEFAULT_TEXTURE_WORLD_SIZE
): MaterialTextureSet {
  return {
    map: texture,
    textureWorldSize,
  };
}

function usePoolroomTextures() {
  const [
    wallColorMap,
    wallNormalMap,
    wallRoughnessMap,
    poolColorMap,
    poolNormalMap,
    poolRoughnessMap,
  ] = useLoader(TextureLoader, [
    `${WALL_TILE_PATH}/Tiles105_4K-JPG_Color.jpg`,
    `${WALL_TILE_PATH}/Tiles105_4K-JPG_NormalGL.jpg`,
    `${WALL_TILE_PATH}/Tiles105_4K-JPG_Roughness.jpg`,
    `${POOL_TILE_PATH}/Tiles020_2K-JPG_Color.jpg`,
    `${POOL_TILE_PATH}/Tiles020_2K-JPG_NormalGL.jpg`,
    `${POOL_TILE_PATH}/Tiles020_2K-JPG_Roughness.jpg`,
  ]);

  return useMemo(
    () => {
      const wallTiles = {
        map: configureSourceTexture(wallColorMap, true),
        normalMap: configureSourceTexture(wallNormalMap),
        roughnessMap: configureSourceTexture(wallRoughnessMap),
        textureWorldSize: 2.55,
        normalStrength: 0.1,
      };
      const poolTiles = {
        map: configureSourceTexture(poolColorMap, true),
        normalMap: configureSourceTexture(poolNormalMap),
        roughnessMap: configureSourceTexture(poolRoughnessMap),
        textureWorldSize: 3.8,
        normalStrength: 0.14,
      };

      return {
        deck: wallTiles,
        wall: wallTiles,
        pool: poolTiles,
        coping: {
          ...wallTiles,
          textureWorldSize: 2.55,
          normalStrength: 0.08,
        },
        ceiling: proceduralTextureSet(
          createTileTexture("#f0f5f5", "#cbd4d4", "#ffffff", 64),
          5.8
        ),
        shadow: proceduralTextureSet(
          createTileTexture("#95a6a4", "#738281", "#c6d0cf", 42),
          4.8
        ),
        caustics: createCausticTexture(),
      };
    },
    [
      poolColorMap,
      poolNormalMap,
      poolRoughnessMap,
      wallColorMap,
      wallNormalMap,
      wallRoughnessMap,
    ]
  );
}

function getMaterialProfile(
  variant: TileVariant,
  textures: ReturnType<typeof usePoolroomTextures>
) {
  if (variant === "pool") {
    return {
      maps: textures.pool,
      color: "#d3edf0",
      roughness: 0.5,
    };
  }

  if (variant === "coping") {
    return {
      maps: textures.coping,
      color: "#f9faf7",
      roughness: 0.42,
    };
  }

  if (variant === "ceiling") {
    return {
      maps: textures.ceiling,
      color: "#f3f7f7",
      roughness: 0.58,
    };
  }

  if (variant === "shadow") {
    return {
      maps: textures.shadow,
      color: "#99aaa6",
      roughness: 0.46,
    };
  }

  if (variant === "wall") {
    return {
      maps: textures.wall,
      color: "#f7f8f6",
      roughness: 0.46,
    };
  }

  return {
    maps: textures.deck,
    color: "#f4f6f3",
    roughness: 0.5,
  };
}

function createTiledMap(
  texture: Texture
) {
  const map = texture.clone();
  map.wrapS = map.wrapT = RepeatWrapping;
  map.needsUpdate = true;

  return map;
}

function createMaterial(
  textures: MaterialTextureSet,
  color: string,
  roughness: number
) {
  return new MeshStandardMaterial({
    map: createTiledMap(textures.map),
    normalMap: textures.normalMap
      ? createTiledMap(textures.normalMap)
      : undefined,
    normalScale: textures.normalMap
      ? new Vector2(
          textures.normalStrength ?? 0.2,
          textures.normalStrength ?? 0.2
        )
      : undefined,
    roughnessMap: textures.roughnessMap
      ? createTiledMap(textures.roughnessMap)
      : undefined,
    color,
    roughness,
    metalness: 0,
  });
}

function useBlockMaterials(
  variant: TileVariant,
  textures: ReturnType<typeof usePoolroomTextures>,
  size: Vec3
) {
  return useMemo(() => {
    const { maps, color, roughness } = getMaterialProfile(variant, textures);

    return [
      createMaterial(maps, color, roughness),
      createMaterial(maps, color, roughness),
      createMaterial(maps, color, roughness),
      createMaterial(maps, color, roughness),
      createMaterial(maps, color, roughness),
      createMaterial(maps, color, roughness),
    ];
  }, [size, textures, variant]);
}

function createWorldMappedBoxGeometry(
  size: Vec3,
  position: Vec3,
  textureWorldSize: number
) {
  const geometry = new BoxGeometry(size[0], size[1], size[2]);
  const positions = geometry.getAttribute("position");
  const normals = geometry.getAttribute("normal");
  const uvs = geometry.getAttribute("uv") as BufferAttribute;
  const scale = Math.max(0.001, textureWorldSize);

  for (let index = 0; index < positions.count; index += 1) {
    const worldX = positions.getX(index) + position[0];
    const worldY = positions.getY(index) + position[1];
    const worldZ = positions.getZ(index) + position[2];
    const normalX = normals.getX(index);
    const normalY = normals.getY(index);

    if (Math.abs(normalY) > 0.5) {
      uvs.setXY(index, worldX / scale, worldZ / scale);
    } else if (Math.abs(normalX) > 0.5) {
      uvs.setXY(index, worldZ / scale, worldY / scale);
    } else {
      uvs.setXY(index, worldX / scale, worldY / scale);
    }
  }

  uvs.needsUpdate = true;

  return geometry;
}

function Block({
  position,
  size,
  rotation = [0, 0, 0],
  variant,
  textures,
  castShadow = true,
  receiveShadow = true,
}: {
  position: Vec3;
  size: Vec3;
  rotation?: Vec3;
  variant: TileVariant;
  textures: ReturnType<typeof usePoolroomTextures>;
  castShadow?: boolean;
  receiveShadow?: boolean;
}) {
  const colliderSize = useMemo<Vec3>(
    () => [size[0] / 2, size[1] / 2, size[2] / 2],
    [size]
  );
  const materials = useBlockMaterials(variant, textures, size);
  const textureWorldSize = useMemo(
    () =>
      getMaterialProfile(variant, textures).maps.textureWorldSize ??
      DEFAULT_TEXTURE_WORLD_SIZE,
    [textures, variant]
  );
  const geometry = useMemo(
    () => createWorldMappedBoxGeometry(size, position, textureWorldSize),
    [position, size, textureWorldSize]
  );

  return (
    <RigidBody
      type="fixed"
      position={position}
      rotation={rotation}
      colliders={false}>
      <CuboidCollider args={colliderSize} />
      <mesh
        castShadow={castShadow}
        receiveShadow={receiveShadow}
        geometry={geometry}
        material={materials}
      />
    </RigidBody>
  );
}

const WATER_VERTEX_SHADER = `
  uniform float uTime;

  varying vec2 vUv;
  varying vec3 vWorldPosition;
  varying float vWave;

  void main() {
    vec3 displaced = position;
    vec2 p = position.xy;

    float waveA = sin(p.x * 0.62 + uTime * 0.36) * 0.012;
    float waveB = sin(p.y * 1.05 - uTime * 0.42) * 0.009;
    float waveC = sin((p.x + p.y) * 0.44 + uTime * 0.28) * 0.007;

    vWave = waveA + waveB + waveC;
    displaced.z += vWave;

    vec4 worldPosition = modelMatrix * vec4(displaced, 1.0);
    vWorldPosition = worldPosition.xyz;
    vUv = uv;
    gl_Position = projectionMatrix * viewMatrix * worldPosition;
  }
`;

const WATER_FRAGMENT_SHADER = `
  uniform float uTime;
  uniform vec3 uShallowColor;
  uniform vec3 uDeepColor;
  uniform vec3 uHighlightColor;
  uniform float uOpacity;

  varying vec2 vUv;
  varying vec3 vWorldPosition;
  varying float vWave;

  float waveLine(vec2 p, float scale, float speed) {
    float a = sin(p.x * scale + sin(p.y * 0.7) * 1.3 + uTime * speed);
    float b = sin((p.x + p.y) * scale * 0.58 - uTime * speed * 0.72);
    return a * b * 0.5 + 0.5;
  }

  void main() {
    float edgeDistance = min(min(vUv.x, 1.0 - vUv.x), min(vUv.y, 1.0 - vUv.y));
    float centerDepth = smoothstep(0.02, 0.42, edgeDistance);

    float fineWave = waveLine(vWorldPosition.xz, 3.7, 0.75);
    float broadWave = waveLine(vWorldPosition.xz, 0.92, 0.28);
    float glint = smoothstep(0.989, 1.0, fineWave) * 0.07;
    float caustic = smoothstep(0.88, 1.0, broadWave) * 0.035;

    vec3 color = mix(uShallowColor, uDeepColor, centerDepth);
    color += uHighlightColor * (glint + caustic + max(vWave, 0.0) * 1.1);

    float alpha = uOpacity + centerDepth * 0.08;
    gl_FragColor = vec4(color, alpha);
  }
`;

function WaterSurface({
  position,
  size,
  textures,
}: {
  position: Vec3;
  size: [number, number];
  textures: ReturnType<typeof usePoolroomTextures>;
}) {
  const materialRef = useRef<ShaderMaterial>(null);
  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uShallowColor: { value: new Color("#b8dce3") },
      uDeepColor: { value: new Color("#79aeba") },
      uHighlightColor: { value: new Color("#f6ffff") },
      uOpacity: { value: 0.52 },
    }),
    []
  );

  useFrame((state) => {
    if (!materialRef.current) return;
    materialRef.current.uniforms.uTime.value = state.clock.elapsedTime;
  });

  return (
    <group>
      <mesh position={position} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[size[0], size[1], 120, 220]} />
        <shaderMaterial
          ref={materialRef}
          uniforms={uniforms}
          vertexShader={WATER_VERTEX_SHADER}
          fragmentShader={WATER_FRAGMENT_SHADER}
          transparent
          side={DoubleSide}
          depthWrite={false}
        />
      </mesh>
      <mesh
        position={[position[0], position[1] + 0.006, position[2]]}
        rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={size} />
        <meshBasicMaterial
          map={textures.caustics}
          transparent
          opacity={0.035}
          blending={AdditiveBlending}
          depthWrite={false}
        />
      </mesh>
    </group>
  );
}

function SkylightPanel({ position, size }: { position: Vec3; size: Vec3 }) {
  return (
    <group position={position}>
      <mesh position={[0, -0.035, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[size[0] - 0.7, size[2] - 0.5]} />
        <meshStandardMaterial
          color="#eef3f2"
          roughness={0.82}
          metalness={0}
          emissive="#edf6f4"
          emissiveIntensity={0.08}
          side={DoubleSide}
        />
      </mesh>
      <rectAreaLight
        width={size[0] - 0.7}
        height={size[2] - 0.5}
        intensity={0.035}
        color="#f7fbf8"
        rotation={[-Math.PI / 2, 0, 0]}
      />
    </group>
  );
}

function LightSlot({ position, size }: { position: Vec3; size: [number, number] }) {
  return (
    <group position={position} rotation={[-Math.PI / 2, 0, 0]}>
      <mesh position={[0, 0, -0.006]}>
        <planeGeometry args={[size[0], size[1]]} />
        <meshBasicMaterial color="#f8fbf8" transparent opacity={0.72} />
      </mesh>
      <rectAreaLight
        width={size[0]}
        height={size[1]}
        intensity={0.045}
        color="#f7fbf8"
        rotation={[0, 0, 0]}
      />
    </group>
  );
}

function WallLightPatch({
  position,
  size,
}: {
  position: Vec3;
  size: [number, number];
}) {
  return (
    <mesh position={position} rotation={[0, -Math.PI / 2, 0]}>
      <planeGeometry args={size} />
      <meshBasicMaterial
        color="#ffffff"
        transparent
        opacity={0.11}
        side={DoubleSide}
      />
    </mesh>
  );
}

function PoolSteps({
  textures,
}: {
  textures: ReturnType<typeof usePoolroomTextures>;
}) {
  const steps = [
    { x: 6.7, y: -0.2, width: 3.0 },
    { x: 7.15, y: -0.48, width: 2.1 },
    { x: 7.55, y: -0.76, width: 1.3 },
  ];

  return (
    <group>
      {steps.map((step, index) => (
        <Block
          key={index}
          position={[step.x, step.y, 8.8]}
          size={[step.width, 0.24, 4.8]}
          variant="pool"
          textures={textures}
        />
      ))}
    </group>
  );
}

function StructuralPillars({
  textures,
}: {
  textures: ReturnType<typeof usePoolroomTextures>;
}) {
  const zPositions = [-13.8, -6.2, 1.4, 9.0, 15.8];

  return (
    <group>
      {zPositions.map((z) => (
        <Block
          key={`left-${z}`}
          position={[-13.55, WALL_HEIGHT / 2, z]}
          size={[1.6, WALL_HEIGHT, 2.05]}
          variant="wall"
          textures={textures}
        />
      ))}
      {[-12.2, -2.2, 7.8].map((z) => (
        <Block
          key={`right-${z}`}
          position={[13.85, WALL_HEIGHT / 2, z]}
          size={[1.15, WALL_HEIGHT, 1.7]}
          variant="wall"
          textures={textures}
        />
      ))}
    </group>
  );
}

function CeilingSystem({
  textures,
}: {
  textures: ReturnType<typeof usePoolroomTextures>;
}) {
  const beamZ = [-17.4, -11.0, -4.6, 1.8, 8.2, 14.6];
  const lightZ = [-14.2, -7.8, -1.4, 5.0, 11.4];

  return (
    <group>
      <Block
        position={[-11.1, 6.78, 0]}
        size={[7.6, 0.34, 40]}
        variant="ceiling"
        textures={textures}
        castShadow={false}
      />
      <Block
        position={[0, 6.78, 0]}
        size={[13.8, 0.28, 40]}
        variant="ceiling"
        textures={textures}
        castShadow={false}
      />
      <Block
        position={[11.1, 6.78, 0]}
        size={[7.6, 0.34, 40]}
        variant="ceiling"
        textures={textures}
        castShadow={false}
      />

      {beamZ.map((z) => (
        <Block
          key={z}
          position={[0, 6.55, z]}
          size={[29.2, 0.56, 0.62]}
          variant="ceiling"
          textures={textures}
          castShadow={false}
        />
      ))}

      {lightZ.map((z) => (
        <SkylightPanel
          key={z}
          position={[0, 6.5, z]}
          size={[9.8, 0.04, 2.8]}
        />
      ))}

      {lightZ.map((z) => (
        <group key={`slots-${z}`}>
          <LightSlot position={[-10.2, 6.42, z]} size={[2.2, 0.08]} />
          <LightSlot position={[10.2, 6.42, z]} size={[2.2, 0.08]} />
        </group>
      ))}
    </group>
  );
}

export default function Room() {
  const textures = usePoolroomTextures();

  return (
    <group>
      <Block
        position={[-12.05, -0.12, 0]}
        size={[5.9, 0.24, 42.6]}
        variant="deck"
        textures={textures}
        castShadow={false}
      />
      <Block
        position={[12.05, -0.12, 0]}
        size={[5.9, 0.24, 42.6]}
        variant="deck"
        textures={textures}
        castShadow={false}
      />
      <Block
        position={[0, -0.12, 19.85]}
        size={[18.1, 0.24, 2.9]}
        variant="deck"
        textures={textures}
        castShadow={false}
      />
      <Block
        position={[0, -0.12, -19.85]}
        size={[18.1, 0.24, 2.9]}
        variant="deck"
        textures={textures}
        castShadow={false}
      />

      <Block
        position={[0, -1.12, 0]}
        size={[POOL_WIDTH, 0.22, POOL_DEPTH]}
        variant="pool"
        textures={textures}
      />
      <Block
        position={[-8.35, -0.56, 0]}
        size={[0.34, 1.12, POOL_DEPTH]}
        variant="pool"
        textures={textures}
      />
      <Block
        position={[8.35, -0.56, 0]}
        size={[0.34, 1.12, POOL_DEPTH]}
        variant="pool"
        textures={textures}
      />
      <Block
        position={[0, -0.56, -17.65]}
        size={[POOL_WIDTH, 1.12, 0.34]}
        variant="pool"
        textures={textures}
      />
      <Block
        position={[0, -0.56, 17.65]}
        size={[POOL_WIDTH, 1.12, 0.34]}
        variant="pool"
        textures={textures}
      />

      <Block
        position={[-8.75, 0.015, 0]}
        size={[0.7, 0.03, POOL_DEPTH + 0.9]}
        variant="coping"
        textures={textures}
        castShadow={false}
      />
      <Block
        position={[8.75, 0.015, 0]}
        size={[0.7, 0.03, POOL_DEPTH + 0.9]}
        variant="coping"
        textures={textures}
        castShadow={false}
      />
      <Block
        position={[0, 0.015, -18.05]}
        size={[POOL_WIDTH + 1.5, 0.03, 0.7]}
        variant="coping"
        textures={textures}
        castShadow={false}
      />
      <Block
        position={[0, 0.015, 18.05]}
        size={[POOL_WIDTH + 1.5, 0.03, 0.7]}
        variant="coping"
        textures={textures}
        castShadow={false}
      />

      <PoolSteps textures={textures} />
      <WaterSurface
        position={[0, 0.012, 0]}
        size={[POOL_WIDTH - 0.45, POOL_DEPTH - 0.45]}
        textures={textures}
      />

      <Block
        position={[0, WALL_HEIGHT / 2, WORLD_DEPTH / 2]}
        size={[WORLD_WIDTH, WALL_HEIGHT, WALL_THICKNESS]}
        variant="wall"
        textures={textures}
      />
      <Block
        position={[0, WALL_HEIGHT / 2, -WORLD_DEPTH / 2]}
        size={[WORLD_WIDTH, WALL_HEIGHT, WALL_THICKNESS]}
        variant="wall"
        textures={textures}
      />
      <Block
        position={[-WORLD_WIDTH / 2, WALL_HEIGHT / 2, 0]}
        size={[WALL_THICKNESS, WALL_HEIGHT, WORLD_DEPTH]}
        variant="wall"
        textures={textures}
      />
      <Block
        position={[WORLD_WIDTH / 2, WALL_HEIGHT / 2, 0]}
        size={[WALL_THICKNESS, WALL_HEIGHT, WORLD_DEPTH]}
        variant="wall"
        textures={textures}
      />

      <StructuralPillars textures={textures} />
      <CeilingSystem textures={textures} />

      {[-12.8, -9.7, -6.6, -3.5, -0.4, 2.7, 5.8, 8.9, 12.0].map((z) => (
        <WallLightPatch key={z} position={[14.74, 4.5, z]} size={[0.34, 1.2]} />
      ))}

      {[-8.8, 8.8].map((x) => (
        <mesh
          key={x}
          position={[x, 0.23, 0]}
          rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[0.045, POOL_DEPTH - 1.6]} />
          <meshBasicMaterial color="#62787f" transparent opacity={0.5} />
        </mesh>
      ))}
    </group>
  );
}
