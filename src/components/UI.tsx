import { useEffect, useSyncExternalStore } from "react";
import {
  getSnapshot,
  nextTrack,
  subscribe,
  togglePlay,
  toggleMute,
} from "./musicStore";

export default function UI() {
  const isQaMode =
    typeof window !== "undefined" &&
    new URLSearchParams(window.location.search).get("qa") === "1";

  const music = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  useEffect(() => {
    if (isQaMode) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.repeat) return;
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      if (e.code === "KeyE") {
        e.preventDefault();
        nextTrack();
      } else if (e.code === "KeyP") {
        e.preventDefault();
        togglePlay();
      } else if (e.code === "KeyM") {
        e.preventDefault();
        toggleMute();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isQaMode]);

  if (isQaMode) {
    return null;
  }

  return (
    <>
      <div
        style={{
          position: "absolute",
          top: 20,
          left: 20,
          color: "white",
          fontFamily: "monospace",
          fontSize: 13,
          lineHeight: 1.55,
          background: "rgba(0, 0, 0, 0.42)",
          padding: "12px 14px",
          borderRadius: 6,
          pointerEvents: "none",
        }}>
        <strong>Plato's Cove</strong>
        <div>Click to capture mouse</div>
        <div>WASD / arrows move</div>
        <div>Space jumps</div>
        <div>Esc releases mouse</div>
        <div style={{ marginTop: 8, opacity: 0.85 }}>
          P play/pause &nbsp; E next &nbsp; M mute
        </div>
      </div>
      <MusicControls
        isPlaying={music.isPlaying}
        isMuted={music.isMuted}
        hasStarted={music.hasStarted}
        trackLabel={music.trackLabel}
        visible={music.nearBoombox}
      />
    </>
  );
}

interface MusicControlsProps {
  isPlaying: boolean;
  isMuted: boolean;
  hasStarted: boolean;
  trackLabel: string;
  visible: boolean;
}

function MusicControls({
  isPlaying,
  isMuted,
  hasStarted,
  trackLabel,
  visible,
}: MusicControlsProps) {
  const statusLabel = !hasStarted
    ? "Music off"
    : isPlaying
      ? `Playing — ${trackLabel}`
      : `Paused — ${trackLabel}`;

  return (
    <div
      style={{
        position: "absolute",
        bottom: "50%",
        left: "50%",
        transform: "translate(-50%, 50%)",
        color: "white",
        fontFamily: "monospace",
        fontSize: 12,
        lineHeight: 1.45,
        background: "rgba(0, 0, 0, 0.55)",
        padding: "10px 12px",
        borderRadius: 6,
        display: "flex",
        flexDirection: "column",
        gap: 8,
        minWidth: 180,
        opacity: visible ? 1 : 0,
        pointerEvents: visible ? "auto" : "none",
        transition: "opacity 0.3s ease",
      }}>
      <div style={{ opacity: 0.85 }}>{statusLabel}</div>
      <div style={{ display: "flex", gap: 6 }}>
        <ControlButton onClick={togglePlay}>
          {isPlaying ? "Pause (P)" : "Play (P)"}
        </ControlButton>
        <ControlButton onClick={nextTrack}>Next (E)</ControlButton>
        <ControlButton onClick={toggleMute}>
          {isMuted ? "Unmute (M)" : "Mute (M)"}
        </ControlButton>
      </div>
    </div>
  );
}

function ControlButton({
  children,
  onClick,
}: {
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={(e) => {
        onClick();
        (e.currentTarget as HTMLButtonElement).blur();
      }}
      style={{
        flex: 1,
        minWidth: 90,
        whiteSpace: "nowrap",
        background: "rgba(255, 92, 176, 0.18)",
        border: "1px solid rgba(255, 92, 176, 0.55)",
        color: "white",
        fontFamily: "monospace",
        fontSize: 11,
        padding: "5px 8px",
        borderRadius: 4,
        cursor: "pointer",
      }}>
      {children}
    </button>
  );
}
