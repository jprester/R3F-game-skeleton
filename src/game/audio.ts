import type { Vector3 } from 'three';

/** Short synthesized interface and event cues: start and end pitch (Hz), duration (s), peak volume. */
const CUES = {
  notice: [390, 495, .16, .025], alert: [280, 185, .32, .045],
  motor: [560, 230, .22, .055], blink: [155, 410, .24, .06],
  core: [330, 660, .42, .035], seeker: [720, 340, .3, .04],
  panic: [480, 760, .3, .04], report: [680, 520, .35, .05], aim: [350, 490, .21, .035],
  radio: [1250, 1180, .12, .018], radioDone: [900, 620, .26, .03], restrain: [300, 120, .5, .06], sense: [200, 95, .7, .045],
} as const;
export type CueKind = keyof typeof CUES;

export function playCue(context: AudioContext, kind: CueKind) {
  const now = context.currentTime;
  const [start, end, duration, volume] = CUES[kind];
  const oscillator = context.createOscillator();
  const gain = context.createGain();
  oscillator.type = kind === 'alert' ? 'sawtooth' : kind.startsWith('radio') ? 'square' : 'sine';
  oscillator.frequency.setValueAtTime(start, now);
  oscillator.frequency.exponentialRampToValueAtTime(end, now + duration);
  gain.gain.setValueAtTime(.0001, now);
  gain.gain.exponentialRampToValueAtTime(volume, now + .025);
  gain.gain.exponentialRampToValueAtTime(.0001, now + duration);
  oscillator.connect(gain).connect(context.destination);
  oscillator.start(now); oscillator.stop(now + duration + .02);
}

function positional(context: AudioContext, point: Vector3, height: number, refDistance: number, maxDistance: number, rolloff: number) {
  const now = context.currentTime;
  const panner = context.createPanner();
  panner.panningModel = 'HRTF';
  panner.distanceModel = 'inverse';
  panner.refDistance = refDistance;
  panner.maxDistance = maxDistance;
  panner.rolloffFactor = rolloff;
  panner.positionX.setValueAtTime(point.x, now);
  panner.positionY.setValueAtTime(height, now);
  panner.positionZ.setValueAtTime(point.z, now);
  return panner;
}

/** The Echo Lure's projected sound, placed where guards will hear it. */
export function playLure(context: AudioContext, point: Vector3) {
  const now = context.currentTime;
  const oscillator = context.createOscillator();
  const gain = context.createGain();
  oscillator.type = 'triangle';
  oscillator.frequency.setValueAtTime(680, now);
  oscillator.frequency.exponentialRampToValueAtTime(270, now + .36);
  gain.gain.setValueAtTime(.0001, now);
  gain.gain.exponentialRampToValueAtTime(.075, now + .02);
  gain.gain.exponentialRampToValueAtTime(.0001, now + .42);
  oscillator.connect(gain).connect(positional(context, point, .7, 3, 22, .65)).connect(context.destination);
  oscillator.start(now); oscillator.stop(now + .44);
}

/** A guard's shot: a short high-passed noise burst from the shooter's position. */
export function playShot(context: AudioContext, point: Vector3) {
  const now = context.currentTime;
  const length = Math.floor(context.sampleRate * .14);
  const buffer = context.createBuffer(1, length, context.sampleRate);
  const samples = buffer.getChannelData(0);
  for (let i = 0; i < length; i++) samples[i] = (Math.random() * 2 - 1) * (1 - i / length);
  const source = context.createBufferSource();
  source.buffer = buffer;
  const filter = context.createBiquadFilter();
  filter.type = 'highpass'; filter.frequency.value = 220;
  const gain = context.createGain();
  gain.gain.setValueAtTime(.08, now);
  gain.gain.exponentialRampToValueAtTime(.0001, now + .14);
  source.connect(filter).connect(gain).connect(positional(context, point, 1.4, 4, 25, .7)).connect(context.destination);
  source.start(now); source.stop(now + .14);
}
