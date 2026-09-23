import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { Physics } from "@react-three/rapier";
import Encounter, { HUD, initialHUD } from "./game/Encounter";
import { LIFE_SENSE_COOLDOWN, LIFE_SENSE_DURATION, LIFE_SENSE_RANGE, PLAYER_MAX_HEALTH, RADIO_CALL_TIME, SHOT_WINDUP, VEIL_BREAK_RANGE, VEIL_COOLDOWN, VEIL_DURATION, WARY_DURATION } from "./game/mechanics";
import { CAMERA_DETECTION_TIME } from "./game/camera";
import type { Threat } from "./game/awareness";
import { SPELLS, type SpellId } from "./game/spells";
import { formatTime, isBetterRun, rateOperation, RATINGS, type BestRun, type OperationStats } from "./game/debrief";

/** Personal bests live in this browser only; storage can be unavailable, so every access is guarded. */
const bestKey = (level: Level) => `wayfarer.best.${level.id}`;
function readBest(level: Level): BestRun | null {
  try { return JSON.parse(localStorage.getItem(bestKey(level)) ?? "null"); } catch { return null; }
}
function writeBest(level: Level, run: BestRun) {
  try { localStorage.setItem(bestKey(level), JSON.stringify(run)); } catch { /* best is a convenience only */ }
}

