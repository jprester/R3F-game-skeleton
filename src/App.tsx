import { Canvas } from "@react-three/fiber";
import { Physics } from "@react-three/rapier";
import { KeyboardControls } from "@react-three/drei";
import Scene from "./components/Scene";
import UI from "./components/UI";

// Define keyboard controls mapping
const keyboardMap = [
  { name: "forward", keys: ["ArrowUp", "KeyW"] },
  { name: "backward", keys: ["ArrowDown", "KeyS"] },
  { name: "left", keys: ["ArrowLeft", "KeyA"] },
  { name: "right", keys: ["ArrowRight", "KeyD"] },
  { name: "jump", keys: ["Space"] },
];

export default function App() {
  return (
    <>
      <KeyboardControls map={keyboardMap}>
        <Canvas
          shadows
          camera={{ fov: 60, near: 0.1, far: 1000 }}
          style={{ background: "#1a1a2e" }}>
          <Physics gravity={[0, -20, 0]} debug={false}>
            <Scene />
          </Physics>
        </Canvas>
      </KeyboardControls>
      <UI />
    </>
  );
}
