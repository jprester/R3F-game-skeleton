import {
  createContext,
  useContext,
  useRef,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from "react";
import { useThree } from "@react-three/fiber";
import { AudioListener, Audio, AudioLoader } from "three";

// Footstep sound files
const FOOTSTEP_SOUNDS = [
  "/sounds/footsteps/217964__otakua__shoeswalkcarpet05.wav",
];

// Ambient sound files
const AMBIENT_SOUNDS = {
  ventilator:
    "/sounds/ambient/646564__garuda1982__small-ventilator-raspy-hum-geofon-contactmic.mp3",
};

interface AudioContextType {
  playFootstep: () => void;
  stopFootsteps: () => void;
  setMasterVolume: (volume: number) => void;
  masterVolume: number;
  isMuted: boolean;
  toggleMute: () => void;
  isAudioReady: boolean;
}

const AudioContext = createContext<AudioContextType | null>(null);

export function useAudio() {
  const context = useContext(AudioContext);
  if (!context) {
    throw new Error("useAudio must be used within an AudioProvider");
  }
  return context;
}

interface AudioProviderProps {
  children: ReactNode;
  isMuted?: boolean;
  masterVolume?: number;
}

export function AudioProvider({
  children,
  isMuted: externalMuted = false,
  masterVolume: externalVolume = 0.5,
}: AudioProviderProps) {
  const { camera } = useThree();
  const listenerRef = useRef<AudioListener | null>(null);
  const footstepSoundsRef = useRef<Audio[]>([]);
  const ambientSoundsRef = useRef<Audio[]>([]);
  const [isAudioReady, setIsAudioReady] = useState(false);
  const lastFootstepIndex = useRef(0);

  // Initialize audio listener and load sounds
  useEffect(() => {
    const listener = new AudioListener();
    listenerRef.current = listener;
    camera.add(listener);

    const audioLoader = new AudioLoader();
    let mounted = true;

    // Load footstep sounds
    const loadFootsteps = FOOTSTEP_SOUNDS.map(
      (url) =>
        new Promise<Audio>((resolve) => {
          const sound = new Audio(listener);
          audioLoader.load(url, (buffer) => {
            if (mounted) {
              sound.setBuffer(buffer);
              sound.setVolume(0.4);
              resolve(sound);
            }
          });
        })
    );

    // Load ambient sounds
    const loadAmbient = Object.values(AMBIENT_SOUNDS).map(
      (url, index) =>
        new Promise<Audio>((resolve) => {
          const sound = new Audio(listener);
          audioLoader.load(url, (buffer) => {
            if (mounted) {
              sound.setBuffer(buffer);
              sound.setLoop(true);
              // Electric hum quieter, ventilator slightly louder
              sound.setVolume(index === 0 ? 0.05 : 0.06);
              resolve(sound);
            }
          });
        })
    );

    Promise.all([...loadFootsteps, ...loadAmbient]).then((sounds) => {
      if (mounted) {
        footstepSoundsRef.current = sounds.slice(0, FOOTSTEP_SOUNDS.length);
        ambientSoundsRef.current = sounds.slice(FOOTSTEP_SOUNDS.length);
        setIsAudioReady(true);
      }
    });

    return () => {
      mounted = false;
      camera.remove(listener);
      // Stop and cleanup all sounds
      footstepSoundsRef.current.forEach((sound) => {
        if (sound.isPlaying) sound.stop();
      });
      ambientSoundsRef.current.forEach((sound) => {
        if (sound.isPlaying) sound.stop();
      });
    };
  }, [camera]);

  // Start ambient sounds when audio context is unlocked (user interaction)
  useEffect(() => {
    if (!isAudioReady) return;

    const startAmbient = () => {
      // Resume audio context if suspended
      const context = listenerRef.current?.context;
      if (context && context.state === "suspended") {
        context.resume();
      }

      // Start ambient sounds
      ambientSoundsRef.current.forEach((sound) => {
        if (!sound.isPlaying && !externalMuted) {
          sound.play();
        }
      });
    };

    // Start on pointer lock (game start)
    const handlePointerLockChange = () => {
      if (document.pointerLockElement) {
        startAmbient();
      }
    };

    document.addEventListener("pointerlockchange", handlePointerLockChange);

    return () => {
      document.removeEventListener(
        "pointerlockchange",
        handlePointerLockChange
      );
    };
  }, [isAudioReady, externalMuted]);

  // Handle mute/unmute
  useEffect(() => {
    if (!isAudioReady) return;

    ambientSoundsRef.current.forEach((sound) => {
      if (externalMuted && sound.isPlaying) {
        sound.pause();
      } else if (
        !externalMuted &&
        !sound.isPlaying &&
        document.pointerLockElement
      ) {
        sound.play();
      }
    });
  }, [externalMuted, isAudioReady]);

  // Update master volume
  useEffect(() => {
    if (listenerRef.current) {
      listenerRef.current.setMasterVolume(externalMuted ? 0 : externalVolume);
    }
  }, [externalVolume, externalMuted]);

  const playFootstep = useCallback(() => {
    if (!isAudioReady || externalMuted) return;

    const sounds = footstepSoundsRef.current;
    if (sounds.length === 0) return;

    // Alternate between footstep sounds for variety
    const index = lastFootstepIndex.current % sounds.length;
    const sound = sounds[index];

    if (!sound.isPlaying) {
      sound.play();
      lastFootstepIndex.current++;
    }
  }, [isAudioReady, externalMuted]);

  const stopFootsteps = useCallback(() => {
    footstepSoundsRef.current.forEach((sound) => {
      if (sound.isPlaying) {
        sound.stop();
      }
    });
  }, []);

  // These are kept for context compatibility but use external state
  const setMasterVolume = useCallback(() => {}, []);
  const toggleMute = useCallback(() => {}, []);

  return (
    <AudioContext.Provider
      value={{
        playFootstep,
        stopFootsteps,
        setMasterVolume,
        masterVolume: externalVolume,
        isMuted: externalMuted,
        toggleMute,
        isAudioReady,
      }}>
      {children}
    </AudioContext.Provider>
  );
}
