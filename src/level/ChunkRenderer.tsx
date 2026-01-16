// =============================================================================
// Liminal Drift - Chunk Renderer
// =============================================================================

import { useMemo } from 'react';
import { RigidBody, CuboidCollider } from '@react-three/rapier';
import * as THREE from 'three';
import {
  ChunkInstance,
  ChunkDefinition,
  ChunkRendererProps,
  Direction,
  FurniturePlacement,
} from './types';

// -----------------------------------------------------------------------------
// Constants
// -----------------------------------------------------------------------------

const WALL_THICKNESS = 0.3;
const DEFAULT_WALL_COLOR = '#4a4a6a';
const DEFAULT_FLOOR_COLOR = '#3d3d5c';
const DEFAULT_CEILING_COLOR = '#2a2a4a';

// -----------------------------------------------------------------------------
// Helper Functions
// -----------------------------------------------------------------------------

/**
 * Check if an exit is connected (has a door opening)
 */
function isExitConnected(chunk: ChunkInstance, direction: Direction): boolean {
  return chunk.connections.some((conn) => conn.exitDirection === direction);
}

/**
 * Get exit configuration for a direction
 */
function getExitConfig(
  definition: ChunkDefinition,
  direction: Direction
): { offset: number; width: number; height: number } | null {
  const exit = definition.exits.find((e) => e.direction === direction);
  return exit ? { offset: exit.offset, width: exit.width, height: exit.height } : null;
}

// -----------------------------------------------------------------------------
// Wall Component (with optional doorway cutout)
// -----------------------------------------------------------------------------

interface WallProps {
  position: [number, number, number];
  size: [number, number, number]; // width, height, depth
  rotation?: number;
  hasDoorway?: boolean;
  doorwayWidth?: number;
  doorwayHeight?: number;
  doorwayOffset?: number;
  color?: string;
}

function Wall({
  position,
  size,
  rotation = 0,
  hasDoorway = false,
  doorwayWidth = 1.2,
  doorwayHeight = 2.4,
  doorwayOffset = 0,
  color = DEFAULT_WALL_COLOR,
}: WallProps) {
  const [width, height, depth] = size;

  if (!hasDoorway) {
    // Simple solid wall
    return (
      <group position={position} rotation={[0, rotation, 0]}>
        <mesh castShadow receiveShadow>
          <boxGeometry args={[width, height, depth]} />
          <meshStandardMaterial color={color} />
        </mesh>
      </group>
    );
  }

  // Wall with doorway - split into sections
  const doorLeft = doorwayOffset - doorwayWidth / 2;
  const doorRight = doorwayOffset + doorwayWidth / 2;
  
  const leftSectionWidth = width / 2 + doorLeft;
  const rightSectionWidth = width / 2 - doorRight;
  const topSectionHeight = height - doorwayHeight;

  return (
    <group position={position} rotation={[0, rotation, 0]}>
      {/* Left section */}
      {leftSectionWidth > 0.1 && (
        <mesh
          castShadow
          receiveShadow
          position={[-(width / 2 - leftSectionWidth / 2), 0, 0]}
        >
          <boxGeometry args={[leftSectionWidth, height, depth]} />
          <meshStandardMaterial color={color} />
        </mesh>
      )}

      {/* Right section */}
      {rightSectionWidth > 0.1 && (
        <mesh
          castShadow
          receiveShadow
          position={[width / 2 - rightSectionWidth / 2, 0, 0]}
        >
          <boxGeometry args={[rightSectionWidth, height, depth]} />
          <meshStandardMaterial color={color} />
        </mesh>
      )}

      {/* Top section (above doorway) */}
      {topSectionHeight > 0.1 && (
        <mesh
          castShadow
          receiveShadow
          position={[doorwayOffset, height / 2 - topSectionHeight / 2, 0]}
        >
          <boxGeometry args={[doorwayWidth, topSectionHeight, depth]} />
          <meshStandardMaterial color={color} />
        </mesh>
      )}
    </group>
  );
}

// -----------------------------------------------------------------------------
// Room Geometry Component
// -----------------------------------------------------------------------------

interface RoomGeometryProps {
  chunk: ChunkInstance;
  definition: ChunkDefinition;
  lightActive?: boolean;
}

