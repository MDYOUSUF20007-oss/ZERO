import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  Lock,
  Unlock,
  ShieldAlert,
  Briefcase,
  Calculator,
  FileText,
  Volume2,
  VolumeX,
  Phone,
  Wind,
  BookOpen,
  BarChart3,
  Settings,
  Clock,
  AlertTriangle,
  CheckCircle2,
  X,
  Plus,
  Minus,
  RotateCcw,
  Maximize2,
  Minimize2,
  Zap,
  Flame,
  Download,
  Upload,
  Trash2,
  Play,
  Pause,
  ChevronRight,
  Radio,
  Eye,
  Smartphone,
  Terminal,
  Sparkles,
  Check
} from 'lucide-react';

// ============================================================================
// WEB AUDIO API TACTILE SYNTHESIZER & ACOUSTIC SHIELD ENGINE
// ============================================================================
class IndustrialSoundEngine {
  constructor() {
    this.ctx = null;
    this.enabled = true;
    this.hapticsEnabled = true;
    // Acoustic Shield state
    this.noiseNode = null;
    this.noiseGain = null;
    this.binauralOscL = null;
    this.binauralOscR = null;
    this.isPlayingNoise = false;
    this.currentNoiseType = 'BROWN'; // 'BROWN' | 'RAIN' | 'GAMMA_40HZ'
    this.noiseVolume = 0.35;
    // Parachute tension oscillator
    this.tensionOsc = null;
    this.tensionGain = null;
  }

  initContext() {
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  }

  vibrate(pattern = 10) {
    if (!this.hapticsEnabled) return;
    try {
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate(pattern);
      }
    } catch (e) {
      // Ignore on unsupported devices
    }
  }

  // Crisp mechanical rotary detent click
  playClick(pitch = 1.0) {
    this.vibrate(8);
    if (!this.enabled) return;
    try {
      this.initContext();
      if (!this.ctx) return;

      const now = this.ctx.currentTime;

      // Short transient click oscillator
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(1100 * pitch, now);
      osc.frequency.exponentialRampToValueAtTime(140 * pitch, now + 0.018);

      gain.gain.setValueAtTime(0.22, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.018);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.02);
    } catch (e) {}
  }

  // Heavy pneumatic solenoid lock-in latch sound
  playLatch() {
    this.vibrate([30, 40, 60]);
    if (!this.enabled) return;
    try {
      this.initContext();
      if (!this.ctx) return;

      const now = this.ctx.currentTime;

      // 1. Sub-bass mechanical thud
      const subOsc = this.ctx.createOscillator();
      const subGain = this.ctx.createGain();
      subOsc.type = 'sine';
      subOsc.frequency.setValueAtTime(160, now);
      subOsc.frequency.exponentialRampToValueAtTime(38, now + 0.18);
      subGain.gain.setValueAtTime(0.5, now);
      subGain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
      subOsc.connect(subGain);
      subGain.connect(this.ctx.destination);
      subOsc.start(now);
      subOsc.stop(now + 0.22);

      // 2. High-tech confirm double-chirp
      [0.08, 0.16].forEach((offset, idx) => {
        const beep = this.ctx.createOscillator();
        const beepGain = this.ctx.createGain();
        beep.type = 'square';
        beep.frequency.setValueAtTime(idx === 0 ? 880 : 1760, now + offset);
        beepGain.gain.setValueAtTime(0.08, now + offset);
        beepGain.gain.exponentialRampToValueAtTime(0.001, now + offset + 0.06);
        beep.connect(beepGain);
        beepGain.connect(this.ctx.destination);
        beep.start(now + offset);
        beep.stop(now + offset + 0.065);
      });
    } catch (e) {}
  }

  // Breach warning buzzer
  playBreachAlarm() {
    this.vibrate([100, 50, 100, 50, 180]);
    if (!this.enabled) return;
    try {
      this.initContext();
      if (!this.ctx) return;

      const now = this.ctx.currentTime;
      [0, 0.18, 0.36].forEach((offset) => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(440, now + offset);
        osc.frequency.setValueAtTime(310, now + offset + 0.07);

        gain.gain.setValueAtTime(0.16, now + offset);
        gain.gain.exponentialRampToValueAtTime(0.001, now + offset + 0.14);

        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now + offset);
        osc.stop(now + offset + 0.15);
      });
    } catch (e) {}
  }

  // Clean harmonic chime when session finishes
  playSuccessChime() {
    this.vibrate([40, 60, 120]);
    if (!this.enabled) return;
    try {
      this.initContext();
      if (!this.ctx) return;

      const now = this.ctx.currentTime;
      const freqs = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
      freqs.forEach((f, idx) => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(f, now + idx * 0.09);
        gain.gain.setValueAtTime(0.15, now + idx * 0.09);
        gain.gain.exponentialRampToValueAtTime(0.0008, now + idx * 0.09 + 0.55);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now + idx * 0.09);
        osc.stop(now + idx * 0.09 + 0.6);
      });
    } catch (e) {}
  }

  // Parachute 8-second continuous rising tension tone
  startTensionRiser() {
    this.stopTensionRiser();
    if (!this.enabled) return;
    try {
      this.initContext();
      if (!this.ctx) return;

      const now = this.ctx.currentTime;
      this.tensionOsc = this.ctx.createOscillator();
      this.tensionGain = this.ctx.createGain();

      this.tensionOsc.type = 'sawtooth';
      this.tensionOsc.frequency.setValueAtTime(110, now);
      this.tensionOsc.frequency.exponentialRampToValueAtTime(880, now + 8.0);

      // Lowpass filter so it's not harsh
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(300, now);
      filter.frequency.exponentialRampToValueAtTime(2400, now + 8.0);

      this.tensionGain.gain.setValueAtTime(0.02, now);
      this.tensionGain.gain.linearRampToValueAtTime(0.18, now + 8.0);

      this.tensionOsc.connect(filter);
      filter.connect(this.tensionGain);
      this.tensionGain.connect(this.ctx.destination);

      this.tensionOsc.start(now);
    } catch (e) {}
  }

  stopTensionRiser() {
    try {
      if (this.tensionOsc) {
        this.tensionOsc.stop();
        this.tensionOsc.disconnect();
        this.tensionOsc = null;
      }
      if (this.tensionGain) {
        this.tensionGain.disconnect();
        this.tensionGain = null;
      }
    } catch (e) {}
  }

  // Procedural Acoustic Shield (Brown Noise / Rain / 40Hz Binaural Focus Drone)
  startAcousticShield(type = this.currentNoiseType, volume = this.noiseVolume) {
    this.stopAcousticShield();
    this.currentNoiseType = type;
    this.noiseVolume = volume;

    try {
      this.initContext();
      if (!this.ctx) return;

      this.noiseGain = this.ctx.createGain();
      this.noiseGain.gain.setValueAtTime(volume, this.ctx.currentTime);
      this.noiseGain.connect(this.ctx.destination);

      if (type === 'GAMMA_40HZ') {
        // 40Hz Gamma Binaural Drone (200Hz Left + 240Hz Right + 100Hz Sub Warmth)
        const merger = this.ctx.createChannelMerger(2);
        this.binauralOscL = this.ctx.createOscillator();
        this.binauralOscR = this.ctx.createOscillator();

        this.binauralOscL.type = 'sine';
        this.binauralOscR.type = 'sine';
        this.binauralOscL.frequency.setValueAtTime(200, this.ctx.currentTime);
        this.binauralOscR.frequency.setValueAtTime(240, this.ctx.currentTime);

        this.binauralOscL.connect(merger, 0, 0);
        this.binauralOscR.connect(merger, 0, 1);
        merger.connect(this.noiseGain);

        this.binauralOscL.start();
        this.binauralOscR.start();
        this.isPlayingNoise = true;
        return;
      }

      // Generate 5-second seamless noise buffer for Brown or Rain noise
      const bufferSize = this.ctx.sampleRate * 5;
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const output = buffer.getChannelData(0);

      if (type === 'BROWN') {
        let lastOut = 0.0;
        for (let i = 0; i < bufferSize; i++) {
          const white = Math.random() * 2 - 1;
          output[i] = (lastOut + 0.02 * white) / 1.02;
          lastOut = output[i];
          output[i] *= 3.2; // Gain compensation
        }
      } else {
        // RAIN (Pink-ish filtered texture)
        let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
        for (let i = 0; i < bufferSize; i++) {
          const white = Math.random() * 2 - 1;
          b0 = 0.99886 * b0 + white * 0.0555179;
          b1 = 0.99332 * b1 + white * 0.0750759;
          b2 = 0.96900 * b2 + white * 0.1538520;
          b3 = 0.86650 * b3 + white * 0.3104856;
          b4 = 0.55000 * b4 + white * 0.5329522;
          b5 = -0.7616 * b5 - white * 0.0168980;
          output[i] = b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362;
          output[i] *= 0.08;
          b6 = white * 0.115926;
        }
      }

      this.noiseNode = this.ctx.createBufferSource();
      this.noiseNode.buffer = buffer;
      this.noiseNode.loop = true;

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(type === 'BROWN' ? 650 : 1800, this.ctx.currentTime);

      this.noiseNode.connect(filter);
      filter.connect(this.noiseGain);
      this.noiseNode.start(0);
      this.isPlayingNoise = true;
    } catch (e) {}
  }

  setAcousticVolume(vol) {
    this.noiseVolume = vol;
    if (this.noiseGain && this.ctx) {
      this.noiseGain.gain.setValueAtTime(vol, this.ctx.currentTime);
    }
  }

  stopAcousticShield() {
    try {
      if (this.noiseNode) {
        this.noiseNode.stop();
        this.noiseNode.disconnect();
        this.noiseNode = null;
      }
      if (this.binauralOscL) {
        this.binauralOscL.stop();
        this.binauralOscL.disconnect();
        this.binauralOscL = null;
      }
      if (this.binauralOscR) {
        this.binauralOscR.stop();
        this.binauralOscR.disconnect();
        this.binauralOscR = null;
      }
      if (this.noiseGain) {
        this.noiseGain.disconnect();
        this.noiseGain = null;
      }
      this.isPlayingNoise = false;
    } catch (e) {}
  }
}

const soundEngine = new IndustrialSoundEngine();

// ============================================================================
// CONSTANTS & INITIAL DATA
// ============================================================================
const SESSION_TAGS = [
  'STUDY // PCM',
  'DEEP WORK',
  'CODING',
  'NO SCROLL',
  'SLEEP',
  'READING'
];

const QUICK_PRESETS = [15, 30, 45, 60, 90, 120, 180];

const SUITCASE_MODULES = [
  {
    id: 'CALC',
    code: 'FX-99',
    name: 'SCI-CALC',
    desc: 'Scientific & trig expression calculator with memory tape',
    icon: Calculator
  },
  {
    id: 'SCRATCHPAD',
    code: 'MEMO-01',
    name: 'SCRATCHPAD',
    desc: 'Persistent offline markdown & formula thought capture',
    icon: FileText
  },
  {
    id: 'ACOUSTIC',
    code: 'SND-GEN',
    name: 'ACOUSTIC SHIELD',
    desc: 'Procedural Brown Noise, Rain Static & 40Hz Gamma Drone',
    icon: Volume2
  },
  {
    id: 'DIALER',
    code: 'COM-TEL',
    name: 'EMERGENCY DIALER',
    desc: 'Hardware tel: launcher & ICE emergency contacts',
    icon: Phone
  },
  {
    id: 'BREATH',
    code: 'RSP-478',
    name: 'BREATH PACER',
    desc: '4-7-8 & Box Breathing kinetic urge-killer guide',
    icon: Wind
  },
  {
    id: 'DECK',
    code: 'REF-DCK',
    name: 'FORMULA DECK',
    desc: 'Customizable high-yield Physics, Math & CS reference cards',
    icon: BookOpen
  }
];

const PARACHUTE_PHRASES = [
  'I am choosing distraction over my current goal',
  'I am breaking my focus lock early by choice',
  'Temporary dopamine is costing me deep progress',
  'I acknowledge I am aborting this focus session'
];

const DEFAULT_FLASHCARDS = [
  {
    id: 'f1',
    category: 'CALCULUS // INTEGRALS',
    title: 'Integration by Parts & Gaussian',
    content: '∫ u dv = u·v - ∫ v du\n∫_{-∞}^{∞} e^(-x²) dx = √π\nd/dx [sin⁻¹(x)] = 1 / √(1 - x²)'
  },
  {
    id: 'f2',
    category: 'PHYSICS // ELECTROMAGNETISM',
    title: 'Maxwell & Lorentz Equations',
    content: 'F = q(E + v × B)\n∇ · E = ρ / ε₀\n∇ × B = μ₀J + μ₀ε₀(∂E/∂t)\nU_capacitor = ½ C V²'
  },
  {
    id: 'f3',
    category: 'CS // ALGORITHMS',
    title: 'Master Theorem & Complexity',
    content: 'T(n) = aT(n/b) + f(n)\nc_crit = log_b(a)\nBinary Search: O(log n) | Merge Sort: O(n log n)\nDijkstra (Binary Heap): O((V + E) log V)'
  },
  {
    id: 'f4',
    category: 'THERMODYNAMICS // LAWS',
    title: 'Entropy & Ideal Gas Relations',
    content: 'dU = δQ - δW\nPV = nRT | C_p - C_v = R\nCarnot Efficiency: η = 1 - (T_cold / T_hot)\nΔS ≥ ∫ δQ / T'
  }
];

