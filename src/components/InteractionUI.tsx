import { useInteraction } from "./InteractionContext";

export default function InteractionUI() {
  const { isNearMonitor, isViewingMonitor } = useInteraction();

  return (
    <>
      {/* Interaction prompt - shown when near monitor but not viewing */}
      {isNearMonitor && !isViewingMonitor && (
        <div
          style={{
            position: "fixed",
            bottom: "20%",
            left: "50%",
            transform: "translateX(-50%)",
            backgroundColor: "rgba(0, 0, 0, 0.7)",
            color: "white",
            padding: "12px 24px",
            borderRadius: "8px",
            fontSize: "16px",
            fontFamily: "system-ui, sans-serif",
            pointerEvents: "none",
            zIndex: 100,
          }}>
          Press <strong>SPACE</strong> to view MRI scan
        </div>
      )}

      {/* Fullscreen image view */}
      {isViewingMonitor && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100vw",
            height: "100vh",
            backgroundColor: "rgba(0, 0, 0, 0.9)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
          }}>
          <img
            src="/textures/corsmed-simulator-ui.png"
            alt="MRI Scan Results"
            style={{
              maxWidth: "95%",
              maxHeight: "85%",
              objectFit: "contain",
              borderRadius: "4px",
              boxShadow: "0 4px 20px rgba(0, 0, 0, 0.5)",
            }}
          />
          <div
            style={{
              marginTop: "20px",
              color: "white",
              fontSize: "14px",
              fontFamily: "system-ui, sans-serif",
              opacity: 0.7,
            }}>
            Press <strong>SPACE</strong> or <strong>ESC</strong> to close
          </div>
        </div>
      )}
    </>
  );
}
