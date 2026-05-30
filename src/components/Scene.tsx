import { useEffect, useMemo, useRef } from "react";
import { Text, useGLTF } from "@react-three/drei";
import { useFrame, useLoader, useThree } from "@react-three/fiber";
import {
  Bloom,
  ChromaticAberration,
  EffectComposer,
  Noise,
  Vignette,
} from "@react-three/postprocessing";
import { BlendFunction } from "postprocessing";
import {
  BackSide,
  Color,
  Euler,
  Fog,
  Mesh,
  MeshPhysicalMaterial,
  MathUtils,
  PlaneGeometry,
  RepeatWrapping,
  RawShaderMaterial,
  SphereGeometry,
  SRGBColorSpace,
  Texture,
  TextureLoader,
  Vector2,
  Vector3,
} from "three";
import { Water } from "three/examples/jsm/objects/Water.js";
import skyVertexShader from "../shaders/sky.vert.glsl";
import skyFragmentShader from "../shaders/sky.frag.glsl";
import MusicPlayer, {
  BOOMBOX_CENTER_X,
  BOOMBOX_CENTER_Z,
  BOOMBOX_TABLE_DEPTH,
  BOOMBOX_TABLE_WIDTH,
} from "./MusicPlayer";
import { useControls } from "leva";

const OCEAN_SIZE = 10000;
const SUN_ELEVATION = 8;
const SUN_AZIMUTH = 180;
const LOOK_SENSITIVITY = 0.002;
const FLOOR_WIDTH = 56;
const FLOOR_DEPTH = 50;
const FLOOR_HEIGHT = 5.2;
const FLOOR_TEXTURE_WORLD_SIZE = 12;
const FRAME_THICKNESS = 1.9;
const POOL_WIDTH = 17;
const POOL_DEPTH = 14;
const POOL_CENTER_X = 0;
const POOL_CENTER_Z = -2;
const POOL_RECESS = 1.7;
const POOL_WATER_DROP = 0.45;
const COLUMN_HALF = 1.3;
const PEDESTAL_WIDTH = 4.2;
const PEDESTAL_HEIGHT = 12.5;
const PEDESTAL_DEPTH = 4.2;
const PEDESTAL_CENTER_X = -20;
const PEDESTAL_CENTER_Z = -2;
const PLAYER_EYE_HEIGHT = 1.7;
const PLAYER_RADIUS = 1.2;
const WALK_SPEED = 22;
const GROUND_ACCELERATION = 38;
const AIR_ACCELERATION = 10;
const GRAVITY = 34;
const JUMP_SPEED = 10.5;

interface PlayerSnapshot {
  x: number;
  y: number;
  z: number;
  velocity: {
    x: number;
    y: number;
    z: number;
  };
  yaw: number;
  pitch: number;
  grounded: boolean;
  jumpCount: number;
  lastJumpPeakY: number;
}

function getUniforms(object: Water) {
  return object.material.uniforms;
}

