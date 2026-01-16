# Liminal Drift - Level System Specification

## Overview

This document specifies the multi-room level system for Liminal Drift, an interactive liminal space exploration experience built with React Three Fiber and Rapier physics.

The system uses a **prefab chunk architecture** where pre-designed room modules snap together to create expansive, explorable environments while maintaining performance through spatial loading.

---

## Architecture

### Core Concepts

| Concept | Description |
|---------|-------------|
| **Chunk** | A self-contained room module with geometry, colliders, furniture, and exit points |
| **Exit** | A doorway/opening where chunks connect to each other |
| **Level Graph** | Data structure defining which chunks exist and how they connect |
| **Spatial Loading** | Only chunks near the player are rendered and have active physics |

### System Components

```
src/level/
├── types.ts              # TypeScript interfaces for the level system
├── LevelManager.tsx      # Orchestrates chunk loading/unloading based on player position
├── ChunkRenderer.tsx     # Renders a single chunk from configuration
├── levelData.ts          # Level layout definition (which chunks, where, connections)
├── spatialUtils.ts       # Distance calculations, bounds checking
├── chunks/               # Prefab chunk components
│   ├── index.ts          # Chunk registry
│   ├── OfficeSmall.tsx   # Small office room (12x12)
│   ├── OfficeLarge.tsx   # Large office room (16x16)
│   ├── HallwayStraight.tsx
│   ├── HallwayCorner.tsx
│   ├── HallwayTJunction.tsx
│   └── Lobby.tsx
└── furniture/
    ├── InstancedFurniture.tsx  # Batched rendering for repeated objects
    └── FurniturePlacer.tsx     # Places furniture based on room config
```

---

## Type Definitions

### Core Types

```typescript
// Direction for exits and connections
type Direction = 'north' | 'south' | 'east' | 'west';

// Available chunk types (extend as needed)
type ChunkType = 
  | 'office_small'
  | 'office_large'
  | 'hallway_straight'
  | 'hallway_corner'
  | 'hallway_t_junction'
  | 'lobby';

// Exit point definition
interface Exit {
  direction: Direction;
  offset: number;        // Offset along the wall (0 = center)
  width: number;         // Doorway width
  height: number;        // Doorway height
}

// Furniture placement within a chunk
interface FurniturePlacement {
  type: 'desk' | 'chair' | 'table' | 'filing_cabinet' | 'plant' | 'lamp';
  position: [number, number, number];  // Local to chunk
  rotation: number;                     // Y-axis rotation in radians
}

// Chunk definition (the prefab template)
interface ChunkDefinition {
  type: ChunkType;
  size: [number, number, number];  // width (x), height (y), depth (z)
  exits: Exit[];
  defaultFurniture: FurniturePlacement[];
}

// Chunk instance in the level (placed chunk)
interface ChunkInstance {
  id: string;                           // Unique identifier
  type: ChunkType;
  position: [number, number, number];   // World position (center of chunk)
  rotation: number;                     // Y-axis rotation (0, 90, 180, 270 degrees)
  connections: ChunkConnection[];       // Links to other chunks
  furnitureOverride?: FurniturePlacement[];  // Optional custom furniture
}

// Connection between two chunks
interface ChunkConnection {
  exitDirection: Direction;    // Which exit on this chunk
  targetChunkId: string;       // ID of connected chunk
  targetExitDirection: Direction;  // Which exit on target chunk
}

// Complete level definition
interface LevelData {
  id: string;
  name: string;
  spawnPoint: {
    chunkId: string;
    position: [number, number, number];  // Local to chunk
  };
  chunks: ChunkInstance[];
}
```

### Runtime State Types

```typescript
// Chunk loading state
type ChunkState = 'unloaded' | 'loading' | 'loaded' | 'unloading';

// Runtime chunk with state
interface RuntimeChunk extends ChunkInstance {
  state: ChunkState;
  distanceToPlayer: number;
}

// Level manager state
interface LevelManagerState {
  activeChunks: Set<string>;      // Currently rendered chunk IDs
  playerChunkId: string | null;   // Chunk the player is currently in
  playerPosition: [number, number, number];
}
```

