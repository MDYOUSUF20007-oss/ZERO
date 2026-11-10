/**
 * Tactile Sound Synthesizer & Web Haptics Engine for Zero
 * Synthesizes crisp clicks, mechanical detents, and escalating charge hums without external audio files.
 * Optimized for low CPU/battery load during continuous dial spinning:
 * - Throttles tick audio (>=45ms) & haptic vibrate (>=95ms) to avoid Binder/WebAudio flooding
 * - Disconnects completed OscillatorNode/GainNode graphs via onended
 * - Automatically suspends AudioContext after idle delay so the audio thread sleeps
 */
class HapticsEngine {
  private ctx: AudioContext | null = null;
  private holdOsc: OscillatorNode | null = null;
  private holdFilter: BiquadFilterNode | null = null;
  private holdGain: GainNode | null = null;
  private idleSuspendTimer: ReturnType<typeof setTimeout> | null = null;
  private lastTickAudioMs = 0;
  private lastTickVibrateMs = 0;

  private scheduleIdleSuspend() {
    if (this.idleSuspendTimer) {
      clearTimeout(this.idleSuspendTimer);
    }
    this.idleSuspendTimer = setTimeout(() => {
      this.idleSuspendTimer = null;
      if (this.holdOsc) return;
      if (this.ctx && this.ctx.state === 'running') {
        this.ctx.suspend().catch(() => {});
      }
    }, 1800);
  }

  private getContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    if (this.ctx) {
      this.scheduleIdleSuspend();
    }
    return this.ctx;
  }

  private cleanupAfterPlay(osc: OscillatorNode, gain: GainNode) {
    osc.onended = () => {
      try {
        osc.disconnect();
      } catch {
        // Ignored
      }
      try {
        gain.disconnect();
      } catch {
        // Ignored
      }
    };
  }

  // Dial Scrub Click (short metallic/detent tick, throttled to prevent CPU/Binder saturation)
  tick(frequency = 900) {
    try {
      const now = typeof performance !== 'undefined' ? performance.now() : Date.now();

      if (navigator.vibrate && now - this.lastTickVibrateMs >= 95) {
        this.lastTickVibrateMs = now;
        navigator.vibrate(5);
      }

      if (now - this.lastTickAudioMs < 45) return;
      this.lastTickAudioMs = now;

      const ctx = this.getContext();
      if (!ctx) return;

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(frequency, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(80, ctx.currentTime + 0.015);

      gain.gain.setValueAtTime(0.18, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.015);

      osc.connect(gain);
      gain.connect(ctx.destination);
      this.cleanupAfterPlay(osc, gain);

      osc.start();
      osc.stop(ctx.currentTime + 0.018);
    } catch {
      // Audio autoplay blocked or unsupported
    }
  }

  // Heavy Detent Thud (e.g. Presets or 1-hour intervals)
  thud() {
    try {
      const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
      if (navigator.vibrate && now - this.lastTickVibrateMs >= 75) {
        this.lastTickVibrateMs = now;
        navigator.vibrate(16);
      }

      const ctx = this.getContext();
      if (!ctx) return;

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(160, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(30, ctx.currentTime + 0.04);

      gain.gain.setValueAtTime(0.32, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.045);

      osc.connect(gain);
      gain.connect(ctx.destination);
      this.cleanupAfterPlay(osc, gain);

      osc.start();
      osc.stop(ctx.currentTime + 0.05);
    } catch {
      // Ignored
    }
  }

  // Escalating hold-to-lock hum (starts at 110Hz, rises to 600Hz over 3s)
  startHoldCharge() {
    try {
      if (navigator.vibrate) navigator.vibrate([15, 60, 20, 60, 30, 60, 40]);
      const ctx = this.getContext();
      if (!ctx) return;

      this.stopHoldCharge();

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(110, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(600, ctx.currentTime + 3.0);

      gain.gain.setValueAtTime(0.01, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.18, ctx.currentTime + 3.0);

      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(300, ctx.currentTime);
      filter.frequency.exponentialRampToValueAtTime(1400, ctx.currentTime + 3.0);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      this.holdOsc = osc;
      this.holdFilter = filter;
      this.holdGain = gain;
    } catch {
      // Ignored
    }
  }

  stopHoldCharge() {
    try {
      if (this.holdOsc) {
        this.holdOsc.stop();
        this.holdOsc.disconnect();
        this.holdOsc = null;
      }
      if (this.holdFilter) {
        this.holdFilter.disconnect();
        this.holdFilter = null;
      }
      if (this.holdGain) {
        this.holdGain.disconnect();
        this.holdGain = null;
      }
      if (this.ctx) {
        this.scheduleIdleSuspend();
      }
    } catch {
      // Ignored
    }
  }

  // Ignition Lock Engaged Clank
  lockEngaged() {
    try {
      this.stopHoldCharge();
      if (navigator.vibrate) navigator.vibrate([60, 40, 100]);
      const ctx = this.getContext();
      if (!ctx) return;

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'square';
      osc.frequency.setValueAtTime(140, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(40, ctx.currentTime + 0.12);

      gain.gain.setValueAtTime(0.4, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);

      osc.connect(gain);
      gain.connect(ctx.destination);
      this.cleanupAfterPlay(osc, gain);

      osc.start();
      osc.stop(ctx.currentTime + 0.13);
    } catch {
      // Ignored
    }
  }

  // Parachute Deployed Sound
  parachuteDeploy() {
    try {
      if (navigator.vibrate) navigator.vibrate([100, 50, 100]);
      const ctx = this.getContext();
      if (!ctx) return;

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(440, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(180, ctx.currentTime + 0.25);

      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);

      osc.connect(gain);
      gain.connect(ctx.destination);
      this.cleanupAfterPlay(osc, gain);

      osc.start();
      osc.stop(ctx.currentTime + 0.26);
    } catch {
      // Ignored
    }
  }

  // 20-Hour Milestone celebration sound
  milestoneChime() {
    try {
      if (navigator.vibrate) navigator.vibrate([40, 40, 60, 40, 100]);
      const ctx = this.getContext();
      if (!ctx) return;

      const notes = [330, 440, 554, 659]; // E major chord
      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, ctx.currentTime + idx * 0.08);

        gain.gain.setValueAtTime(0, ctx.currentTime + idx * 0.08);
        gain.gain.linearRampToValueAtTime(0.2, ctx.currentTime + idx * 0.08 + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + idx * 0.08 + 0.6);

        osc.connect(gain);
        gain.connect(ctx.destination);
        this.cleanupAfterPlay(osc, gain);

        osc.start(ctx.currentTime + idx * 0.08);
        osc.stop(ctx.currentTime + idx * 0.08 + 0.65);
      });
    } catch {
      // Ignored
    }
  }
}

export const haptics = new HapticsEngine();
