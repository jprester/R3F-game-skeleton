/// <reference types="vite/client" />

declare global {
  interface Window {
    // Debug hooks used by scripts/shot.mjs for headless screenshots.
    render_game_to_text?: () => string;
    advanceTime?: (ms: number) => void | Promise<void>;
    setCameraOrientation?: (yaw: number, pitch: number) => void;
  }
}

export {};
