import Player from "./Player";
import MRIRoom from "./MRIRoom";
import MRIFurniture from "./MRIFurniture";
import { MRIModelProvider } from "./MRIModelProvider";
import MonitorInteraction from "./MonitorInteraction";

export default function MRIScene() {
  return (
    <MRIModelProvider>
      {/* Monitor proximity detection and interaction */}
      <MonitorInteraction />
        {/* Ambient light - slightly brighter for medical environment */}
        <ambientLight intensity={0.4} color="#ffffff" />

        {/* Main overhead lights in MRI scanning room */}
        <pointLight
          position={[-3, 3.5, 0]}
          intensity={8}
          color="#ffffff"
          castShadow
        />
        <pointLight
          position={[-3, 3.5, -3]}
          intensity={5}
          color="#ffffff"
        />
        <pointLight
          position={[-3, 3.5, 3]}
          intensity={5}
          color="#ffffff"
        />

        {/* Control room lighting */}
        <pointLight
          position={[5, 3.5, 0]}
          intensity={6}
          color="#f0f0ff"
        />

        {/* Subtle blue accent light near MRI machine */}
        <pointLight
          position={[-5, 1.5, 0]}
          intensity={2}
          color="#4488ff"
        />

        {/* Light fog for depth - lighter than office scene */}
        <fog attach="fog" args={["#e8e8e8", 8, 20]} />

        {/* Player starting in control room, facing the MRI room */}
        <Player position={[5, 2, 2]} />

        {/* MRI Room (floor, walls, ceiling, observation window) */}
        <MRIRoom />

        {/* MRI Equipment and furniture */}
        <MRIFurniture />
    </MRIModelProvider>
  );
}
