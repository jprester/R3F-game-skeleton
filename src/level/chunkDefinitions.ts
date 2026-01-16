// =============================================================================
// Liminal Drift - Chunk Definitions Registry
// =============================================================================

import { ChunkDefinition, ChunkType } from './types';

/**
 * Registry of all chunk prefab definitions
 * Each definition describes the size, exits, and default furniture for a chunk type
 */
export const chunkDefinitions: Record<ChunkType, ChunkDefinition> = {
  // ---------------------------------------------------------------------------
  // Office Rooms
  // ---------------------------------------------------------------------------
  
  office_small: {
    type: 'office_small',
    size: [12, 4, 12],
    exits: [
      { direction: 'north', offset: 0, width: 1.2, height: 2.4 },
      { direction: 'south', offset: 0, width: 1.2, height: 2.4 },
      { direction: 'east', offset: 0, width: 1.2, height: 2.4 },
      { direction: 'west', offset: 0, width: 1.2, height: 2.4 },
    ],
    defaultFurniture: [
      // Central desk
      { type: 'desk', position: [0, 0, 0], rotation: 0 },
      { type: 'chair', position: [0, 0, 1], rotation: Math.PI },
      
      // Side desks
      { type: 'desk', position: [-3.5, 0, -3], rotation: Math.PI / 2 },
      { type: 'chair', position: [-2.5, 0, -3], rotation: -Math.PI / 2 },
      
      { type: 'desk', position: [3.5, 0, -3], rotation: -Math.PI / 2 },
      { type: 'chair', position: [2.5, 0, -3], rotation: Math.PI / 2 },
      
      // Filing cabinets
      { type: 'filing_cabinet', position: [-5, 0, 0], rotation: Math.PI / 2 },
      { type: 'filing_cabinet', position: [-5, 0, 1.5], rotation: Math.PI / 2 },
      
      // Corner plant
      { type: 'plant', position: [4.5, 0, 4.5], rotation: 0 },
      
      // Trash bin
      { type: 'trash_bin', position: [1.5, 0, 0.5], rotation: 0 },
    ],
  },

  office_large: {
    type: 'office_large',
    size: [16, 4, 16],
    exits: [
      { direction: 'north', offset: 0, width: 1.5, height: 2.4 },
      { direction: 'south', offset: 0, width: 1.5, height: 2.4 },
      { direction: 'east', offset: 0, width: 1.5, height: 2.4 },
      { direction: 'west', offset: 0, width: 1.5, height: 2.4 },
    ],
    defaultFurniture: [
      // Conference table in center
      { type: 'table', position: [0, 0, 0], rotation: 0, scale: 1.5 },
      
      // Chairs around table
      { type: 'chair', position: [0, 0, 2], rotation: Math.PI },
      { type: 'chair', position: [0, 0, -2], rotation: 0 },
      { type: 'chair', position: [2, 0, 0], rotation: -Math.PI / 2 },
      { type: 'chair', position: [-2, 0, 0], rotation: Math.PI / 2 },
      { type: 'chair', position: [1.5, 0, 1.5], rotation: Math.PI * 0.75 },
      { type: 'chair', position: [-1.5, 0, 1.5], rotation: Math.PI * 0.25 },
      { type: 'chair', position: [1.5, 0, -1.5], rotation: -Math.PI * 0.75 },
      { type: 'chair', position: [-1.5, 0, -1.5], rotation: -Math.PI * 0.25 },
      
      // Wall desks
      { type: 'desk', position: [-6, 0, -5], rotation: 0 },
      { type: 'desk', position: [-6, 0, 5], rotation: Math.PI },
      { type: 'desk', position: [6, 0, -5], rotation: 0 },
      { type: 'desk', position: [6, 0, 5], rotation: Math.PI },
      
      // Filing cabinets along wall
      { type: 'filing_cabinet', position: [-6.5, 0, 0], rotation: Math.PI / 2 },
      { type: 'filing_cabinet', position: [-6.5, 0, 1.5], rotation: Math.PI / 2 },
      { type: 'filing_cabinet', position: [-6.5, 0, -1.5], rotation: Math.PI / 2 },
      
      // Plants
      { type: 'plant', position: [6.5, 0, 6.5], rotation: 0 },
      { type: 'plant', position: [-6.5, 0, 6.5], rotation: 0 },
      
      // Water cooler
      { type: 'water_cooler', position: [6, 0, 0], rotation: -Math.PI / 2 },
    ],
  },

  // ---------------------------------------------------------------------------
  // Hallways
  // ---------------------------------------------------------------------------

  hallway_straight: {
    type: 'hallway_straight',
    size: [4, 4, 16],
    exits: [
      { direction: 'north', offset: 0, width: 2.5, height: 3 },
      { direction: 'south', offset: 0, width: 2.5, height: 3 },
    ],
    defaultFurniture: [
      // Minimal hallway furniture
      { type: 'plant', position: [1.2, 0, 4], rotation: 0 },
      { type: 'plant', position: [-1.2, 0, -4], rotation: 0 },
      { type: 'trash_bin', position: [1.5, 0, 0], rotation: 0 },
    ],
  },

  hallway_corner: {
    type: 'hallway_corner',
    size: [8, 4, 8],
    exits: [
      { direction: 'south', offset: -2, width: 2.5, height: 3 }, // Offset for L-shape
      { direction: 'east', offset: 2, width: 2.5, height: 3 },
    ],
    defaultFurniture: [
      { type: 'plant', position: [-2.5, 0, -2.5], rotation: 0 },
    ],
  },

  hallway_t_junction: {
    type: 'hallway_t_junction',
    size: [12, 4, 8],
    exits: [
      { direction: 'north', offset: 0, width: 2.5, height: 3 },
      { direction: 'east', offset: 0, width: 2.5, height: 3 },
      { direction: 'west', offset: 0, width: 2.5, height: 3 },
    ],
    defaultFurniture: [
      { type: 'plant', position: [0, 0, 2.5], rotation: 0 },
      { type: 'water_cooler', position: [4, 0, 2.5], rotation: Math.PI },
    ],
  },

  // ---------------------------------------------------------------------------
  // Special Rooms
  // ---------------------------------------------------------------------------

  lobby: {
    type: 'lobby',
    size: [20, 5, 20],
    exits: [
      { direction: 'north', offset: 0, width: 3, height: 3 },
      { direction: 'south', offset: 0, width: 3, height: 3 },
      { direction: 'east', offset: 0, width: 2, height: 3 },
      { direction: 'west', offset: 0, width: 2, height: 3 },
    ],
    defaultFurniture: [
      // Reception desk
      { type: 'desk', position: [0, 0, 5], rotation: Math.PI, scale: 1.5 },
      { type: 'chair', position: [0, 0, 6.5], rotation: 0 },
      
      // Seating area
      { type: 'chair', position: [-5, 0, -3], rotation: Math.PI / 4 },
      { type: 'chair', position: [-3.5, 0, -4.5], rotation: Math.PI / 4 },
      { type: 'chair', position: [5, 0, -3], rotation: -Math.PI / 4 },
      { type: 'chair', position: [3.5, 0, -4.5], rotation: -Math.PI / 4 },
      
      { type: 'table', position: [-4, 0, -3.5], rotation: 0, scale: 0.5 },
      { type: 'table', position: [4, 0, -3.5], rotation: 0, scale: 0.5 },
      
      // Plants in corners
      { type: 'plant', position: [8, 0, 8], rotation: 0, scale: 1.5 },
      { type: 'plant', position: [-8, 0, 8], rotation: 0, scale: 1.5 },
      { type: 'plant', position: [8, 0, -8], rotation: 0, scale: 1.5 },
      { type: 'plant', position: [-8, 0, -8], rotation: 0, scale: 1.5 },
      
      // Water cooler
      { type: 'water_cooler', position: [-8, 0, 0], rotation: Math.PI / 2 },
    ],
  },
};

/**
 * Get chunk definition by type
 */
export function getChunkDefinition(type: ChunkType): ChunkDefinition {
  return chunkDefinitions[type];
}

/**
 * Get all chunk definitions as a Map (useful for lookups)
 */
export function getChunkDefinitionsMap(): Map<string, ChunkDefinition> {
  return new Map(Object.entries(chunkDefinitions));
}