---

## Component Specifications

### 1. LevelManager

**Purpose**: Orchestrates the entire level system, handling chunk loading/unloading based on player proximity.

**Props**:
```typescript
interface LevelManagerProps {
  levelData: LevelData;
  loadRadius?: number;      // Distance to load chunks (default: 40)
  unloadRadius?: number;    // Distance to unload chunks (default: 50)
  updateInterval?: number;  // How often to check distances in ms (default: 500)
}
```

**Behavior**:
1. On mount, load the spawn chunk and adjacent chunks
2. Every `updateInterval` ms, calculate distance from player to each chunk
3. Load chunks within `loadRadius`
4. Unload chunks beyond `unloadRadius` (with hysteresis to prevent thrashing)
5. Provide context for child components to access level state

**Implementation Notes**:
- Use `useFrame` with a throttle for distance checks (not every frame)
- Maintain a `Set<string>` of active chunk IDs for O(1) lookups
- Use React context to share state with chunk renderers

### 2. ChunkRenderer

**Purpose**: Renders a single chunk including geometry, colliders, and furniture.

**Props**:
```typescript
interface ChunkRendererProps {
  chunk: ChunkInstance;
  definition: ChunkDefinition;
  isActive: boolean;  // Whether physics should be active
}
```

**Behavior**:
1. Render room geometry (floor, walls, ceiling) with appropriate materials
2. Create doorway openings based on `exits` and `connections`
3. Wrap geometry in `<RigidBody type="fixed">` for collision
4. Place furniture using `FurniturePlacer`
5. Add lighting fixtures

**Implementation Notes**:
- Use `useMemo` to cache geometry creation
- Only create RigidBody when `isActive` is true (performance)
- Doorways should be cut from walls, not just empty spaces

### 3. Chunk Prefabs (e.g., OfficeSmall)

**Purpose**: Define the visual and physical structure of a room type.

**Interface**:
```typescript
interface ChunkPrefabProps {
  exits: Exit[];              // Which exits are open
  materials?: MaterialConfig; // Optional material overrides
}
```

**Standard Sizes**:

| Chunk Type | Size (WxHxD) | Typical Exits |
|------------|--------------|---------------|
| office_small | 12 x 4 x 12 | 1-2 doors |
| office_large | 16 x 4 x 16 | 2-3 doors |
| hallway_straight | 4 x 4 x 16 | 2 (opposite ends) |
| hallway_corner | 8 x 4 x 8 | 2 (perpendicular) |
| hallway_t_junction | 8 x 4 x 8 | 3 (T-shape) |
| lobby | 20 x 5 x 20 | 2-4 doors |

### 4. InstancedFurniture

**Purpose**: Efficiently render many identical furniture pieces with a single draw call.

**Props**:
```typescript
interface InstancedFurnitureProps {
  type: 'chair' | 'desk' | 'table' | etc;
  instances: Array<{
    position: [number, number, number];
    rotation: number;
  }>;
}
```

**Implementation Notes**:
- Use Three.js `InstancedMesh`
- Create collision shapes separately (Rapier compound colliders)
- Update instance matrices in `useEffect`, not `useFrame`

---

## Level Data Format

### Example Level

