import { createContext, useContext, ReactNode } from "react";
import { useGLTF } from "@react-three/drei";
import { Group } from "three";

interface ModelContextType {
  deskScene: Group;
  chairScene: Group;
  folderScene: Group;
  boxesScene: Group;
  doorScene: Group;
}

const ModelContext = createContext<ModelContextType | null>(null);

export function ModelProvider({ children }: { children: ReactNode }) {
  // Load models ONCE at this level
  const { scene: deskScene } = useGLTF("/models/desk/office_table_2.glb");
  const { scene: chairScene } = useGLTF("/models/chair/conference_chair.glb");
  const { scene: folderScene } = useGLTF("/models/misc/folder.glb");
  const { scene: boxesScene } = useGLTF(
    "/models/misc/two_cardboard_boxes_one_open_one_closed.glb"
  );
  const { scene: doorScene } = useGLTF(
    "/models/door/a_simple_modern_white_door.glb"
  );

  return (
    <ModelContext.Provider
      value={{
        deskScene,
        chairScene,
        folderScene,
        boxesScene,
        doorScene,
      }}>
      {children}
    </ModelContext.Provider>
  );
}

export function useModels() {
  const context = useContext(ModelContext);
  if (!context) {
    throw new Error("useModels must be used within ModelProvider");
  }
  return context;
}

// Preload models
useGLTF.preload("/models/desk/office_table_2.glb");
useGLTF.preload("/models/chair/conference_chair.glb");
useGLTF.preload("/models/misc/folder.glb");
useGLTF.preload("/models/misc/two_cardboard_boxes_one_open_one_closed.glb");
useGLTF.preload("/models/door/a_simple_modern_white_door.glb");
