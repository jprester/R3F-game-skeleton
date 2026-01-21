import { useMemo } from "react";
import Player from "./Player";
import { AudioProvider } from "./AudioProvider";
import { ModelProvider } from "./ModelProvider";
import { LevelManager, officeLevelData, localToWorld } from "../level";

interface SceneProps {
  isMuted?: boolean;
  masterVolume?: number;
}

export default function Scene({
  isMuted = false,
  masterVolume = 0.5,
}: SceneProps) {
  // Compute spawn position from level data
  const spawnPosition = useMemo<[number, number, number]>(() => {
    const spawnChunk = officeLevelData.chunks.find(
      (c) => c.id === officeLevelData.spawnPoint.chunkId
    );
    if (!spawnChunk) {
      return [0, 1, 0];
    }
    return localToWorld(spawnChunk, officeLevelData.spawnPoint.localPosition);
  }, []);

  return (
    <AudioProvider isMuted={isMuted} masterVolume={masterVolume}>
      <ModelProvider>
        {/* Level system handles fog, ambient light, chunks, and furniture */}
        <LevelManager levelData={officeLevelData}>
          {/* Player with collision - spawns at level-defined spawn point */}
          <Player position={spawnPosition} />
        </LevelManager>
      </ModelProvider>
    </AudioProvider>
  );
}
