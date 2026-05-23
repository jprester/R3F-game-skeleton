import { useEffect, useRef, useState } from "react";
import { useGLTF } from "@react-three/drei";
import { Box3, Group } from "three";

// Table + boombox + chair arrangement built from .glb models.
// Audio playback was removed; the music files in public/sounds/music/ remain
// on disk for the next pass. The exported constants are consumed by Scene.tsx
// for player collision around the table footprint.

const FLOOR_TOP_Y = 5.2; // must match FLOOR_HEIGHT in Scene.tsx

export const BOOMBOX_CENTER_X = 15;
export const BOOMBOX_CENTER_Z = 18;
export const BOOMBOX_TABLE_WIDTH = 3.4;
export const BOOMBOX_TABLE_DEPTH = 2.4;

const CHAIR_OFFSET_X = -2.4;
const CHAIR_OFFSET_Z = 1.6;
const CHAIR_YAW = Math.PI / 5;

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
    </>
  );
}

useGLTF.preload("/models/desk/plastic-table.glb");
useGLTF.preload("/models/misc/retro-boombox.002.glb");
useGLTF.preload("/models/chair/platic-chair.glb");
