// =============================================================================
// Liminal Drift - Spatial Utilities
// =============================================================================

import { ChunkInstance, ChunkDefinition, Direction, BoundingBox } from './types';

/**
 * Calculate distance between two 3D points (ignoring Y for horizontal distance)
 */
export function horizontalDistance(
  a: [number, number, number],
  b: [number, number, number]
): number {
  const dx = a[0] - b[0];
  const dz = a[2] - b[2];
  return Math.sqrt(dx * dx + dz * dz);
}

/**
 * Calculate full 3D distance between two points
 */
export function distance3D(
  a: [number, number, number],
  b: [number, number, number]
): number {
  const dx = a[0] - b[0];
  const dy = a[1] - b[1];
  const dz = a[2] - b[2];
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

/**
 * Check if a point is within a bounding box
 */
export function isPointInBounds(
  point: [number, number, number],
  bounds: BoundingBox
): boolean {
  return (
    point[0] >= bounds.min[0] &&
    point[0] <= bounds.max[0] &&
    point[1] >= bounds.min[1] &&
    point[1] <= bounds.max[1] &&
    point[2] >= bounds.min[2] &&
    point[2] <= bounds.max[2]
  );
}

/**
 * Get bounding box for a chunk instance
 */
export function getChunkBounds(
  chunk: ChunkInstance,
  definition: ChunkDefinition
): BoundingBox {
  const [width, height, depth] = definition.size;
  const [cx, cy, cz] = chunk.position;

  // Account for rotation (swap width/depth for 90/270 degree rotations)
  const isRotated = Math.abs(chunk.rotation % Math.PI) > 0.1;
  const effectiveWidth = isRotated ? depth : width;
  const effectiveDepth = isRotated ? width : depth;

  return {
    min: [
      cx - effectiveWidth / 2,
      cy,
      cz - effectiveDepth / 2,
    ],
    max: [
      cx + effectiveWidth / 2,
      cy + height,
      cz + effectiveDepth / 2,
    ],
  };
}

/**
 * Check if player is inside a chunk's bounds (with some padding)
 */
export function isPlayerInChunk(
  playerPosition: [number, number, number],
  chunk: ChunkInstance,
  definition: ChunkDefinition,
  padding: number = 0.5
): boolean {
  const bounds = getChunkBounds(chunk, definition);
  
  // Add padding
  const paddedBounds: BoundingBox = {
    min: [
      bounds.min[0] - padding,
      bounds.min[1] - padding,
      bounds.min[2] - padding,
    ],
    max: [
      bounds.max[0] + padding,
      bounds.max[1] + padding,
      bounds.max[2] + padding,
    ],
  };

  return isPointInBounds(playerPosition, paddedBounds);
}

/**
 * Calculate distance from player to nearest point of chunk bounds
 */
export function distanceToChunk(
  playerPosition: [number, number, number],
  chunk: ChunkInstance,
  definition: ChunkDefinition
): number {
  const bounds = getChunkBounds(chunk, definition);
  
  // Find closest point on bounding box
  const closestPoint: [number, number, number] = [
    Math.max(bounds.min[0], Math.min(playerPosition[0], bounds.max[0])),
    Math.max(bounds.min[1], Math.min(playerPosition[1], bounds.max[1])),
    Math.max(bounds.min[2], Math.min(playerPosition[2], bounds.max[2])),
  ];

  return distance3D(playerPosition, closestPoint);
}

/**
 * Get the world position of an exit point
 */
export function getExitWorldPosition(
  chunk: ChunkInstance,
  definition: ChunkDefinition,
  exitDirection: Direction
): [number, number, number] {
  const [width, height, depth] = definition.size;
  const [cx, cy, cz] = chunk.position;

  // Calculate local exit position
  let localX = 0;
  let localZ = 0;

  switch (exitDirection) {
    case 'north':
      localZ = -depth / 2;
      break;
    case 'south':
      localZ = depth / 2;
      break;
    case 'east':
      localX = width / 2;
      break;
    case 'west':
      localX = -width / 2;
      break;
  }

  // Apply chunk rotation
  const cos = Math.cos(chunk.rotation);
  const sin = Math.sin(chunk.rotation);
  const rotatedX = localX * cos - localZ * sin;
  const rotatedZ = localX * sin + localZ * cos;

  return [
    cx + rotatedX,
    cy + height / 2, // Exit at mid-height
    cz + rotatedZ,
  ];
}

/**
 * Calculate chunk position based on connection to another chunk
 * This helps with procedural level generation
 */
export function calculateConnectedChunkPosition(
  sourceChunk: ChunkInstance,
  sourceDefinition: ChunkDefinition,
  sourceExitDirection: Direction,
  targetDefinition: ChunkDefinition,
  targetExitDirection: Direction
): [number, number, number] {
  const sourceExit = getExitWorldPosition(
    sourceChunk,
    sourceDefinition,
    sourceExitDirection
  );

  // Calculate offset from target's exit to its center
  const [targetWidth, , targetDepth] = targetDefinition.size;
  let offsetX = 0;
  let offsetZ = 0;

  switch (targetExitDirection) {
    case 'north':
      offsetZ = targetDepth / 2;
      break;
    case 'south':
      offsetZ = -targetDepth / 2;
      break;
    case 'east':
      offsetX = -targetWidth / 2;
      break;
    case 'west':
      offsetX = targetWidth / 2;
      break;
  }

  return [
    sourceExit[0] + offsetX,
    sourceChunk.position[1], // Same Y level
    sourceExit[2] + offsetZ,
  ];
}

/**
 * Sort chunks by distance to player (nearest first)
 */
export function sortChunksByDistance(
  chunks: ChunkInstance[],
  definitions: Map<string, ChunkDefinition>,
  playerPosition: [number, number, number]
): ChunkInstance[] {
  return [...chunks].sort((a, b) => {
    const defA = definitions.get(a.type);
    const defB = definitions.get(b.type);
    if (!defA || !defB) return 0;
    
    const distA = distanceToChunk(playerPosition, a, defA);
    const distB = distanceToChunk(playerPosition, b, defB);
    return distA - distB;
  });
}

/**
 * Get all chunks within a radius of the player
 */
export function getChunksInRadius(
  chunks: ChunkInstance[],
  definitions: Map<string, ChunkDefinition>,
  playerPosition: [number, number, number],
  radius: number
): ChunkInstance[] {
  return chunks.filter((chunk) => {
    const def = definitions.get(chunk.type);
    if (!def) return false;
    return distanceToChunk(playerPosition, chunk, def) <= radius;
  });
}

/**
 * Find which chunk the player is currently in
 */
export function findPlayerChunk(
  chunks: ChunkInstance[],
  definitions: Map<string, ChunkDefinition>,
  playerPosition: [number, number, number]
): ChunkInstance | null {
  for (const chunk of chunks) {
    const def = definitions.get(chunk.type);
    if (!def) continue;
    if (isPlayerInChunk(playerPosition, chunk, def)) {
      return chunk;
    }
  }
  return null;
}

/**
 * Transform a local position to world position within a chunk
 */
export function localToWorld(
  chunk: ChunkInstance,
  localPosition: [number, number, number]
): [number, number, number] {
  const [lx, ly, lz] = localPosition;
  const [cx, cy, cz] = chunk.position;

  // Apply rotation
  const cos = Math.cos(chunk.rotation);
  const sin = Math.sin(chunk.rotation);
  const rotatedX = lx * cos - lz * sin;
  const rotatedZ = lx * sin + lz * cos;

  return [cx + rotatedX, cy + ly, cz + rotatedZ];
}

/**
 * Transform a world position to local position within a chunk
 */
export function worldToLocal(
  chunk: ChunkInstance,
  worldPosition: [number, number, number]
): [number, number, number] {
  const [wx, wy, wz] = worldPosition;
  const [cx, cy, cz] = chunk.position;

  // Translate to chunk origin
  const dx = wx - cx;
  const dy = wy - cy;
  const dz = wz - cz;

  // Apply inverse rotation
  const cos = Math.cos(-chunk.rotation);
  const sin = Math.sin(-chunk.rotation);
  const localX = dx * cos - dz * sin;
  const localZ = dx * sin + dz * cos;

  return [localX, dy, localZ];
}