function useGroundedPlayer() {
  const { camera, gl } = useThree();
  const keys = useRef(new Set<string>());
  const yaw = useRef(0);
  const pitch = useRef(0);
  const isGrounded = useRef(true);
  const jumpWasDown = useRef(false);
  const jumpCount = useRef(0);
  const lastJumpPeakY = useRef(FLOOR_HEIGHT + PLAYER_EYE_HEIGHT);
  const velocity = useMemo(() => new Vector3(), []);
  const forward = useMemo(() => new Vector3(), []);
  const right = useMemo(() => new Vector3(), []);
  const movement = useMemo(() => new Vector3(), []);
  const targetVelocity = useMemo(() => new Vector3(), []);
  const euler = useMemo(() => new Euler(0, 0, 0, "YXZ"), []);
  const snapshot = useRef<PlayerSnapshot>({
    x: 0,
    y: FLOOR_HEIGHT + PLAYER_EYE_HEIGHT,
    z: FLOOR_DEPTH / 2 - 5,
    velocity: { x: 0, y: 0, z: 0 },
    yaw: 0,
    pitch: 0,
    grounded: true,
    jumpCount: 0,
    lastJumpPeakY: FLOOR_HEIGHT + PLAYER_EYE_HEIGHT,
  });

  useEffect(() => {
    camera.position.set(
      0,
      FLOOR_HEIGHT + PLAYER_EYE_HEIGHT,
      FLOOR_DEPTH / 2 - 5,
    );
    camera.rotation.order = "YXZ";
    yaw.current = 0;
    pitch.current = 0;
    velocity.set(0, 0, 0);
    camera.rotation.set(0, 0, 0);
    camera.updateProjectionMatrix();
  }, [camera, velocity]);

  useEffect(() => {
    // Debug hook for screenshot tooling (scripts/shot.mjs): aim the camera
    // without pointer lock. The useFrame loop applies yaw/pitch every frame.
    window.setCameraOrientation = (y: number, p: number) => {
      yaw.current = y;
      pitch.current = MathUtils.clamp(
        p,
        -Math.PI / 2 + 0.01,
        Math.PI / 2 - 0.01,
      );
    };
    return () => {
      delete window.setCameraOrientation;
    };
  }, [pitch, yaw]);

  useEffect(() => {
    const canvas = gl.domElement;

    const requestLock = () => {
      const lockRequest = canvas.requestPointerLock?.();
      if (lockRequest instanceof Promise) {
        lockRequest.catch(() => undefined);
      }
    };

    const handleMouseMove = (event: MouseEvent) => {
      if (document.pointerLockElement !== canvas) return;

      yaw.current -= event.movementX * LOOK_SENSITIVITY;
      pitch.current -= event.movementY * LOOK_SENSITIVITY;
      pitch.current = MathUtils.clamp(
        pitch.current,
        -Math.PI / 2 + 0.01,
        Math.PI / 2 - 0.01,
      );
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      addKey(keys.current, event);
      if (isMovementEvent(event)) {
        event.preventDefault();
      }
    };

    const handleKeyUp = (event: KeyboardEvent) => {
      removeKey(keys.current, event);
      if (isMovementEvent(event)) {
        event.preventDefault();
      }
    };

    canvas.addEventListener("click", requestLock);
    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("keyup", handleKeyUp);

    return () => {
      canvas.removeEventListener("click", requestLock);
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("keyup", handleKeyUp);
    };
  }, [gl]);

  useFrame((_, delta) => {
    euler.set(pitch.current, yaw.current, 0);
    camera.quaternion.setFromEuler(euler);

    camera.getWorldDirection(forward);
    forward.y = 0;
    forward.normalize();
    right.crossVectors(forward, camera.up).normalize();
    movement.set(0, 0, 0);

    if (hasAnyKey(keys.current, ["KeyW", "ArrowUp"])) {
      movement.add(forward);
    }
    if (hasAnyKey(keys.current, ["KeyS", "ArrowDown"])) {
      movement.sub(forward);
    }
    if (hasAnyKey(keys.current, ["KeyA", "ArrowLeft"])) {
      movement.sub(right);
    }
    if (hasAnyKey(keys.current, ["KeyD", "ArrowRight"])) {
      movement.add(right);
    }

    const jumpIsDown = hasAnyKey(keys.current, ["Space", " ", "Spacebar"]);
    if (jumpIsDown && !jumpWasDown.current && isGrounded.current) {
      velocity.y = JUMP_SPEED;
      isGrounded.current = false;
      jumpCount.current += 1;
      lastJumpPeakY.current = camera.position.y;
    }
    jumpWasDown.current = jumpIsDown;

    if (movement.lengthSq() > 0) {
      movement.normalize();
    }

    targetVelocity.copy(movement).multiplyScalar(WALK_SPEED);

    const acceleration = isGrounded.current
      ? GROUND_ACCELERATION
      : AIR_ACCELERATION;
    const blend = Math.min(1, acceleration * delta);
    velocity.x += (targetVelocity.x - velocity.x) * blend;
    velocity.z += (targetVelocity.z - velocity.z) * blend;
    velocity.y -= GRAVITY * delta;

    camera.position.addScaledVector(velocity, delta);
    lastJumpPeakY.current = Math.max(lastJumpPeakY.current, camera.position.y);

    const floorEyeY = FLOOR_HEIGHT + PLAYER_EYE_HEIGHT;
    if (camera.position.y <= floorEyeY) {
      camera.position.y = floorEyeY;
      velocity.y = 0;
      isGrounded.current = true;
    } else {
      isGrounded.current = false;
    }

    camera.position.x = MathUtils.clamp(
      camera.position.x,
      -FLOOR_WIDTH / 2 + PLAYER_RADIUS,
      FLOOR_WIDTH / 2 - PLAYER_RADIUS,
    );
    camera.position.z = MathUtils.clamp(
      camera.position.z,
      -FLOOR_DEPTH / 2 + PLAYER_RADIUS,
      FLOOR_DEPTH / 2 - PLAYER_RADIUS,
    );

    pushOutOfAabb(
      camera,
      velocity,
      POOL_CENTER_X,
      POOL_CENTER_Z,
      POOL_WIDTH,
      POOL_DEPTH,
    );
    pushOutOfAabb(
      camera,
      velocity,
      PEDESTAL_CENTER_X,
      PEDESTAL_CENTER_Z,
      PEDESTAL_WIDTH,
      PEDESTAL_DEPTH,
    );

    for (const [cx, , cz] of COLUMN_POSITIONS) {
      pushOutOfAabb(camera, velocity, cx, cz, COLUMN_HALF * 2, COLUMN_HALF * 2);
    }

    pushOutOfAabb(
      camera,
      velocity,
      BOOMBOX_CENTER_X,
      BOOMBOX_CENTER_Z,
      BOOMBOX_TABLE_WIDTH,
      BOOMBOX_TABLE_DEPTH,
    );

    snapshot.current = {
      x: Number(camera.position.x.toFixed(3)),
      y: Number(camera.position.y.toFixed(3)),
      z: Number(camera.position.z.toFixed(3)),
      velocity: {
        x: Number(velocity.x.toFixed(3)),
        y: Number(velocity.y.toFixed(3)),
        z: Number(velocity.z.toFixed(3)),
      },
      yaw: Number(yaw.current.toFixed(3)),
      pitch: Number(pitch.current.toFixed(3)),
      grounded: isGrounded.current,
      jumpCount: jumpCount.current,
      lastJumpPeakY: Number(lastJumpPeakY.current.toFixed(3)),
    };
  });

  return snapshot;
}

