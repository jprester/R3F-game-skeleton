import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { Physics } from "@react-three/rapier";
import Encounter, { HUD, initialHUD } from "./game/Encounter";
import "./game/game.css";

export default function App() {
  const [hud, setHUD] = useState<HUD>(initialHUD);
  const [run, setRun] = useState(0);
  const [error, setError] = useState("");
  const [dragLook, setDragLook] = useState(false);
  const [preferDragLook, setPreferDragLook] = useState(false);
  const audio = useRef<AudioContext | null>(null);
  useEffect(() => () => { if (audio.current) void audio.current.close(); }, []);
  const activateAudio = () => {
    if (!audio.current) audio.current = new AudioContext();
    if (audio.current.state === "suspended") void audio.current.resume();
  };
  const pause = useCallback(() => setDragLook(false), []);
  const updateHUD = useCallback((next: HUD) => setHUD(next), []);
  const start = () => {
    activateAudio();
    if (preferDragLook) {
      setDragLook(true);
      return;
    }
    const canvas = document.querySelector("canvas");
    if (canvas)
      Promise.resolve(canvas.requestPointerLock()).catch(() =>
        setError(
          "Mouse capture is unavailable here. Use drag-look controls below, or open this URL in your browser.",
        ),
      );
  };
  const restart = () => {
    setDragLook(false);
    setHUD(initialHUD);
    setRun((v) => v + 1);
    setError("");
  };
  return (
    <main className="game">
      <Canvas shadows camera={{ fov: 70, near: 0.05, far: 60 }} dpr={[1, 1.75]}>
        <Suspense fallback={null}>
          <Physics
            key={run}
            gravity={[0, -20, 0]}
            paused={(!hud.locked && !dragLook) || hud.status !== "playing"}>
            <Encounter onHUD={updateHUD} dragLook={dragLook} onPause={pause} audio={audio} />
          </Physics>
        </Suspense>
      </Canvas>
      <div className="topbar">
        <div>
          <span className="eyebrow">WAYFARER / FIELD TRIAL 01</span>
          <h1>Quiet entry</h1>
        </div>
        <span className="tag">CORPORATE ANNEX · NIGHT</span>
      </div>
      <section className="mission">
        <span className="eyebrow">
          {hud.carrying ? "02 / EXTRACT" : "01 / RECOVER"}
        </span>
        <p>
          {hud.carrying
            ? "Return to the insertion point"
            : "Retrieve the transit core"}
        </p>
        <small>
          {hud.carrying
            ? "Use E inside the marked circle."
            : "Research chamber · beyond Operations"}
        </small>
      </section>
      {hud.locked && (
        <>
          {hud.pulse && <div key={hud.pulse.id} className={`spell-pulse ${hud.pulse.kind}`} />}
          <div className="crosshair">+</div>
          <div className="target">{hud.target}</div>
          <div className="feedback" role="status">
            {hud.message}
          </div>
          {hud.awareness && (
            <div className="detection">
              <span>
                {hud.alarm > 0
                  ? `ALARM CALL · ${Math.max(0, 3 - hud.alarm).toFixed(1)}s`
                  : hud.awareness}
              </span>
              <div>
                <i
                  style={{
                    width: `${(hud.alarm > 0 ? hud.alarm / 3 : hud.awareness === 'INVESTIGATING LAST CONTACT' ? 1 : hud.suspicion) * 100}%`,
                    background: hud.alarm > 0 ? "#e89380" : hud.awareness === 'INVESTIGATING LAST CONTACT' ? '#a7c7d0' : '#d0c29c',
                  }}
                />
              </div>
            </div>
          )}
        </>
      )}
      <div className="bottom">
        <div className="abilities">
          <div>
            <kbd>LMB</kbd>
            <strong>Motor Lock</strong>
            <span>{hud.motor > 0 ? `${hud.motor.toFixed(1)}s` : "READY"}</span>
          </div>
          <div>
            <kbd>Q</kbd>
            <strong>Blink</strong>
            <span>{hud.blink > 0 ? `${hud.blink.toFixed(1)}s` : "READY"}</span>
          </div>
          <div>
            <kbd>F</kbd>
            <strong>Seeker Crystal</strong>
            <span>{hud.seekerFlying ? "TRACKING" : hud.seeker > 0 ? `${hud.seeker.toFixed(1)}s` : "READY"}</span>
          </div>
        </div>
        <p>
          WASD move · {dragLook ? "Right-drag look" : "Mouse look"} · Shift slow
          · Space jump · E interact · M {hud.muted ? 'unmute' : 'mute'} · Esc pause
        </p>
      </div>
      {!hud.locked && (
        <div className="scrim">
          <section className="briefing">
            <span className="eyebrow">
              {hud.status === "success"
                ? "OPERATION COMPLETE"
                : hud.status === "failed"
                  ? "OPERATION COMPROMISED"
                  : hud.elapsed > 0
                    ? "OPERATION PAUSED"
                    : "INSERTION BRIEF"}
            </span>
            <h2>
              {hud.status === "success"
                ? "Core recovered."
                : hud.status === "failed"
                  ? "Security raised the alarm."
                  : "Minimum intervention."}
            </h2>
            <p>
              {hud.status === "success"
                ? `Extracted in ${Math.floor(hud.elapsed / 60)}m ${Math.floor(hud.elapsed % 60)}s. The annex is behind you.`
                : hud.status === "failed"
                  ? "A guard completed the alarm call. Break sightlines or immobilize them before the call finishes."
                  : "Enter the annex, recover the transit core from Research, and return here. Two guards stand between you and the objective."}
            </p>
            {hud.status === "playing" && (
              <div className="brief-details">
                <p>
                  <b>LMB / Motor Lock</b> Immobilize a visible guard for 6
                  seconds. They remain aware and resume security duties
                  afterward.
                </p>
                <p>
                  <b>Q / Blink</b> Aim down at clear floor within 7 metres. A
                  pale ring confirms a safe arrival.
                </p>
                <p>
                  <b>F / Seeker Crystal</b> Launch at a visible guard within 14
                  metres. It follows them around corners and holds them for 10
                  seconds on impact. Its cooldown is 9 seconds.
                </p>
                <p>
                  <b>Stay out of sight.</b> Use the right-hand service passage
                  or time your crossing. Confirmed contact starts a 3-second
                  alarm call. Guards investigate where they last saw you.
                </p>
              </div>
            )}
            <button onClick={hud.status === "playing" ? start : restart}>
              {hud.status === "playing"
                ? hud.elapsed > 0
                  ? "Resume operation"
                  : "Enter operation"
                : "New attempt"}{" "}
              <span>→</span>
            </button>
            {hud.status === "playing" && hud.elapsed > 0 && (
              <button className="secondary" onClick={restart}>
                Restart encounter
              </button>
            )}
            {error && (
              <>
                <p role="alert">{error}</p>
                <button
                  className="secondary"
                  onClick={() => {
                    activateAudio();
                    setPreferDragLook(true);
                    setDragLook(true);
                    setError("");
                  }}>
                  Use drag-look controls
                </button>
              </>
            )}
            <small className="prototype">
              PLAYABLE BLOCKOUT / TWO GUARDS / THREE ABILITIES
            </small>
          </section>
        </div>
      )}
    </main>
  );
}
