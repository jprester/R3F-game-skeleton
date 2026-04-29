import { useEffect, useMemo, useRef } from "react";
import { Cloud, Clouds, useGLTF } from "@react-three/drei";
import { useFrame, useLoader, useThree } from "@react-three/fiber";
import {
  BackSide,
  Euler,
  Fog,
  Mesh,
  MeshLambertMaterial,
  MeshStandardMaterial,
  MathUtils,
  PlaneGeometry,
  RepeatWrapping,
  ShaderMaterial,
  SphereGeometry,
  SRGBColorSpace,
  Texture,
  TextureLoader,
  Vector2,
  Vector3,
} from "three";
import { Water } from "three/examples/jsm/objects/Water.js";

const OCEAN_SIZE = 10000;
const SUN_ELEVATION = 2;
const SUN_AZIMUTH = 180;
const LOOK_SENSITIVITY = 0.002;
const FLOOR_WIDTH = 90;
const FLOOR_DEPTH = 65;
const FLOOR_HEIGHT = 5.2;
const FLOOR_TEXTURE_WORLD_SIZE = 12;
const PILLAR_WIDTH = 3.4;
const PILLAR_HEIGHT = 15;
const PILLAR_DEPTH = 3.4;
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
    z: FLOOR_DEPTH / 2 - 13,
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
      FLOOR_DEPTH / 2 - 13,
    );
    camera.rotation.order = "YXZ";
    yaw.current = 0;
    pitch.current = 0;
    velocity.set(0, 0, 0);
    camera.rotation.set(0, 0, 0);
    camera.updateProjectionMatrix();
  }, [camera, velocity]);

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
) {
  texture.wrapS = RepeatWrapping;
  texture.wrapT = RepeatWrapping;
  texture.repeat.set(repeatX, repeatY);
  texture.anisotropy = 8;
  if (isColorMap) {
    texture.colorSpace = SRGBColorSpace;
  }
  texture.needsUpdate = true;

  return texture;
}

const COLUMN_POSITIONS: [number, number, number][] = [
  [-32, FLOOR_HEIGHT, -18],
  [-32, FLOOR_HEIGHT, 0],
  [-32, FLOOR_HEIGHT, 18],
  [32, FLOOR_HEIGHT, -18],
  [32, FLOOR_HEIGHT, 0],
  [32, FLOOR_HEIGHT, 18],
];

function DoricColumns() {
  const { scene } = useGLTF("/models/misc/doric_pillar.glb");
  return (
    <>
      {COLUMN_POSITIONS.map((pos, i) => (
        <primitive key={i} object={scene.clone(true)} position={pos} />
      ))}
    </>
  );
}

function VaporwaveBust() {
  const { scene } = useGLTF("/models/statue/helios_vaporwave_bust.glb");
  return (
    <primitive object={scene} position={[60, 0, -182]} scale={[2, 2, 2]} />
  );
}

function FloatingFloor() {
  const [colorMap, normalMap, roughnessMap] = useLoader(TextureLoader, [
    "/textures/wall/bahtroom-walls2/Tiles105_4K-JPG_Color.jpg",
    "/textures/wall/bahtroom-walls2/Tiles105_4K-JPG_NormalGL.jpg",
    "/textures/wall/bahtroom-walls2/Tiles105_4K-JPG_Roughness.jpg",
  ]);

  const pillarMaterial = useMemo(() => {
    const repeatX = PILLAR_WIDTH / 10;
    const repeatY = PILLAR_HEIGHT / 10;

    return new MeshStandardMaterial({
      map: configureRepeatingTexture(colorMap.clone(), repeatX, repeatY, true),
      normalMap: configureRepeatingTexture(normalMap.clone(), repeatX, repeatY),
      roughnessMap: configureRepeatingTexture(
        roughnessMap.clone(),
        repeatX,
        repeatY,
      ),
      normalScale: new Vector2(0.08, 0.08),
      color: "#e8d0d8",
      roughness: 0.82,
      metalness: 0,
    });
  }, [colorMap, normalMap, roughnessMap]);

  const floorMaterial = useMemo(() => {
    const repeatX = FLOOR_WIDTH / FLOOR_TEXTURE_WORLD_SIZE;
    const repeatY = FLOOR_DEPTH / FLOOR_TEXTURE_WORLD_SIZE;

    return new MeshStandardMaterial({
      map: configureRepeatingTexture(colorMap.clone(), repeatX, repeatY, true),
      normalMap: configureRepeatingTexture(normalMap.clone(), repeatX, repeatY),
      roughnessMap: configureRepeatingTexture(
        roughnessMap.clone(),
        repeatX,
        repeatY,
      ),
      normalScale: new Vector2(0.08, 0.08),
      color: "#e8d0d8",
      roughness: 0.82,
      metalness: 0,
    });
  }, [colorMap, normalMap, roughnessMap]);

  useEffect(() => () => pillarMaterial.dispose(), [pillarMaterial]);
  useEffect(() => () => floorMaterial.dispose(), [floorMaterial]);

  return (
    <group position={[0, FLOOR_HEIGHT, 0]}>
      <mesh position={[0, -0.38, 0]} receiveShadow>
        <boxGeometry args={[FLOOR_WIDTH, 0.72, FLOOR_DEPTH]} />
        <meshStandardMaterial color="#d4bcc6" roughness={0.82} metalness={0} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} material={floorMaterial}>
        <planeGeometry args={[FLOOR_WIDTH, FLOOR_DEPTH]} />
      </mesh>
      {/* <mesh
        position={[0, PILLAR_HEIGHT / 2, 0]}
        material={pillarMaterial}
        castShadow
        receiveShadow>
        <boxGeometry args={[PILLAR_WIDTH, PILLAR_HEIGHT, PILLAR_DEPTH]} />
      </mesh> */}
    </group>
  );
}

