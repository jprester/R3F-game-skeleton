// Music store: lives outside the R3F Canvas so play/pause/mute controls work
// reliably from the UI (no reconciler boundary to cross). The Canvas only
// writes the distance-based volume into the store; it never reads state.

const TRACKS = [
  "/sounds/music/track1.mp3",
  "/sounds/music/track2.mp3",
  "/sounds/music/track3.mp3",
];

const TRACK_LABELS = ["Track 1", "Track 2", "Track 3"];

interface Snapshot {
  isPlaying: boolean;
  isMuted: boolean;
  hasStarted: boolean;
  currentIndex: number;
  trackLabel: string;
}

let audioElements: HTMLAudioElement[] = [];
let currentIndex = 0;
let isPlaying = false;
let isMuted = false;
let hasStarted = false;
let distanceVolume = 1;
let lastWrittenVolume = -1;

let snapshot: Snapshot = {
  isPlaying: false,
  isMuted: false,
  hasStarted: false,
  currentIndex: 0,
  trackLabel: TRACK_LABELS[0],
};

const listeners = new Set<() => void>();

function notify() {
  snapshot = {
    isPlaying,
    isMuted,
    hasStarted,
    currentIndex,
    trackLabel: TRACK_LABELS[currentIndex] ?? `Track ${currentIndex + 1}`,
  };
  listeners.forEach((l) => l());
}

function ensureAudio() {
  if (audioElements.length > 0) return;
  audioElements = TRACKS.map((src) => {
    const a = new Audio(src);
    a.preload = "auto";
    a.volume = 0;
    return a;
  });
  audioElements.forEach((a, i) => {
    a.addEventListener("ended", () => {
      if (i === currentIndex && isPlaying) {
        nextTrack();
      }
    });
  });
}

function effectiveVolume() {
  return isMuted ? 0 : distanceVolume;
}

function writeVolume(force = false) {
  if (audioElements.length === 0) return;
  const v = effectiveVolume();
  if (!force && Math.abs(v - lastWrittenVolume) < 0.005) return;
  audioElements[currentIndex].volume = v;
  lastWrittenVolume = v;
}

export function play() {
  ensureAudio();
  const a = audioElements[currentIndex];
  writeVolume(true);
  const result = a.play();
  if (result && typeof result.then === "function") {
    result.catch((err) => {
      console.warn("Music playback blocked by browser:", err);
    });
  }
  hasStarted = true;
  isPlaying = true;
  notify();
}

export function pause() {
  if (audioElements.length === 0) return;
  audioElements[currentIndex].pause();
  isPlaying = false;
  notify();
}

export function togglePlay() {
  if (isPlaying) pause();
  else play();
}

export function nextTrack() {
  ensureAudio();
  const wasPlaying = isPlaying;
  const prev = audioElements[currentIndex];
  prev.pause();
  prev.currentTime = 0;
  currentIndex = (currentIndex + 1) % TRACKS.length;
  lastWrittenVolume = -1;
  if (wasPlaying || !hasStarted) {
    play();
  } else {
    notify();
  }
}

export function toggleMute() {
  isMuted = !isMuted;
  writeVolume(true);
  notify();
}

export function setDistanceVolume(v: number) {
  distanceVolume = Math.max(0, Math.min(1, v));
  writeVolume();
}

export function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getSnapshot(): Snapshot {
  return snapshot;
}
