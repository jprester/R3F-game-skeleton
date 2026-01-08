import Player from "./Player";
import Room from "./Room";
import Furniture from "./Furniture";

export default function Scene() {
  return (
    <>
      {/* Ambient light */}
      <ambientLight intensity={0.14} />
      {/* <directionalLight
        position={[5, 10, 5]}
        intensity={0.5}
        // castShadow
        // shadow-mapSize={[2048, 2048]}
        // shadow-camera-far={50}
        // shadow-camera-left={-10}
        // shadow-camera-right={10}
        // shadow-camera-top={10}
        // shadow-camera-bottom={-10}
      /> */}
      <pointLight position={[-3, 2, 0]} intensity={2.2} color="#d8dc69ff" />
      <pointLight position={[2, 2, 0]} intensity={5.2} color={0xffffff} />

      {/* <pointLight position={[-2, 2, -2]} intensity={1.2} color="#d8dc69ff" /> */}
      {/* Fog for atmosphere */}
      <fog attach="fog" args={["#333", 5, 14]} />

      {/* Player with collision */}
      <Player position={[0, 2, 5]} />

      {/* Room (floor, walls, ceiling) */}
      <Room />

      {/* Furniture with collision */}
      <Furniture />
    </>
  );
}
