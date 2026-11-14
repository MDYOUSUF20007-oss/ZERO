/**
 * Procedural Offline Focus Audio Synthesizer for The Void
 * Generates pure soundscapes using the Web Audio API without any external audio files.
 * 100% offline, zero network requests, zero bundle weight.
 */

export type FocusSoundTrack = 'none' | 'gamma40' | 'rain' | 'ocean' | 'brownian';

export interface SoundTrackInfo {
  id: FocusSoundTrack;
  name: string;
  emoji: string;
  description: string;
}

export const FOCUS_SOUND_TRACKS: SoundTrackInfo[] = [
  {
    id: 'none',
    name: 'Silent Void',
    emoji: '🔇',
    description: 'Pure silence for absolute stillness.',
  },
  {
    id: 'gamma40',
    name: '40Hz Gamma',
    emoji: '🧠',
    description: 'Binaural beats scientifically tuned for deep cognitive focus.',
  },
  {
    id: 'rain',
    name: 'Rain & Mist',
    emoji: '🌧️',
    description: 'Procedural rainfall masking background disturbances.',
  },
  {
    id: 'ocean',
    name: 'Ocean Waves',
    emoji: '🌊',
    description: 'Rhythmic oceanic surge for calm, steady work.',
  },
  {
    id: 'brownian',
    name: 'Brown Noise',
    emoji: '📻',
    description: 'Deep warm low-frequency acoustic curtain.',
  },
];

class VoidAudioSynthesizer {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private currentTrack: FocusSoundTrack = 'none';
  private activeNodes: Array<{ stop?: () => void; disconnect: () => void }> = [];
  private volume: number = 0.5;

  private initContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return null;
      this.ctx = new AudioCtx();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(this.volume, this.ctx.currentTime);
      this.masterGain.connect(this.ctx.destination);
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  public setVolume(vol: number): void {
    this.volume = Math.max(0, Math.min(1, vol));
    if (this.ctx && this.masterGain) {
      this.masterGain.gain.setTargetAtTime(this.volume, this.ctx.currentTime, 0.05);
    }
  }

  public getVolume(): number {
    return this.volume;
  }

  public getCurrentTrack(): FocusSoundTrack {
    return this.currentTrack;
  }

  public stop(): void {
    if (this.ctx && this.masterGain) {
      // Smooth fade out
      this.masterGain.gain.setTargetAtTime(0.001, this.ctx.currentTime, 0.08);
    }
    setTimeout(() => {
      this.cleanupNodes();
      this.currentTrack = 'none';
      if (this.ctx && this.masterGain) {
        this.masterGain.gain.setValueAtTime(this.volume, this.ctx.currentTime);
      }
    }, 120);
  }

  private cleanupNodes(): void {
    for (const node of this.activeNodes) {
      try {
        node.stop?.();
      } catch {}
      try {
        node.disconnect();
      } catch {}
    }
    this.activeNodes = [];
  }

  public play(track: FocusSoundTrack): void {
    if (track === 'none') {
      this.stop();
      return;
    }

    const ctx = this.initContext();
    if (!ctx || !this.masterGain) return;

    this.cleanupNodes();
    this.currentTrack = track;

    // Reset master gain
    this.masterGain.gain.setValueAtTime(this.volume, ctx.currentTime);

    switch (track) {
      case 'gamma40':
        this.startGammaBinaural(ctx);
        break;
      case 'rain':
        this.startRain(ctx);
        break;
      case 'ocean':
        this.startOcean(ctx);
        break;
      case 'brownian':
        this.startBrownNoise(ctx);
        break;
    }
  }

