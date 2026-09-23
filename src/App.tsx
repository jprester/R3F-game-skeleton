import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { Physics } from "@react-three/rapier";
import Encounter, { HUD, initialHUD } from "./game/Encounter";
import { PLAYER_MAX_HEALTH, SHOT_WINDUP } from "./game/mechanics";
import { ANNEX_LEVEL, DEMO_LEVEL, type Level } from "./game/levels";
import "./game/game.css";

export default function App() {
  const [hud, setHUD] = useState<HUD>(initialHUD);
  const [run, setRun] = useState(0);
  const [level, setLevel] = useState<Level>(ANNEX_LEVEL);
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
  const chooseLevel = (next: Level) => {
    if (next === level) return;
    setLevel(next);
    restart();
  };
  return (
    <main className="game">
      <Canvas shadows camera={{ fov: 70, near: 0.05, far: 60 }} dpr={[1, 1.75]}>
        <Suspense fallback={null}>
          <Physics
            key={`${level.id}-${run}`}
            gravity={[0, -20, 0]}
            paused={(!hud.locked && !dragLook) || hud.status !== "playing"}>
            <Encounter onHUD={updateHUD} dragLook={dragLook} onPause={pause} audio={audio} level={level} />
          </Physics>
        </Suspense>
      </Canvas>
      <div className="topbar">
        <div>
          <span className="eyebrow">WAYFARER / {level.id === 'demo' ? 'FIELD TRIAL 01' : 'OPERATION 01'}</span>
          <h1>{level.name}</h1>
        </div>
        <span className="tag">{level.subtitle}</span>
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
            : level.id === 'demo' ? "Research chamber · beyond Operations" : "Vault · beyond the records wing"}
        </small>
      </section>
      <div className="health" aria-label={`Vitality ${hud.health} of ${PLAYER_MAX_HEALTH}`}>
        <span className="eyebrow">VITALITY</span>
        <div>{Array.from({ length: PLAYER_MAX_HEALTH }, (_, index) => <i key={index} className={index < hud.health ? "full" : ""} />)}</div>
      </div>
      {hud.locked && (
        <>
          {hud.pulse && <div key={hud.pulse.id} className={`spell-pulse ${hud.pulse.kind}`} />}
          <div className="crosshair">+</div>
          <div className="target">{hud.target}</div>
          <div className="feedback" role="status">
            {hud.message}
          </div>
          {hud.shotWindup > 0 && <div className="incoming">ARMED GUARD AIMING · {(SHOT_WINDUP - hud.shotWindup).toFixed(1)}s</div>}
          {hud.awareness && (
            <div className="detection">
              <span>
                {hud.alarm > 0
                  ? `ALARM CALL · ${Math.max(0, 3 - hud.alarm).toFixed(1)}s`
                  : hud.workerMode === 'calling'
                    ? `WORKER REPORT · ${Math.max(0, 4 - hud.workerReport).toFixed(1)}s`
                  : hud.awareness}
              </span>
              <div>
                <i
                  style={{
                    width: `${(hud.alarm > 0 ? hud.alarm / 3 : hud.workerMode === 'calling' ? hud.workerReport / 4 : hud.workerMode === 'fleeing' || hud.awareness.startsWith('INVESTIGATING') ? 1 : hud.suspicion) * 100}%`,
                    background: hud.alarm > 0 || hud.workerMode === 'calling' ? "#e89380" : hud.awareness.startsWith('INVESTIGATING') ? '#a7c7d0' : '#d0c29c',
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
          <div>
            <kbd>R</kbd>
            <strong>Echo Lure</strong>
            <span>{hud.lure > 0 ? `${hud.lure.toFixed(1)}s` : "READY"}</span>
          </div>
        </div>
        <p>
          WASD move · {dragLook ? "Right-drag look" : "Mouse look"} · Shift quiet
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
                  ? hud.failureReason === 'worker' ? "The worker reached the alarm." : hud.failureReason === 'shot' ? "You were hit by guard fire." : hud.failureReason === 'fall' ? "Arrival lost." : "Security raised the alarm."
                  : "Minimum intervention."}
            </h2>
            <p>
              {hud.status === "success"
                ? `Extracted in ${Math.floor(hud.elapsed / 60)}m ${Math.floor(hud.elapsed % 60)}s. The annex is behind you.`
                : hud.status === "failed"
                  ? hud.failureReason === 'worker'
                    ? "The office worker completed a report at the Research alarm panel. Immobilize them or leave before the countdown ends."
                    : hud.failureReason === 'shot'
                      ? "The armed guard had a clear shot. Break sight before they fire, Blink behind cover, or immobilize them."
                      : hud.failureReason === 'fall'
                        ? "The arrival point was lost. Choose clear floor before using Blink."
                        : "A guard completed an alarm call. Break sightlines or immobilize them before the call finishes."
                  : level.id === 'demo'
                    ? "Enter the test office, recover the transit core from Research, and return here. Two guards and an office worker stand between you and the objective."
                    : "Enter the records wing, take the direct security route on the left or the longer covered service route on the right, recover the core from the vault, and return here. Armed guards hold the left; alarm guards patrol the right."}
            </p>
            <div className="level-picker" aria-label="Select level">
              <button className={level.id === 'annex' ? 'selected' : ''} onClick={() => chooseLevel(ANNEX_LEVEL)}>Records wing <small>Mission</small></button>
              <button className={level.id === 'demo' ? 'selected' : ''} onClick={() => chooseLevel(DEMO_LEVEL)}>Quiet entry <small>Mechanics demo</small></button>
            </div>
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
            {hud.status === "playing" && (
              <div className="brief-details">
                <p>
                  <b>LMB / Motor Lock</b> Immobilize a visible guard or worker
                  for 6 seconds. They resume their behavior afterward.
                </p>
                <p>
                  <b>Q / Blink</b> Aim down at clear floor within 7 metres. A
                  pale ring confirms a safe arrival.
                </p>
                <p>
                  <b>F / Seeker Crystal</b> Launch at a visible guard or worker
                  within 14 metres. It follows them around corners and holds them for 10
                  seconds on impact. Its cooldown is 9 seconds.
                </p>
                <p>
                  <b>R / Echo Lure</b> Aim at clear floor within 12 metres to
                  place a sound that draws nearby guards to investigate. The
                  amber ring marks valid placement. Cooldown: 8 seconds.
                </p>
                <p>
                  <b>Office worker</b> Unarmed. If they recognize you, they run
                  to the marked alarm panel and need 4 seconds to
                  report. Motor Lock or Seeker Crystal interrupts the report.
                </p>
                <p>
                  <b>Armed security</b> Armed guards fire after confirmed sight.
                  Their aiming cue gives you time to break sight, Blink behind
                  cover, or immobilize them. Three hits end the attempt.
                </p>
                <p>
                  <b>Stay out of sight.</b> Use the side routes or time your crossing. The alarm guards need 3 seconds to
                  complete a call. Guards investigate where they last saw you or
                  heard your footsteps. Hold Shift to move quietly.
                </p>
              </div>
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
              PLAYABLE BLOCKOUT / {level.guards.filter(guard => guard.armed).length} ARMED / {level.guards.filter(guard => !guard.armed).length} ALARM GUARDS / ONE WORKER
            </small>
          </section>
        </div>
      )}
    </main>
  );
}
