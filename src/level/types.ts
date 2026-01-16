// =============================================================================
// Liminal Drift - Level System Types
// =============================================================================

// -----------------------------------------------------------------------------
// Basic Types
// -----------------------------------------------------------------------------

/** Cardinal directions for exits and connections */
export type Direction = 'north' | 'south' | 'east' | 'west';

/** Available chunk types - extend as you add new prefabs */
export type ChunkType =
  | 'office_small'
  | 'office_large'
  | 'hallway_straight'
  | 'hallway_corner'
  | 'hallway_t_junction'
  | 'lobby';

/** Furniture types available for placement */
export type FurnitureType =
  | 'desk'
  | 'chair'
  | 'table'
  | 'filing_cabinet'
  | 'plant'
  | 'lamp'
  | 'water_cooler'
  | 'trash_bin';

/** Chunk loading state */
export type ChunkState = 'unloaded' | 'loading' | 'loaded' | 'unloading';

// -----------------------------------------------------------------------------
// Exit & Connection Types
// -----------------------------------------------------------------------------

/** Exit point definition - where chunks can connect */
export interface Exit {
  /** Which wall the exit is on */
  direction: Direction;
  /** Offset along the wall from center (0 = centered) */
  offset: number;
  /** Width of the doorway opening */
  width: number;
  /** Height of the doorway opening */
  height: number;
}

/** Connection between two chunks */
export interface ChunkConnection {
  /** Which exit on this chunk */
  exitDirection: Direction;
  /** ID of the connected chunk */
  targetChunkId: string;
  /** Which exit on the target chunk */
  targetExitDirection: Direction;
}

// -----------------------------------------------------------------------------
// Furniture Types
// -----------------------------------------------------------------------------

/** Single furniture placement within a chunk */
export interface FurniturePlacement {
  /** Type of furniture piece */
  type: FurnitureType;
  /** Position relative to chunk center [x, y, z] */
  position: [number, number, number];
  /** Y-axis rotation in radians */
  rotation: number;
  /** Optional scale multiplier */
  scale?: number;
}

// -----------------------------------------------------------------------------
// Chunk Types
// -----------------------------------------------------------------------------

/** Chunk definition - the prefab template */
export interface ChunkDefinition {
  /** Chunk type identifier */
  type: ChunkType;
  /** Dimensions [width (x), height (y), depth (z)] */
  size: [number, number, number];
  /** Available exit points */
  exits: Exit[];
  /** Default furniture layout */
  defaultFurniture: FurniturePlacement[];
}

/** Chunk instance - a placed chunk in the level */
export interface ChunkInstance {
  /** Unique identifier for this chunk instance */
  id: string;
  /** Which prefab type to use */
  type: ChunkType;
  /** World position of chunk center [x, y, z] */
  position: [number, number, number];
  /** Y-axis rotation in radians (0, π/2, π, 3π/2) */
  rotation: number;
  /** Connections to other chunks */
  connections: ChunkConnection[];
  /** Override default furniture (optional) */
  furnitureOverride?: FurniturePlacement[];
  /** Override default materials (optional) */
  materialOverride?: MaterialConfig;
}

/** Runtime chunk with loading state */
export interface RuntimeChunk extends ChunkInstance {
  /** Current loading state */
  state: ChunkState;
  /** Cached distance to player */
  distanceToPlayer: number;
}

// -----------------------------------------------------------------------------
// Level Types
// -----------------------------------------------------------------------------

/** Spawn point configuration */
export interface SpawnPoint {
  /** Which chunk the player spawns in */
  chunkId: string;
  /** Position within the chunk [x, y, z] */
  localPosition: [number, number, number];
}

/** Complete level definition */
export interface LevelData {
  /** Unique level identifier */
  id: string;
  /** Display name */
  name: string;
  /** Where the player starts */
  spawnPoint: SpawnPoint;
  /** All chunks in the level */
  chunks: ChunkInstance[];
  /** Global atmosphere settings (optional) */
  atmosphere?: AtmosphereConfig;
}

