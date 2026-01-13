import { createContext, useContext, useState, ReactNode } from "react";

interface InteractionContextType {
  isNearMonitor: boolean;
  setIsNearMonitor: (value: boolean) => void;
  isViewingMonitor: boolean;
  setIsViewingMonitor: (value: boolean) => void;
  toggleMonitorView: () => void;
}

const InteractionContext = createContext<InteractionContextType | null>(null);

export function InteractionProvider({ children }: { children: ReactNode }) {
  const [isNearMonitor, setIsNearMonitor] = useState(false);
  const [isViewingMonitor, setIsViewingMonitor] = useState(false);

  const toggleMonitorView = () => {
    setIsViewingMonitor((prev) => !prev);
  };

  return (
    <InteractionContext.Provider
      value={{
        isNearMonitor,
        setIsNearMonitor,
        isViewingMonitor,
        setIsViewingMonitor,
        toggleMonitorView,
      }}>
      {children}
    </InteractionContext.Provider>
  );
}

export function useInteraction() {
  const context = useContext(InteractionContext);
  if (!context) {
    throw new Error("useInteraction must be used within InteractionProvider");
  }
  return context;
}
