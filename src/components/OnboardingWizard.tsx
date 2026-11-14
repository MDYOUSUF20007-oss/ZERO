import { useState } from 'react';
import type {
  HabitCalibrationProfile,
  FrictionLevel,
  LaunchModePreset,
  ThemeConfig,
  InterfaceStyle,
  RecurringSchedule,
  OccasionBag,
  BagApp,
} from '../types';
import { createDefaultAppRuleConfig } from '../utils/bagAppConfig';
import { haptics } from '../utils/haptics';
import { useInterfaceStyle } from '../context/InterfaceStyleContext';
import {
  Palette,
  Target,
  Flame,
  ShieldCheck,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  Upload,
  Lock,
  ExternalLink,
  Sliders,
  Sparkles,
  Eye,
  Check,
} from 'lucide-react';

interface OnboardingWizardProps {
  themeConfig: ThemeConfig;
  setThemeConfig: (config: ThemeConfig) => void;
  interfaceStyle: InterfaceStyle;
  setInterfaceStyle: (style: InterfaceStyle) => void;
  installedApps: BagApp[];
  onComplete: (profile: HabitCalibrationProfile, schedules: RecurringSchedule[], bags: OccasionBag[]) => void;
  onOpenRestore: () => void;
}

const PRIMARY_GOALS = [
  { id: 'stop_scrolling', title: 'Stop Mindless Scrolling', desc: 'Break dopamine doomscrolling loops on short-form feeds' },
  { id: 'deep_work', title: 'Reclaim Deep Work Hours', desc: 'Carve out uninterrupted blocks for coding, writing & building' },
  { id: 'sleep_better', title: 'Sleep Before Midnight', desc: 'Eliminate bedtime revenge procrastination and phone glare' },
  { id: 'study_mastery', title: 'Exam Prep & High Focus', desc: 'Eliminate digital temptations during study sessions' },
  { id: 'minimalism', title: 'Digital Minimalism', desc: 'Make your phone a dumb tool rather than a slot machine' },
];

const POPULAR_DISTRACTIONS = [
  { pkg: 'com.instagram.android', name: 'Instagram' },
  { pkg: 'com.google.android.youtube', name: 'YouTube' },
  { pkg: 'com.twitter.android', name: 'X / Twitter' },
  { pkg: 'com.reddit.frontpage', name: 'Reddit' },
  { pkg: 'com.zhiliaoapp.musically', name: 'TikTok' },
  { pkg: 'com.snapchat.android', name: 'Snapchat' },
  { pkg: 'com.facebook.katana', name: 'Facebook' },
  { pkg: 'com.netflix.mediaclient', name: 'Netflix' },
];

const DISTRACTION_TRIGGERS = [
  'Shorts & Reels',
  'Infinite Feeds',
  'Late-Night Boredom',
  'Work Procrastination',
  'Notification Impulses',
  'Social Comparison',
];

const VULNERABILITY_WINDOWS = [
  { id: 'late_night', label: 'Late Night (22:00 – 02:00)', start: '22:00', end: '02:00' },
  { id: 'morning', label: 'Morning Wakeup (06:00 – 09:00)', start: '06:00', end: '09:00' },
  { id: 'afternoon', label: 'Work Afternoon Slump (14:00 – 17:00)', start: '14:00', end: '17:00' },
  { id: 'evening', label: 'Evening Wind-Down (20:00 – 23:00)', start: '20:00', end: '23:00' },
  { id: 'workday', label: 'All-Day Workdays (09:00 – 18:00)', start: '09:00', end: '18:00' },
];

