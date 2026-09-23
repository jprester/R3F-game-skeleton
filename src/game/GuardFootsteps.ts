import { Vector3 } from 'three';

/** A short, dry footfall synthesized once and played through a 3D panner. */
export class GuardFootsteps {
  private readonly buffer: AudioBuffer;
  private readonly panners: PannerNode[];
  private step = 0;

  constructor(private readonly context: AudioContext, guardCount: number) {
    const length = Math.ceil(context.sampleRate * .15);
    this.buffer = context.createBuffer(1, length, context.sampleRate);
    const samples = this.buffer.getChannelData(0);
    let noise = 0;
    for (let i = 0; i < length; i++) {
      const t = i / context.sampleRate;
      const decay = Math.pow(1 - i / length, 3);
      noise += ((Math.random() * 2 - 1) - noise) * .17;
      const thump = Math.sin(2 * Math.PI * (88 * t - 230 * t * t));
      samples[i] = (noise * .8 + thump * .55) * decay;
    }
    this.panners = Array.from({ length: guardCount }, () => {
      const panner = context.createPanner();
      panner.panningModel = 'HRTF';
      panner.distanceModel = 'inverse';
      panner.refDistance = 3;
      panner.maxDistance = 35;
      panner.rolloffFactor = .65;
      panner.connect(context.destination);
      return panner;
    });
  }

  updateListener(position: Vector3, forward: Vector3) {
    const listener = this.context.listener;
    listener.positionX.value = position.x;
    listener.positionY.value = position.y;
    listener.positionZ.value = position.z;
    listener.forwardX.value = forward.x;
    listener.forwardY.value = forward.y;
    listener.forwardZ.value = forward.z;
    listener.upX.value = 0;
    listener.upY.value = 1;
    listener.upZ.value = 0;
  }

  play(guardIndex: number, position: Vector3, throughWall: boolean) {
    if (this.context.state !== 'running') return;
    const panner = this.panners[guardIndex];
    if (!panner) return;
    panner.positionX.value = position.x;
    panner.positionY.value = .1;
    panner.positionZ.value = position.z;

    const source = this.context.createBufferSource();
    const filter = this.context.createBiquadFilter();
    const gain = this.context.createGain();
    source.buffer = this.buffer;
    source.playbackRate.value = this.step++ % 2 === 0 ? 1 : .91;
    filter.type = 'lowpass';
    filter.frequency.value = throughWall ? 800 : 2400;
    gain.gain.value = throughWall ? .13 : .24;
    source.connect(filter).connect(gain).connect(panner);
    source.onended = () => {
      source.disconnect(); filter.disconnect(); gain.disconnect();
    };
    source.start();
  }

  dispose() { this.panners.forEach(panner => panner.disconnect()); }
}