const generateInitialHistory = () => {
  const now = Date.now();
  const day = 86400000;
  return [
    {
      id: 'init-1',
      timestamp: now - day * 3,
      durationMinutes: 60,
      actualMinutes: 60,
      tag: 'STUDY // PCM',
      outcome: 'COMPLETED',
      breaches: 0
    },
    {
      id: 'init-2',
      timestamp: now - day * 2,
      durationMinutes: 90,
      actualMinutes: 90,
      tag: 'DEEP WORK',
      outcome: 'COMPLETED',
      breaches: 0
    },
    {
      id: 'init-3',
      timestamp: now - day * 1,
      durationMinutes: 45,
      actualMinutes: 45,
      tag: 'CODING',
      outcome: 'COMPLETED',
      breaches: 1
    }
  ];
};

// ============================================================================
// UTILITY HELPERS
// ============================================================================
function loadStorage(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch (e) {
    return fallback;
  }
}

function saveStorage(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {}
}

function formatTimeHMS(totalSeconds) {
  const hrs = Math.floor(totalSeconds / 3600);
  const mins = Math.floor((totalSeconds % 3600) / 60);
  const secs = totalSeconds % 60;
  if (hrs > 0) {
    return `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

// ============================================================================
// SUITCASE TOOL MODALS (WORK IN BOTH HOME PREVIEW & ACTIVE LOCK SCREEN)
// ============================================================================

// 1. SCIENTIFIC CALCULATOR
function SciCalcTool() {
  const [expr, setExpr] = useState('');
  const [result, setResult] = useState('0');
  const [history, setHistory] = useState(() => loadStorage('blockit_calc_hist', []));

  const appendToken = (token) => {
    soundEngine.playClick(1.15);
    setExpr((prev) => prev + token);
  };

  const evaluateExpression = () => {
    soundEngine.playClick(1.4);
    if (!expr.trim()) return;
    try {
      // Safe math transformation
      const sanitized = expr
        .replace(/×/g, '*')
        .replace(/÷/g, '/')
        .replace(/π/g, 'Math.PI')
        .replace(/e/g, 'Math.E')
        .replace(/sin\(/g, 'Math.sin(')
        .replace(/cos\(/g, 'Math.cos(')
        .replace(/tan\(/g, 'Math.tan(')
        .replace(/sqrt\(/g, 'Math.sqrt(')
        .replace(/log\(/g, 'Math.log10(')
        .replace(/ln\(/g, 'Math.log(')
        .replace(/\^/g, '**');

      // Evaluate safely
      // eslint-disable-next-line no-new-func
      const val = Function(`"use strict"; return (${sanitized})`)();
      const formatted =
        typeof val === 'number' && !Number.isNaN(val)
          ? Number(val.toPrecision(10)).toString()
          : 'ERR';
      setResult(formatted);
      const nextHist = [{ expr, res: formatted }, ...history.slice(0, 7)];
      setHistory(nextHist);
      saveStorage('blockit_calc_hist', nextHist);
    } catch (err) {
      setResult('SYNTAX ERR');
    }
  };

  const clearAll = () => {
    soundEngine.playClick(0.8);
    setExpr('');
    setResult('0');
  };

  const buttons = [
    { label: 'sin(', type: 'fn' },
    { label: 'cos(', type: 'fn' },
    { label: 'tan(', type: 'fn' },
    { label: 'sqrt(', type: 'fn' },
    { label: 'log(', type: 'fn' },
    { label: 'ln(', type: 'fn' },
    { label: '(', type: 'fn' },
    { label: ')', type: 'fn' },
    { label: '7', type: 'num' },
    { label: '8', type: 'num' },
    { label: '9', type: 'num' },
    { label: '÷', type: 'op' },
    { label: '4', type: 'num' },
    { label: '5', type: 'num' },
    { label: '6', type: 'num' },
    { label: '×', type: 'op' },
    { label: '1', type: 'num' },
    { label: '2', type: 'num' },
    { label: '3', type: 'num' },
    { label: '-', type: 'op' },
    { label: '0', type: 'num' },
    { label: '.', type: 'num' },
    { label: 'π', type: 'fn' },
    { label: '+', type: 'op' }
  ];

  return (
    <div className="space-y-3">
      {/* LCD Readout */}
      <div className="bg-[#0A0A0A] border border-[#262626] p-3 rounded-sm font-mono">
        <div className="flex justify-between items-center text-[10px] text-neutral-500 uppercase tracking-widest mb-1">
          <span>FX-99 // SCIENTIFIC</span>
          <span>RAD // FLOAT</span>
        </div>
        <div className="text-right text-xs text-neutral-400 min-h-[1.25rem] break-all">
          {expr || '0'}
        </div>
        <div className="text-right text-2xl font-bold text-[#00FF66] tracking-tight tabular-nums mt-1 overflow-x-auto">
          {result}
        </div>
      </div>

      {/* Top Row Utility */}
      <div className="grid grid-cols-4 gap-1.5">
        <button
          onClick={clearAll}
          className="bg-[#261109] border border-[#FF4500]/50 text-[#FF4500] py-2 text-xs font-bold uppercase tracking-wider hover:bg-[#FF4500] hover:text-black transition-colors"
        >
          AC
        </button>
        <button
          onClick={() => {
            soundEngine.playClick(0.9);
            setExpr((p) => p.slice(0, -1));
          }}
          className="bg-[#161616] border border-[#262626] text-neutral-300 py-2 text-xs font-bold uppercase hover:border-neutral-500"
        >
          DEL
        </button>
        <button
          onClick={() => appendToken('^')}
          className="bg-[#161616] border border-[#262626] text-neutral-300 py-2 text-xs font-bold hover:border-neutral-500"
        >
          x^y
        </button>
        <button
          onClick={evaluateExpression}
          className="bg-[#FF4500] text-black py-2 text-xs font-black uppercase tracking-wider hover:bg-[#ff571a]"
        >
          EXE =
        </button>
      </div>

      {/* Main Matrix */}
      <div className="grid grid-cols-4 gap-1.5">
        {buttons.map((b, i) => (
          <button
            key={i}
            onClick={() => appendToken(b.label)}
            className={`py-2.5 text-xs font-mono font-bold border transition-all active:scale-95 ${
              b.type === 'num'
                ? 'bg-[#141414] border-[#262626] text-white hover:border-neutral-500'
                : b.type === 'op'
                ? 'bg-[#1C1C1C] border-[#333333] text-[#FF4500] hover:border-[#FF4500]'
                : 'bg-[#0E0E0E] border-[#222222] text-neutral-400 hover:text-white'
            }`}
          >
            {b.label}
          </button>
        ))}
      </div>

      {/* Recent Tape */}
      {history.length > 0 && (
        <div className="border-t border-[#262626] pt-2">
          <div className="text-[10px] text-neutral-500 uppercase tracking-widest mb-1">
            MEMORY TAPE (CLICK TO REUSE)
          </div>
          <div className="max-h-24 overflow-y-auto space-y-1 pr-1">
            {history.map((item, idx) => (
              <button
                key={idx}
                onClick={() => setExpr(item.res)}
                className="w-full flex justify-between text-xs font-mono text-neutral-400 hover:text-white bg-[#0B0B0B] px-2 py-1 border border-[#1A1A1A]"
              >
                <span className="truncate max-w-[60%]">{item.expr}</span>
                <span className="text-[#00FF66] font-bold">= {item.res}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// 2. SCRATCHPAD
function ScratchpadTool() {
  const [note, setNote] = useState(() =>
    loadStorage(
      'blockit_scratchpad',
      '# SESSION SCRATCHPAD\n- Jot down intrusive thoughts or formulas here so you stay locked in.\n- '
    )
  );
  const [copied, setCopied] = useState(false);

  const handleNoteChange = (val) => {
    setNote(val);
    saveStorage('blockit_scratchpad', val);
  };

  const insertTimestamp = () => {
    soundEngine.playClick(1.1);
    const stamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    handleNoteChange(`${note}\n[${stamp}] `);
  };

  const copyNotes = () => {
    soundEngine.playClick(1.3);
    if (navigator.clipboard) {
      navigator.clipboard.writeText(note);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between text-[11px] text-neutral-400 font-mono">
        <span>LOCAL_STORAGE // AUTO-SAVED</span>
        <span>{note.length} CHARS</span>
      </div>
      <textarea
        value={note}
        onChange={(e) => handleNoteChange(e.target.value)}
        placeholder="Type formulas, tasks, or distracting thoughts to deal with after unlocking..."
        className="w-full h-56 bg-[#080808] border border-[#262626] focus:border-[#FF4500] focus:outline-none p-3 text-xs font-mono text-neutral-100 leading-relaxed resize-none"
      />
      <div className="flex gap-2">
        <button
          onClick={insertTimestamp}
          className="flex-1 bg-[#141414] border border-[#262626] hover:border-neutral-500 text-xs font-mono py-2 text-neutral-200 uppercase"
        >
          + TIMESTAMP
        </button>
        <button
          onClick={copyNotes}
          className="flex-1 bg-[#141414] border border-[#262626] hover:border-[#00FF66] text-xs font-mono py-2 text-neutral-200 uppercase"
        >
          {copied ? 'COPIED TO CLIPBOARD' : 'COPY BUFFER'}
        </button>
      </div>
    </div>
  );
}

// 3. ACOUSTIC SHIELD
function AcousticShieldTool({ noiseState, setNoiseState }) {
  const toggleNoise = () => {
    soundEngine.playClick(1.0);
    if (noiseState.playing) {
      soundEngine.stopAcousticShield();
      setNoiseState((prev) => ({ ...prev, playing: false }));
    } else {
      soundEngine.startAcousticShield(noiseState.type, noiseState.volume);
      setNoiseState((prev) => ({ ...prev, playing: true }));
    }
  };

  const selectType = (type) => {
    soundEngine.playClick(1.2);
    setNoiseState((prev) => ({ ...prev, type }));
    if (noiseState.playing) {
      soundEngine.startAcousticShield(type, noiseState.volume);
    }
  };

  const changeVolume = (val) => {
    const num = parseFloat(val);
    setNoiseState((prev) => ({ ...prev, volume: num }));
    soundEngine.setAcousticVolume(num);
  };

  const modes = [
    {
      id: 'BROWN',
      label: 'BROWN NOISE',
      sub: 'Deep low-pass waterfall cascade (blocks speech)'
    },
    {
      id: 'RAIN',
      label: 'HEAVY RAIN STATIC',
      sub: 'Warm pink-spectrum atmospheric rain mask'
    },
    {
      id: 'GAMMA_40HZ',
      label: '40HZ GAMMA DRONE',
      sub: '200Hz L / 240Hz R binaural cognitive lock tone'
    }
  ];

  return (
    <div className="space-y-4">
      <div className="bg-[#0B0B0B] border border-[#262626] p-3 flex items-center justify-between">
        <div>
          <div className="text-[10px] text-neutral-500 uppercase tracking-widest">
            ACOUSTIC GENERATOR STATUS
          </div>
          <div className="text-sm font-bold font-mono flex items-center gap-2 mt-0.5">
            <span
              className={`w-2 h-2 rounded-full ${
                noiseState.playing ? 'bg-[#00FF66] animate-pulse' : 'bg-neutral-600'
              }`}
            />
            {noiseState.playing ? `ACTIVE // ${noiseState.type}` : 'STANDBY // MUTED'}
          </div>
        </div>
        <button
          onClick={toggleNoise}
          className={`px-4 py-2 text-xs font-mono font-bold uppercase border transition-all ${
            noiseState.playing
              ? 'bg-[#FF4500] text-black border-[#FF4500]'
              : 'bg-[#161616] text-white border-[#333333] hover:border-white'
          }`}
        >
          {noiseState.playing ? 'STOP ENGINE' : 'ENGAGE AUDIO'}
        </button>
      </div>

      {/* Mode Selector */}
      <div className="space-y-2">
        {modes.map((m) => {
          const active = noiseState.type === m.id;
          return (
            <button
              key={m.id}
              onClick={() => selectType(m.id)}
              className={`w-full text-left p-3 border transition-all flex items-center justify-between ${
                active
                  ? 'bg-[#161616] border-[#00FF66] text-white'
                  : 'bg-[#0A0A0A] border-[#222222] text-neutral-400 hover:border-neutral-600'
              }`}
            >
              <div>
                <div className="text-xs font-mono font-bold">{m.label}</div>
                <div className="text-[11px] text-neutral-500 mt-0.5">{m.sub}</div>
              </div>
              <div
                className={`w-3 h-3 border ${
                  active ? 'bg-[#00FF66] border-[#00FF66]' : 'border-neutral-600'
                }`}
              />
            </button>
          );
        })}
      </div>

      {/* Gain Slider */}
      <div className="bg-[#0B0B0B] border border-[#262626] p-3 space-y-2">
        <div className="flex justify-between text-xs font-mono">
          <span className="text-neutral-400 uppercase">OUTPUT GAIN ATTENUATION</span>
          <span className="text-[#00FF66] font-bold">{Math.round(noiseState.volume * 100)}%</span>
        </div>
        <input
          type="range"
          min="0.02"
          max="0.9"
          step="0.02"
          value={noiseState.volume}
          onChange={(e) => changeVolume(e.target.value)}
          className="w-full accent-[#FF4500] cursor-pointer"
        />
      </div>
    </div>
  );
}

