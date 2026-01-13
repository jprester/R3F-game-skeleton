import { useRef, useEffect } from "react";
import { useFrame } from "@react-three/fiber";
import { Vector3 } from "three";
import { useInteraction } from "./InteractionContext";

// Monitor position (must match MRIFurniture)
const MONITOR_POSITION = new Vector3(4.3, 0.79, 0);
const INTERACTION_DISTANCE = 2; // meters

export default function MonitorInteraction() {
  const { setIsNearMonitor, isViewingMonitor, toggleMonitorView } =
    useInteraction();
  const playerPosition = useRef(new Vector3());

  // Handle keyboard input for interaction
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.code === "Space" || event.code === "Escape") {
        // Space toggles the view when near, Escape only closes
        if (event.code === "Escape" && isViewingMonitor) {
          toggleMonitorView();
        } else if (event.code === "Space") {
          // Only toggle if near monitor or already viewing
          const distance = playerPosition.current.distanceTo(MONITOR_POSITION);
          if (distance < INTERACTION_DISTANCE || isViewingMonitor) {
            toggleMonitorView();
          }
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isViewingMonitor, toggleMonitorView]);

  // Check proximity to monitor every frame
  useFrame((state) => {
    playerPosition.current.copy(state.camera.position);
    const distance = playerPosition.current.distanceTo(MONITOR_POSITION);
    setIsNearMonitor(distance < INTERACTION_DISTANCE);
  });

  return null;
}