  /**
   * 40Hz Gamma Focus Binaural Beats:
   * Left: 216Hz, Right: 256Hz -> Difference is 40Hz gamma brainwave frequency.
   */
  private startGammaBinaural(ctx: AudioContext): void {
    if (!this.masterGain) return;

    const baseFreq = 216; // Carrier
    const diff = 40; // 40Hz Gamma

    // Left Channel
    const oscL = ctx.createOscillator();
    oscL.type = 'sine';
    oscL.frequency.setValueAtTime(baseFreq, ctx.currentTime);

    const panL = ctx.createStereoPanner ? ctx.createStereoPanner() : null;
    if (panL) panL.pan.setValueAtTime(-1, ctx.currentTime);

    const gainL = ctx.createGain();
    gainL.gain.setValueAtTime(0.25, ctx.currentTime);

    // Right Channel
    const oscR = ctx.createOscillator();
    oscR.type = 'sine';
    oscR.frequency.setValueAtTime(baseFreq + diff, ctx.currentTime);

    const panR = ctx.createStereoPanner ? ctx.createStereoPanner() : null;
    if (panR) panR.pan.setValueAtTime(1, ctx.currentTime);

    const gainR = ctx.createGain();
    gainR.gain.setValueAtTime(0.25, ctx.currentTime);

    // Warm undertone harmonic (54Hz subtle drone for grounding)
    const drone = ctx.createOscillator();
    drone.type = 'triangle';
    drone.frequency.setValueAtTime(54, ctx.currentTime);
    const droneGain = ctx.createGain();
    droneGain.gain.setValueAtTime(0.08, ctx.currentTime);

    if (panL && panR) {
      oscL.connect(gainL);
      gainL.connect(panL);
      panL.connect(this.masterGain);

      oscR.connect(gainR);
      gainR.connect(panR);
      panR.connect(this.masterGain);
    } else {
      oscL.connect(gainL);
      gainL.connect(this.masterGain);

      oscR.connect(gainR);
      gainR.connect(this.masterGain);
    }
    drone.connect(droneGain).connect(this.masterGain);

    oscL.start();
    oscR.start();
    drone.start();

    this.activeNodes.push(
      { stop: () => oscL.stop(), disconnect: () => oscL.disconnect() },
      { stop: () => oscR.stop(), disconnect: () => oscR.disconnect() },
      { stop: () => drone.stop(), disconnect: () => drone.disconnect() },
      gainL,
      gainR,
      droneGain
    );
  }

  /**
   * Procedural Brown Noise (Deep focus mask)
   */
  private startBrownNoise(ctx: AudioContext): void {
    if (!this.masterGain) return;

    const bufferSize = ctx.sampleRate * 4;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    let lastOut = 0.0;

    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      data[i] = (lastOut + 0.02 * white) / 1.02;
      lastOut = data[i];
      data[i] *= 3.5; // Compensate gain
    }

    const noise = ctx.createBufferSource();
    noise.buffer = buffer;
    noise.loop = true;

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(450, ctx.currentTime);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.45, ctx.currentTime);

    noise.connect(filter).connect(gain).connect(this.masterGain);
    noise.start();

    this.activeNodes.push(
      { stop: () => noise.stop(), disconnect: () => noise.disconnect() },
      filter,
      gain
    );
  }

  /**
   * Procedural Rain & Mist
   */
  private startRain(ctx: AudioContext): void {
    if (!this.masterGain) return;

    const bufferSize = ctx.sampleRate * 3;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = ctx.createBufferSource();
    noise.buffer = buffer;
    noise.loop = true;

    // Highpass to eliminate harsh low hum
    const hp = ctx.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.setValueAtTime(300, ctx.currentTime);

    // Lowpass to give soft patter
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.setValueAtTime(1400, ctx.currentTime);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.35, ctx.currentTime);

    noise.connect(hp).connect(lp).connect(gain).connect(this.masterGain);
    noise.start();

    this.activeNodes.push(
      { stop: () => noise.stop(), disconnect: () => noise.disconnect() },
      hp,
      lp,
      gain
    );
  }

  /**
   * Procedural Ocean Waves (Surge & Ebb)
   */
  private startOcean(ctx: AudioContext): void {
    if (!this.masterGain) return;

    const bufferSize = ctx.sampleRate * 4;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    let lastOut = 0.0;

    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      data[i] = (lastOut + 0.02 * white) / 1.02;
      lastOut = data[i];
      data[i] *= 3.0;
    }

    const noise = ctx.createBufferSource();
    noise.buffer = buffer;
    noise.loop = true;

    // Swept lowpass filter modulated by LFO
    const sweepFilter = ctx.createBiquadFilter();
    sweepFilter.type = 'lowpass';
    sweepFilter.frequency.setValueAtTime(250, ctx.currentTime);

    // LFO to oscillate wave surge (~0.12 Hz = 8.3s cycle)
    const lfo = ctx.createOscillator();
    lfo.type = 'sine';
    lfo.frequency.setValueAtTime(0.12, ctx.currentTime);

    const lfoGain = ctx.createGain();
    lfoGain.gain.setValueAtTime(220, ctx.currentTime); // Filter cutoff modulation depth

    lfo.connect(lfoGain).connect(sweepFilter.frequency);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.4, ctx.currentTime);

    noise.connect(sweepFilter).connect(gain).connect(this.masterGain);

    noise.start();
    lfo.start();

    this.activeNodes.push(
      { stop: () => noise.stop(), disconnect: () => noise.disconnect() },
      { stop: () => lfo.stop(), disconnect: () => lfo.disconnect() },
      sweepFilter,
      lfoGain,
      gain
    );
  }
}

export const voidAudio = new VoidAudioSynthesizer();
