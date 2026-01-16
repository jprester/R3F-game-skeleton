// =============================================================================
// Liminal Drift - Level Data
// =============================================================================

import { LevelData } from './types';

/**
 * Sample office level layout
 * 
 * Layout visualization:
 * 
 *                      ┌─────────────────┐
 *                      │                 │
 *                      │   office_north  │
 *                      │   (16x16)       │
 *                      │                 │
 *                      └────────┬────────┘
 *                               │
 *                      ┌────────┴────────┐
 *                      │  hall_north     │
 *                      │  (4x16)         │
 *                      └────────┬────────┘
 *                               │
 *  ┌───────────┬────────────────┼────────────────┬───────────┐
 *  │           │                │                │           │
 *  │ office_w  │                │                │ office_e  │
 *  │ (12x12)   ├────┐    ┌──────┴──────┐    ┌───┤ (12x12)   │
 *  │           │    │    │             │    │   │           │
 *  └───────────┘    │    │   lobby     │    │   └───────────┘
 *               hall_w   │   (20x20)   │  hall_e
 *               (16x4)   │             │  (16x4)
 *                   │    │    SPAWN    │    │
 *                   └────┤             ├────┘
 *                        └──────┬──────┘
 *                               │
 *                      ┌────────┴────────┐
 *                      │  hall_south     │
 *                      │  (4x16)         │
 *                      └────────┬────────┘
 *                               │
 *                      ┌────────┴────────┐
 *                      │                 │
 *                      │  office_south   │
 *                      │   (12x12)       │
 *                      │                 │
 *                      └─────────────────┘
 */
export const officeLevelData: LevelData = {
  id: 'office_level_1',
  name: 'Abandoned Office Complex',
  
  spawnPoint: {
    chunkId: 'lobby_main',
    localPosition: [0, 1, 0],
  },

  atmosphere: {
    fogColor: '#1a1a2e',
    fogNear: 8,
    fogFar: 50,
    ambientIntensity: 1.8,
    ambientColor: '#ffeedd',
    flickerChance: 0.02,
  },

  chunks: [
    // -------------------------------------------------------------------------
    // Central Lobby
    // -------------------------------------------------------------------------
    {
      id: 'lobby_main',
      type: 'lobby',
      position: [0, 0, 0],
      rotation: 0,
      connections: [
        { exitDirection: 'north', targetChunkId: 'hall_north', targetExitDirection: 'south' },
        { exitDirection: 'south', targetChunkId: 'hall_south', targetExitDirection: 'north' },
        { exitDirection: 'east', targetChunkId: 'hall_east', targetExitDirection: 'west' },
        { exitDirection: 'west', targetChunkId: 'hall_west', targetExitDirection: 'east' },
      ],
    },

    // -------------------------------------------------------------------------
    // North Wing
    // -------------------------------------------------------------------------
    {
      id: 'hall_north',
      type: 'hallway_straight',
      position: [0, 0, -18], // lobby (20/2) + hallway (16/2) = 10 + 8 = 18
      rotation: 0,
      connections: [
        { exitDirection: 'south', targetChunkId: 'lobby_main', targetExitDirection: 'north' },
        { exitDirection: 'north', targetChunkId: 'office_north', targetExitDirection: 'south' },
      ],
    },
    {
      id: 'office_north',
      type: 'office_large',
      position: [0, 0, -34], // hall_north (-18) + hallway (16/2) + office (16/2) = -18 - 16 = -34
      rotation: 0,
      connections: [
        { exitDirection: 'south', targetChunkId: 'hall_north', targetExitDirection: 'north' },
      ],
    },

    // -------------------------------------------------------------------------
    // South Wing
    // -------------------------------------------------------------------------
    {
      id: 'hall_south',
      type: 'hallway_straight',
      position: [0, 0, 18],
      rotation: 0,
      connections: [
        { exitDirection: 'north', targetChunkId: 'lobby_main', targetExitDirection: 'south' },
        { exitDirection: 'south', targetChunkId: 'office_south', targetExitDirection: 'north' },
      ],
    },
    {
      id: 'office_south',
      type: 'office_small',
      position: [0, 0, 32], // hall_south (18) + hallway (16/2) + office (12/2) = 18 + 8 + 6 = 32
      rotation: 0,
      connections: [
        { exitDirection: 'north', targetChunkId: 'hall_south', targetExitDirection: 'south' },
      ],
    },

    // -------------------------------------------------------------------------
    // East Wing
    // -------------------------------------------------------------------------
    {
      id: 'hall_east',
      type: 'hallway_straight',
      position: [18, 0, 0],
      rotation: Math.PI / 2, // Rotated 90 degrees - north becomes east, south becomes west
      connections: [
        // In local coords: south exit connects to lobby's east exit
        { exitDirection: 'south', targetChunkId: 'lobby_main', targetExitDirection: 'east' },
        // In local coords: north exit connects to office's west exit
        { exitDirection: 'north', targetChunkId: 'office_east', targetExitDirection: 'west' },
      ],
    },
    {
      id: 'office_east',
      type: 'office_small',
      position: [32, 0, 0],
      rotation: 0,
      connections: [
        { exitDirection: 'west', targetChunkId: 'hall_east', targetExitDirection: 'north' },
      ],
    },

    // -------------------------------------------------------------------------
    // West Wing
    // -------------------------------------------------------------------------
    {
      id: 'hall_west',
      type: 'hallway_straight',
      position: [-18, 0, 0],
      rotation: Math.PI / 2, // Rotated 90 degrees - north becomes east, south becomes west
      connections: [
        // In local coords: north exit connects to lobby's west exit
        { exitDirection: 'north', targetChunkId: 'lobby_main', targetExitDirection: 'west' },
        // In local coords: south exit connects to office's east exit
        { exitDirection: 'south', targetChunkId: 'office_west', targetExitDirection: 'east' },
      ],
    },
    {
      id: 'office_west',
      type: 'office_small',
      position: [-32, 0, 0],
      rotation: 0,
      connections: [
        { exitDirection: 'east', targetChunkId: 'hall_west', targetExitDirection: 'south' },
      ],
    },
  ],
};

/**
 * Minimal test level for development
 */
export const testLevelData: LevelData = {
  id: 'test_level',
  name: 'Test Level',
  
  spawnPoint: {
    chunkId: 'room_a',
    localPosition: [0, 1, 3],
  },

  chunks: [
    {
      id: 'room_a',
      type: 'office_small',
      position: [0, 0, 0],
      rotation: 0,
      connections: [
        { exitDirection: 'north', targetChunkId: 'hallway', targetExitDirection: 'south' },
      ],
    },
    {
      id: 'hallway',
      type: 'hallway_straight',
      position: [0, 0, -14], // office (12/2) + hallway (16/2) = 6 + 8 = 14
      rotation: 0,
      connections: [
        { exitDirection: 'south', targetChunkId: 'room_a', targetExitDirection: 'north' },
        { exitDirection: 'north', targetChunkId: 'room_b', targetExitDirection: 'south' },
      ],
    },
    {
      id: 'room_b',
      type: 'office_small',
      position: [0, 0, -28], // hallway (-14) + hallway (16/2) + office (12/2) = -14 - 14 = -28
      rotation: 0,
      connections: [
        { exitDirection: 'south', targetChunkId: 'hallway', targetExitDirection: 'north' },
      ],
    },
  ],
};

/**
 * Get level data by ID
 */
export function getLevelData(levelId: string): LevelData | null {
  const levels: Record<string, LevelData> = {
    'office_level_1': officeLevelData,
    'test_level': testLevelData,
  };
  return levels[levelId] || null;
}
