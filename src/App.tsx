import { ACESFilmicToneMapping } from "three";
import { Canvas } from "@react-three/fiber";
import Scene from "./components/Scene";
import UI from "./components/UI";

export default function App() {
  return (
    <>
      <Canvas
        camera={{ fov: 55, near: 1, far: 20000, position: [30, 30, 100] }}
        gl={{ antialias: true }}
        dpr={[1, 2]}
        onCreated={({ gl }) => {
          gl.toneMapping = ACESFilmicToneMapping;
          gl.toneMappingExposure = 0.38;
        }}
        style={{ background: "#000", width: "100vw", height: "100vh" }}>
        <Scene />
      </Canvas>
      <UI />
    </>
  );
}
