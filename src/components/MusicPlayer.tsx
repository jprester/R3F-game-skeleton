import { useEffect, useRef, useState } from "react";
import { useGLTF } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import { Box3, Group, Vector3 } from "three";
import { setDistanceVolume, setNearBoombox } from "./musicStore";

// Table + boombox + chair arrangement built from .glb models. The boombox is
// the audio source: a child <DistanceVolume /> reads the player's distance and
// writes a normalized volume into the music store. Playback/pause/mute state
// lives outside the Canvas (see musicStore.ts + UI.tsx).

const FLOOR_TOP_Y = 5.2; // must match FLOOR_HEIGHT in Scene.tsx

export const BOOMBOX_CENTER_X = 15;
export const BOOMBOX_CENTER_Z = 18;
export const BOOMBOX_TABLE_WIDTH = 3.4;
export const BOOMBOX_TABLE_DEPTH = 2.4;

const CHAIR_OFFSET_X = -2.4;
const CHAIR_OFFSET_Z = 1.6;
const CHAIR_YAW = Math.PI / 5;

const AUDIO_REF_DISTANCE = 6;
const AUDIO_MAX_DISTANCE = 45;
const INTERACT_DISTANCE = 9;
const FOCUS_DOT_THRESHOLD = 0.55; // ~57° half-angle

function DistanceVolume() {
  const camera = useThree((s) => s.camera);
  const camDir = useRef(new Vector3());

  useFrame(() => {
    const dx = camera.position.x - BOOMBOX_CENTER_X;
    const dz = camera.position.z - BOOMBOX_CENTER_Z;
    const dist = Math.sqrt(dx * dx + dz * dz);

    if (dist <= AUDIO_REF_DISTANCE) {
      setDistanceVolume(1);
    } else if (dist >= AUDIO_MAX_DISTANCE) {
      setDistanceVolume(0);
    } else {
      const t =
        (dist - AUDIO_REF_DISTANCE) /
        (AUDIO_MAX_DISTANCE - AUDIO_REF_DISTANCE);
      setDistanceVolume(1 - t);
    }

    if (dist <= INTERACT_DISTANCE) {
      camera.getWorldDirection(camDir.current);
      // horizontal dot product toward the boombox
      const invDist = 1 / (dist || 1);
      const dot = camDir.current.x * (-dx * invDist) + camDir.current.z * (-dz * invDist);
      setNearBoombox(dot >= FOCUS_DOT_THRESHOLD);
    } else {
      setNearBoombox(false);
    }
  });
  return null;
}

export default function MusicPlayer() {
  const { scene: tableScene } = useGLTF("/models/desk/plastic-table.glb");
  const { scene: boomboxScene } = useGLTF("/models/misc/retro-boombox.002.glb");
  const { scene: chairScene } = useGLTF("/models/chair/platic-chair.glb");

  const tableRef = useRef<Group>(null);
  const [tableTopY, setTableTopY] = useState<number | null>(null);

  useEffect(() => {
    if (!tableRef.current) return;
    const box = new Box3().setFromObject(tableRef.current);
    if (!box.isEmpty()) {
      setTableTopY(box.max.y);
    }
  }, []);

  return (
    <>
      <primitive
        ref={tableRef}
        object={tableScene}
        position={[BOOMBOX_CENTER_X, FLOOR_TOP_Y, BOOMBOX_CENTER_Z]}
      />
      {tableTopY !== null && (
        <primitive
          object={boomboxScene}
          position={[BOOMBOX_CENTER_X, tableTopY, BOOMBOX_CENTER_Z]}
          rotation={[0, Math.PI, 0]}
        />
      )}
      <primitive
        object={chairScene}
        position={[
          BOOMBOX_CENTER_X + CHAIR_OFFSET_X,
          FLOOR_TOP_Y,
          BOOMBOX_CENTER_Z + CHAIR_OFFSET_Z,
        ]}
        rotation={[0, CHAIR_YAW, 0]}
      />
      <DistanceVolume />
    </>
  );
}

useGLTF.preload("/models/desk/plastic-table.glb");
useGLTF.preload("/models/misc/retro-boombox.002.glb");
useGLTF.preload("/models/chair/platic-chair.glb");
