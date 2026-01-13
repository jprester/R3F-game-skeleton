import { createContext, useContext, ReactNode } from "react";
import { useGLTF } from "@react-three/drei";
import { Group } from "three";

interface MRIModelContextType {
  mriMachineScene: Group;
  mriMachineBedScene: Group;
  patientScene: Group;
  computerMonitorScene: Group;
}

const MRIModelContext = createContext<MRIModelContextType | null>(null);

export function MRIModelProvider({ children }: { children: ReactNode }) {
  // Load MRI-specific models ONCE at this level
  const { scene: mriMachineScene } = useGLTF(
    "/models/MRI/2026-mri-machine.glb"
  );
  const { scene: mriMachineBedScene } = useGLTF(
    "/models/MRI/2026-mri-machine_bed.glb"
  );
  const { scene: patientScene } = useGLTF(
    "/models/MRI/human-patient-lying.glb"
  );
  const { scene: computerMonitorScene } = useGLTF(
    "/models/MRI/computer-monitor-simulator_ui.glb"
  );

  return (
    <MRIModelContext.Provider
      value={{
        mriMachineScene,
        mriMachineBedScene,
        patientScene,
        computerMonitorScene,
      }}>
      {children}
    </MRIModelContext.Provider>
  );
}

export function useMRIModels() {
  const context = useContext(MRIModelContext);
  if (!context) {
    throw new Error("useMRIModels must be used within MRIModelProvider");
  }
  return context;
}

// Preload MRI models
useGLTF.preload("/models/MRI/2026-mri-machine.glb");
useGLTF.preload("/models/MRI/2026-mri-machine_bed.glb");
useGLTF.preload("/models/MRI/human-patient-lying.glb");
useGLTF.preload("/models/MRI/computer-monitor-simulator_ui.glb");