const skyVertexShader = /* glsl */ `
  varying vec3 vWorldPosition;
  void main() {
    vec4 worldPosition = modelMatrix * vec4(position, 1.0);
    vWorldPosition = worldPosition.xyz;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const skyFragmentShader = /* glsl */ `
  varying vec3 vWorldPosition;

  vec3 vaporwaveSky(vec3 dir) {
    float height = dir.y;

    vec3 horizon = vec3(0.98, 0.72, 0.82);
    vec3 mid     = vec3(0.82, 0.72, 0.90);
    vec3 top     = vec3(0.60, 0.80, 0.95);

    vec3 color = mix(horizon, mid, smoothstep(-0.1, 0.5, height));
    color = mix(color, top, smoothstep(0.1, 0.9, height));

    // Vaporwave striped sun
    vec3 sunDir = normalize(vec3(0.0, 0.08, -1.0));
    float sunRadius = 0.18;
    float cosAngle = dot(dir, sunDir);
    float angle = acos(clamp(cosAngle, -1.0, 1.0));

    // Atmospheric glow
    float halo = exp(-angle * 5.5) * 0.45;
    color += vec3(1.0, 0.65, 0.45) * halo;

    if (angle < sunRadius) {
      float sunLocalY = (dir.y - sunDir.y) / sunRadius; // -1=bottom, +1=top
      float yNorm = clamp(sunLocalY * 0.5 + 0.5, 0.0, 1.0);

      // Gradient: magenta -> orange -> warm yellow
      vec3 sunTop = vec3(1.0, 0.97, 0.40);
      vec3 sunMid = vec3(1.0, 0.50, 0.12);
      vec3 sunBot = vec3(0.95, 0.10, 0.52);
      vec3 sunColor = mix(sunBot, sunMid, smoothstep(0.0, 0.5, yNorm));
      sunColor = mix(sunColor, sunTop, smoothstep(0.5, 1.0, yNorm));

      // Horizontal stripes in lower half — denser toward bottom (perspective effect)
      float isSolid = 1.0;
      if (dir.y < sunDir.y) {
        float t = clamp((sunDir.y - dir.y) / sunRadius, 0.0, 1.0);
        float bandIndex = floor(t * t * 8.0);
        isSolid = 1.0 - mod(bandIndex, 2.0);
      }

      float edgeFade = smoothstep(sunRadius, sunRadius * 0.88, angle);
      color = mix(color, sunColor, isSolid * edgeFade);
    }

    return color;
  }

  void main() {
    vec3 dir = normalize(vWorldPosition);
    gl_FragColor = vec4(vaporwaveSky(dir), 1.0);
  }
`;

function VaporwaveClouds() {
  return (
    <Clouds material={MeshLambertMaterial}>
      <Cloud
        position={[-180, 90, -350]}
        bounds={[120, 20, 30]}
        volume={18}
        segments={25}
        color="#e8b0d8"
        fade={40}
        speed={0.15}
        opacity={0.65}
      />
      <Cloud
        position={[220, 110, -280]}
        bounds={[100, 18, 25]}
        volume={15}
        segments={20}
        color="#d4a8f0"
        fade={35}
        speed={0.12}
        opacity={0.55}
      />
      <Cloud
        position={[0, 140, -600]}
        bounds={[160, 25, 40]}
        volume={22}
        segments={30}
        color="#f0c0e0"
        fade={50}
        speed={0.1}
        opacity={0.45}
      />
    </Clouds>
  );
}

export default function Scene() {
  const { camera, gl, scene } = useThree();
  const waterRef = useRef<Water>(null);
  const sun = useMemo(() => new Vector3(), []);
  const waterNormals = useLoader(TextureLoader, "/textures/waternormals.jpg");

  const skyMesh = useMemo(
    () =>
      new Mesh(
        new SphereGeometry(OCEAN_SIZE, 32, 32),
        new ShaderMaterial({
          vertexShader: skyVertexShader,
          fragmentShader: skyFragmentShader,
          side: BackSide,
        }),
      ),
    [],
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
      sunColor: 0xffe8a0,
      waterColor: 0xe8c0d0,
      distortionScale: 2.0,
      fog: false,
    });

    waterObject.rotation.x = -Math.PI / 2;

    return waterObject;
  }, [waterNormals]);

  const playerSnapshot = useGroundedPlayer();

  useEffect(() => {
    const phi = MathUtils.degToRad(90 - SUN_ELEVATION);
    const theta = MathUtils.degToRad(SUN_AZIMUTH);
    sun.setFromSphericalCoords(1, phi, theta);

    getUniforms(water).sunDirection.value.copy(sun).normalize();
    scene.fog = new Fog(0xf5cedd, 60, 700);

    return () => {
      scene.fog = null;
    };
  }, [scene, sun, water]);

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

  useFrame((_, delta) => {
    const waterObject = waterRef.current;
    if (!waterObject) return;

    getUniforms(waterObject).time.value += delta;
  });

  return (
    <>
      <primitive object={skyMesh} />
      <primitive ref={waterRef} object={water} />
      <ambientLight color={0xffe8f2} intensity={3.0} />
      {/* <hemisphereLight args={[0xf0c0d8, 0xc0d8f0, 2.0]} />
      <directionalLight
        color={0xfff5e0}
        intensity={1.2}
        position={[0, 10, -50]}
      /> */}
      <VaporwaveClouds />
      <FloatingFloor />
      <DoricColumns />
      <VaporwaveBust />
    </>
  );
}