// 4. EMERGENCY DIALER
function EmergencyDialerTool() {
  const [phoneNum, setPhoneNum] = useState('');
  const [iceContacts, setIceContacts] = useState(() =>
    loadStorage('blockit_ice_contacts', [
      { name: 'EMERGENCY SERVICES', number: '112' },
      { name: 'HOME / FAMILY ICE', number: '' }
    ])
  );

  const dialDigit = (d) => {
    soundEngine.playClick(1.1);
    setPhoneNum((p) => p + d);
  };

  const updateIce = (idx, number) => {
    const updated = iceContacts.map((c, i) => (i === idx ? { ...c, number } : c));
    setIceContacts(updated);
    saveStorage('blockit_ice_contacts', updated);
  };

  return (
    <div className="space-y-3 font-mono">
      <div className="bg-[#0B0B0B] border border-[#262626] p-3">
        <div className="text-[10px] text-neutral-500 uppercase tracking-widest">
          DIRECT HARDWARE TEL:// INTENT
        </div>
        <div className="flex items-center justify-between mt-1">
          <input
            type="tel"
            value={phoneNum}
            onChange={(e) => setPhoneNum(e.target.value)}
            placeholder="ENTER NUMBER..."
            className="bg-transparent text-xl font-bold text-white focus:outline-none w-full tabular-nums"
          />
          {phoneNum && (
            <button
              onClick={() => setPhoneNum((p) => p.slice(0, -1))}
              className="text-xs text-neutral-400 hover:text-white px-2 py-1 border border-[#262626]"
            >
              CLR
            </button>
          )}
        </div>
      </div>

      {/* Keypad */}
      <div className="grid grid-cols-3 gap-1.5">
        {['1', '2', '3', '4', '5', '6', '7', '8', '9', '*', '0', '#'].map((digit) => (
          <button
            key={digit}
            onClick={() => dialDigit(digit)}
            className="bg-[#141414] border border-[#262626] hover:border-neutral-500 py-2.5 text-sm font-bold text-white active:scale-95 transition-transform"
          >
            {digit}
          </button>
        ))}
      </div>

      <a
        href={phoneNum ? `tel:${phoneNum}` : '#'}
        onClick={(e) => {
          if (!phoneNum) e.preventDefault();
          soundEngine.playLatch();
        }}
        className={`block w-full text-center py-3 text-xs font-black uppercase tracking-widest border ${
          phoneNum
            ? 'bg-[#00FF66] text-black border-[#00FF66]'
            : 'bg-[#141414] text-neutral-600 border-[#262626] cursor-not-allowed'
        }`}
      >
        PLACE VOICE CALL ({phoneNum || 'NO NUMBER'})
      </a>

      {/* Quick ICE Numbers */}
      <div className="border-t border-[#262626] pt-2 space-y-2">
        <div className="text-[10px] text-neutral-500 uppercase tracking-widest">
          QUICK ICE PRESETS
        </div>
        {iceContacts.map((ice, idx) => (
          <div key={idx} className="flex gap-1.5 items-center">
            <span className="text-[11px] text-neutral-400 w-36 truncate">{ice.name}</span>
            <input
              type="tel"
              value={ice.number}
              onChange={(e) => updateIce(idx, e.target.value)}
              placeholder="Set number..."
              className="flex-1 bg-[#0B0B0B] border border-[#262626] px-2 py-1 text-xs text-white focus:outline-none focus:border-[#FF4500]"
            />
            {ice.number && (
              <a
                href={`tel:${ice.number}`}
                className="bg-[#1F1F1F] border border-[#333333] hover:border-[#00FF66] text-[#00FF66] px-2.5 py-1 text-xs font-bold"
              >
                DIAL
              </a>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// 5. BREATHING PACER (4-7-8 & BOX BREATHING)
function BreathingPacerTool() {
  const [pattern, setPattern] = useState('478'); // '478' | 'BOX'
  const [active, setActive] = useState(true);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (!active) return;
    const interval = setInterval(() => {
      setTick((t) => t + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [active]);

  // Compute current phase and countdown
  const phaseInfo = useMemo(() => {
    if (pattern === '478') {
      // Total cycle = 19s (4 inhale, 7 hold, 8 exhale)
      const mod = tick % 19;
      if (mod < 4) {
        return { label: 'INHALE (NOSE)', remaining: 4 - mod, scale: 1.0, color: '#00FF66' };
      } else if (mod < 11) {
        return { label: 'HOLD BREATH', remaining: 11 - mod, scale: 1.0, color: '#FF4500' };
      } else {
        return { label: 'EXHALE SLOWLY', remaining: 19 - mod, scale: 0.55, color: '#FFFFFF' };
      }
    } else {
      // BOX 4-4-4-4 = 16s
      const mod = tick % 16;
      if (mod < 4) {
        return { label: 'INHALE', remaining: 4 - mod, scale: 1.0, color: '#00FF66' };
      } else if (mod < 8) {
        return { label: 'HOLD FULL', remaining: 8 - mod, scale: 1.0, color: '#FF4500' };
      } else if (mod < 12) {
        return { label: 'EXHALE', remaining: 12 - mod, scale: 0.55, color: '#FFFFFF' };
      } else {
        return { label: 'HOLD EMPTY', remaining: 16 - mod, scale: 0.55, color: '#888888' };
      }
    }
  }, [tick, pattern]);

  return (
    <div className="space-y-4 font-mono">
      <div className="flex gap-2">
        <button
          onClick={() => {
            soundEngine.playClick(1.0);
            setPattern('478');
            setTick(0);
          }}
          className={`flex-1 py-2 text-xs font-bold border ${
            pattern === '478'
              ? 'bg-[#1A1A1A] border-[#00FF66] text-[#00FF66]'
              : 'bg-[#0B0B0B] border-[#262626] text-neutral-400'
          }`}
        >
          4-7-8 PARASYMPATHETIC
        </button>
        <button
          onClick={() => {
            soundEngine.playClick(1.0);
            setPattern('BOX');
            setTick(0);
          }}
          className={`flex-1 py-2 text-xs font-bold border ${
            pattern === 'BOX'
              ? 'bg-[#1A1A1A] border-[#00FF66] text-[#00FF66]'
              : 'bg-[#0B0B0B] border-[#262626] text-neutral-400'
          }`}
        >
          4-4-4-4 TACTICAL BOX
        </button>
      </div>

      {/* Kinetic Visualizer */}
      <div className="h-56 bg-[#070707] border border-[#262626] flex flex-col items-center justify-center relative overflow-hidden">
        <div
          className="w-36 h-36 rounded-full border-2 border-dashed flex items-center justify-center transition-all duration-1000 ease-in-out"
          style={{
            transform: `scale(${phaseInfo.scale})`,
            borderColor: phaseInfo.color,
            boxShadow: `0 0 30px ${phaseInfo.color}22`
          }}
        >
          <div className="text-center">
            <div className="text-3xl font-black tabular-nums" style={{ color: phaseInfo.color }}>
              0{phaseInfo.remaining}s
            </div>
          </div>
        </div>
        <div className="mt-4 text-xs font-bold tracking-widest uppercase" style={{ color: phaseInfo.color }}>
          {phaseInfo.label}
        </div>
      </div>

      <div className="flex justify-between items-center text-[11px] text-neutral-400">
        <span>KILLS IMPULSIVE DOPAMINE URGES IN ~60S</span>
        <button
          onClick={() => setActive((a) => !a)}
          className="px-3 py-1 border border-[#262626] text-white hover:border-white"
        >
          {active ? 'PAUSE' : 'RESUME'}
        </button>
      </div>
    </div>
  );
}

// 6. FORMULA / FLASHCARD DECK
function FormulaDeckTool() {
  const [cards, setCards] = useState(() => loadStorage('blockit_flashcards', DEFAULT_FLASHCARDS));
  const [idx, setIdx] = useState(0);
  const [adding, setAdding] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newCategory, setNewCategory] = useState('CUSTOM // REF');
  const [newContent, setNewContent] = useState('');

  const currentCard = cards[idx] || cards[0];

  const handleAddCard = () => {
    if (!newTitle.trim() || !newContent.trim()) return;
    soundEngine.playClick(1.2);
    const updated = [
      ...cards,
      {
        id: `c-${Date.now()}`,
        category: newCategory.toUpperCase(),
        title: newTitle.trim(),
        content: newContent.trim()
      }
    ];
    setCards(updated);
    saveStorage('blockit_flashcards', updated);
    setNewTitle('');
    setNewContent('');
    setAdding(false);
    setIdx(updated.length - 1);
  };

  return (
    <div className="space-y-3 font-mono">
      {!adding ? (
        <>
          <div className="flex justify-between items-center text-xs text-neutral-400">
            <span>
              CARD {idx + 1} OF {cards.length}
            </span>
            <button
              onClick={() => setAdding(true)}
              className="text-[#FF4500] hover:underline text-xs font-bold uppercase"
            >
              + NEW CHEAT CARD
            </button>
          </div>

          {currentCard && (
            <div className="bg-[#0B0B0B] border border-[#262626] p-4 min-h-[11rem] flex flex-col justify-between">
              <div>
                <div className="text-[10px] text-[#00FF66] uppercase tracking-widest mb-1">
                  {currentCard.category}
                </div>
                <div className="text-sm font-bold text-white border-b border-[#222222] pb-2 mb-2">
                  {currentCard.title}
                </div>
                <pre className="text-xs text-neutral-300 whitespace-pre-wrap font-mono leading-relaxed">
                  {currentCard.content}
                </pre>
              </div>
            </div>
          )}

          <div className="flex gap-2">
            <button
              onClick={() => {
                soundEngine.playClick(0.95);
                setIdx((p) => (p - 1 + cards.length) % cards.length);
              }}
              className="flex-1 bg-[#141414] border border-[#262626] py-2.5 text-xs font-bold uppercase hover:border-white"
            >
              PREV CARD
            </button>
            <button
              onClick={() => {
                soundEngine.playClick(1.05);
                setIdx((p) => (p + 1) % cards.length);
              }}
              className="flex-1 bg-[#141414] border border-[#262626] py-2.5 text-xs font-bold uppercase hover:border-white"
            >
              NEXT CARD
            </button>
          </div>
        </>
      ) : (
        <div className="space-y-2.5 bg-[#0B0B0B] border border-[#262626] p-3">
          <div className="text-xs font-bold text-white uppercase">ADD REFERENCE CARD</div>
          <input
            type="text"
            value={newCategory}
            onChange={(e) => setNewCategory(e.target.value)}
            placeholder="Category (e.g. ORGANIC CHEM)"
            className="w-full bg-[#141414] border border-[#262626] px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-[#FF4500]"
          />
          <input
            type="text"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            placeholder="Card Title..."
            className="w-full bg-[#141414] border border-[#262626] px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-[#FF4500]"
          />
          <textarea
            value={newContent}
            onChange={(e) => setNewContent(e.target.value)}
            placeholder="Formulas, key definitions, or equations..."
            className="w-full h-28 bg-[#141414] border border-[#262626] p-2.5 text-xs text-white focus:outline-none focus:border-[#FF4500] resize-none"
          />
          <div className="flex gap-2">
            <button
              onClick={() => setAdding(false)}
              className="flex-1 bg-[#161616] border border-[#262626] py-2 text-xs text-neutral-400 uppercase"
            >
              CANCEL
            </button>
            <button
              onClick={handleAddCard}
              className="flex-1 bg-[#FF4500] text-black py-2 text-xs font-black uppercase"
            >
              SAVE CARD
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// TACTILE ROTARY DIAL SELECTOR COMPONENT
// ============================================================================
function RotaryTimerDial({ durationMinutes, onChangeDuration, unlockTimeString }) {
  const dialRef = useRef(null);
  const draggingRef = useRef(false);
  const lastAngleRef = useRef(null);

  const computeAngleFromPoint = (clientX, clientY) => {
    if (!dialRef.current) return 0;
    const rect = dialRef.current.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const rad = Math.atan2(clientY - cy, clientX - cx);
    let deg = rad * (180 / Math.PI) + 90;
    if (deg < 0) deg += 360;
    return deg;
  };

  const handlePointerDown = (e) => {
    draggingRef.current = true;
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    lastAngleRef.current = computeAngleFromPoint(clientX, clientY);
  };

  const handlePointerMove = useCallback(
    (e) => {
      if (!draggingRef.current) return;
      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      const clientY = e.touches ? e.touches[0].clientY : e.clientY;
      const currentAngle = computeAngleFromPoint(clientX, clientY);

      if (lastAngleRef.current !== null) {
        let delta = currentAngle - lastAngleRef.current;
        if (delta > 180) delta -= 360;
        if (delta < -180) delta += 360;

        // Every ~10 degrees of rotation = 5 minutes step
        if (Math.abs(delta) >= 9) {
          const step = delta > 0 ? 5 : -5;
          onChangeDuration((prev) => {
            const next = Math.max(5, Math.min(360, prev + step));
            if (next !== prev) {
              soundEngine.playClick(step > 0 ? 1.12 : 0.92);
            }
            return next;
          });
          lastAngleRef.current = currentAngle;
        }
      }
    },
    [onChangeDuration]
  );

  const handlePointerUp = useCallback(() => {
    draggingRef.current = false;
    lastAngleRef.current = null;
  }, []);

  useEffect(() => {
    window.addEventListener('mousemove', handlePointerMove);
    window.addEventListener('mouseup', handlePointerUp);
    window.addEventListener('touchmove', handlePointerMove, { passive: true });
    window.addEventListener('touchend', handlePointerUp);
    return () => {
      window.removeEventListener('mousemove', handlePointerMove);
      window.removeEventListener('mouseup', handlePointerUp);
      window.removeEventListener('touchmove', handlePointerMove);
      window.removeEventListener('touchend', handlePointerUp);
    };
  }, [handlePointerMove, handlePointerUp]);

  // Wheel support on desktop
  const handleWheel = (e) => {
    e.preventDefault();
    const step = e.deltaY < 0 ? 5 : -5;
    onChangeDuration((prev) => {
      const next = Math.max(5, Math.min(360, prev + step));
      if (next !== prev) soundEngine.playClick(step > 0 ? 1.1 : 0.9);
      return next;
    });
  };

  // Visual progress ticks (60 ticks around dial)
  const totalTicks = 48;
  const activeTicks = Math.min(totalTicks, Math.round((durationMinutes / 180) * totalTicks));
  const indicatorAngle = (durationMinutes / 180) * 360;

  return (
    <div className="flex flex-col items-center select-none">
      <div
        ref={dialRef}
        onMouseDown={handlePointerDown}
        onTouchStart={handlePointerDown}
        onWheel={handleWheel}
        className="relative w-64 h-64 sm:w-72 sm:h-72 flex items-center justify-center cursor-grab active:cursor-grabbing"
        title="Drag rotary wheel or scroll to adjust lock duration"
      >
        {/* SVG Outer Dot-Matrix & Tick Ring */}
        <svg viewBox="0 0 260 260" className="w-full h-full">
          {/* Outer subtle chassis ring */}
          <circle
            cx="130"
            cy="130"
            r="122"
            fill="none"
            stroke="#1F1F1F"
            strokeWidth="1.5"
            strokeDasharray="3 3"
          />

          {/* 48 Radial LED Ticks */}
          {Array.from({ length: totalTicks }).map((_, i) => {
            const angle = (i / totalTicks) * 360 - 90;
            const rad = (angle * Math.PI) / 180;
            const x1 = 130 + Math.cos(rad) * 102;
            const y1 = 130 + Math.sin(rad) * 102;
            const x2 = 130 + Math.cos(rad) * 114;
            const y2 = 130 + Math.sin(rad) * 114;
            const isLit = i < activeTicks;
            return (
              <line
                key={i}
                x1={x1}
                y1={y1}
                x2={x2}
                y2={y2}
                stroke={isLit ? '#FF4500' : '#262626'}
                strokeWidth={i % 4 === 0 ? '3' : '2'}
                strokeLinecap="square"
              />
            );
          })}

          {/* Inner Knurled Mechanical Wheel */}
          <circle
            cx="130"
            cy="130"
            r="90"
            fill="#090909"
            stroke="#262626"
            strokeWidth="2"
          />
          <circle
            cx="130"
            cy="130"
            r="82"
            fill="none"
            stroke="#1A1A1A"
            strokeWidth="1"
            strokeDasharray="2 4"
          />

          {/* Rotary Detent Notch Indicator */}
          {(() => {
            const rad = ((indicatorAngle - 90) * Math.PI) / 180;
            const cx = 130 + Math.cos(rad) * 76;
            const cy = 130 + Math.sin(rad) * 76;
            return (
              <circle
                cx={cx}
                cy={cy}
                r="4.5"
                fill="#FF4500"
                stroke="#000000"
                strokeWidth="1.5"
              />
            );
          })()}
        </svg>

        {/* Center Readout Display */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span className="text-[10px] font-mono uppercase tracking-[0.25em] text-neutral-500">
            LOCK DURATION
          </span>
          <div className="flex items-baseline gap-1 mt-0.5">
            <span className="text-5xl sm:text-6xl font-black font-mono tracking-tighter text-white tabular-nums dot-matrix-title">
              {durationMinutes}
            </span>
            <span className="text-xs font-mono font-bold text-[#FF4500]">MIN</span>
          </div>
          <div className="mt-2 px-2.5 py-0.5 bg-[#121212] border border-[#262626] text-[10px] font-mono text-[#00FF66] tracking-wider uppercase">
            UNLOCKS {unlockTimeString}
          </div>
        </div>
      </div>

      {/* Fine Stepper Controls (-5m / +5m) */}
      <div className="flex items-center gap-3 -mt-1">
        <button
          onClick={() => {
            soundEngine.playClick(0.88);
            onChangeDuration((d) => Math.max(5, d - 5));
          }}
          className="px-3.5 py-1.5 bg-[#111111] border border-[#262626] hover:border-white text-xs font-mono font-bold text-neutral-300 flex items-center gap-1 active:scale-95 transition-transform"
        >
          <Minus className="w-3.5 h-3.5 text-[#FF4500]" /> 5M
        </button>
        <span className="text-[10px] font-mono text-neutral-500 uppercase tracking-widest">
          ROTATE OR STEP
        </span>
        <button
          onClick={() => {
            soundEngine.playClick(1.18);
            onChangeDuration((d) => Math.min(360, d + 5));
          }}
          className="px-3.5 py-1.5 bg-[#111111] border border-[#262626] hover:border-white text-xs font-mono font-bold text-neutral-300 flex items-center gap-1 active:scale-95 transition-transform"
        >
          <Plus className="w-3.5 h-3.5 text-[#00FF66]" /> 5M
        </button>
      </div>
    </div>
  );
}

// ============================================================================
// MAIN APPLICATION COMPONENT
// ============================================================================
export default function App() {

  /* --- ZERO UNIFIED STATE (PERSISTENT) --- */
  const defaultPresets = {
    Study: { name: 'Study Mode', icon: '📖', color: 'border-purple-500/50 text-purple-300', allowed: ['Notion', 'Kindle', 'Dictionary'] },
    Outing: { name: 'Going Out', icon: '🧭', color: 'border-blue-500/50 text-blue-300', allowed: ['Maps', 'Camera', 'Transit'] },
    Sports: { name: 'Sports & Gym', icon: '⚡', color: 'border-yellow-500/50 text-yellow-300', allowed: ['Spotify', 'Fitness', 'Workout'] }
  };

  const [activePreset, setActivePreset] = useState(() => {
    try {
      return localStorage.getItem('zero_active_preset_v1') || 'Study';
    } catch {
      return 'Study';
    }
  });

  const [presets, setPresets] = useState(() => {
    try {
      const saved = localStorage.getItem('zero_presets_v1');
      return saved ? JSON.parse(saved) : defaultPresets;
    } catch {
      return defaultPresets;
    }
  });

  const [customMinutesInput, setCustomMinutesInput] = useState(() => {
    try {
      return localStorage.getItem('zero_custom_mins_v1') || '45';
    } catch {
      return '45';
    }
  });

  const [bagAppInput, setBagAppInput] = useState('');
  const [isEngaged, setIsEngaged] = useState(false);
  const [remainingSeconds, setRemainingSeconds] = useState(() => {
    try {
      const savedMins = parseInt(localStorage.getItem('zero_custom_mins_v1') || '45', 10);
      return (!isNaN(savedMins) && savedMins > 0 ? savedMins : 45) * 60;
    } catch {
      return 45 * 60;
    }
  });

  const compulsoryWhitelist = ['Phone', 'Messages', 'WhatsApp', 'Telegram', 'Dialer', 'Contacts'];

  useEffect(() => {
    try {
      localStorage.setItem('zero_presets_v1', JSON.stringify(presets));
      localStorage.setItem('zero_active_preset_v1', activePreset);
    } catch (err) {
      console.warn('Could not save presets to localStorage:', err);
    }
  }, [presets, activePreset]);

  useEffect(() => {
    if (!isEngaged) return;
    const interval = setInterval(() => {
      setRemainingSeconds((prev) => {
        if (prev <= 1) {
          setIsEngaged(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [isEngaged]);

  const handleCustomTimerSet = (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (isEngaged) return;
    const mins = parseInt(customMinutesInput, 10);
    if (!isNaN(mins) && mins > 0 && mins <= 720) {
      setRemainingSeconds(mins * 60);
      try {
        localStorage.setItem('zero_custom_mins_v1', String(mins));
      } catch {}
    }
  };

  const addAppToActiveBag = (e) => {
    if (e && e.preventDefault) e.preventDefault();
    const appName = bagAppInput.trim();
    if (!appName || isEngaged) return;
    setPresets((prev) => {
      const currentBag = prev[activePreset];
      if (!currentBag || currentBag.allowed.some((a) => a.toLowerCase() === appName.toLowerCase())) {
        return prev;
      }
      return {
        ...prev,
        [activePreset]: {
          ...currentBag,
          allowed: [...currentBag.allowed, appName]
        }
      };
    });
    setBagAppInput('');
  };

  const removeAppFromActiveBag = (appName) => {
    if (isEngaged) return;
    setPresets((prev) => {
      const currentBag = prev[activePreset];
      if (!currentBag) return prev;
      return {
        ...prev,
        [activePreset]: {
          ...currentBag,
          allowed: currentBag.allowed.filter((a) => a !== appName)
        }
      };
    });
  };

  const resetBagsToDefault = () => {
    if (isEngaged) return;
    setPresets(defaultPresets);
    setActivePreset('Study');
    setCustomMinutesInput('45');
    setRemainingSeconds(45 * 60);
    try {
      localStorage.removeItem('zero_presets_v1');
      localStorage.removeItem('zero_active_preset_v1');
      localStorage.removeItem('zero_custom_mins_v1');
    } catch {}
  };

  const formatTime = (totalSecs) => {
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };
  
  // Navigation & Core State
  const [activeTab, setActiveTab] = useState('LOCK'); // 'LOCK' | 'SUITCASE' | 'LEDGER' | 'SYSTEM'
  const [durationMinutes, setDurationMinutes] = useState(45);
  const [selectedTag, setSelectedTag] = useState('STUDY // PCM');
  const [customTagInput, setCustomTagInput] = useState('');
  const [showCustomTag, setShowCustomTag] = useState(false);

  // Suitcase Selection (Max 3 packed modules)
  const [packedTools, setPackedTools] = useState(() =>
    loadStorage('blockit_packed_tools', ['CALC', 'SCRATCHPAD', 'ACOUSTIC'])
  );
  const [activeToolModal, setActiveToolModal] = useState(null); // ID of currently open Suitcase tool

  // Acoustic Shield state (persists while modal closes)
  const [noiseState, setNoiseState] = useState({
    playing: false,
    type: 'BROWN',
    volume: 0.35
  });

  // System & Hardware Preferences
  const [settings, setSettings] = useState(() =>
    loadStorage('blockit_settings', {
      soundEnabled: true,
      hapticsEnabled: true,
      strictBreachDetection: true,
      autoFullscreen: true,
      burnInProtection: true,
      parachutesRemaining: 3
    })
  );

  // Active Lock Session State
  const [isLockedIn, setIsLockedIn] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [totalSessionSeconds, setTotalSessionSeconds] = useState(0);
  const [sessionBreaches, setSessionBreaches] = useState(0);
  const [breachOverlayVisible, setBreachOverlayVisible] = useState(false);
  const [lastBreachReason, setLastBreachReason] = useState('');
  const [zenFlipMode, setZenFlipMode] = useState(false);
  const [pixelShiftOffset, setPixelShiftOffset] = useState({ x: 0, y: 0 });
  const [wakeLockActive, setWakeLockActive] = useState(false);

  // Parachute 2-Stage High-Friction State
  const [parachuteModalOpen, setParachuteModalOpen] = useState(false);
  const [parachuteStage, setParachuteStage] = useState(1); // 1 = 8s Hold, 2 = Exact Phrase
  const [holdProgress, setHoldProgress] = useState(0); // 0 to 100
  const [targetPhrase, setTargetPhrase] = useState(PARACHUTE_PHRASES[0]);
  const [typedPhrase, setTypedPhrase] = useState('');

  // Session Completion Summary Modal
  const [completedSummary, setCompletedSummary] = useState(null);

  // Session History Ledger
  const [history, setHistory] = useState(() =>
    loadStorage('blockit_history', generateInitialHistory())
  );

  // Current time ticker for accurate "UNLOCKS AT" display
  const [nowTime, setNowTime] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNowTime(Date.now()), 15000);
    return () => clearInterval(t);
  }, []);

  // Sync settings to SoundEngine & LocalStorage
  useEffect(() => {
    soundEngine.enabled = settings.soundEnabled;
    soundEngine.hapticsEnabled = settings.hapticsEnabled;
    saveStorage('blockit_settings', settings);
  }, [settings]);

  useEffect(() => {
    saveStorage('blockit_packed_tools', packedTools);
  }, [packedTools]);

  useEffect(() => {
    saveStorage('blockit_history', history);
  }, [history]);

  // Calculate estimated unlock timestamp
  const unlockTimeString = useMemo(() => {
    const target = new Date(nowTime + durationMinutes * 60000);
    return target.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }, [nowTime, durationMinutes]);

  // Screen Wake Lock Manager
  const wakeLockRef = useRef(null);
  const requestWakeLock = async () => {
    try {
      if ('wakeLock' in navigator) {
        wakeLockRef.current = await navigator.wakeLock.request('screen');
        setWakeLockActive(true);
        wakeLockRef.current.addEventListener('release', () => {
          setWakeLockActive(false);
        });
      }
    } catch (e) {
      setWakeLockActive(false);
    }
  };

  const releaseWakeLock = async () => {
    try {
      if (wakeLockRef.current) {
        await wakeLockRef.current.release();
        wakeLockRef.current = null;
        setWakeLockActive(false);
      }
    } catch (e) {}
  };

  // Fullscreen Helper
  const enterFullscreen = async () => {
    try {
      if (document.documentElement.requestFullscreen && !document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
      }
    } catch (e) {}
  };

  const exitFullscreen = async () => {
    try {
      if (document.fullscreenElement && document.exitFullscreen) {
        await document.exitFullscreen();
      }
    } catch (e) {}
  };

  // ============================================================================
  // START & FINISH LOCK SESSION
  // ============================================================================
  const engageLockSession = () => {
    soundEngine.playLatch();
    const totalSecs = durationMinutes * 60;
    setTotalSessionSeconds(totalSecs);
    setSecondsLeft(totalSecs);
    setSessionBreaches(0);
    setBreachOverlayVisible(false);
    setParachuteModalOpen(false);
    setIsLockedIn(true);

    requestWakeLock();
    if (settings.autoFullscreen) {
      enterFullscreen();
    }
  };

  const finishSession = useCallback(
    (outcome = 'COMPLETED') => {
      soundEngine.stopTensionRiser();
      soundEngine.stopAcousticShield();
      setNoiseState((prev) => ({ ...prev, playing: false }));
      releaseWakeLock();
      exitFullscreen();

      const elapsedSeconds = totalSessionSeconds - secondsLeft;
      const actualMinutes =
        outcome === 'COMPLETED'
          ? durationMinutes
          : Math.max(1, Math.round(elapsedSeconds / 60));

      const record = {
        id: `sess-${Date.now()}`,
        timestamp: Date.now(),
        durationMinutes,
        actualMinutes,
        tag: selectedTag,
        outcome,
        breaches: sessionBreaches
      };

      setHistory((prev) => [record, ...prev]);
      setIsLockedIn(false);
      setParachuteModalOpen(false);
      setActiveToolModal(null);

      if (outcome === 'COMPLETED') {
        soundEngine.playSuccessChime();
      } else {
        soundEngine.playClick(0.7);
      }

      setCompletedSummary(record);
    },
    [totalSessionSeconds, secondsLeft, durationMinutes, selectedTag, sessionBreaches]
  );

  // Active Lock Countdown Timer
  useEffect(() => {
    if (!isLockedIn) return;
    const timer = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          finishSession('COMPLETED');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [isLockedIn, finishSession]);

  // AMOLED Burn-in Pixel Shifter (shifts by a few pixels every 30s)
  useEffect(() => {
    if (!isLockedIn || !settings.burnInProtection) {
      setPixelShiftOffset({ x: 0, y: 0 });
      return;
    }
    const interval = setInterval(() => {
      const rx = Math.floor(Math.random() * 12) - 6;
      const ry = Math.floor(Math.random() * 12) - 6;
      setPixelShiftOffset({ x: rx, y: ry });
    }, 30000);
    return () => clearInterval(interval);
  }, [isLockedIn, settings.burnInProtection]);

  // ============================================================================
  // FOCUS INTEGRITY MONITOR (VISIBILITYCHANGE & WINDOW BLUR)
  // ============================================================================
  useEffect(() => {
    if (!isLockedIn || !settings.strictBreachDetection) return;

    const triggerBreach = (reason) => {
      setSessionBreaches((b) => b + 1);
      setLastBreachReason(reason);
      setBreachOverlayVisible(true);
      soundEngine.playBreachAlarm();
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        triggerBreach('TAB SWITCH OR APP MINIMIZED DETECTED');
      }
    };

    const handleWindowBlur = () => {
      // Only trigger if not already hidden to avoid duplicate count
      if (!document.hidden) {
        triggerBreach('WINDOW FOCUS LOST // EXTERNAL INTERACTION');
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleWindowBlur);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleWindowBlur);
    };
  }, [isLockedIn, settings.strictBreachDetection]);

  // ============================================================================
  // PARACHUTE 2-STAGE FRICTION MECHANIC
  // ============================================================================
  const holdIntervalRef = useRef(null);

  const openParachuteModal = () => {
    soundEngine.playClick(0.85);
    const randomPhrase =
      PARACHUTE_PHRASES[Math.floor(Math.random() * PARACHUTE_PHRASES.length)];
    setTargetPhrase(randomPhrase);
    setTypedPhrase('');
    setHoldProgress(0);
    setParachuteStage(1);
    setParachuteModalOpen(true);
  };

  const startHoldingParachute = () => {
    if (settings.parachutesRemaining <= 0) return;
    soundEngine.startTensionRiser();
    const startTime = Date.now();
    const requiredMs = 8000; // 8.0 continuous seconds

    clearInterval(holdIntervalRef.current);
    holdIntervalRef.current = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const pct = Math.min(100, (elapsed / requiredMs) * 100);
      setHoldProgress(pct);

      if (elapsed % 400 < 50) {
        soundEngine.vibrate(12);
      }

      if (pct >= 100) {
        clearInterval(holdIntervalRef.current);
        soundEngine.stopTensionRiser();
        soundEngine.playLatch();
        setParachuteStage(2);
      }
    }, 40);
  };

  const stopHoldingParachute = () => {
    clearInterval(holdIntervalRef.current);
    soundEngine.stopTensionRiser();
    if (holdProgress < 100) {
      setHoldProgress(0);
    }
  };

  const confirmParachuteRelease = () => {
    if (typedPhrase !== targetPhrase) return;
    setSettings((prev) => ({
      ...prev,
      parachutesRemaining: Math.max(0, prev.parachutesRemaining - 1)
    }));
    finishSession('PARACHUTE');
  };

  // ============================================================================
  // SUITCASE PACKING TOGGLE
  // ============================================================================
  const togglePackTool = (id) => {
    soundEngine.playClick(1.05);
    setPackedTools((prev) => {
      if (prev.includes(id)) {
        return prev.filter((item) => item !== id);
      }
      if (prev.length >= 3) {
        // Replace oldest slot or shake
        return [...prev.slice(1), id];
      }
      return [...prev, id];
    });
  };

  // ============================================================================
  // ANALYTICS & 14-DAY DOT-MATRIX COMPUTATION
  // ============================================================================
  const analytics = useMemo(() => {
    const totalMinutes = history.reduce((acc, s) => acc + (s.actualMinutes || 0), 0);
    const completedCount = history.filter((s) => s.outcome === 'COMPLETED').length;
    const cleanSessions = history.filter(
      (s) => s.outcome === 'COMPLETED' && (s.breaches || 0) === 0
    ).length;
    const integrityScore =
      history.length > 0 ? Math.round((cleanSessions / history.length) * 100) : 100;

    // 14-Day Activity Matrix
    const days = [];
    const now = new Date();
    for (let i = 13; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(now.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const dayLabel = d.toLocaleDateString([], { weekday: 'narrow' });
      const dayNum = d.getDate();

      const minsForDay = history
        .filter((s) => new Date(s.timestamp).toISOString().split('T')[0] === dateStr)
        .reduce((sum, s) => sum + (s.actualMinutes || 0), 0);

      days.push({ dateStr, dayLabel, dayNum, minutes: minsForDay });
    }

    return {
      totalHours: Math.floor(totalMinutes / 60),
      remainingMins: totalMinutes % 60,
      totalMinutes,
      completedCount,
      integrityScore,
      days
    };
  }, [history]);

  // Render Suitcase Active Tool Body
  const renderToolContent = (toolId) => {
    switch (toolId) {
      case 'CALC':
        return <SciCalcTool />;
      case 'SCRATCHPAD':
        return <ScratchpadTool />;
      case 'ACOUSTIC':
        return <AcousticShieldTool noiseState={noiseState} setNoiseState={setNoiseState} />;
      case 'DIALER':
        return <EmergencyDialerTool />;
      case 'BREATH':
        return <BreathingPacerTool />;
      case 'DECK':
        return <FormulaDeckTool />;
      default:
        return null;
    }
  };

  // ============================================================================
  // ACTIVE LOCK SCREEN ("LOCKED IN" OVERLAY MODE)
  // ============================================================================
  if (isLockedIn) {
    const progressPct =
      totalSessionSeconds > 0
        ? Math.min(100, ((totalSessionSeconds - secondsLeft) / totalSessionSeconds) * 100)
        : 0;

    return (
      <div className="min-h-screen bg-black text-white font-mono flex flex-col justify-between p-4 sm:p-6 select-none relative overflow-hidden">
        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=DotGothic16&family=JetBrains+Mono:wght@400;600;700;800&display=swap');
          .dot-matrix-title { font-family: 'DotGothic16', 'JetBrains Mono', monospace; letter-spacing: 0.06em; }
        `}</style>

        {/* Top Telemetry Bar */}
        <header className="flex flex-wrap items-center justify-between gap-2 border-b border-[#1F1F1F] pb-3 z-10">
          <div className="flex items-center gap-2.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#FF4500] animate-ping" />
            <span className="text-xs font-bold tracking-widest uppercase text-[#FF4500]">
              LOCKED IN // {selectedTag}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span
              className={`px-2 py-0.5 text-[10px] border ${
                sessionBreaches === 0
                  ? 'border-[#00FF66]/40 text-[#00FF66]'
                  : 'border-[#FF4500] text-[#FF4500]'
              }`}
            >
              BREACHES: {sessionBreaches}
            </span>

            <button
              onClick={() => {
                soundEngine.playClick(1.0);
                setZenFlipMode((z) => !z);
              }}
              className="px-2.5 py-1 bg-[#111111] border border-[#262626] hover:border-white text-[10px] uppercase tracking-wider text-neutral-300"
            >
              {zenFlipMode ? 'HUD MODE' : 'ZEN FLIP'}
            </button>

            <button
              onClick={enterFullscreen}
              className="p-1.5 bg-[#111111] border border-[#262626] hover:border-white text-neutral-400 hover:text-white"
              title="Fullscreen"
            >
              <Maximize2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </header>

        {/* Center Countdown Core (with AMOLED Burn-in Pixel Shift) */}
        <main
          className="flex-1 flex flex-col items-center justify-center my-4 transition-transform duration-1000"
          style={{
            transform: `translate(${pixelShiftOffset.x}px, ${pixelShiftOffset.y}px)`
          }}
        >
          {zenFlipMode ? (
            /* ZEN OVERSIZED FLIP CLOCK */
            <div className="w-full max-w-xl flex flex-col items-center">
              <div className="text-[10px] text-neutral-600 uppercase tracking-[0.3em] mb-4">
                AMOLED ZEN LOCK // {unlockTimeString} UNLOCK
              </div>
              <div className="bg-[#080808] border-2 border-[#1F1F1F] px-8 py-12 sm:px-14 sm:py-16 rounded-sm shadow-2xl relative">
                <div className="absolute inset-x-0 top-1/2 h-[1px] bg-[#1A1A1A]" />
                <div className="text-6xl sm:text-8xl font-black tracking-tight tabular-nums text-white dot-matrix-title">
                  {formatTimeHMS(secondsLeft)}
                </div>
              </div>
            </div>
          ) : (
            /* INDUSTRIAL HUD LOCK DISPLAY */
            <div className="w-full max-w-md bg-[#060606] border border-[#262626] p-6 sm:p-8 relative">
              {/* Corner Hardware Crosshairs */}
              <div className="absolute top-1.5 left-1.5 w-2 h-2 border-t border-l border-[#FF4500]" />
              <div className="absolute top-1.5 right-1.5 w-2 h-2 border-t border-r border-[#FF4500]" />
              <div className="absolute bottom-1.5 left-1.5 w-2 h-2 border-b border-l border-[#FF4500]" />
              <div className="absolute bottom-1.5 right-1.5 w-2 h-2 border-b border-r border-[#FF4500]" />

              <div className="flex justify-between items-center text-[10px] text-neutral-500 uppercase tracking-widest mb-2">
                <span>REMAINING LOCK TIME</span>
                <span className="text-[#00FF66]">
                  {wakeLockActive ? 'WAKE_LOCK: ON' : 'SHIELD: ARMED'}
                </span>
              </div>

              <div className="text-center py-6 border-y border-[#1A1A1A]">
                <div className="text-6xl sm:text-7xl font-black tracking-tighter tabular-nums text-white dot-matrix-title">
                  {formatTimeHMS(secondsLeft)}
                </div>
                <div className="text-xs text-neutral-400 mt-2 tracking-widest uppercase">
                  TARGET UNLOCK: <span className="text-white font-bold">{unlockTimeString}</span>
                </div>
              </div>

              {/* Segmented Industrial Progress Bar */}
              <div className="mt-5 space-y-1.5">
                <div className="flex justify-between text-[10px] uppercase tracking-wider">
                  <span className="text-neutral-500">SESSION COMPLETION</span>
                  <span className="text-[#FF4500] font-bold">{progressPct.toFixed(1)}%</span>
                </div>
                <div className="w-full h-3 bg-[#111111] border border-[#262626] p-0.5">
                  <div
                    className="h-full bg-[#FF4500] transition-all duration-500"
                    style={{ width: `${progressPct}%` }}
                  />
                </div>
              </div>
            </div>
          )}
        </main>

        {/* Bottom Dock: Packed Suitcase Utilities + Parachute Release */}
        <footer className="space-y-3 z-10 max-w-xl w-full mx-auto">
          <div className="text-[10px] text-neutral-500 uppercase tracking-widest text-center">
            PACKED SUITCASE UTILITIES ({packedTools.length}/3 WHITELISTED)
          </div>

          <div className="grid grid-cols-3 gap-2">
            {[0, 1, 2].map((slotIdx) => {
              const toolId = packedTools[slotIdx];
              const mod = SUITCASE_MODULES.find((m) => m.id === toolId);
              if (!mod) {
                return (
                  <div
                    key={slotIdx}
                    className="border border-dashed border-[#1F1F1F] py-3 text-center text-[10px] text-neutral-600 uppercase"
                  >
                    EMPTY SLOT 0{slotIdx + 1}
                  </div>
                );
              }
              const IconComp = mod.icon;
              const isAudioActive = mod.id === 'ACOUSTIC' && noiseState.playing;
              return (
                <button
                  key={mod.id}
                  onClick={() => {
                    soundEngine.playClick(1.1);
                    setActiveToolModal(mod.id);
                  }}
                  className={`p-3 border text-left transition-all flex flex-col justify-between ${
                    isAudioActive
                      ? 'bg-[#111F16] border-[#00FF66] text-white'
                      : 'bg-[#0C0C0C] border-[#262626] hover:border-white text-neutral-200'
                  }`}
                >
                  <div className="flex items-center justify-between w-full mb-1.5">
                    <IconComp
                      className={`w-4 h-4 ${
                        isAudioActive ? 'text-[#00FF66]' : 'text-[#FF4500]'
                      }`}
                    />
                    <span className="text-[9px] text-neutral-500">{mod.code}</span>
                  </div>
                  <div className="text-xs font-bold truncate">{mod.name}</div>
                </button>
              );
            })}
          </div>

          {/* Emergency Parachute Trigger */}
          <div className="pt-2 flex justify-center">
            <button
              onClick={openParachuteModal}
              className="px-4 py-2 bg-[#0A0A0A] border border-[#262626] hover:border-[#FF4500] text-[11px] text-neutral-400 hover:text-[#FF4500] uppercase tracking-widest flex items-center gap-2 transition-colors"
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              PULL EMERGENCY PARACHUTE ({settings.parachutesRemaining} LEFT)
            </button>
          </div>
        </footer>

        {/* SUITCASE UTILITY MODAL INSIDE LOCK SCREEN */}
        {activeToolModal && (
          <div className="fixed inset-0 bg-black/90 backdrop-blur-xs z-40 flex items-center justify-center p-4">
            <div className="w-full max-w-md bg-[#050505] border-2 border-[#333333] p-4 space-y-4">
              <div className="flex items-center justify-between border-b border-[#222222] pb-2.5">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 bg-[#00FF66]" />
                  <span className="text-xs font-bold uppercase tracking-wider">
                    SUITCASE MODULE //{' '}
                    {SUITCASE_MODULES.find((m) => m.id === activeToolModal)?.name}
                  </span>
                </div>
                <button
                  onClick={() => {
                    soundEngine.playClick(0.9);
                    setActiveToolModal(null);
                  }}
                  className="p-1 bg-[#141414] border border-[#262626] text-neutral-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              {renderToolContent(activeToolModal)}
            </div>
          </div>
        )}

        {/* FOCUS BREACH WARNING OVERLAY */}
        {breachOverlayVisible && (
          <div className="fixed inset-0 bg-[#1A0500]/95 z-50 flex items-center justify-center p-4">
            <div className="w-full max-w-md bg-black border-2 border-[#FF4500] p-6 text-center space-y-4 shadow-2xl">
              <div className="w-12 h-12 mx-auto bg-[#FF4500]/20 border border-[#FF4500] flex items-center justify-center text-[#FF4500]">
                <ShieldAlert className="w-7 h-7" />
              </div>
              <div className="text-xs text-[#FF4500] font-bold tracking-[0.2em] uppercase">
                INTEGRITY BREACH LOGGED // #{sessionBreaches}
              </div>
              <h2 className="text-2xl font-black text-white uppercase dot-matrix-title">
                FOCUS PERIMETER VIOLATED
              </h2>
              <p className="text-xs text-neutral-400 leading-relaxed font-mono">
                {lastBreachReason}. This event has been recorded on your permanent session ledger and impacts your Integrity Score.
              </p>
              <button
                onClick={() => {
                  soundEngine.playLatch();
                  setBreachOverlayVisible(false);
                  if (settings.autoFullscreen) enterFullscreen();
                }}
                className="w-full py-3.5 bg-[#FF4500] text-black font-black text-xs uppercase tracking-widest hover:bg-[#ff571a]"
              >
                RETURN TO DEEP FOCUS IMMEDIATELY
              </button>
            </div>
          </div>
        )}

        {/* 2-STAGE HIGH-FRICTION PARACHUTE MODAL */}
        {parachuteModalOpen && (
          <div className="fixed inset-0 bg-black/95 z-50 flex items-center justify-center p-4">
            <div className="w-full max-w-md bg-[#070707] border-2 border-[#FF4500] p-5 space-y-4">
              <div className="flex justify-between items-center border-b border-[#262626] pb-3">
                <span className="text-xs font-bold text-[#FF4500] uppercase tracking-widest">
                  EMERGENCY PARACHUTE // STAGE 0{parachuteStage} OF 02
                </span>
                <button
                  onClick={() => {
                    stopHoldingParachute();
                    setParachuteModalOpen(false);
                  }}
                  className="text-neutral-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {settings.parachutesRemaining <= 0 ? (
                <div className="py-6 text-center space-y-3">
                  <div className="text-sm font-bold text-[#FF4500]">
                    0 PARACHUTES REMAINING THIS WEEK
                  </div>
                  <p className="text-xs text-neutral-400">
                    You have exhausted all 3 emergency releases. Stay locked in until the timer expires.
                  </p>
                </div>
              ) : parachuteStage === 1 ? (
                <div className="space-y-4">
                  <p className="text-xs text-neutral-300 leading-relaxed">
                    To prevent impulsive quitting, press and hold the mechanical release switch below continuously for <span className="text-white font-bold">8.0 seconds</span>. Releasing early resets the latch.
                  </p>

                  {/* Hold Progress Bar */}
                  <div className="w-full h-6 bg-[#111111] border border-[#262626] relative overflow-hidden">
                    <div
                      className="h-full bg-[#FF4500] transition-all duration-75"
                      style={{ width: `${holdProgress}%` }}
                    />
                    <div className="absolute inset-0 flex items-center justify-center text-[11px] font-bold text-white mix-blend-difference">
                      {holdProgress > 0
                        ? `HOLDING... ${(holdProgress * 0.08).toFixed(1)}S / 8.0S`
                        : 'READY TO HOLD (8.0 SECONDS)'}
                    </div>
                  </div>

                  <button
                    onMouseDown={startHoldingParachute}
                    onMouseUp={stopHoldingParachute}
                    onMouseLeave={stopHoldingParachute}
                    onTouchStart={(e) => {
                      e.preventDefault();
                      startHoldingParachute();
                    }}
                    onTouchEnd={stopHoldingParachute}
                    className="w-full py-4 bg-[#1A0B05] border-2 border-[#FF4500] text-[#FF4500] active:bg-[#FF4500] active:text-black font-black text-xs uppercase tracking-widest select-none"
                  >
                    HOLD CONTINUOUSLY TO UNLATCH
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  <p className="text-xs text-neutral-300">
                    Type the exact commitment statement below (case-sensitive, paste disabled) to confirm aborting your session:
                  </p>

                  <div className="p-3 bg-[#111111] border border-[#262626] text-xs text-[#FF4500] font-bold select-none">
                    "{targetPhrase}"
                  </div>

                  <input
                    type="text"
                    value={typedPhrase}
                    onPaste={(e) => e.preventDefault()}
                    onChange={(e) => setTypedPhrase(e.target.value)}
                    placeholder="Type the exact phrase above..."
                    className="w-full bg-black border border-[#333333] focus:border-[#FF4500] focus:outline-none p-3 text-xs text-white font-mono"
                  />

                  <button
                    disabled={typedPhrase !== targetPhrase}
                    onClick={confirmParachuteRelease}
                    className={`w-full py-3.5 text-xs font-black uppercase tracking-widest ${
                      typedPhrase === targetPhrase
                        ? 'bg-[#FF4500] text-black cursor-pointer'
                        : 'bg-[#161616] text-neutral-600 border border-[#262626] cursor-not-allowed'
                    }`}
                  >
                    CONFIRM PARACHUTE ABORT (-1 PARACHUTE)
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    );
  }

  // ============================================================================
  // MAIN HOME INTERFACE (UNLOCKED CONFIGURATION & ANALYTICS)
  // ============================================================================
  return (
    <div className="min-h-screen bg-black text-white font-mono flex flex-col justify-between pb-20">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DotGothic16&family=JetBrains+Mono:wght@400;600;700;800&display=swap');
        .dot-matrix-title { font-family: 'DotGothic16', 'JetBrains Mono', monospace; letter-spacing: 0.06em; }
        .dot-grid-bg {
          background-image: radial-gradient(#1F1F1F 1px, transparent 1px);
          background-size: 14px 14px;
        }
      `}</style>

      {/* Top Industrial Hardware Header */}
      <header className="border-b border-[#222222] bg-black/95 sticky top-0 z-30">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-3 h-3 bg-[#FF4500] flex items-center justify-center">
              <div className="w-1 h-1 bg-black" />
            </div>
            <div>
              <h1 className="text-base font-black tracking-wider uppercase dot-matrix-title leading-none">
                BLOCKIT // ZERO
              </h1>
              <div className="text-[9px] text-neutral-500 tracking-[0.2em] uppercase mt-0.5">
                OS-01 FOCUS DETOX UNIT
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Sound Quick Toggle */}
            <button
              onClick={() => {
                const next = !settings.soundEnabled;
                setSettings((s) => ({ ...s, soundEnabled: next }));
                if (next) {
                  soundEngine.enabled = true;
                  soundEngine.playClick(1.2);
                }
              }}
              className={`px-2.5 py-1 border text-[10px] font-bold uppercase flex items-center gap-1.5 ${
                settings.soundEnabled
                  ? 'bg-[#111111] border-[#262626] text-[#00FF66]'
                  : 'bg-[#0A0A0A] border-[#1F1F1F] text-neutral-500'
              }`}
            >
              {settings.soundEnabled ? (
                <Volume2 className="w-3 h-3" />
              ) : (
                <VolumeX className="w-3 h-3" />
              )}
              SFX {settings.soundEnabled ? 'ON' : 'OFF'}
            </button>

            {/* Parachute Counter Badge */}
            <div
              className="px-2.5 py-1 bg-[#111111] border border-[#262626] text-[10px] text-neutral-300 font-bold uppercase"
              title="Free Weekly Emergency Parachutes"
            >
              PARA: <span className="text-[#FF4500]">{settings.parachutesRemaining}/3</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content Container */}
      <main className="max-w-2xl w-full mx-auto px-4 py-5 flex-1">
        {/* TAB 1: LOCK CONSOLE */}
        {activeTab === 'LOCK' && (
          <div className="space-y-6">
            {/* Rotary Timer Card */}
            <section className="bg-[#060606] border border-[#262626] p-5 relative dot-grid-bg">
              <div className="flex justify-between items-center text-[10px] text-neutral-400 uppercase tracking-widest mb-2">
                <span>01 // ROTARY TIMER MODULE</span>
                <span className="text-[#00FF66] flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#00FF66]" /> READY
                </span>
              </div>

              <RotaryTimerDial
                durationMinutes={durationMinutes}
                onChangeDuration={setDurationMinutes}
                unlockTimeString={unlockTimeString}
              />

              {/* Quick Duration Presets */}
              <div className="mt-5 pt-4 border-t border-[#1A1A1A]">
                <div className="text-[10px] text-neutral-500 uppercase tracking-widest mb-2">
                  QUICK PRESET DETENTS
                </div>
                <div className="grid grid-cols-7 gap-1.5">
                  {QUICK_PRESETS.map((preset) => {
                    const active = durationMinutes === preset;
                    return (
                      <button
                        key={preset}
                        onClick={() => {
                          soundEngine.playClick(1.1);
                          setDurationMinutes(preset);
                        }}
                        className={`py-2 text-xs font-bold border transition-all ${
                          active
                            ? 'bg-[#FF4500] text-black border-[#FF4500]'
                            : 'bg-[#111111] text-neutral-300 border-[#262626] hover:border-neutral-500'
                        }`}
                      >
                        {preset >= 60 ? `${preset / 60}H` : `${preset}M`}
                      </button>
                    );
                  })}
                </div>
              </div>
            </section>

            {/* Session Tag Selector */}
            <section className="bg-[#060606] border border-[#262626] p-4 space-y-3">
              <div className="flex justify-between items-center text-[10px] text-neutral-400 uppercase tracking-widest">
                <span>02 // PROTOCOL TAG</span>
                <button
                  onClick={() => setShowCustomTag((s) => !s)}
                  className="text-[#FF4500] hover:underline"
                >
                  {showCustomTag ? 'CLOSE CUSTOM' : '+ CUSTOM TAG'}
                </button>
              </div>

              {showCustomTag && (
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={customTagInput}
                    onChange={(e) => setCustomTagInput(e.target.value)}
                    placeholder="E.G. JEE MOCK TEST..."
                    className="flex-1 bg-[#111111] border border-[#262626] px-3 py-1.5 text-xs text-white uppercase focus:outline-none focus:border-[#FF4500]"
                  />
                  <button
                    onClick={() => {
                      if (customTagInput.trim()) {
                        soundEngine.playClick(1.2);
                        setSelectedTag(customTagInput.trim().toUpperCase());
                        setShowCustomTag(false);
                      }
                    }}
                    className="px-4 py-1.5 bg-[#FF4500] text-black text-xs font-black uppercase"
                  >
                    SET
                  </button>
                </div>
              )}

              <div className="flex flex-wrap gap-1.5">
                {SESSION_TAGS.map((tag) => {
                  const active = selectedTag === tag;
                  return (
                    <button
                      key={tag}
                      onClick={() => {
                        soundEngine.playClick(1.0);
                        setSelectedTag(tag);
                      }}
                      className={`px-3 py-1.5 text-xs font-bold border transition-all ${
                        active
                          ? 'bg-white text-black border-white'
                          : 'bg-[#111111] text-neutral-400 border-[#262626] hover:border-neutral-500'
                      }`}
                    >
                      {tag}
                    </button>
                  );
                })}
              </div>
            </section>

            {/* Packed Suitcase Summary Preview */}
            <section className="bg-[#060606] border border-[#262626] p-4 space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-[10px] text-neutral-400 uppercase tracking-widest">
                  03 // PACKED SUITCASE ({packedTools.length}/3 SLOTS)
                </span>
                <button
                  onClick={() => {
                    soundEngine.playClick(1.0);
                    setActiveTab('SUITCASE');
                  }}
                  className="text-[11px] text-[#00FF66] hover:underline uppercase font-bold"
                >
                  CONFIGURE SLOTS →
                </button>
              </div>

              <div className="grid grid-cols-3 gap-2">
                {[0, 1, 2].map((slotIdx) => {
                  const toolId = packedTools[slotIdx];
                  const mod = SUITCASE_MODULES.find((m) => m.id === toolId);
                  if (!mod) {
                    return (
                      <button
                        key={slotIdx}
                        onClick={() => setActiveTab('SUITCASE')}
                        className="border border-dashed border-[#262626] p-2.5 text-center text-[10px] text-neutral-600 hover:border-neutral-400"
                      >
                        + PACK SLOT 0{slotIdx + 1}
                      </button>
                    );
                  }
                  const IconComp = mod.icon;
                  return (
                    <button
                      key={mod.id}
                      onClick={() => {
                        soundEngine.playClick(1.1);
                        setActiveToolModal(mod.id);
                      }}
                      className="bg-[#111111] border border-[#262626] hover:border-[#00FF66] p-2.5 text-left flex items-center gap-2 transition-colors"
                    >
                      <IconComp className="w-4 h-4 text-[#FF4500] shrink-0" />
                      <div className="truncate">
                        <div className="text-[11px] font-bold text-white truncate">
                          {mod.name}
                        </div>
                        <div className="text-[9px] text-neutral-500">TAP TO TEST</div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </section>

            {/* Primary Hardware Engage Lock Button */}
            <button
              onClick={engageLockSession}
              className="w-full py-4 bg-[#FF4500] hover:bg-[#ff571a] active:scale-[0.99] text-black font-black text-sm uppercase tracking-[0.2em] border-2 border-[#FF4500] shadow-[0_0_25px_rgba(255,69,0,0.3)] flex items-center justify-center gap-3 transition-all"
            >
              <Lock className="w-4 h-4 stroke-[2.5]" />
              ENGAGE FOCUS LOCK // {durationMinutes} MIN
            </button>
          </div>
        )}

        {/* TAB 2: THE SUITCASE (WHITELIST & BUILT-IN OFFLINE UTILITIES) */}
        {activeTab === 'SUITCASE' && (
          <div className="space-y-5">
            <div className="bg-[#080808] border border-[#262626] p-4">
              <div className="text-[10px] text-[#00FF66] uppercase tracking-widest mb-1">
                WHITELIST LOADOUT // {packedTools.length} OF 3 SLOTS PACKED
              </div>
              <h2 className="text-lg font-black uppercase dot-matrix-title">
                PACK YOUR FOCUS SUITCASE
              </h2>
              <p className="text-xs text-neutral-400 mt-1">
                Select up to 3 offline tools to bring with you into the Lock Screen. You can also test any module right now.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {SUITCASE_MODULES.map((mod) => {
                const isPacked = packedTools.includes(mod.id);
                const slotIndex = packedTools.indexOf(mod.id) + 1;
                const IconComp = mod.icon;

                return (
                  <div
                    key={mod.id}
                    className={`border p-4 flex flex-col justify-between transition-all ${
                      isPacked
                        ? 'bg-[#101010] border-[#00FF66]'
                        : 'bg-[#070707] border-[#262626]'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <div
                            className={`p-2 border ${
                              isPacked
                                ? 'bg-[#00FF66]/10 border-[#00FF66] text-[#00FF66]'
                                : 'bg-[#141414] border-[#262626] text-[#FF4500]'
                            }`}
                          >
                            <IconComp className="w-4 h-4" />
                          </div>
                          <div>
                            <div className="text-xs font-bold text-white">{mod.name}</div>
                            <div className="text-[10px] text-neutral-500">MODULE // {mod.code}</div>
                          </div>
                        </div>

                        {isPacked && (
                          <span className="px-2 py-0.5 bg-[#00FF66] text-black text-[10px] font-black uppercase">
                            SLOT 0{slotIndex}
                          </span>
                        )}
                      </div>

                      <p className="text-xs text-neutral-400 leading-relaxed mb-4">
                        {mod.desc}
                      </p>
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={() => togglePackTool(mod.id)}
                        className={`flex-1 py-2 text-xs font-bold uppercase border ${
                          isPacked
                            ? 'bg-[#1C1C1C] border-[#333333] text-neutral-300 hover:border-[#FF4500] hover:text-[#FF4500]'
                            : 'bg-[#FF4500] border-[#FF4500] text-black'
                        }`}
                      >
                        {isPacked ? 'UNPACK' : 'PACK IN SUITCASE'}
                      </button>
                      <button
                        onClick={() => {
                          soundEngine.playClick(1.1);
                          setActiveToolModal(mod.id);
                        }}
                        className="px-3 py-2 bg-[#141414] border border-[#262626] hover:border-white text-xs text-neutral-300 uppercase"
                      >
                        OPEN
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* TAB 3: ANALYTICS & SESSION LEDGER */}
        {activeTab === 'LEDGER' && (
          <div className="space-y-5">
            {/* Top KPI Cards */}
            <div className="grid grid-cols-3 gap-2.5">
              <div className="bg-[#080808] border border-[#262626] p-3.5">
                <div className="text-[10px] text-neutral-500 uppercase">TOTAL FOCUSED</div>
                <div className="text-2xl font-black text-white mt-1 tabular-nums dot-matrix-title">
                  {analytics.totalHours}H {analytics.remainingMins}M
                </div>
              </div>
              <div className="bg-[#080808] border border-[#262626] p-3.5">
                <div className="text-[10px] text-neutral-500 uppercase">INTEGRITY SCORE</div>
                <div className="text-2xl font-black text-[#00FF66] mt-1 tabular-nums dot-matrix-title">
                  {analytics.integrityScore}%
                </div>
              </div>
              <div className="bg-[#080808] border border-[#262626] p-3.5">
                <div className="text-[10px] text-neutral-500 uppercase">LOCKS COMPLETED</div>
                <div className="text-2xl font-black text-[#FF4500] mt-1 tabular-nums dot-matrix-title">
                  {analytics.completedCount}
                </div>
              </div>
            </div>

            {/* 14-Day Dot-Matrix Activity Graph */}
            <div className="bg-[#080808] border border-[#262626] p-4 space-y-3">
              <div className="flex justify-between items-center text-[10px] text-neutral-400 uppercase tracking-widest">
                <span>14-DAY FOCUS MATRIX</span>
                <span className="text-[#00FF66]">MINUTES / DAY</span>
              </div>

              <div className="grid grid-cols-14 gap-1.5 items-end h-32 pt-4 border-b border-[#1F1F1F]">
                {analytics.days.map((d, idx) => {
                  const heightPct = Math.min(100, Math.round((d.minutes / 120) * 100));
                  return (
                    <div
                      key={idx}
                      className="flex flex-col items-center justify-end h-full group relative"
                    >
                      <div className="w-full flex-1 flex items-end justify-center">
                        <div
                          className={`w-full transition-all ${
                            d.minutes > 0 ? 'bg-[#00FF66]' : 'bg-[#1A1A1A]'
                          }`}
                          style={{ height: `${Math.max(6, heightPct)}%` }}
                          title={`${d.dateStr}: ${d.minutes} mins`}
                        />
                      </div>
                      <span className="text-[9px] text-neutral-500 mt-1.5">{d.dayLabel}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Session History Log */}
            <div className="bg-[#080808] border border-[#262626] p-4 space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-[10px] text-neutral-400 uppercase tracking-widest">
                  IMMUTABLE SESSION LEDGER ({history.length})
                </span>
                <button
                  onClick={() => {
                    const dataStr =
                      'data:text/json;charset=utf-8,' +
                      encodeURIComponent(JSON.stringify(history, null, 2));
                    const a = document.createElement('a');
                    a.setAttribute('href', dataStr);
                    a.setAttribute('download', `blockit-zero-ledger-${Date.now()}.json`);
                    a.click();
                  }}
                  className="text-[10px] text-[#FF4500] hover:underline uppercase font-bold flex items-center gap-1"
                >
                  <Download className="w-3 h-3" /> EXPORT JSON
                </button>
              </div>

              <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                {history.length === 0 ? (
                  <div className="text-xs text-neutral-500 py-6 text-center">
                    No focus sessions recorded yet.
                  </div>
                ) : (
                  history.map((item) => (
                    <div
                      key={item.id}
                      className="bg-[#0E0E0E] border border-[#222222] p-3 flex items-center justify-between"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-white">{item.tag}</span>
                          <span
                            className={`text-[9px] px-1.5 py-0.5 font-bold uppercase ${
                              item.outcome === 'COMPLETED'
                                ? 'bg-[#00FF66]/15 text-[#00FF66] border border-[#00FF66]/40'
                                : 'bg-[#FF4500]/15 text-[#FF4500] border border-[#FF4500]/40'
                            }`}
                          >
                            {item.outcome}
                          </span>
                        </div>
                        <div className="text-[10px] text-neutral-500 mt-1">
                          {new Date(item.timestamp).toLocaleDateString()} // BREACHES:{' '}
                          {item.breaches || 0}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-black text-white tabular-nums">
                          {item.actualMinutes} MIN
                        </div>
                        <div className="text-[10px] text-neutral-500">
                          TARGET: {item.durationMinutes}M
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: SYSTEM SETTINGS */}
        {activeTab === 'SYSTEM' && (
          <div className="space-y-4">
            <div className="bg-[#080808] border border-[#262626] p-4 space-y-4">
              <div className="text-xs font-bold uppercase tracking-widest text-[#FF4500]">
                HARDWARE & PROTOCOL CONFIGURATION
              </div>

              {[
                {
                  key: 'soundEnabled',
                  label: 'TACTILE WEB-AUDIO SYNTHESIZER',
                  desc: 'Mechanical rotary clicks, pneumatic lock latch, and breach alarms'
                },
                {
                  key: 'hapticsEnabled',
                  label: 'HAPTIC PULSE FEEDBACK',
                  desc: 'Triggers navigator.vibrate(10) on mobile devices'
                },
                {
                  key: 'strictBreachDetection',
                  label: 'FOCUS PERIMETER MONITOR',
                  desc: 'Logs a Breach and sounds alarm if you switch tabs or minimize while locked'
                },
                {
                  key: 'autoFullscreen',
                  label: 'AUTO-REQUEST FULLSCREEN & WAKE LOCK',
                  desc: 'Keeps AMOLED screen awake and hides system bars during lock'
                },
                {
                  key: 'burnInProtection',
                  label: 'AMOLED PIXEL-SHIFT GUARD',
                  desc: 'Subtly orbits the countdown clock every 30s to prevent OLED burn-in'
                }
              ].map((item) => (
                <div
                  key={item.key}
                  className="flex items-center justify-between border-b border-[#1A1A1A] pb-3"
                >
                  <div className="pr-4">
                    <div className="text-xs font-bold text-white">{item.label}</div>
                    <div className="text-[11px] text-neutral-500 mt-0.5">{item.desc}</div>
                  </div>
                  <button
                    onClick={() => {
                      soundEngine.playClick(1.1);
                      setSettings((s) => ({ ...s, [item.key]: !s[item.key] }));
                    }}
                    className={`px-3 py-1.5 text-xs font-bold border ${
                      settings[item.key]
                        ? 'bg-[#00FF66] text-black border-[#00FF66]'
                        : 'bg-[#141414] text-neutral-500 border-[#262626]'
                    }`}
                  >
                    {settings[item.key] ? 'ENABLED' : 'DISABLED'}
                  </button>
                </div>
              ))}

              {/* Parachute Refill & Ledger Reset */}
              <div className="pt-2 flex flex-col sm:flex-row gap-2">
                <button
                  onClick={() => {
                    soundEngine.playLatch();
                    setSettings((s) => ({ ...s, parachutesRemaining: 3 }));
                  }}
                  className="flex-1 py-2.5 bg-[#141414] border border-[#262626] hover:border-[#00FF66] text-xs font-bold text-white uppercase"
                >
                  RESET WEEKLY PARACHUTES (3/3)
                </button>
                <button
                  onClick={() => {
                    soundEngine.playClick(0.8);
                    setHistory([]);
                  }}
                  className="flex-1 py-2.5 bg-[#1A0805] border border-[#FF4500]/50 hover:border-[#FF4500] text-xs font-bold text-[#FF4500] uppercase"
                >
                  CLEAR SESSION LEDGER
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* SUITCASE TOOL PREVIEW MODAL (WHEN OPENED FROM HOME SCREEN) */}
      {activeToolModal && !isLockedIn && (
        <div className="fixed inset-0 bg-black/90 z-40 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-[#060606] border-2 border-[#333333] p-4 space-y-4">
            <div className="flex items-center justify-between border-b border-[#222222] pb-2.5">
              <span className="text-xs font-bold uppercase tracking-wider text-[#00FF66]">
                MODULE TEST // {SUITCASE_MODULES.find((m) => m.id === activeToolModal)?.name}
              </span>
              <button
                onClick={() => setActiveToolModal(null)}
                className="p-1 bg-[#141414] border border-[#262626] text-neutral-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            {renderToolContent(activeToolModal)}
          </div>
        </div>
      )}

      {/* SESSION COMPLETED SUMMARY MODAL */}
      {completedSummary && (
        <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-[#070707] border-2 border-[#00FF66] p-6 text-center space-y-4">
            <div className="text-xs font-bold uppercase tracking-[0.2em] text-[#00FF66]">
              SESSION DEBBRIEF // {completedSummary.outcome}
            </div>
            <h3 className="text-2xl font-black text-white dot-matrix-title">
              {completedSummary.outcome === 'COMPLETED'
                ? 'LOCK PROTOCOL COMPLETE'
                : 'PARACHUTE DEPLOYED'}
            </h3>
            <div className="grid grid-cols-3 gap-2 bg-[#111111] border border-[#262626] p-3 text-xs">
              <div>
                <div className="text-[10px] text-neutral-500">DURATION</div>
                <div className="font-bold text-white mt-0.5">
                  {completedSummary.actualMinutes} MIN
                </div>
              </div>
              <div>
                <div className="text-[10px] text-neutral-500">TAG</div>
                <div className="font-bold text-white mt-0.5 truncate">
                  {completedSummary.tag}
                </div>
              </div>
              <div>
                <div className="text-[10px] text-neutral-500">BREACHES</div>
                <div className="font-bold text-[#00FF66] mt-0.5">
                  {completedSummary.breaches}
                </div>
              </div>
            </div>
            <button
              onClick={() => setCompletedSummary(null)}
              className="w-full py-3 bg-[#00FF66] text-black font-black text-xs uppercase tracking-widest"
            >
              LOG TO LEDGER & CONTINUE
            </button>
          </div>
        </div>
      )}

      {/* Bottom Industrial Navigation Dock */}
      <nav className="fixed bottom-0 inset-x-0 bg-black border-t border-[#222222] z-30">
        <div className="max-w-2xl mx-auto grid grid-cols-4">
          {[
            { id: 'LOCK', label: '01 // LOCK', icon: Lock },
            { id: 'SUITCASE', label: '02 // SUITCASE', icon: Briefcase },
            { id: 'LEDGER', label: '03 // LEDGER', icon: BarChart3 },
            { id: 'SYSTEM', label: '04 // SYSTEM', icon: Settings }
          ].map((tab) => {
            const IconComp = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  soundEngine.playClick(1.0);
                  setActiveTab(tab.id);
                }}
                className={`py-3 flex flex-col items-center justify-center gap-1 border-t-2 transition-colors ${
                  active
                    ? 'border-[#FF4500] text-white bg-[#0C0C0C]'
                    : 'border-transparent text-neutral-500 hover:text-neutral-300'
                }`}
              >
                <IconComp
                  className={`w-4 h-4 ${active ? 'text-[#FF4500]' : 'text-neutral-500'}`}
                />
                <span className="text-[10px] font-bold tracking-wider uppercase">
                  {tab.label}
                </span>
              </button>
            );
          })}
        </div>
      </nav>
    
      {/* --- ZERO UNIFIED UI --- */}
      <div className="amoled-card rounded-2xl p-5 my-4 max-w-md mx-auto">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-semibold tracking-wide text-purple-200">ZERO</h2>
            {!isEngaged && (
              <button
                type="button"
                onClick={resetBagsToDefault}
                className="text-[11px] text-purple-400/60 hover:text-purple-300 underline cursor-pointer"
                title="Restore default preset bags and timer"
              >
                Reset
              </button>
            )}
          </div>
          <span className="text-xs px-2.5 py-1 rounded-full bg-purple-950/80 border border-purple-500/30 text-purple-300">
            {isEngaged ? '🔒 Engaged' : '🔓 Standby'}
          </span>
        </div>

        <div className="flex items-center justify-between mb-5 pb-4 border-b border-white/10">
          <div>
            <span className="text-[11px] uppercase tracking-wider text-purple-400/80 block">Session Timer</span>
            <span className="text-3xl font-mono font-bold text-purple-100">
              {formatTime(remainingSeconds)}
            </span>
          </div>
          {!isEngaged && (
            <form onSubmit={handleCustomTimerSet} className="flex items-center gap-1.5">
              <input
                type="number"
                min="1"
                max="720"
                value={customMinutesInput}
                onChange={(e) => setCustomMinutesInput(e.target.value)}
                className="w-16 bg-black/60 border border-purple-500/30 rounded-lg px-2.5 py-1.5 text-sm text-center text-purple-100 focus:outline-none focus:border-purple-400"
                placeholder="Min"
              />
              <button
                type="submit"
                className="px-3 py-1.5 rounded-lg bg-purple-600/30 border border-purple-500/40 text-purple-200 text-xs font-medium hover:bg-purple-600/50 cursor-pointer"
              >
                Save Mins
              </button>
            </form>
          )}
        </div>

        <div className="grid grid-cols-3 gap-2 mb-4">
          {Object.entries(presets).map(([key, preset]) => (
            <button
              key={key}
              type="button"
              onClick={() => !isEngaged && setActivePreset(key)}
              disabled={isEngaged}
              className={`p-2.5 rounded-xl border text-center transition-all ${
                activePreset === key
                  ? preset.color + ' bg-purple-950/50 scale-[1.02]'
                  : 'border-white/10 text-gray-400 opacity-60 hover:opacity-100'
              } ${isEngaged ? 'cursor-not-allowed' : 'cursor-pointer'}`}
            >
              <div className="text-xl mb-1">{preset.icon}</div>
              <div className="text-xs font-medium">{preset.name}</div>
            </button>
          ))}
        </div>

        <div className="mb-4">
          <p className="text-xs uppercase tracking-wider text-purple-400/80 mb-2">
            Allowed in {presets[activePreset].name}
          </p>
          <div className="flex flex-wrap gap-1.5 mb-3">
            {presets[activePreset].allowed.map((app) => (
              <span
                key={app}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-lg bg-white/5 border border-white/10 text-purple-100"
              >
                {app}
                {!isEngaged && (
                  <button
                    type="button"
                    onClick={() => removeAppFromActiveBag(app)}
                    className="text-purple-400 hover:text-pink-400 font-bold leading-none cursor-pointer"
                    title={`Remove ${app}`}
                  >
                    ×
                  </button>
                )}
              </span>
            ))}
          </div>

          {!isEngaged && (
            <form onSubmit={addAppToActiveBag} className="flex gap-2">
              <input
                type="text"
                value={bagAppInput}
                onChange={(e) => setBagAppInput(e.target.value)}
                placeholder="Add app to active bag..."
                className="flex-1 bg-black/50 border border-purple-500/30 rounded-xl px-3 py-1.5 text-sm text-purple-100 placeholder-purple-400/40 focus:outline-none focus:border-purple-400"
              />
              <button
                type="submit"
                className="px-3.5 py-1.5 rounded-xl bg-purple-600/30 border border-purple-500/40 text-purple-200 text-xs font-medium hover:bg-purple-600/50 cursor-pointer"
              >
                + Add
              </button>
            </form>
          )}
        </div>

        <div className="pt-3 border-t border-white/10 mb-5">
          <p className="text-[11px] text-gray-400 mb-1.5">⚡ Always Permitted (Emergency & Comms)</p>
          <div className="flex flex-wrap gap-1">
            {compulsoryWhitelist.map((item) => (
              <span
                key={item}
                className="px-2 py-0.5 text-[11px] rounded bg-emerald-950/40 border border-emerald-500/20 text-emerald-300/80"
              >
                {item}
              </span>
            ))}
          </div>
        </div>

        <button
          type="button"
          onClick={() => setIsEngaged(!isEngaged)}
          className="btn-engage w-full py-3 rounded-xl text-sm uppercase tracking-wider transition-transform active:scale-95 cursor-pointer"
        >
          {isEngaged ? `Disengage ${APP_NAME}` : `Engage ${presets[activePreset].name}`}
        </button>
      </div>
  
    </div>
  );
}