export function OnboardingWizard({
  themeConfig,
  setThemeConfig,
  interfaceStyle,
  setInterfaceStyle,
  installedApps: _installedApps,
  onComplete,
  onOpenRestore,
}: OnboardingWizardProps) {
  const {
    accent,
    setAccent,
    fluentOrbIntensity,
    setFluentOrbIntensity,
    setTheme,
  } = useInterfaceStyle();
  const isCyan = accent === 'cyan';
  const isSelectedBespoke = interfaceStyle === 'bespoke';

  const [step, setStep] = useState<number>(1);
  const totalSteps = 7;

  // Calibration survey state
  const [primaryGoal, setPrimaryGoal] = useState<string>(PRIMARY_GOALS[0].title);
  const [selectedTriggers, setSelectedTriggers] = useState<string[]>(['Shorts & Reels', 'Infinite Feeds']);
  const [selectedApps, setSelectedApps] = useState<string[]>([
    'com.instagram.android',
    'com.google.android.youtube',
  ]);
  const [frictionLevel, setFrictionLevel] = useState<FrictionLevel>('moderate');
  const [vulnerabilityWindow, setVulnerabilityWindow] = useState<string>('late_night');
  const [dailyReclaimTarget, setDailyReclaimTarget] = useState<number>(3);
  const [launchMode, setLaunchMode] = useState<LaunchModePreset>('recommended');

  const toggleTrigger = (trig: string) => {
    haptics.tick(900);
    setSelectedTriggers((prev) =>
      prev.includes(trig) ? prev.filter((t) => t !== trig) : [...prev, trig]
    );
  };

  const toggleApp = (pkg: string) => {
    haptics.tick(900);
    setSelectedApps((prev) =>
      prev.includes(pkg) ? prev.filter((p) => p !== pkg) : [...prev, pkg]
    );
  };

  const handleNext = () => {
    haptics.tick(900);
    if (step < totalSteps) {
      setStep((s) => s + 1);
    } else {
      finalizeOnboarding();
    }
  };

  const handleBack = () => {
    haptics.tick(900);
    if (step > 1) {
      setStep((s) => s - 1);
    }
  };

  const finalizeOnboarding = () => {
    const profile: HabitCalibrationProfile = {
      primaryGoal,
      distractionTriggers: selectedTriggers,
      distractionApps: selectedApps,
      frictionLevel,
      vulnerabilityWindow,
      dailyReclaimTargetHours: dailyReclaimTarget,
      launchMode,
      calibratedAt: Date.now(),
    };

    // Construct recommended routines strictly with isEnabled: false (OFF)
    const windowDef = VULNERABILITY_WINDOWS.find((w) => w.id === vulnerabilityWindow) || VULNERABILITY_WINDOWS[0];
    const recommendedSchedules: RecurringSchedule[] = [
      {
        id: 'rec_vulnerability_window',
        name: `${windowDef.label.split('(')[0].trim()} Shield`,
        startTime: windowDef.start,
        endTime: windowDef.end,
        days: [0, 1, 2, 3, 4, 5, 6],
        isEnabled: false, // CRITICAL: strictly OFF by default
        tag: 'Deep Work',
        preLockWarningMinutes: 5,
      },
      {
        id: 'rec_sleep_shield',
        name: 'Night Sleep Shield',
        startTime: '23:00',
        endTime: '07:00',
        days: [0, 1, 2, 3, 4, 5, 6],
        isEnabled: false, // CRITICAL: strictly OFF by default
        tag: 'Sleep',
        preLockWarningMinutes: 5,
      },
    ];

    const recommendedBags: OccasionBag[] = [
      {
        id: 'bag-work',
        name: 'Deep Focus Bag',
        occasionLabel: 'Distraction-Free Work',
        apps: selectedApps.map((pkg) => {
          const matched = POPULAR_DISTRACTIONS.find((p) => p.pkg === pkg);
          return {
            packageName: pkg,
            appName: matched ? matched.name : pkg.split('.').pop() || pkg,
            category: 'custom' as const,
            ruleConfig: {
              ...createDefaultAppRuleConfig(frictionLevel === 'ironclad' ? 'hard_block' : 'controlled'),
              quotaSeconds: frictionLevel === 'gentle' ? 1800 : 900,
              frictionEnabled: true,
              frictionDelaySeconds: frictionLevel === 'ironclad' ? 15 : 10,
              blockShortVideos: true,
              shortVideoAction: 'back_action' as const,
            },
          };
        }),
        allowCalls: true,
        allowSms: false,
      },
      {
        id: 'bag-family',
        name: 'Evening Calm Bag',
        occasionLabel: 'Rest & Recovery',
        apps: [],
        allowCalls: true,
        allowSms: true,
      },
    ];

    onComplete(profile, recommendedSchedules, recommendedBags);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/75 backdrop-blur-xl text-white flex flex-col justify-between p-4 sm:p-6 selection:bg-white selection:text-black">
      {/* Top Header & Progress Bar */}
      <div className="max-w-lg mx-auto w-full pt-2">
        <div className="flex items-center justify-between text-xs text-zinc-400 font-mono mb-2">
          <span className="flex items-center gap-1.5 font-bold tracking-wider text-white">
            <Sparkles size={14} className={isCyan ? 'text-cyan-400' : 'text-purple-400'} />
            ZERO CALIBRATION
          </span>
          <span>
            STEP {step} OF {totalSteps}
          </span>
        </div>
        <div className="w-full bg-zinc-800/80 h-1.5 rounded-full overflow-hidden">
          <div
            className={`h-full transition-all duration-300 ${
              isCyan
                ? 'bg-gradient-to-r from-cyan-500 to-blue-500 shadow-sm shadow-cyan-400/50'
                : 'bg-gradient-to-r from-purple-500 to-indigo-500 shadow-sm shadow-purple-400/50'
            }`}
            style={{ width: `${(step / totalSteps) * 100}%` }}
          />
        </div>
      </div>

      {/* Main Step Content */}
      <div className="max-w-lg mx-auto w-full my-auto py-6">
        {/* STEP 1: THEME SELECTION & BACKUP RESTORE */}
        {step === 1 && (
          <div className="space-y-5 animate-fadeIn">
            <div>
              <div
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-mono mb-2 border ${
                  isCyan
                    ? 'bg-cyan-500/10 border-cyan-500/30 text-cyan-400'
                    : 'bg-purple-500/10 border-purple-500/30 text-purple-400'
                }`}
              >
                <Palette size={13} /> Visual Preference First
              </div>
              <h2 className="text-2xl font-bold tracking-tight text-white">Choose Your Aesthetic</h2>
              <p className="text-sm text-zinc-300 mt-1 leading-relaxed">
                Zero adapts immediately. Fluent Glass is our primary design system with living ambient mesh &amp; specular acrylic cards.
              </p>
            </div>

            {/* Interface Style Selector */}
            <div className="grid grid-cols-2 gap-3">
              {/* Fluent Glass (Recommended) */}
              <button
                type="button"
                onClick={() => {
                  haptics.tick(900);
                  setInterfaceStyle('fluent_glass');
                  setTheme('fluent_glass');
                }}
                className={`p-3.5 rounded-2xl border text-left transition-all relative overflow-hidden flex flex-col justify-between ${
                  !isSelectedBespoke
                    ? isCyan
                      ? 'border-cyan-400 bg-cyan-950/40 ring-1 ring-cyan-400/50 shadow-xl shadow-cyan-950/50'
                      : 'border-purple-400 bg-purple-950/40 ring-1 ring-purple-400/50 shadow-xl shadow-purple-950/50'
                    : 'border-zinc-800 bg-zinc-900/60 hover:border-zinc-700'
                }`}
              >
                <div>
                  <div className="font-bold text-sm text-white flex items-center justify-between">
                    <span>Fluent Glass</span>
                    {!isSelectedBespoke && (
                      <Check size={16} className={isCyan ? 'text-cyan-400' : 'text-purple-400'} />
                    )}
                  </div>
                  <div
                    className={`inline-block px-1.5 py-0.5 rounded text-[9px] font-mono tracking-wider font-semibold uppercase mt-1.5 border ${
                      !isSelectedBespoke
                        ? isCyan
                          ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40'
                          : 'bg-purple-500/20 text-purple-300 border-purple-500/40'
                        : 'bg-zinc-800 text-zinc-400 border-zinc-700'
                    }`}
                  >
                    RECOMMENDED • ACRYLIC
                  </div>
                  <div className="text-xs text-zinc-300 mt-2 leading-relaxed">
                    Pitch-black canvas with living ambient fluid mesh, specular double-bevel refraction &amp; floating pill dock.
                  </div>
                </div>
              </button>

              {/* Bespoke Minimalist */}
              <button
                type="button"
                onClick={() => {
                  haptics.tick(900);
                  setInterfaceStyle('bespoke');
                  setTheme('bespoke');
                }}
                className={`p-3.5 rounded-2xl border text-left transition-all relative overflow-hidden flex flex-col justify-between ${
                  isSelectedBespoke
                    ? 'border-blue-500 bg-blue-500/10 ring-1 ring-blue-500/50 shadow-xl shadow-blue-950/40'
                    : 'border-zinc-800 bg-zinc-900/60 hover:border-zinc-700'
                }`}
              >
                <div>
                  <div className="font-bold text-sm text-white flex items-center justify-between">
                    <span>Bespoke Minimalist</span>
                    {isSelectedBespoke && <Check size={16} className="text-blue-400" />}
                  </div>
                  <div className="inline-block px-1.5 py-0.5 rounded text-[9px] font-mono tracking-wider font-semibold uppercase mt-1.5 bg-zinc-800 text-zinc-400 border border-zinc-700">
                    MONOCHROME
                  </div>
                  <div className="text-xs text-zinc-400 mt-2 leading-relaxed">
                    Utility typography, sharp borders, pure obsidian black with zero ambient glow.
                  </div>
                </div>
              </button>
            </div>

            {/* Accent Color Selection (Live switch) */}
            <div className="space-y-2 pt-1">
              <label className="text-xs font-mono uppercase text-zinc-400 tracking-wider flex items-center justify-between">
                <span>Accent Color</span>
                <span className="text-[10px] text-zinc-500 font-mono">Applies instantly</span>
              </label>
              <div className="grid grid-cols-2 gap-2.5">
                {/* Deep Purple */}
                <button
                  type="button"
                  onClick={() => {
                    haptics.tick(900);
                    setAccent('purple');
                    setThemeConfig({
                      ...themeConfig,
                      family: 'amoled',
                    });
                  }}
                  className={`p-3 rounded-xl border flex items-center gap-3 transition-all ${
                    accent === 'purple'
                      ? 'border-purple-400 bg-purple-950/50 ring-1 ring-purple-400/50 text-white shadow-md shadow-purple-950/40'
                      : 'border-zinc-800 bg-zinc-900/70 hover:border-zinc-700 text-zinc-300'
                  }`}
                >
                  <div className="w-5 h-5 rounded-full bg-purple-600 border border-purple-400 shrink-0 shadow-sm shadow-purple-500/50" />
                  <div className="text-left min-w-0">
                    <div className="text-xs font-bold leading-tight">Deep Purple</div>
                    <div className="text-[10px] text-purple-300/80 font-mono">#A855F7</div>
                  </div>
                  {accent === 'purple' && <Check size={14} className="text-purple-400 ml-auto shrink-0" />}
                </button>

                {/* Cyber Cyan */}
                <button
                  type="button"
                  onClick={() => {
                    haptics.tick(900);
                    setAccent('cyan');
                    setThemeConfig({
                      ...themeConfig,
                      family: 'amoled',
                    });
                  }}
                  className={`p-3 rounded-xl border flex items-center gap-3 transition-all ${
                    accent === 'cyan'
                      ? 'border-cyan-400 bg-cyan-950/50 ring-1 ring-cyan-400/50 text-white shadow-md shadow-cyan-950/40'
                      : 'border-zinc-800 bg-zinc-900/70 hover:border-zinc-700 text-zinc-300'
                  }`}
                >
                  <div className="w-5 h-5 rounded-full bg-cyan-400 border border-cyan-300 shrink-0 shadow-sm shadow-cyan-400/50" />
                  <div className="text-left min-w-0">
                    <div className="text-xs font-bold leading-tight">Cyber Cyan</div>
                    <div className="text-[10px] text-cyan-300/80 font-mono">#00F0FF</div>
                  </div>
                  {accent === 'cyan' && <Check size={14} className="text-cyan-400 ml-auto shrink-0" />}
                </button>
              </div>
            </div>

            {/* Ambient Mesh Glow Intensity */}
            <div className="space-y-2 pt-1">
              <label className="text-xs font-mono uppercase text-zinc-400 tracking-wider flex items-center justify-between">
                <span>Ambient Mesh Glow</span>
                <span className="text-[10px] text-zinc-500 font-mono">Look at background</span>
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { label: 'Stealth', value: 0, desc: '0% Glow' },
                  { label: 'Subtle', value: 0.35, desc: '35% Balanced' },
                  { label: 'Radiant', value: 0.75, desc: '75% Vibrant' },
                ].map((p) => {
                  const isGlowActive = Math.abs(fluentOrbIntensity - p.value) < 0.15;
                  return (
                    <button
                      key={p.label}
                      type="button"
                      onClick={() => {
                        haptics.tick(900);
                        setFluentOrbIntensity(p.value);
                      }}
                      className={`p-2.5 rounded-xl border text-center transition-all ${
                        isGlowActive
                          ? isCyan
                            ? 'border-cyan-400 bg-cyan-950/40 ring-1 ring-cyan-400/40 text-white'
                            : 'border-purple-400 bg-purple-950/40 ring-1 ring-purple-400/40 text-white'
                          : 'border-zinc-800 bg-zinc-900/60 hover:border-zinc-700 text-zinc-400'
                      }`}
                    >
                      <div className="text-xs font-bold">{p.label}</div>
                      <div className="text-[10px] text-zinc-500 mt-0.5">{p.desc}</div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Instant Backup Restore Shortcut */}
            <div className="pt-2 border-t border-zinc-900">
              <button
                type="button"
                onClick={() => {
                  haptics.tick(900);
                  onOpenRestore();
                }}
                className="w-full py-2.5 px-4 rounded-xl border border-zinc-800 hover:border-zinc-700 bg-zinc-900/40 text-xs font-medium text-zinc-300 flex items-center justify-center gap-2 transition-all"
              >
                <Upload size={14} className="text-zinc-400" />
                Already have a backup? Restore File or Cloud Backup
              </button>
            </div>
          </div>
        )}

        {/* STEP 2: PRIMARY GOAL */}
        {step === 2 && (
          <div className="space-y-4 animate-fadeIn">
            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-500/10 border border-blue-500/30 text-blue-400 text-xs font-mono mb-2">
                <Target size={13} /> Question 1 of 5
              </div>
              <h2 className="text-2xl font-bold tracking-tight text-white">What is your primary goal?</h2>
              <p className="text-sm text-zinc-400 mt-1">
                Zero tunes your recommended blocking profiles and friction triggers to your exact intention.
              </p>
            </div>

            <div className="space-y-2 pt-1">
              {PRIMARY_GOALS.map((g) => {
                const selected = primaryGoal === g.title;
                return (
                  <button
                    key={g.id}
                    type="button"
                    onClick={() => {
                      haptics.tick(900);
                      setPrimaryGoal(g.title);
                    }}
                    className={`w-full p-3.5 rounded-xl border text-left transition-all flex items-start justify-between ${
                      selected
                        ? 'border-blue-500 bg-blue-500/10 ring-1 ring-blue-500/40'
                        : 'border-zinc-800 bg-zinc-900/50 hover:border-zinc-700'
                    }`}
                  >
                    <div>
                      <div className={`font-semibold text-sm ${selected ? 'text-white' : 'text-zinc-200'}`}>
                        {g.title}
                      </div>
                      <div className="text-xs text-zinc-400 mt-0.5">{g.desc}</div>
                    </div>
                    {selected && <CheckCircle2 size={18} className="text-blue-400 shrink-0 mt-0.5" />}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* STEP 3: DISTRACTION TRIGGERS & APP PICKER */}
        {step === 3 && (
          <div className="space-y-4 animate-fadeIn">
            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-500/10 border border-blue-500/30 text-blue-400 text-xs font-mono mb-2">
                <Flame size={13} /> Question 2 of 5
              </div>
              <h2 className="text-2xl font-bold tracking-tight text-white">What hooks your attention?</h2>
              <p className="text-sm text-zinc-400 mt-1">
                Select your top triggers and the apps that drain the most time.
              </p>
            </div>

            {/* Triggers Pills */}
            <div className="space-y-2">
              <label className="text-xs font-mono uppercase text-zinc-400 tracking-wider">
                Distraction Triggers
              </label>
              <div className="flex flex-wrap gap-2">
                {DISTRACTION_TRIGGERS.map((trig) => {
                  const active = selectedTriggers.includes(trig);
                  return (
                    <button
                      key={trig}
                      type="button"
                      onClick={() => toggleTrigger(trig)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                        active
                          ? 'border-blue-400 bg-blue-500/20 text-blue-200'
                          : 'border-zinc-800 bg-zinc-900 text-zinc-400 hover:border-zinc-700'
                      }`}
                    >
                      {trig}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Apps Selection */}
            <div className="space-y-2 pt-2">
              <label className="text-xs font-mono uppercase text-zinc-400 tracking-wider">
                Apps to Place Under Guard
              </label>
              <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1">
                {POPULAR_DISTRACTIONS.map((app) => {
                  const checked = selectedApps.includes(app.pkg);
                  return (
                    <button
                      key={app.pkg}
                      type="button"
                      onClick={() => toggleApp(app.pkg)}
                      className={`p-2.5 rounded-lg border text-left flex items-center justify-between text-xs transition-all ${
                        checked
                          ? 'border-blue-500 bg-blue-500/10 text-white font-medium'
                          : 'border-zinc-800 bg-zinc-900 text-zinc-400 hover:border-zinc-700'
                      }`}
                    >
                      <span className="truncate">{app.name}</span>
                      {checked && <Check size={14} className="text-blue-400 shrink-0 ml-1" />}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* STEP 4: FRICTION LEVEL */}
        {step === 4 && (
          <div className="space-y-4 animate-fadeIn">
            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-500/10 border border-blue-500/30 text-blue-400 text-xs font-mono mb-2">
                <Sliders size={13} /> Question 3 of 5
              </div>
              <h2 className="text-2xl font-bold tracking-tight text-white">Select Your Friction Level</h2>
              <p className="text-sm text-zinc-400 mt-1">
                Friction creates conscious awareness before an impulse turns into mindless scrolling.
              </p>
            </div>

            <div className="space-y-2.5 pt-1">
              {/* Gentle */}
              <button
                type="button"
                onClick={() => {
                  haptics.tick(900);
                  setFrictionLevel('gentle');
                }}
                className={`w-full p-4 rounded-xl border text-left transition-all ${
                  frictionLevel === 'gentle'
                    ? 'border-blue-500 bg-blue-500/10 ring-1 ring-blue-500/40'
                    : 'border-zinc-800 bg-zinc-900/50 hover:border-zinc-700'
                }`}
              >
                <div className="flex items-center justify-between font-semibold text-sm text-white">
                  <span>Gentle Nudge</span>
                  {frictionLevel === 'gentle' && <CheckCircle2 size={18} className="text-blue-400" />}
                </div>
                <div className="text-xs text-zinc-400 mt-1">
                  5-second breathing circle pause with a simple intention reminder. Easy to bypass if truly needed.
                </div>
              </button>

              {/* Moderate */}
              <button
                type="button"
                onClick={() => {
                  haptics.tick(900);
                  setFrictionLevel('moderate');
                }}
                className={`w-full p-4 rounded-xl border text-left transition-all ${
                  frictionLevel === 'moderate'
                    ? 'border-blue-500 bg-blue-500/10 ring-1 ring-blue-500/40'
                    : 'border-zinc-800 bg-zinc-900/50 hover:border-zinc-700'
                }`}
              >
                <div className="flex items-center justify-between font-semibold text-sm text-white">
                  <span className="flex items-center gap-2">
                    Moderate Discipline
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-blue-500/20 text-blue-300">
                      RECOMMENDED
                    </span>
                  </span>
                  {frictionLevel === 'moderate' && <CheckCircle2 size={18} className="text-blue-400" />}
                </div>
                <div className="text-xs text-zinc-400 mt-1">
                  10-second wait, mandatory intention sentence (15+ chars), and short-video auto-back overlay.
                </div>
              </button>

              {/* Ironclad */}
              <button
                type="button"
                onClick={() => {
                  haptics.tick(900);
                  setFrictionLevel('ironclad');
                }}
                className={`w-full p-4 rounded-xl border text-left transition-all ${
                  frictionLevel === 'ironclad'
                    ? 'border-blue-500 bg-blue-500/10 ring-1 ring-blue-500/40'
                    : 'border-zinc-800 bg-zinc-900/50 hover:border-zinc-700'
                }`}
              >
                <div className="flex items-center justify-between font-semibold text-sm text-white">
                  <span>Ironclad Guard</span>
                  {frictionLevel === 'ironclad' && <CheckCircle2 size={18} className="text-blue-400" />}
                </div>
                <div className="text-xs text-zinc-400 mt-1">
                  Immediate hard block during active routines. Zero bypass without burning an Emergency Escape Ticket.
                </div>
              </button>
            </div>
          </div>
        )}

        {/* STEP 5: ROUTINE VULNERABILITY WINDOW & DAILY RECLAIM TARGET */}
        {step === 5 && (
          <div className="space-y-4 animate-fadeIn">
            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-500/10 border border-blue-500/30 text-blue-400 text-xs font-mono mb-2">
                <Target size={13} /> Questions 4 & 5
              </div>
              <h2 className="text-2xl font-bold tracking-tight text-white">Routine Calibration</h2>
              <p className="text-sm text-zinc-400 mt-1">
                When are you most vulnerable to screen time slip-ups?
              </p>
            </div>

            {/* Vulnerability Window */}
            <div className="space-y-2">
              <label className="text-xs font-mono uppercase text-zinc-400 tracking-wider">
                Vulnerability Window
              </label>
              <div className="space-y-1.5">
                {VULNERABILITY_WINDOWS.map((win) => {
                  const selected = vulnerabilityWindow === win.id;
                  return (
                    <button
                      key={win.id}
                      type="button"
                      onClick={() => {
                        haptics.tick(900);
                        setVulnerabilityWindow(win.id);
                      }}
                      className={`w-full p-2.5 rounded-lg border text-left text-xs font-medium flex items-center justify-between transition-all ${
                        selected
                          ? 'border-blue-500 bg-blue-500/10 text-white'
                          : 'border-zinc-800 bg-zinc-900 text-zinc-300 hover:border-zinc-700'
                      }`}
                    >
                      <span>{win.label}</span>
                      {selected && <Check size={14} className="text-blue-400 shrink-0" />}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Daily Reclaim Target */}
            <div className="space-y-2 pt-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-mono uppercase text-zinc-400 tracking-wider">
                  Daily Reclaim Target
                </span>
                <span className="font-bold text-blue-400 font-mono text-sm">
                  {dailyReclaimTarget} Hours / Day
                </span>
              </div>
              <input
                type="range"
                min="1"
                max="6"
                step="1"
                value={dailyReclaimTarget}
                onChange={(e) => setDailyReclaimTarget(parseInt(e.target.value, 10))}
                className="w-full accent-blue-500 cursor-pointer h-2 bg-zinc-800 rounded-lg"
              />
              <div className="flex justify-between text-[10px] text-zinc-500 font-mono">
                <span>1h (Light)</span>
                <span>3h (Standard)</span>
                <span>6h+ (Deep Focus)</span>
              </div>
            </div>
          </div>
        )}

        {/* STEP 6: SHIELD PERMISSIONS & PLAIN-ENGLISH READ ME */}
        {step === 6 && (
          <div className="space-y-4 animate-fadeIn">
            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-500/10 border border-blue-500/30 text-blue-400 text-xs font-mono mb-2">
                <ShieldCheck size={13} /> OS Permissions
              </div>
              <h2 className="text-2xl font-bold tracking-tight text-white">Shield Permissions</h2>
              <p className="text-sm text-zinc-400 mt-1">
                Zero runs locally on your Android OS to enforce app limits without background battery drain.
              </p>
            </div>

            <div className="space-y-2 pt-1 text-xs">
              <div className="p-3 rounded-xl border border-zinc-800 bg-zinc-900/60 flex items-start gap-3">
                <Lock size={18} className="text-blue-400 shrink-0 mt-0.5" />
                <div>
                  <div className="font-semibold text-white">Accessibility Service</div>
                  <div className="text-zinc-400 text-[11px] mt-0.5">
                    Detects foreground app switches to display friction pauses and blocker overlays.
                  </div>
                </div>
              </div>

              <div className="p-3 rounded-xl border border-zinc-800 bg-zinc-900/60 flex items-start gap-3">
                <Eye size={18} className="text-blue-400 shrink-0 mt-0.5" />
                <div>
                  <div className="font-semibold text-white">Usage Access</div>
                  <div className="text-zinc-400 text-[11px] mt-0.5">
                    Aggregates daily focus minutes and screen-time reclaim statistics.
                  </div>
                </div>
              </div>
            </div>

            {/* Plain-English Read Me Card */}
            <div className="p-4 rounded-xl border border-zinc-700/60 bg-zinc-900/90 space-y-2">
              <div className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                <CheckCircle2 size={14} className="text-emerald-400" />
                Plain-English Privacy Guarantee
              </div>
              <p className="text-xs text-zinc-300 leading-relaxed">
                Zero is 100% Free and Open-Source Software (FOSS). It contains zero ads, zero telemetry, and zero tracking code. Your data never leaves your phone.
              </p>
              <a
                href="https://github.com/MDYOUSUF20007-oss/ZERO"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-[11px] font-mono text-blue-400 hover:text-blue-300 transition-colors pt-1"
              >
                Inspect Zero Source Code on GitHub <ExternalLink size={11} />
              </a>
            </div>
          </div>
        )}

        {/* STEP 7: LAUNCH MODES */}
        {step === 7 && (
          <div className="space-y-4 animate-fadeIn">
            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-500/10 border border-blue-500/30 text-blue-400 text-xs font-mono mb-2">
                <Sparkles size={13} /> Final Step
              </div>
              <h2 className="text-2xl font-bold tracking-tight text-white">Choose Your Launch Mode</h2>
              <p className="text-sm text-zinc-400 mt-1">
                Pick how Zero should arm your daily focus starting today.
              </p>
            </div>

            <div className="space-y-2.5 pt-1">
              {/* Recommended Setup */}
              <button
                type="button"
                onClick={() => {
                  haptics.tick(900);
                  setLaunchMode('recommended');
                }}
                className={`w-full p-4 rounded-xl border text-left transition-all ${
                  launchMode === 'recommended'
                    ? 'border-blue-500 bg-blue-500/10 ring-1 ring-blue-500/40'
                    : 'border-zinc-800 bg-zinc-900/50 hover:border-zinc-700'
                }`}
              >
                <div className="flex items-center justify-between font-semibold text-sm text-white">
                  <span>Recommended Setup</span>
                  {launchMode === 'recommended' && <CheckCircle2 size={18} className="text-blue-400" />}
                </div>
                <div className="text-xs text-zinc-400 mt-1">
                  Customized from your survey answers. Recommended routines are prepared in the Schedules tab (initially OFF so you have full control).
                </div>
              </button>

              {/* Full Productive Mode */}
              <button
                type="button"
                onClick={() => {
                  haptics.tick(900);
                  setLaunchMode('full_productive');
                }}
                className={`w-full p-4 rounded-xl border text-left transition-all ${
                  launchMode === 'full_productive'
                    ? 'border-blue-500 bg-blue-500/10 ring-1 ring-blue-500/40'
                    : 'border-zinc-800 bg-zinc-900/50 hover:border-zinc-700'
                }`}
              >
                <div className="flex items-center justify-between font-semibold text-sm text-white">
                  <span>Full Productive Mode</span>
                  {launchMode === 'full_productive' && <CheckCircle2 size={18} className="text-blue-400" />}
                </div>
                <div className="text-xs text-zinc-400 mt-1">
                  High-discipline setting: Strict friction applied to all social apps with zero excuses.
                </div>
              </button>

              {/* Explore by Myself */}
              <button
                type="button"
                onClick={() => {
                  haptics.tick(900);
                  setLaunchMode('explore');
                }}
                className={`w-full p-4 rounded-xl border text-left transition-all ${
                  launchMode === 'explore'
                    ? 'border-blue-500 bg-blue-500/10 ring-1 ring-blue-500/40'
                    : 'border-zinc-800 bg-zinc-900/50 hover:border-zinc-700'
                }`}
              >
                <div className="flex items-center justify-between font-semibold text-sm text-white">
                  <span>Explore by Myself</span>
                  {launchMode === 'explore' && <CheckCircle2 size={18} className="text-blue-400" />}
                </div>
                <div className="text-xs text-zinc-400 mt-1">
                  Clean canvas without pre-set rules. Build your own Bags and Schedules from scratch.
                </div>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Nav Buttons */}
      <div className="max-w-lg mx-auto w-full pt-4 border-t border-zinc-900 flex items-center justify-between gap-3">
        {step > 1 ? (
          <button
            type="button"
            onClick={handleBack}
            className="py-3 px-5 rounded-xl border border-zinc-800 hover:border-zinc-700 text-xs font-semibold text-zinc-300 flex items-center gap-1.5 transition-all"
          >
            <ArrowLeft size={15} /> Back
          </button>
        ) : (
          <div />
        )}

        <button
          type="button"
          onClick={handleNext}
          className={`py-3 px-6 rounded-xl text-white text-xs font-bold flex items-center gap-2 transition-all shadow-lg ${
            isCyan
              ? 'bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 shadow-cyan-500/25'
              : 'bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 shadow-purple-600/25'
          }`}
        >
          <span>{step === totalSteps ? 'Complete Calibration' : 'Continue'}</span>
          <ArrowRight size={15} />
        </button>
      </div>
    </div>
  );
}
