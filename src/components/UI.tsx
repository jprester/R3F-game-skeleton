import { useState, useEffect, useCallback } from "react";

interface UIProps {
  isMuted?: boolean;
  masterVolume?: number;
  onToggleMute?: () => void;
  onVolumeChange?: (volume: number) => void;
}

export default function UI({
  isMuted = false,
  masterVolume = 0.5,
  onToggleMute,
  onVolumeChange,
}: UIProps) {
  const [isLocked, setIsLocked] = useState(false);

  // Handle keyboard shortcut for mute (M key)
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.code === "KeyM" && onToggleMute) {
        onToggleMute();
      }
    },
    [onToggleMute]
  );

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  useEffect(() => {
    const handleLockChange = () => {
      setIsLocked(document.pointerLockElement !== null);
    };

    document.addEventListener("pointerlockchange", handleLockChange);
    return () =>
      document.removeEventListener("pointerlockchange", handleLockChange);
  }, []);

  return (
    <>
      {/* Instructions overlay */}
      <div
        style={{
          position: "absolute",
          top: 20,
          left: 20,
          color: "white",
          fontFamily: "monospace",
          fontSize: 14,
          backgroundColor: "rgba(0, 0, 0, 0.6)",
          padding: "15px 20px",
          borderRadius: 8,
          pointerEvents: "none",
          maxWidth: 280,
        }}>
        <h3 style={{ margin: "0 0 10px 0", fontSize: 16 }}>
          🎮 R3F Collision Skeleton
        </h3>
        <div style={{ lineHeight: 1.6 }}>
          <div>
            <kbd>W</kbd> <kbd>A</kbd> <kbd>S</kbd> <kbd>D</kbd> — Move
          </div>
          <div>
            <kbd>Mouse</kbd> — Look around
          </div>
          <div>
            <kbd>Space</kbd> — Jump
          </div>
          <div>
            <kbd>M</kbd> — Mute/Unmute
          </div>
          <div style={{ marginTop: 8, opacity: 0.7, fontSize: 12 }}>
            Click to lock mouse
          </div>
        </div>
      </div>

      {/* Audio controls */}
      <div
        style={{
          position: "absolute",
          bottom: 20,
          left: 20,
          color: "white",
          fontFamily: "monospace",
          fontSize: 12,
          backgroundColor: "rgba(0, 0, 0, 0.6)",
          padding: "10px 15px",
          borderRadius: 8,
          display: "flex",
          alignItems: "center",
          gap: 10,
        }}>
        <button
          onClick={onToggleMute}
          style={{
            background: "none",
            border: "none",
            color: "white",
            fontSize: 18,
            cursor: "pointer",
            padding: 0,
          }}
          title={isMuted ? "Unmute (M)" : "Mute (M)"}>
          {isMuted ? "🔇" : "🔊"}
        </button>
        <input
          type="range"
          min="0"
          max="1"
          step="0.05"
          value={isMuted ? 0 : masterVolume}
          onChange={(e) => onVolumeChange?.(parseFloat(e.target.value))}
          style={{
            width: 80,
            cursor: "pointer",
            accentColor: "#4a9eff",
          }}
          title={`Volume: ${Math.round(masterVolume * 100)}%`}
        />
      </div>

      {/* Crosshair */}
      {isLocked && (
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            pointerEvents: "none",
          }}>
          <svg width="20" height="20" viewBox="0 0 20 20">
            <circle
              cx="10"
              cy="10"
              r="3"
              fill="none"
              stroke="white"
              strokeWidth="1.5"
              opacity="0.7"
            />
            <line
              x1="10"
              y1="0"
              x2="10"
              y2="6"
              stroke="white"
              strokeWidth="1.5"
              opacity="0.5"
            />
            <line
              x1="10"
              y1="14"
              x2="10"
              y2="20"
              stroke="white"
              strokeWidth="1.5"
              opacity="0.5"
            />
            <line
              x1="0"
              y1="10"
              x2="6"
              y2="10"
              stroke="white"
              strokeWidth="1.5"
              opacity="0.5"
            />
            <line
              x1="14"
              y1="10"
              x2="20"
              y2="10"
              stroke="white"
              strokeWidth="1.5"
              opacity="0.5"
            />
          </svg>
        </div>
      )}

      {/* Click to start prompt */}
      {!isLocked && (
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            color: "white",
            fontFamily: "sans-serif",
            fontSize: 18,
            backgroundColor: "rgba(0, 0, 0, 0.7)",
            padding: "20px 30px",
            borderRadius: 12,
            textAlign: "center",
            cursor: "pointer",
          }}>
          <div style={{ fontSize: 24, marginBottom: 8 }}>🖱️</div>
          <div>Click to start</div>
          <div style={{ fontSize: 12, opacity: 0.6, marginTop: 4 }}>
            Press ESC to release mouse
          </div>
        </div>
      )}
    </>
  );
}