// -----------------------------------------------------------------------------
// Material Types
// -----------------------------------------------------------------------------

/** Material configuration for a chunk */
export interface MaterialConfig {
  floor: string;
  walls: string;
  ceiling: string;
  trim?: string;
}

/** PBR material definition */
export interface PBRMaterial {
  albedoMap: string;
  normalMap?: string;
  roughnessMap?: string;
  aoMap?: string;
  emissiveMap?: string;
  repeat?: [number, number];
  color?: string;
}

// -----------------------------------------------------------------------------
// Atmosphere Types
// -----------------------------------------------------------------------------

/** Atmosphere/mood configuration */
export interface AtmosphereConfig {
  /** Fog color */
  fogColor: string;
  /** Fog near distance */
  fogNear: number;
  /** Fog far distance */
  fogFar: number;
  /** Ambient light intensity (0-1) */
  ambientIntensity: number;
  /** Ambient light color */
  ambientColor: string;
  /** Flicker probability (0-1) */
  flickerChance: number;
}

// -----------------------------------------------------------------------------
// Level Manager Types
// -----------------------------------------------------------------------------

/** LevelManager component props */
export interface LevelManagerProps {
  /** Level data to load */
  levelData: LevelData;
  /** Distance at which chunks start loading (default: 40) */
  loadRadius?: number;
  /** Distance at which chunks unload (default: 50) */
  unloadRadius?: number;
  /** How often to check distances in ms (default: 500) */
  updateInterval?: number;
  /** Callback when player enters a new chunk */
  onChunkEnter?: (chunkId: string) => void;
  /** React children (player, etc.) */
  children?: React.ReactNode;
}

/** Level manager context value */
export interface LevelContextValue {
  /** Current level data */
  levelData: LevelData;
  /** Currently loaded chunk IDs */
  activeChunks: Set<string>;
  /** ID of chunk player is currently in */
  currentChunkId: string | null;
  /** Get world position for a chunk */
  getChunkWorldPosition: (chunkId: string) => [number, number, number] | null;
  /** Get chunk definition by type */
  getChunkDefinition: (type: ChunkType) => ChunkDefinition | null;
}

// -----------------------------------------------------------------------------
// Chunk Renderer Types
// -----------------------------------------------------------------------------

/** ChunkRenderer component props */
export interface ChunkRendererProps {
  /** Chunk instance to render */
  chunk: ChunkInstance;
  /** Whether physics is active for this chunk */
  physicsActive: boolean;
}

/** Chunk prefab component props */
export interface ChunkPrefabProps {
  /** Active exits (have connections) */
  activeExits: Direction[];
  /** Material configuration */
  materials?: MaterialConfig;
  /** Whether to render furniture */
  includeFurniture?: boolean;
}

// -----------------------------------------------------------------------------
// Furniture Types
// -----------------------------------------------------------------------------

/** InstancedFurniture component props */
export interface InstancedFurnitureProps {
  /** Type of furniture to instance */
  type: FurnitureType;
  /** Array of instance transforms */
  instances: Array<{
    position: [number, number, number];
    rotation: number;
    scale?: number;
  }>;
  /** Whether to include collision shapes */
  includeColliders?: boolean;
}

// -----------------------------------------------------------------------------
// Utility Types
// -----------------------------------------------------------------------------

/** Bounding box for spatial queries */
export interface BoundingBox {
  min: [number, number, number];
  max: [number, number, number];
}

/** Direction vectors for calculations */
export const DIRECTION_VECTORS: Record<Direction, [number, number]> = {
  north: [0, -1],
  south: [0, 1],
  east: [1, 0],
  west: [-1, 0],
};

/** Opposite direction mapping */
export const OPPOSITE_DIRECTION: Record<Direction, Direction> = {
  north: 'south',
  south: 'north',
  east: 'west',
  west: 'east',
};
