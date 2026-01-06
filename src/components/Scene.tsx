import Player from "./Player";
import Room from "./Room";
import Furniture from "./Furniture";

export default function Scene() {
  return (
    <>
      {/* Lighting */}
      <ambientLight intensity={0.5} />
      <directionalLight
        position={[5, 10, 5]}
        intensity={1}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-far={50}
        shadow-camera-left={-10}
        shadow-camera-right={10}
        shadow-camera-top={10}
        shadow-camera-bottom={-10}
      />
      <pointLight position={[0, 3, 0]} intensity={0.5} color="#ffeedd" />

      {/* Fog for atmosphere */}
      <fog attach="fog" args={["#1a1a2e", 5, 25]} />

      {/* Player with collision */}
      <Player position={[0, 2, 5]} />

      {/* Room (floor, walls, ceiling) */}
      <Room />

      {/* Furniture with collision */}
      <Furniture />
    </>
  );
}
