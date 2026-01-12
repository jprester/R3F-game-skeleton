import Player from "./Player";
import Room from "./Room";
import Furniture from "./Furniture";
import { ModelProvider } from "./ModelProvider";
import { AudioProvider } from "./AudioProvider";

interface SceneProps {
  isMuted?: boolean;
  masterVolume?: number;
}

export default function Scene({
  isMuted = false,
  masterVolume = 0.5,
}: SceneProps) {
  return (
    <AudioProvider isMuted={isMuted} masterVolume={masterVolume}>
      <ModelProvider>
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
        <pointLight position={[0, 3, -3]} intensity={7.2} color={0xffffff} />
        <pointLight position={[-3, 2, 0]} intensity={4.2} color={0xe3e4d1ff} />
        <pointLight position={[3, 2, 0]} intensity={4.2} color={0xe3e4d1ff} />

        {/* <pointLight position={[-2, 2, -2]} intensity={1.2} color="#e3e4d1ff" /> */}
        {/* Fog for atmosphere */}
        <fog attach="fog" args={[0x333333, 5, 12]} />

        {/* Player with collision */}
        <Player position={[0, 2, 5]} />

        {/* Room (floor, walls, ceiling) */}
        <Room />

        {/* Furniture with collision */}
        <Furniture />
      </ModelProvider>
    </AudioProvider>
  );
}