function pushOutOfAabb(
  camera: { position: Vector3 },
  velocity: Vector3,
  centerX: number,
  centerZ: number,
  width: number,
  depth: number,
) {
  const halfX = width / 2 + PLAYER_RADIUS;
  const halfZ = depth / 2 + PLAYER_RADIUS;
  const dx = camera.position.x - centerX;
  const dz = camera.position.z - centerZ;
  if (Math.abs(dx) >= halfX || Math.abs(dz) >= halfZ) return;
  const penX = halfX - Math.abs(dx);
  const penZ = halfZ - Math.abs(dz);
  if (penX < penZ) {
    camera.position.x = centerX + (dx >= 0 ? halfX : -halfX);
    velocity.x = 0;
  } else {
    camera.position.z = centerZ + (dz >= 0 ? halfZ : -halfZ);
    velocity.z = 0;
  }
}

function hasAnyKey(keys: Set<string>, codes: string[]) {
  return codes.some((code) => keys.has(code));
}

function addKey(keys: Set<string>, event: KeyboardEvent) {
  keys.add(event.code);
  keys.add(event.key);
}

function removeKey(keys: Set<string>, event: KeyboardEvent) {
  keys.delete(event.code);
  keys.delete(event.key);
}

function isMovementEvent(event: KeyboardEvent) {
  return isMovementKey(event.code) || isMovementKey(event.key);
}

function isMovementKey(code: string) {
  return [
    "KeyW",
    "KeyA",
    "KeyS",
    "KeyD",
    "ArrowUp",
    "ArrowDown",
    "ArrowLeft",
    "ArrowRight",
    "Space",
    " ",
    "Spacebar",
  ].includes(code);
}

function configureRepeatingTexture(
  texture: Texture,
  repeatX: number,
  repeatY: number,
  isColorMap = false,
  offsetX = 0,
  offsetY = 0,
) {
  texture.wrapS = RepeatWrapping;
  texture.wrapT = RepeatWrapping;
  texture.repeat.set(repeatX, repeatY);
  texture.offset.set(offsetX, offsetY);
  texture.anisotropy = 8;
  if (isColorMap) {
    texture.colorSpace = SRGBColorSpace;
  }
  texture.needsUpdate = true;

  return texture;
}

const COLUMN_POSITIONS: [number, number, number][] = [
  [20, FLOOR_HEIGHT, -19],
  [20, FLOOR_HEIGHT, -10],
  [20, FLOOR_HEIGHT, 0],
  [20, FLOOR_HEIGHT, 8],
  [20, FLOOR_HEIGHT, 17],
  [-20, FLOOR_HEIGHT, -19],
  [-20, FLOOR_HEIGHT, -10],
  [-20, FLOOR_HEIGHT, 8],
  [-20, FLOOR_HEIGHT, 17],
];

function DoricColumns() {
  const { scene } = useGLTF("/models/misc/doric_pillar.glb");
  return (
    <group name="doric-columns">
      {COLUMN_POSITIONS.map((pos, i) => (
        <primitive
          key={i}
          name={`doric-column-${i}`}
          object={scene.clone(true)}
          position={pos}
        />
      ))}
    </group>
  );
}

function VaporwaveBust() {
  const { scene } = useGLTF("/models/statue/helios_vaporwave_bust.glb");
  return (
    <primitive
      name="vaporwave-bust"
      object={scene}
      position={[60, 0, -182]}
      scale={[2, 2, 2]}
    />
  );
}

