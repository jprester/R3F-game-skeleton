import { useState, useCallback } from "react";
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
  const [isMuted, setIsMuted] = useState(false);
  const [masterVolume, setMasterVolume] = useState(0.5);

  const toggleMute = useCallback(() => {
    setIsMuted((prev) => !prev);
  }, []);

  const handleVolumeChange = useCallback((volume: number) => {
    setMasterVolume(volume);
    if (volume > 0) setIsMuted(false);
  }, []);

  return (
    <>
      <KeyboardControls map={keyboardMap}>
        <Canvas
          shadows
          camera={{ fov: 60, near: 0.1, far: 30 }}
          style={{ background: "#1a1a2e" }}>
          <Physics gravity={[0, -20, 0]} debug={false}>
            <Scene isMuted={isMuted} masterVolume={masterVolume} />
          </Physics>
        </Canvas>
      </KeyboardControls>
      <UI
        isMuted={isMuted}
        masterVolume={masterVolume}
        onToggleMute={toggleMute}
        onVolumeChange={handleVolumeChange}
      />
    </>
  );
}