function RoomGeometry({ chunk, definition, lightActive = true }: RoomGeometryProps) {
  const [width, height, depth] = definition.size;

  // Determine which exits are open
  const northExit = isExitConnected(chunk, 'north')
    ? getExitConfig(definition, 'north')
    : null;
  const southExit = isExitConnected(chunk, 'south')
    ? getExitConfig(definition, 'south')
    : null;
  const eastExit = isExitConnected(chunk, 'east')
    ? getExitConfig(definition, 'east')
    : null;
  const westExit = isExitConnected(chunk, 'west')
    ? getExitConfig(definition, 'west')
    : null;

  return (
    <group>
      {/* Floor */}
      <mesh receiveShadow position={[0, 0, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[width, depth]} />
        <meshStandardMaterial color={DEFAULT_FLOOR_COLOR} side={THREE.DoubleSide} />
      </mesh>

      {/* Ceiling */}
      <mesh position={[0, height, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <planeGeometry args={[width, depth]} />
        <meshStandardMaterial color={DEFAULT_CEILING_COLOR} side={THREE.DoubleSide} />
      </mesh>

      {/* North Wall */}
      <Wall
        position={[0, height / 2, -depth / 2 + WALL_THICKNESS / 2]}
        size={[width, height, WALL_THICKNESS]}
        hasDoorway={!!northExit}
        doorwayWidth={northExit?.width}
        doorwayHeight={northExit?.height}
        doorwayOffset={northExit?.offset}
      />

      {/* South Wall */}
      <Wall
        position={[0, height / 2, depth / 2 - WALL_THICKNESS / 2]}
        size={[width, height, WALL_THICKNESS]}
        hasDoorway={!!southExit}
        doorwayWidth={southExit?.width}
        doorwayHeight={southExit?.height}
        doorwayOffset={southExit?.offset}
      />

      {/* East Wall */}
      <Wall
        position={[width / 2 - WALL_THICKNESS / 2, height / 2, 0]}
        size={[depth, height, WALL_THICKNESS]}
        rotation={Math.PI / 2}
        hasDoorway={!!eastExit}
        doorwayWidth={eastExit?.width}
        doorwayHeight={eastExit?.height}
        doorwayOffset={eastExit?.offset}
      />

      {/* West Wall */}
      <Wall
        position={[-width / 2 + WALL_THICKNESS / 2, height / 2, 0]}
        size={[depth, height, WALL_THICKNESS]}
        rotation={Math.PI / 2}
        hasDoorway={!!westExit}
        doorwayWidth={westExit?.width}
        doorwayHeight={westExit?.height}
        doorwayOffset={westExit?.offset}
      />

      {/* Single ceiling light per room - only active when player is nearby */}
      {lightActive && (
        <pointLight
          position={[0, height - 0.3, 0]}
          intensity={12}
          color="#ffeedd"
          distance={Math.max(width, depth) * 1.5}
          decay={1.5}
        />
      )}
    </group>
  );
}

// -----------------------------------------------------------------------------
// Room Colliders Component
// -----------------------------------------------------------------------------

interface RoomCollidersProps {
  chunk: ChunkInstance;
  definition: ChunkDefinition;
}

function RoomColliders({ chunk, definition }: RoomCollidersProps) {
  const [width, height, depth] = definition.size;

  // Build collider list based on walls and doorways
  const colliders = useMemo(() => {
    const result: Array<{
      position: [number, number, number];
      size: [number, number, number];
    }> = [];

    // Floor collider
    result.push({
      position: [0, -0.1, 0],
      size: [width / 2, 0.1, depth / 2],
    });

    // Ceiling collider
    result.push({
      position: [0, height + 0.1, 0],
      size: [width / 2, 0.1, depth / 2],
    });

    // Wall colliders (simplified - full walls, doorways handled by physics)
    // In a more complete implementation, you'd split walls around doorways

    // North wall
    if (!isExitConnected(chunk, 'north')) {
      result.push({
        position: [0, height / 2, -depth / 2],
        size: [width / 2, height / 2, WALL_THICKNESS / 2],
      });
    } else {
      // Add wall sections around doorway
      const exit = getExitConfig(definition, 'north');
      if (exit) {
        const doorHalfWidth = exit.width / 2;
        // Left section
        result.push({
          position: [-(width / 4 + doorHalfWidth / 2), height / 2, -depth / 2],
          size: [(width / 2 - doorHalfWidth) / 2, height / 2, WALL_THICKNESS / 2],
        });
        // Right section
        result.push({
          position: [width / 4 + doorHalfWidth / 2, height / 2, -depth / 2],
          size: [(width / 2 - doorHalfWidth) / 2, height / 2, WALL_THICKNESS / 2],
        });
      }
    }

    // South wall
    if (!isExitConnected(chunk, 'south')) {
      result.push({
        position: [0, height / 2, depth / 2],
        size: [width / 2, height / 2, WALL_THICKNESS / 2],
      });
    } else {
      const exit = getExitConfig(definition, 'south');
      if (exit) {
        const doorHalfWidth = exit.width / 2;
        result.push({
          position: [-(width / 4 + doorHalfWidth / 2), height / 2, depth / 2],
          size: [(width / 2 - doorHalfWidth) / 2, height / 2, WALL_THICKNESS / 2],
        });
        result.push({
          position: [width / 4 + doorHalfWidth / 2, height / 2, depth / 2],
          size: [(width / 2 - doorHalfWidth) / 2, height / 2, WALL_THICKNESS / 2],
        });
      }
    }

    // East wall
    if (!isExitConnected(chunk, 'east')) {
      result.push({
        position: [width / 2, height / 2, 0],
        size: [WALL_THICKNESS / 2, height / 2, depth / 2],
      });
    } else {
      const exit = getExitConfig(definition, 'east');
      if (exit) {
        const doorHalfWidth = exit.width / 2;
        result.push({
          position: [width / 2, height / 2, -(depth / 4 + doorHalfWidth / 2)],
          size: [WALL_THICKNESS / 2, height / 2, (depth / 2 - doorHalfWidth) / 2],
        });
        result.push({
          position: [width / 2, height / 2, depth / 4 + doorHalfWidth / 2],
          size: [WALL_THICKNESS / 2, height / 2, (depth / 2 - doorHalfWidth) / 2],
        });
      }
    }

    // West wall
    if (!isExitConnected(chunk, 'west')) {
      result.push({
        position: [-width / 2, height / 2, 0],
        size: [WALL_THICKNESS / 2, height / 2, depth / 2],
      });
    } else {
      const exit = getExitConfig(definition, 'west');
      if (exit) {
        const doorHalfWidth = exit.width / 2;
        result.push({
          position: [-width / 2, height / 2, -(depth / 4 + doorHalfWidth / 2)],
          size: [WALL_THICKNESS / 2, height / 2, (depth / 2 - doorHalfWidth) / 2],
        });
        result.push({
          position: [-width / 2, height / 2, depth / 4 + doorHalfWidth / 2],
          size: [WALL_THICKNESS / 2, height / 2, (depth / 2 - doorHalfWidth) / 2],
        });
      }
    }

    return result;
  }, [chunk, definition, width, height, depth]);

  return (
    <RigidBody type="fixed" colliders={false}>
      {colliders.map((collider, index) => (
        <CuboidCollider
          key={index}
          position={collider.position}
          args={collider.size}
        />
      ))}
    </RigidBody>
  );
}

// -----------------------------------------------------------------------------
// Simple Furniture Components
// -----------------------------------------------------------------------------

function SimpleFurniture({ placements }: { placements: FurniturePlacement[] }) {
  return (
    <group>
      {placements.map((item, index) => {
        const scale = item.scale || 1;
        
        switch (item.type) {
          case 'desk':
            return (
              <RigidBody key={index} type="fixed" position={item.position}>
                <group rotation={[0, item.rotation, 0]} scale={scale}>
                  {/* Desk top */}
                  <mesh castShadow position={[0, 0.75, 0]}>
                    <boxGeometry args={[1.4, 0.05, 0.7]} />
                    <meshStandardMaterial color="#8b5a2b" />
                  </mesh>
                  {/* Legs */}
                  <mesh castShadow position={[-0.6, 0.35, -0.25]}>
                    <boxGeometry args={[0.05, 0.7, 0.05]} />
                    <meshStandardMaterial color="#6b4423" />
                  </mesh>
                  <mesh castShadow position={[0.6, 0.35, -0.25]}>
                    <boxGeometry args={[0.05, 0.7, 0.05]} />
                    <meshStandardMaterial color="#6b4423" />
                  </mesh>
                  <mesh castShadow position={[-0.6, 0.35, 0.25]}>
                    <boxGeometry args={[0.05, 0.7, 0.05]} />
                    <meshStandardMaterial color="#6b4423" />
                  </mesh>
                  <mesh castShadow position={[0.6, 0.35, 0.25]}>
                    <boxGeometry args={[0.05, 0.7, 0.05]} />
                    <meshStandardMaterial color="#6b4423" />
                  </mesh>
                </group>
              </RigidBody>
            );

          case 'chair':
            return (
              <RigidBody key={index} type="fixed" position={item.position}>
                <group rotation={[0, item.rotation, 0]} scale={scale}>
                  {/* Seat */}
                  <mesh castShadow position={[0, 0.45, 0]}>
                    <boxGeometry args={[0.45, 0.05, 0.45]} />
                    <meshStandardMaterial color="#cd853f" />
                  </mesh>
                  {/* Back */}
                  <mesh castShadow position={[0, 0.75, -0.2]}>
                    <boxGeometry args={[0.45, 0.5, 0.05]} />
                    <meshStandardMaterial color="#cd853f" />
                  </mesh>
                  {/* Legs */}
                  {[[-0.18, -0.18], [0.18, -0.18], [-0.18, 0.18], [0.18, 0.18]].map(
                    ([x, z], i) => (
                      <mesh key={i} castShadow position={[x, 0.2, z]}>
                        <boxGeometry args={[0.04, 0.4, 0.04]} />
                        <meshStandardMaterial color="#8b4513" />
                      </mesh>
                    )
                  )}
                </group>
              </RigidBody>
            );

          case 'table':
            return (
              <RigidBody key={index} type="fixed" position={item.position}>
                <group rotation={[0, item.rotation, 0]} scale={scale}>
                  <mesh castShadow position={[0, 0.4, 0]}>
                    <boxGeometry args={[1, 0.05, 0.6]} />
                    <meshStandardMaterial color="#8b5a2b" />
                  </mesh>
                  {[[-0.4, -0.25], [0.4, -0.25], [-0.4, 0.25], [0.4, 0.25]].map(
                    ([x, z], i) => (
                      <mesh key={i} castShadow position={[x, 0.2, z]}>
                        <boxGeometry args={[0.05, 0.4, 0.05]} />
                        <meshStandardMaterial color="#6b4423" />
                      </mesh>
                    )
                  )}
                </group>
              </RigidBody>
            );

          case 'filing_cabinet':
            return (
              <RigidBody key={index} type="fixed" position={item.position}>
                <group rotation={[0, item.rotation, 0]} scale={scale}>
                  <mesh castShadow position={[0, 0.6, 0]}>
                    <boxGeometry args={[0.5, 1.2, 0.6]} />
                    <meshStandardMaterial color="#696969" />
                  </mesh>
                </group>
              </RigidBody>
            );

          case 'plant':
            return (
              <RigidBody key={index} type="fixed" position={item.position}>
                <group rotation={[0, item.rotation, 0]} scale={scale}>
                  {/* Pot */}
                  <mesh castShadow position={[0, 0.2, 0]}>
                    <cylinderGeometry args={[0.2, 0.15, 0.4, 16]} />
                    <meshStandardMaterial color="#8b4513" />
                  </mesh>
                  {/* Plant */}
                  <mesh castShadow position={[0, 0.6, 0]}>
                    <sphereGeometry args={[0.3, 16, 16]} />
                    <meshStandardMaterial color="#228b22" />
                  </mesh>
                </group>
              </RigidBody>
            );

          case 'water_cooler':
            return (
              <RigidBody key={index} type="fixed" position={item.position}>
                <group rotation={[0, item.rotation, 0]} scale={scale}>
                  <mesh castShadow position={[0, 0.5, 0]}>
                    <boxGeometry args={[0.4, 1, 0.4]} />
                    <meshStandardMaterial color="#e0e0e0" />
                  </mesh>
                  <mesh castShadow position={[0, 1.1, 0]}>
                    <cylinderGeometry args={[0.15, 0.15, 0.4, 16]} />
                    <meshStandardMaterial color="#4169e1" transparent opacity={0.6} />
                  </mesh>
                </group>
              </RigidBody>
            );

          case 'trash_bin':
            return (
              <RigidBody key={index} type="fixed" position={item.position}>
                <group rotation={[0, item.rotation, 0]} scale={scale}>
                  <mesh castShadow position={[0, 0.2, 0]}>
                    <cylinderGeometry args={[0.15, 0.12, 0.4, 16]} />
                    <meshStandardMaterial color="#404040" />
                  </mesh>
                </group>
              </RigidBody>
            );

          default:
            return null;
        }
      })}
    </group>
  );
}

// -----------------------------------------------------------------------------
// Main Chunk Renderer Component
// -----------------------------------------------------------------------------

interface ChunkRendererFullProps extends ChunkRendererProps {
  definition: ChunkDefinition;
  lightActive?: boolean;
}

export function ChunkRenderer({
  chunk,
  definition,
  physicsActive,
  lightActive = true,
}: ChunkRendererFullProps) {
  // Get furniture placements
  const furniture = chunk.furnitureOverride || definition.defaultFurniture;

  return (
    <group
      position={chunk.position}
      rotation={[0, chunk.rotation, 0]}
    >
      {/* Room geometry (visual) */}
      <RoomGeometry chunk={chunk} definition={definition} lightActive={lightActive} />

      {/* Room colliders (physics) */}
      {physicsActive && (
        <RoomColliders chunk={chunk} definition={definition} />
      )}

      {/* Furniture */}
      <SimpleFurniture placements={furniture} />
    </group>
  );
}

export default ChunkRenderer;
