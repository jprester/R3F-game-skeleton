import { Canvas } from "@react-three/fiber";
import { Physics } from "@react-three/rapier";
import { KeyboardControls } from "@react-three/drei";
import MRIScene from "./components/MRIScene";
import { InteractionProvider } from "./components/InteractionContext";
import InteractionUI from "./components/InteractionUI";

// Define keyboard controls mapping
const keyboardMap = [
  { name: "forward", keys: ["ArrowUp", "KeyW"] },
  { name: "backward", keys: ["ArrowDown", "KeyS"] },
  { name: "left", keys: ["ArrowLeft", "KeyA"] },
  { name: "right", keys: ["ArrowRight", "KeyD"] },
];

export default function App() {
  return (
    <InteractionProvider>
      <KeyboardControls map={keyboardMap}>
        <Canvas
          shadows
          camera={{ fov: 60, near: 0.1, far: 50 }}
          style={{ background: "#e0e0e0" }}>
          <Physics gravity={[0, -20, 0]} debug={false}>
            <MRIScene />
          </Physics>
        </Canvas>
      </KeyboardControls>
      <InteractionUI />
    </InteractionProvider>
  );
}
