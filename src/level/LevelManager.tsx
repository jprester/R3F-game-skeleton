// =============================================================================
// Liminal Drift - Level Manager
// =============================================================================

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
  useMemo,
} from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import {
  LevelManagerProps,
  LevelContextValue,
  ChunkType,
  ChunkInstance,
} from './types';
import { getChunkDefinition, getChunkDefinitionsMap } from './chunkDefinitions';
import {
  distanceToChunk,
  findPlayerChunk,
  getChunksInRadius,
} from './spatialUtils';
import { ChunkRenderer } from './ChunkRenderer';

// -----------------------------------------------------------------------------
// Context
// -----------------------------------------------------------------------------

const LevelContext = createContext<LevelContextValue | null>(null);

/**
 * Hook to access level context
 */
export function useLevelContext(): LevelContextValue {
  const context = useContext(LevelContext);
  if (!context) {
    throw new Error('useLevelContext must be used within a LevelManager');
  }
  return context;
}

// -----------------------------------------------------------------------------
// Level Manager Component
// -----------------------------------------------------------------------------

export function LevelManager({
  levelData,
  loadRadius = 40,
  unloadRadius = 50,
  updateInterval = 500,
  onChunkEnter,
  children,
}: LevelManagerProps) {
  const { camera } = useThree();
  
  // State
  const [activeChunks, setActiveChunks] = useState<Set<string>>(new Set());
  const [currentChunkId, setCurrentChunkId] = useState<string | null>(null);
  
  // Refs for throttling
  const lastUpdateTime = useRef(0);
  const definitions = useRef(getChunkDefinitionsMap());

  // Create chunk lookup map
  const chunkMap = useMemo(() => {
    const map = new Map<string, ChunkInstance>();
    for (const chunk of levelData.chunks) {
      map.set(chunk.id, chunk);
    }
    return map;
  }, [levelData.chunks]);

  // Get connected chunk IDs (for preloading adjacent rooms)
  const getConnectedChunkIds = useCallback(
    (chunkId: string): string[] => {
      const chunk = chunkMap.get(chunkId);
      if (!chunk) return [];
      return chunk.connections.map((c) => c.targetChunkId);
    },
    [chunkMap]
  );

  // Initialize - load spawn chunk and adjacent chunks
  useEffect(() => {
    const spawnChunkId = levelData.spawnPoint.chunkId;
    const initialChunks = new Set<string>([spawnChunkId]);
    
    // Also load connected chunks
    const connected = getConnectedChunkIds(spawnChunkId);
    connected.forEach((id) => initialChunks.add(id));
    
    setActiveChunks(initialChunks);
    setCurrentChunkId(spawnChunkId);
  }, [levelData.spawnPoint.chunkId, getConnectedChunkIds]);

  // Update loop - check distances and load/unload chunks
  useFrame((state) => {
    const now = state.clock.elapsedTime * 1000;
    
    // Throttle updates
    if (now - lastUpdateTime.current < updateInterval) {
      return;
    }
    lastUpdateTime.current = now;

    const playerPos: [number, number, number] = [
      camera.position.x,
      camera.position.y,
      camera.position.z,
    ];

    // Find which chunk player is in
    const playerChunk = findPlayerChunk(
      levelData.chunks,
      definitions.current,
      playerPos
    );

    if (playerChunk && playerChunk.id !== currentChunkId) {
      setCurrentChunkId(playerChunk.id);
      onChunkEnter?.(playerChunk.id);
    }

    // Calculate which chunks should be loaded
    const chunksToLoad = new Set<string>();

    // Always keep current chunk and its neighbors
    if (playerChunk) {
      chunksToLoad.add(playerChunk.id);
      getConnectedChunkIds(playerChunk.id).forEach((id) => chunksToLoad.add(id));
    }

    // Add chunks within load radius
    const nearbyChunks = getChunksInRadius(
      levelData.chunks,
      definitions.current,
      playerPos,
      loadRadius
    );
    nearbyChunks.forEach((chunk) => chunksToLoad.add(chunk.id));

    // Determine chunks to unload (beyond unload radius and not connected to current)
    const chunksToUnload = new Set<string>();
    activeChunks.forEach((chunkId) => {
      const chunk = chunkMap.get(chunkId);
      if (!chunk) return;
      
      const def = definitions.current.get(chunk.type);
      if (!def) return;

      const distance = distanceToChunk(playerPos, chunk, def);
      
      // Keep if within unload radius or connected to current chunk
      const isConnectedToCurrent =
        playerChunk && getConnectedChunkIds(playerChunk.id).includes(chunkId);
      
      if (distance > unloadRadius && !isConnectedToCurrent) {
        chunksToUnload.add(chunkId);
      }
    });

    // Apply changes
    const newActiveChunks = new Set<string>(activeChunks);
    
    chunksToLoad.forEach((id) => newActiveChunks.add(id));
    chunksToUnload.forEach((id) => newActiveChunks.delete(id));

    // Only update state if changed
    if (
      newActiveChunks.size !== activeChunks.size ||
      ![...newActiveChunks].every((id) => activeChunks.has(id))
    ) {
      setActiveChunks(newActiveChunks);
    }
  });

  // Context value
  const contextValue = useMemo<LevelContextValue>(
    () => ({
      levelData,
      activeChunks,
      currentChunkId,
      getChunkWorldPosition: (chunkId: string) => {
        const chunk = chunkMap.get(chunkId);
        return chunk ? chunk.position : null;
      },
      getChunkDefinition: (type: ChunkType) => {
        return getChunkDefinition(type);
      },
    }),
    [levelData, activeChunks, currentChunkId, chunkMap]
  );

  // Get active chunk instances
  const activeChunkInstances = useMemo(() => {
    return levelData.chunks.filter((chunk) => activeChunks.has(chunk.id));
  }, [levelData.chunks, activeChunks]);

  return (
    <LevelContext.Provider value={contextValue}>
      {/* Atmosphere */}
      {levelData.atmosphere && (
        <>
          <fog
            attach="fog"
            args={[
              levelData.atmosphere.fogColor,
              levelData.atmosphere.fogNear,
              levelData.atmosphere.fogFar,
            ]}
          />
          <ambientLight
            intensity={levelData.atmosphere.ambientIntensity}
            color={levelData.atmosphere.ambientColor}
          />
        </>
      )}

      {/* Render active chunks */}
      {activeChunkInstances.map((chunk) => {
        const definition = getChunkDefinition(chunk.type);
        const isCurrentChunk = chunk.id === currentChunkId;

        // Only light current chunk and directly connected chunks
        const currentChunkData = levelData.chunks.find((c) => c.id === currentChunkId);
        const connectedIds = currentChunkData?.connections.map((c) => c.targetChunkId) || [];
        const shouldLight = isCurrentChunk || connectedIds.includes(chunk.id);

        return (
          <ChunkRenderer
            key={chunk.id}
            chunk={chunk}
            definition={definition}
            physicsActive={isCurrentChunk || activeChunks.has(chunk.id)}
            lightActive={shouldLight}
          />
        );
      })}

      {/* Player and other children */}
      {children}
    </LevelContext.Provider>
  );
}

export default LevelManager;
