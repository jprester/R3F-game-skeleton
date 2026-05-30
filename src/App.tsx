import { ACESFilmicToneMapping } from "three";
import { Canvas } from "@react-three/fiber";
import { Leva } from "leva";

import Scene from "./components/Scene";
import UI from "./components/UI";

export default function App() {
  // ?qa=1 hides dev overlays (Leva panel) for clean headless screenshots.
  const isQaMode =
    typeof window !== "undefined" &&
    new URLSearchParams(window.location.search).get("qa") === "1";

  // Never show the Leva debug panel in a production build — only in `npm run dev`.
  const hideLeva = isQaMode || import.meta.env.PROD;

  return (
    <>
      <Leva hidden={hideLeva} />
      <Canvas
        shadows
        camera={{ fov: 55, near: 1, far: 20000, position: [30, 30, 100] }}
        gl={{ antialias: true }}
        dpr={[1, 2]}
        onCreated={({ gl }) => {
          gl.toneMapping = ACESFilmicToneMapping;
          gl.toneMappingExposure = 0.6;
        }}
        style={{ background: "#000", width: "100vw", height: "100vh" }}>
        <Scene />
      </Canvas>
      <UI />
    </>
  );
}