```typescript
// levelData.ts
export const officeLevelData: LevelData = {
  id: 'office_level_1',
  name: 'Abandoned Office Complex',
  spawnPoint: {
    chunkId: 'lobby_main',
    position: [0, 1, 0],
  },
  chunks: [
    {
      id: 'lobby_main',
      type: 'lobby',
      position: [0, 0, 0],
      rotation: 0,
      connections: [
        { exitDirection: 'north', targetChunkId: 'hall_1', targetExitDirection: 'south' },
        { exitDirection: 'east', targetChunkId: 'office_1', targetExitDirection: 'west' },
      ],
    },
    {
      id: 'hall_1',
      type: 'hallway_straight',
      position: [0, 0, -18],  // 20/2 (lobby) + 16/2 (hallway) = 18 units north
      rotation: 0,
      connections: [
        { exitDirection: 'south', targetChunkId: 'lobby_main', targetExitDirection: 'north' },
        { exitDirection: 'north', targetChunkId: 'office_2', targetExitDirection: 'south' },
      ],
    },
    {
      id: 'office_1',
      type: 'office_small',
      position: [16, 0, 0],  // 20/2 (lobby) + 12/2 (office) = 16 units east
      rotation: 0,
      connections: [
        { exitDirection: 'west', targetChunkId: 'lobby_main', targetExitDirection: 'east' },
      ],
    },
    {
      id: 'office_2',
      type: 'office_large',
      position: [0, 0, -34],  // hall_1 position + offset
      rotation: 0,
      connections: [
        { exitDirection: 'south', targetChunkId: 'hall_1', targetExitDirection: 'north' },
      ],
    },
  ],
};
```

### Level Layout Visualization

```
                    ┌─────────────────┐
                    │                 │
                    │   office_2      │
                    │   (16x16)       │
                    │                 │
                    └────────┬────────┘
                             │
                    ┌────────┴────────┐
                    │   hallway_1     │
                    │   (4x16)        │
                    └────────┬────────┘
                             │
        ┌────────────────────┼────────────────────┐
        │                    │                    │
        │                    │                    ├───────────┐
        │      lobby_main    │                    │           │
        │      (20x20)       │                    │  office_1 │
        │                    │                    │  (12x12)  │
        │                    │                    │           │
        └────────────────────┴────────────────────┴───────────┘
                           SPAWN
```

---

## Performance Guidelines

### Spatial Loading Rules

1. **Load Radius**: 40 units (approximately 2-3 rooms away)
2. **Unload Radius**: 50 units (hysteresis prevents thrashing)
3. **Max Active Chunks**: Soft limit of 8-10 chunks simultaneously
4. **Physics Sleep**: Chunks beyond 30 units have physics bodies set to sleep

### Optimization Techniques

| Technique | Implementation | Impact |
|-----------|----------------|--------|
| Frustum Culling | Automatic in R3F | High |
| Instanced Meshes | For furniture (chairs, desks, lights) | High |
| Chunk Loading | Only render nearby chunks | High |
| LOD | Simplified geometry at distance (optional) | Medium |
| Texture Atlasing | Combine room textures | Medium |
| Physics Sleep | Disable distant rigid bodies | Medium |

### Memory Management

- Dispose of Three.js geometries and materials when unloading chunks
- Use `useEffect` cleanup functions
- Pool frequently used objects (particle systems, etc.)

```typescript
useEffect(() => {
  return () => {
    // Cleanup when chunk unloads
    geometry.dispose();
    material.dispose();
  };
}, []);
```

---

## Collision Strategy

### Room Geometry Colliders

- **Walls**: Box colliders matching wall dimensions
- **Floor/Ceiling**: Single box collider each
- **Doorways**: Gap in wall collider (no collision at opening)

### Furniture Colliders

- **Simple shapes**: Use `colliders="cuboid"` for boxes, `colliders="hull"` for complex
- **Compound colliders**: For furniture with multiple parts (desk with legs)

```typescript
// Example: Desk with compound collider
<RigidBody type="fixed" colliders={false}>
  <CuboidCollider args={[0.75, 0.02, 0.4]} position={[0, 0.75, 0]} /> {/* Top */}
  <CuboidCollider args={[0.02, 0.35, 0.35]} position={[-0.7, 0.37, 0]} /> {/* Left panel */}
  <CuboidCollider args={[0.02, 0.35, 0.35]} position={[0.7, 0.37, 0]} /> {/* Right panel */}
  <DeskModel />
</RigidBody>
```

---

## Material System

### Standard Materials

Each chunk type should support these material slots:

```typescript
interface MaterialConfig {
  floor: string;    // Material ID from library
  walls: string;
  ceiling: string;
  trim?: string;    // Door frames, baseboards
}
```

### Material Library IDs

```typescript
const materialLibrary = {
  // Floors
  'carpet_moist_yellow': { /* PBR config */ },
  'carpet_worn_beige': { /* ... */ },
  'linoleum_grey': { /* ... */ },
  'concrete_stained': { /* ... */ },
  
  // Walls
  'wallpaper_yellow_aged': { /* ... */ },
  'drywall_white': { /* ... */ },
  'acoustic_panel': { /* ... */ },
  
  // Ceilings
  'ceiling_tile_fluorescent': { /* ... */ },
  'ceiling_tile_plain': { /* ... */ },
  'concrete_exposed': { /* ... */ },
};
```

---

## Lighting

### Per-Chunk Lighting

Each chunk should include:

1. **Ambient contribution**: Low-intensity ambient light
2. **Fluorescent fixtures**: Rectangular area lights or emissive meshes
3. **Optional point lights**: For desk lamps, etc.

### Flickering Effect

```typescript
// Fluorescent flicker in useFrame
const flickerIntensity = useRef(1);

useFrame((state) => {
  if (Math.random() < 0.02) {  // 2% chance per frame
    flickerIntensity.current = 0.3 + Math.random() * 0.7;
  } else {
    flickerIntensity.current = THREE.MathUtils.lerp(
      flickerIntensity.current, 
      1, 
      0.1
    );
  }
  lightRef.current.intensity = baseIntensity * flickerIntensity.current;
});
```

---

## Implementation Checklist

### Phase 1: Core System
- [ ] Create type definitions (`types.ts`)
- [ ] Implement `LevelManager` with basic loading logic
- [ ] Implement `ChunkRenderer` wrapper component
- [ ] Create one chunk prefab (`OfficeSmall`)
- [ ] Test with 2-3 connected chunks

### Phase 2: Chunk Library
- [ ] Implement `HallwayStraight`
- [ ] Implement `HallwayCorner`
- [ ] Implement `HallwayTJunction`
- [ ] Implement `OfficeLarge`
- [ ] Implement `Lobby`
- [ ] Create chunk registry with definitions

### Phase 3: Furniture System
- [ ] Implement `InstancedFurniture` for chairs
- [ ] Implement `InstancedFurniture` for desks
- [ ] Create `FurniturePlacer` component
- [ ] Add furniture collision shapes

### Phase 4: Polish
- [ ] Add material variation per chunk
- [ ] Implement fluorescent lighting with flicker
- [ ] Add fog transitions between chunks
- [ ] Performance profiling and optimization

### Phase 5: Level Design
- [ ] Design full level layout (10-15 chunks)
- [ ] Place furniture meaningfully
- [ ] Add environmental storytelling elements
- [ ] Test navigation flow

---

## Usage Example

```tsx
// App.tsx
import { Canvas } from '@react-three/fiber';
import { Physics } from '@react-three/rapier';
import { KeyboardControls } from '@react-three/drei';
import { LevelManager } from './level/LevelManager';
import { officeLevelData } from './level/levelData';
import Player from './components/Player';

function App() {
  return (
    <KeyboardControls map={keyboardMap}>
      <Canvas shadows camera={{ fov: 60 }}>
        <Physics gravity={[0, -20, 0]}>
          <LevelManager levelData={officeLevelData}>
            <Player />
          </LevelManager>
        </Physics>
      </Canvas>
    </KeyboardControls>
  );
}
```

---

## Notes for Claude Code

When implementing this system:

1. **Start with types**: Get `types.ts` right first, everything builds on it
2. **Test incrementally**: Get 2 chunks working before building all prefabs
3. **Use React context**: For sharing level state between components
4. **Profile early**: Check performance with React DevTools and Three.js stats
5. **Keep chunks simple**: Start with basic box geometry, add detail later

The most complex part is calculating chunk positions from connections. Consider building a helper function that takes a level graph and computes world positions automatically.