function Debrief({ hud, previous, newBest }: { hud: HUD; previous: BestRun | null; newBest: boolean }) {
  const stats: OperationStats = hud.stats;
  const rating = hud.status === "success" ? rateOperation(stats) : null;
  const casts = Object.values(stats.casts).reduce((sum, n) => sum + n, 0);
  const SPELL_NAMES = { motor: "lock", blink: "blink", seeker: "seeker", lure: "lure", sense: "sense" } as const;
  const used = (Object.keys(SPELL_NAMES) as (keyof typeof SPELL_NAMES)[]).filter(kind => stats.casts[kind] > 0)
    .map(kind => `${SPELL_NAMES[kind]} ${stats.casts[kind]}`);
  const rows: [string, string | number][] = [
    ["Time", formatTime(hud.elapsed)],
    ["Times spotted", stats.spotted],
    ["Times noticed", stats.noticed],
    ["Radio reports", stats.reports],
    ["Camera flags", stats.cameraFlags],
    ["Calls cut off", stats.callsCutOff],
    ["Hits taken", stats.hitsTaken],
    ["Restraints", stats.restraints],
    ["Spells cast", [casts, ...used].join(" · ")],
  ];
  return (
    <div className="debrief">
      {rating && (
        <div className={`rating ${rating}`}>
          <strong>{RATINGS[rating].title}</strong>
          <span>{RATINGS[rating].summary}</span>
        </div>
      )}
      <dl>{rows.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>
      <p className="best">
        {newBest ? "New personal best."
          : previous ? `Personal best: ${RATINGS[previous.rating].title} · ${formatTime(previous.elapsed)}`
          : "No completed run on this level yet."}
      </p>
    </div>
  );
}
import { ANNEX_LEVEL, DEMO_LEVEL, type Level } from "./game/levels";
import "./game/game.css";

/** Ability bar status: an ongoing effect first, then the cooldown. */
function spellStatus(hud: HUD, id: SpellId) {
  if (id === "seeker" && hud.seekerFlying) return "TRACKING";
  if (id === "sense" && hud.senseActive > 0) return "SENSING";
  if (id === "veil" && hud.veiled > 0) return `VEILED ${hud.veiled.toFixed(1)}s`;
  return hud.cooldowns[id] > 0 ? `${hud.cooldowns[id].toFixed(1)}s` : "READY";
}

/** An arc of the indicator ring, centred on `angle` (0 = ahead, clockwise positive). */
const THREAT_RADIUS = 200;
const THREAT_SPAN = .2;
function threatArc(angle: number) {
  const point = (a: number) => `${(THREAT_RADIUS * Math.sin(a)).toFixed(1)} ${(-THREAT_RADIUS * Math.cos(a)).toFixed(1)}`;
  return `M ${point(angle - THREAT_SPAN)} A ${THREAT_RADIUS} ${THREAT_RADIUS} 0 0 1 ${point(angle + THREAT_SPAN)}`;
}
function ThreatRing({ threats }: { threats: Threat[] }) {
  if (threats.length === 0) return null;
  return (
    <svg className="threats" viewBox="-250 -250 500 500" aria-hidden="true">
      {threats.map(threat => <path key={threat.id} d={threatArc(threat.angle)} className={threat.state} style={{ opacity: .3 + .7 * threat.level }} />)}
    </svg>
  );
}

/** The single awareness meter shows the most urgent threat, its countdown and fill. */
function detectionMeter(hud: HUD) {
  if (hud.alarm > 0) return { label: `ALARM CALL · ${Math.max(0, 3 - hud.alarm).toFixed(1)}s`, fill: hud.alarm / 3, color: "#e89380" };
  if (hud.workerMode === "calling") return { label: `WORKER REPORT · ${Math.max(0, 4 - hud.workerReport).toFixed(1)}s`, fill: hud.workerReport / 4, color: "#e89380" };
  if (hud.radioReason) return { label: `${hud.awareness} · ${(RADIO_CALL_TIME * (1 - hud.radio)).toFixed(1)}s`, fill: hud.radio, color: "#e0ae78" };
  if (hud.workerMode === "fleeing" || hud.awareness.startsWith("INVESTIGATING")) return { label: hud.awareness, fill: 1, color: "#a7c7d0" };
  if (hud.awareness === "SECURITY WARY") return { label: `SECURITY WARY · ${Math.ceil(hud.wary)}s`, fill: hud.wary / WARY_DURATION, color: "#71909b" };
  return { label: hud.awareness, fill: hud.suspicion, color: "#d0c29c" };
}

export default function App() {
  const [hud, setHUD] = useState<HUD>(initialHUD);
  const [run, setRun] = useState(0);
  const [level, setLevel] = useState<Level>(ANNEX_LEVEL);
  const [best, setBest] = useState<{ previous: BestRun | null; newBest: boolean }>({ previous: null, newBest: false });
  const recordedRun = useRef(-1);
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
  // Record the outcome once per attempt: compare against the stored best before overwriting it.
  useEffect(() => {
    if (hud.status === "playing" || recordedRun.current === run) return;
    recordedRun.current = run;
    const previous = readBest(level);
    if (hud.status !== "success") { setBest({ previous, newBest: false }); return; }
    const attempt: BestRun = { rating: rateOperation(hud.stats), elapsed: hud.elapsed };
    const newBest = isBetterRun(attempt, previous);
    if (newBest) writeBest(level, attempt);
    setBest({ previous, newBest });
  }, [hud.status, hud.stats, hud.elapsed, level, run]);
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
        {/* Four segments match the four body points observers check: head, shoulders, torso. */}
        <div className={`visibility ${hud.exposure === 0 ? "unseen" : hud.exposure < 1 ? "partial" : "seen"}`}>
          <span className="eyebrow">{hud.crouched ? "CROUCHED" : "STANDING"} · {hud.veiled > 0 ? "VEILED" : hud.exposure === 0 ? "UNSEEN" : hud.exposure < 1 ? "PARTLY SEEN" : "SEEN"}</span>
          <div>{[0, 1, 2, 3].map(index => <b key={index} className={index < Math.round(hud.exposure * 4) ? "lit" : ""} />)}</div>
        </div>
      </div>
      {hud.locked && (
        <>
          {hud.veiled > 0 && <div className="veil-overlay" style={{ opacity: Math.min(1, hud.veiled / .6) }} />}
          {hud.pulse && <div key={hud.pulse.id} className={`spell-pulse ${hud.pulse.kind}`} />}
          <ThreatRing threats={hud.threats} />
          <div className="crosshair">+</div>
          {hud.restrain > 0 && <div className="restrain" aria-label="Restraint progress"><i style={{ width: `${hud.restrain * 100}%` }} /></div>}
          <div className="target">{hud.target}</div>
          <div className="feedback" role="status">
            {hud.message}
          </div>
          {hud.shotWindup > 0 && <div className="incoming">ARMED GUARD AIMING · {(SHOT_WINDUP - hud.shotWindup).toFixed(1)}s</div>}
          {hud.awareness && (() => {
            const meter = detectionMeter(hud);
            return (
              <div className="detection">
                <span>{meter.label}</span>
                <div><i style={{ width: `${meter.fill * 100}%`, background: meter.color }} /></div>
              </div>
            );
          })()}
        </>
      )}
      <div className="bottom">
        <div className="abilities">
          {SPELLS.map(spell => (
            <div key={spell.id}>
              <kbd>{spell.key}</kbd>
              <strong>{spell.name}</strong>
              <span>{spellStatus(hud, spell.id)}</span>
            </div>
          ))}
        </div>
        <p>
          WASD move · {dragLook ? "Right-drag look" : "Mouse look"} · Shift quiet
          · C crouch · V sense · X veil · Space jump · E interact · M {hud.muted ? 'unmute' : 'mute'} · Esc pause
        </p>
      </div>
      {!hud.locked && (
        <div className="scrim">
          <section className="briefing">
            <span className="eyebrow">
              {hud.status === "success"
                ? "OPERATION COMPLETE"
                : hud.status === "failed"
                  ? "OPERATION FAILED"
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
                ? "The annex is behind you. Debrief:"
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
            {hud.status !== "playing" && <Debrief hud={hud} previous={best.previous} newBest={best.newBest} />}
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
                  for 6 seconds. They resume their behavior afterward, and a
                  guard who recovers unreported radios that he was attacked.
                </p>
                <p>
                  <b>Hold E / Restraint</b> Get within reach of an immobilized
                  target and hold E for 1.5 seconds to bind them for the rest of
                  the operation. Guards who find a bound body still report it.
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
                  <b>V / Life Sense</b> Reveal everyone within {LIFE_SENSE_RANGE} metres
                  through walls for {LIFE_SENSE_DURATION} seconds, with where they are
                  looking: the bright cone is where they spot you fastest. Cooldown:{" "}
                  {LIFE_SENSE_COOLDOWN} seconds.
                </p>
                <p>
                  <b>X / Veil</b> For {VEIL_DURATION} seconds, guards, the worker and
                  cameras overlook you. Anyone who can see you within{" "}
                  {VEIL_BREAK_RANGE} metres notices and breaks it, and casting another
                  spell drops it. Cooldown: {VEIL_COOLDOWN} seconds.
                </p>
                <p>
                  <b>Security cameras</b> Sweep a narrow cone, drawn on the floor, and
                  see over low cover from the ceiling. {CAMERA_DETECTION_TIME} seconds in
                  view flags you: no alarm, but the nearest guard comes to check and
                  security turns wary.
                </p>
                <p>
                  <b>Awareness arcs</b> Arcs around the crosshair point to anyone
                  noticing you: amber suspicious, blue investigating, orange on the
                  radio, red alert. Brighter means closer to acting.
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