function WomanStatue() {
  const { scene } = useGLTF("/models/statue/woman1_aiSkin1_0.001.glb");
  return (
    <primitive
      name="woman-statue"
      object={scene}
      position={[
        PEDESTAL_CENTER_X,
        FLOOR_HEIGHT + PEDESTAL_HEIGHT,
        PEDESTAL_CENTER_Z,
      ]}
      rotation={[0, 2 * Math.PI, 0]}
      scale={[3, 3, 3]}
    />
  );
}

function FloorDoor() {
  const { scene } = useGLTF("/models/door/door.glb");
  return (
    <primitive
      name="floor-door"
      object={scene}
      position={[6, FLOOR_HEIGHT, -FLOOR_DEPTH / 2 + 0.5]}
      rotation={[0, 0, 0]}
      scale={[1, 1, 1]}
    />
  );
}

function FloatingFloor({ sunDirection }: { sunDirection: Vector3 }) {
  const [colorMap, normalMap, roughnessMap] = useLoader(TextureLoader, [
    "/textures/wall/bahtroom-walls2/Tiles105_4K-JPG_Color.jpg",
    "/textures/wall/bahtroom-walls2/Tiles105_4K-JPG_NormalGL.jpg",
    "/textures/wall/bahtroom-walls2/Tiles105_4K-JPG_Roughness.jpg",
  ]);
  const waterNormals = useLoader(TextureLoader, "/textures/waternormals.jpg");

  const poolWaterRef = useRef<Water>(null);
  const poolWater = useMemo(() => {
    const tNormals = waterNormals.clone();
    tNormals.wrapS = RepeatWrapping;
    tNormals.wrapT = RepeatWrapping;
    tNormals.needsUpdate = true;

    const waterObject = new Water(
      new PlaneGeometry(POOL_WIDTH - 0.05, POOL_DEPTH - 0.05),
      {
        textureWidth: 512,
        textureHeight: 512,
        waterNormals: tNormals,
        sunDirection: new Vector3(),
        sunColor: 0xff5cb0,
        waterColor: 0x1d4a52,
        distortionScale: 0.15,
        fog: false,
      },
    );

    waterObject.rotation.x = -Math.PI / 2;
    waterObject.material.transparent = true;
    waterObject.material.depthWrite = false;
    // The built-in Water shader is reflection-only and fully opaque. Drive its
    // alpha from the Fresnel term (`reflectance`) it already computes: looking
    // straight down the water is clear so the pool tiles show through, while at
    // grazing angles it stays opaque and mirror-like (keeps the sky reflection).
    waterObject.material.fragmentShader =
      waterObject.material.fragmentShader.replace(
        "gl_FragColor = vec4( outgoingLight, alpha );",
        "gl_FragColor = vec4( outgoingLight, mix( 0.16, 0.92, smoothstep( 0.3, 1.0, reflectance ) ) );",
      );

    return waterObject;
  }, [waterNormals]);

  useEffect(() => {
    if (poolWater) {
      poolWater.material.uniforms.sunDirection.value.copy(sunDirection);
    }
  }, [poolWater, sunDirection]);

  useFrame((_, delta) => {
    if (poolWaterRef.current) {
      poolWaterRef.current.material.uniforms.time.value += delta * 0.15;
    }
  });

  const makeTiledMaterial = (
    width: number,
    height: number,
    worldSize = FLOOR_TEXTURE_WORLD_SIZE,
    offsetX = 0,
    offsetY = 0,
    repeatXSign = 1,
  ) => {
    const repeatX = (width / worldSize) * repeatXSign;
    const repeatY = height / worldSize;
    return new MeshPhysicalMaterial({
      map: configureRepeatingTexture(
        colorMap.clone(),
        repeatX,
        repeatY,
        true,
        offsetX,
        offsetY,
      ),
      normalMap: configureRepeatingTexture(
        normalMap.clone(),
        repeatX,
        repeatY,
        false,
        offsetX,
        offsetY,
      ),
      roughnessMap: configureRepeatingTexture(
        roughnessMap.clone(),
        repeatX,
        repeatY,
        false,
        offsetX,
        offsetY,
      ),
      normalScale: new Vector2(0.18, 0.18),
      color: "#e8d0d8",
      roughness: 0.15,
      metalness: 0,
      // Clearcoat is the wet/glazed varnish layer on top of the ceramic base.
      clearcoat: 0.85,
      clearcoatRoughness: 0.06,
      envMapIntensity: 1.2,
    });
  };

  const floorOffset = (
    centerX: number,
    centerZ: number,
    w: number,
    d: number,
  ) =>
    [
      (centerX - w / 2) / FLOOR_TEXTURE_WORLD_SIZE,
      -(centerZ + d / 2) / FLOOR_TEXTURE_WORLD_SIZE,
    ] as const;

  const poolMinX = POOL_CENTER_X - POOL_WIDTH / 2;
  const poolMaxX = POOL_CENTER_X + POOL_WIDTH / 2;
  const poolMinZ = POOL_CENTER_Z - POOL_DEPTH / 2;
  const poolMaxZ = POOL_CENTER_Z + POOL_DEPTH / 2;
  const floorMinX = -FLOOR_WIDTH / 2;
  const floorMaxX = FLOOR_WIDTH / 2;
  const floorMinZ = -FLOOR_DEPTH / 2;
  const floorMaxZ = FLOOR_DEPTH / 2;

  const northDepth = poolMinZ - floorMinZ;
  const southDepth = floorMaxZ - poolMaxZ;
  const sideDepth = poolMaxZ - poolMinZ;
  const westWidth = poolMinX - floorMinX;
  const eastWidth = floorMaxX - poolMaxX;

  const frameTopY = FLOOR_HEIGHT - FRAME_THICKNESS / 2;
  const poolFloorTopY = FLOOR_HEIGHT - POOL_RECESS;
  const poolFloorCenterY = poolFloorTopY - FRAME_THICKNESS / 2;
  const poolWaterY = FLOOR_HEIGHT - POOL_WATER_DROP;

  const slabs = useMemo(
    () => [
      {
        key: "north",
        size: [FLOOR_WIDTH, FRAME_THICKNESS, northDepth] as const,
        position: [0, frameTopY, (floorMinZ + poolMinZ) / 2] as const,
      },
      {
        key: "south",
        size: [FLOOR_WIDTH, FRAME_THICKNESS, southDepth] as const,
        position: [0, frameTopY, (poolMaxZ + floorMaxZ) / 2] as const,
      },
      {
        key: "west",
        size: [westWidth, FRAME_THICKNESS, sideDepth] as const,
        position: [
          (floorMinX + poolMinX) / 2,
          frameTopY,
          POOL_CENTER_Z,
        ] as const,
      },
      {
        key: "east",
        size: [eastWidth, FRAME_THICKNESS, sideDepth] as const,
        position: [
          (poolMaxX + floorMaxX) / 2,
          frameTopY,
          POOL_CENTER_Z,
        ] as const,
      },
    ],
    [
      eastWidth,
      floorMaxX,
      floorMinX,
      floorMaxZ,
      floorMinZ,
      frameTopY,
      northDepth,
      poolMaxX,
      poolMaxZ,
      poolMinX,
      poolMinZ,
      sideDepth,
      southDepth,
      westWidth,
    ],
  );

  const slabMaterials = useMemo(
    () =>
      slabs.map((s) => {
        const [w, , d] = s.size;
        const [cx, , cz] = s.position;
        const [offsetX, offsetY] = floorOffset(cx, cz, w, d);
        return makeTiledMaterial(
          w,
          d,
          FLOOR_TEXTURE_WORLD_SIZE,
          offsetX,
          offsetY,
        );
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [slabs, colorMap, normalMap, roughnessMap],
  );

  const poolFloorMaterial = useMemo(() => {
    const [offsetX, offsetY] = floorOffset(
      POOL_CENTER_X,
      POOL_CENTER_Z,
      POOL_WIDTH,
      POOL_DEPTH,
    );
    return makeTiledMaterial(
      POOL_WIDTH,
      POOL_DEPTH,
      FLOOR_TEXTURE_WORLD_SIZE,
      offsetX,
      offsetY,
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [colorMap, normalMap, roughnessMap]);

  const WALL_TILE_WORLD_SIZE = FLOOR_TEXTURE_WORLD_SIZE;
  const poolWallMaterials = useMemo(() => {
    // Walls share the floor's tile size and align horizontally with world X/Z
    // so wall and floor tile grid lines meet at the pool's lip. The top of each
    // wall is set to a tile boundary so the partial tile sits at the bottom.
    const wallVOffset = -POOL_RECESS / WALL_TILE_WORLD_SIZE;
    const nsFront = makeTiledMaterial(
      POOL_WIDTH,
      POOL_RECESS,
      WALL_TILE_WORLD_SIZE,
      (POOL_CENTER_X - POOL_WIDTH / 2) / WALL_TILE_WORLD_SIZE,
      wallVOffset,
    );
    const nsBack = makeTiledMaterial(
      POOL_WIDTH,
      POOL_RECESS,
      WALL_TILE_WORLD_SIZE,
      (POOL_CENTER_X + POOL_WIDTH / 2) / WALL_TILE_WORLD_SIZE,
      wallVOffset,
      -1,
    );
    const ewEast = makeTiledMaterial(
      POOL_DEPTH,
      POOL_RECESS,
      WALL_TILE_WORLD_SIZE,
      (POOL_CENTER_Z - POOL_DEPTH / 2) / WALL_TILE_WORLD_SIZE,
      wallVOffset,
    );
    const ewWest = makeTiledMaterial(
      POOL_DEPTH,
      POOL_RECESS,
      WALL_TILE_WORLD_SIZE,
      (POOL_CENTER_Z + POOL_DEPTH / 2) / WALL_TILE_WORLD_SIZE,
      wallVOffset,
      -1,
    );
    return { nsFront, nsBack, ewEast, ewWest };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [colorMap, normalMap, roughnessMap, WALL_TILE_WORLD_SIZE]);

  useEffect(
    () => () => {
      slabMaterials.forEach((m) => m.dispose());
      poolFloorMaterial.dispose();
      poolWater.geometry.dispose();
      poolWater.material.dispose();
      poolWallMaterials.nsFront.dispose();
      poolWallMaterials.nsBack.dispose();
      poolWallMaterials.ewEast.dispose();
      poolWallMaterials.ewWest.dispose();
    },
    [slabMaterials, poolFloorMaterial, poolWater, poolWallMaterials],
  );

  const wallCenterY = poolFloorTopY + POOL_RECESS / 2;
  const wallEpsilon = 0.012;

  return (
    <group name="floating-floor">
      {slabs.map((slab, i) => (
        <mesh
          key={slab.key}
          name={`floor-slab-${slab.key}`}
          position={slab.position as unknown as [number, number, number]}
          material={slabMaterials[i]}
          receiveShadow>
          <boxGeometry
            args={slab.size as unknown as [number, number, number]}
          />
        </mesh>
      ))}
      <mesh
        name="pool-floor"
        position={[POOL_CENTER_X, poolFloorCenterY, POOL_CENTER_Z]}
        material={poolFloorMaterial}
        receiveShadow>
        <boxGeometry args={[POOL_WIDTH, FRAME_THICKNESS, POOL_DEPTH]} />
      </mesh>
      <mesh
        name="pool-wall-north"
        position={[POOL_CENTER_X, wallCenterY, poolMinZ + wallEpsilon]}
        material={poolWallMaterials.nsFront}>
        <planeGeometry args={[POOL_WIDTH, POOL_RECESS]} />
      </mesh>
      <mesh
        name="pool-wall-south"
        position={[POOL_CENTER_X, wallCenterY, poolMaxZ - wallEpsilon]}
        rotation={[0, Math.PI, 0]}
        material={poolWallMaterials.nsBack}>
        <planeGeometry args={[POOL_WIDTH, POOL_RECESS]} />
      </mesh>
      <mesh
        name="pool-wall-east"
        position={[poolMaxX - wallEpsilon, wallCenterY, POOL_CENTER_Z]}
        rotation={[0, -Math.PI / 2, 0]}
        material={poolWallMaterials.ewEast}>
        <planeGeometry args={[POOL_DEPTH, POOL_RECESS]} />
      </mesh>
      <mesh
        name="pool-wall-west"
        position={[poolMinX + wallEpsilon, wallCenterY, POOL_CENTER_Z]}
        rotation={[0, Math.PI / 2, 0]}
        material={poolWallMaterials.ewWest}>
        <planeGeometry args={[POOL_DEPTH, POOL_RECESS]} />
      </mesh>
      <primitive
        ref={poolWaterRef}
        object={poolWater}
        position={[POOL_CENTER_X, poolWaterY, POOL_CENTER_Z]}
      />
    </group>
  );
}

function PlatoSign() {
  const [colorMap, normalMap, roughnessMap] = useLoader(TextureLoader, [
    "/textures/wall/bahtroom-walls2/Tiles105_4K-JPG_Color.jpg",
    "/textures/wall/bahtroom-walls2/Tiles105_4K-JPG_NormalGL.jpg",
    "/textures/wall/bahtroom-walls2/Tiles105_4K-JPG_Roughness.jpg",
  ]);

  const pedestalMaterial = useMemo(() => {
    const repeatX = PEDESTAL_WIDTH / 6;
    const repeatY = PEDESTAL_HEIGHT / 6;
    return new MeshPhysicalMaterial({
      map: configureRepeatingTexture(colorMap.clone(), repeatX, repeatY, true),
      normalMap: configureRepeatingTexture(normalMap.clone(), repeatX, repeatY),
      roughnessMap: configureRepeatingTexture(
        roughnessMap.clone(),
        repeatX,
        repeatY,
      ),
      normalScale: new Vector2(0.08, 0.08),
      color: "#ead4dc",
      roughness: 0.15,
      metalness: 0,
      clearcoat: 0.85,
      clearcoatRoughness: 0.06,
      envMapIntensity: 1.2,
    });
  }, [colorMap, normalMap, roughnessMap]);

  useEffect(() => () => pedestalMaterial.dispose(), [pedestalMaterial]);

  const pedestalY = FLOOR_HEIGHT + PEDESTAL_HEIGHT / 2;
  const textZ = PEDESTAL_DEPTH / 2 + 0.02;
  const neonCore = useMemo(() => new Color(3.2, 0.65, 1.9), []);

  return (
    <group
      name="plato-sign"
      position={[PEDESTAL_CENTER_X, 0, PEDESTAL_CENTER_Z]}>
      <mesh
        name="pedestal"
        position={[0, pedestalY, 0]}
        material={pedestalMaterial}
        castShadow
        receiveShadow>
        <boxGeometry args={[PEDESTAL_WIDTH, PEDESTAL_HEIGHT, PEDESTAL_DEPTH]} />
      </mesh>
      <Text
        name="plato-text"
        font="/fonts/Italianno-Regular.ttf"
        position={[0, FLOOR_HEIGHT + 7.6, textZ]}
        fontSize={1.45}
        lineHeight={0.82}
        letterSpacing={-0.03}
        anchorX="center"
        anchorY="middle"
        maxWidth={PEDESTAL_WIDTH - 0.2}
        textAlign="center"
        outlineColor="#ff7cc8"
        outlineWidth={0}
        outlineBlur={0.45}
        outlineOpacity={0.9}>
        Plato's{"\n"}Cove
        <meshBasicMaterial color={neonCore} toneMapped={false} />
      </Text>
      <pointLight
        name="neon-sign-glow"
        position={[0, FLOOR_HEIGHT + 7.6, textZ + 1.1]}
        color="#ff5cb0"
        intensity={2}
        distance={10}
        decay={2}
      />
    </group>
  );
}

export default function Scene() {
  const { camera, gl, scene } = useThree();
  const waterRef = useRef<Water>(null);

  const lights = useControls("Lights", {
    ambientColor: "#e8cad8",
    ambientIntensity: { value: 1.8, min: 0, max: 5, step: 0.1 },
    hemiSkyColor: "#b7b6d6",
    hemiGroundColor: "#e8bccf",
    hemiIntensity: { value: 0.5, min: 0, max: 5, step: 0.1 },
    dirColor: "#ff6ea5",
    dirIntensity: { value: 2.7, min: 0, max: 10, step: 0.1 },
  });

  const effects = useControls("Effects", {
    bloomIntensity: { value: 0.1, min: 0, max: 5, step: 0.01 },
    bloomThreshold: { value: 1.45, min: 0, max: 3, step: 0.01 },
    bloomSmoothing: { value: 0.5, min: 0, max: 1, step: 0.01 },
    bloomRadius: { value: 0.22, min: 0, max: 1, step: 0.01 },
    chromaticOffset: { value: 0.002, min: 0, max: 0.009, step: 0.001 },
    modulationOffset: { value: 0.45, min: 0, max: 1, step: 0.01 },
    vignetteOffset: { value: 0.4, min: 0, max: 1, step: 0.01 },
    vignetteDarkness: { value: 0.35, min: 0, max: 1, step: 0.01 },
    noiseOpacity: { value: 0.15, min: 0, max: 1, step: 0.01 },
  });

  const chromaticAberrationOffset = useMemo(
    () => new Vector2(effects.chromaticOffset, effects.chromaticOffset),
    [effects.chromaticOffset],
  );

  const sunDirection = useMemo(() => {
    const phi = MathUtils.degToRad(90 - SUN_ELEVATION);
    const theta = MathUtils.degToRad(SUN_AZIMUTH);
    return new Vector3().setFromSphericalCoords(1, phi, theta).normalize();
  }, []);
  const waterNormals = useLoader(TextureLoader, "/textures/waternormals.jpg");

  const skyMaterial = useMemo(
    () =>
      new RawShaderMaterial({
        vertexShader: skyVertexShader,
        fragmentShader: skyFragmentShader,
        side: BackSide,
        uniforms: {
          uSunDir: { value: sunDirection.clone() },
          uTime: { value: 0 },
        },
      }),
    [sunDirection],
  );

  const skyMesh = useMemo(
    () => new Mesh(new SphereGeometry(OCEAN_SIZE, 32, 32), skyMaterial),
    [skyMaterial],
  );

  const water = useMemo(() => {
    waterNormals.wrapS = RepeatWrapping;
    waterNormals.wrapT = RepeatWrapping;
    waterNormals.needsUpdate = true;

    const waterObject = new Water(new PlaneGeometry(OCEAN_SIZE, OCEAN_SIZE), {
      textureWidth: 512,
      textureHeight: 512,
      waterNormals,
      sunDirection: new Vector3(),
      sunColor: 0xff33aa,
      waterColor: 0x4fb8c4,
      distortionScale: 2.0,
      fog: false,
    });

    waterObject.rotation.x = -Math.PI / 2;

    return waterObject;
  }, [waterNormals]);

  const playerSnapshot = useGroundedPlayer();

  useEffect(() => {
    getUniforms(water).sunDirection.value.copy(sunDirection);
    const material = skyMesh.material as RawShaderMaterial;
    material.uniforms.uSunDir.value.copy(sunDirection);
    scene.fog = new Fog(0xf5cedd, 60, 700);

    return () => {
      scene.fog = null;
    };
  }, [scene, skyMesh, sunDirection, water]);

  useEffect(() => {
    window.render_game_to_text = () =>
      JSON.stringify({
        coordinateSystem:
          "x right, y up, z forward/back in Three.js world units",
        scene: "three-webgl-shaders-ocean",
        source: "https://threejs.org/examples/?q=water#webgl_shaders_ocean",
        camera: {
          x: Number(camera.position.x.toFixed(3)),
          y: Number(camera.position.y.toFixed(3)),
          z: Number(camera.position.z.toFixed(3)),
        },
        player: playerSnapshot.current,
        water: {
          size: OCEAN_SIZE,
          distortionScale: getUniforms(water).distortionScale.value,
          time: Number(getUniforms(water).time.value.toFixed(3)),
        },
        floatingFloor: {
          width: FLOOR_WIDTH,
          depth: FLOOR_DEPTH,
          height: FLOOR_HEIGHT,
          texture: "bahtroom-walls2/Tiles105",
          pool: {
            centerX: POOL_CENTER_X,
            centerZ: POOL_CENTER_Z,
            width: POOL_WIDTH,
            depth: POOL_DEPTH,
            recess: POOL_RECESS,
          },
        },
        sun: {
          elevation: SUN_ELEVATION,
          azimuth: SUN_AZIMUTH,
        },
        controls: "grounded-walk",
        input: {
          look: "click canvas, then move mouse",
          move: "WASD or arrow keys",
          jump: "Space",
        },
        pointerLocked: document.pointerLockElement === gl.domElement,
      });

    window.advanceTime = () =>
      new Promise<void>((resolve) => {
        window.requestAnimationFrame(() => resolve());
      });
  }, [camera, gl, playerSnapshot, water]);

  useFrame((state, delta) => {
    const waterObject = waterRef.current;
    if (waterObject) {
      getUniforms(waterObject).time.value += delta;
    }
    skyMaterial.uniforms.uTime.value = state.clock.getElapsedTime();
  });

  return (
    <>
      {/* <Environment frames={1} resolution={512}> */}
      {/* <mesh>
         <primitive object={skyMaterial} attach="material" />
       </mesh> */}
      {/* </Environment> */}
      <primitive object={skyMesh} />
      <primitive ref={waterRef} object={water} />
      <ambientLight
        name="ambient-light"
        color={lights.ambientColor}
        intensity={lights.ambientIntensity}
      />
      <hemisphereLight
        name="hemisphere-light"
        color={lights.hemiSkyColor}
        groundColor={lights.hemiGroundColor}
        intensity={lights.hemiIntensity}
      />
      <directionalLight
        name="directional-light"
        color={lights.dirColor}
        intensity={lights.dirIntensity}
        position={[
          sunDirection.x * 500,
          sunDirection.y * 500,
          sunDirection.z * 500,
        ]}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-near={10}
        shadow-camera-far={600}
        shadow-camera-left={-40}
        shadow-camera-right={40}
        shadow-camera-top={40}
        shadow-camera-bottom={-40}
        shadow-bias={-0.0005}
      />
      <EffectComposer enableNormalPass={false} multisampling={0}>
        <Bloom
          mipmapBlur
          intensity={effects.bloomIntensity}
          luminanceThreshold={effects.bloomThreshold}
          luminanceSmoothing={effects.bloomSmoothing}
          radius={effects.bloomRadius}
        />
        <ChromaticAberration
          offset={chromaticAberrationOffset}
          radialModulation
          modulationOffset={effects.modulationOffset}
        />
        <Vignette
          eskil={false}
          offset={effects.vignetteOffset}
          darkness={effects.vignetteDarkness}
        />
        <Noise
          blendFunction={BlendFunction.OVERLAY}
          opacity={effects.noiseOpacity}
        />
      </EffectComposer>
      <FloatingFloor sunDirection={sunDirection} />
      <PlatoSign />
      <DoricColumns />
      <VaporwaveBust />
      <WomanStatue />
      <FloorDoor />
      <MusicPlayer />
    </>
  );
}
