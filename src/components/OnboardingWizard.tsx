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
import {
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
  themeConfig: _themeConfig,
  setThemeConfig: _setThemeConfig,
  interfaceStyle: _interfaceStyle,
  setInterfaceStyle: _setInterfaceStyle,
  installedApps: _installedApps,
  onComplete,
  onOpenRestore,
}: OnboardingWizardProps) {
  const [step, setStep] = useState<number>(1);
  const totalSteps = 6;

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
    <div
      className="fixed inset-0 z-50 overflow-y-auto text-white flex flex-col justify-between p-4 sm:p-6 selection:bg-white selection:text-black"
      style={{
        background:
          'radial-gradient(circle at 18% 12%, rgba(56, 189, 248, 0.22) 0%, transparent 46%), radial-gradient(circle at 84% 82%, rgba(129, 140, 248, 0.20) 0%, transparent 48%), rgba(6, 10, 18, 0.86)',
        backdropFilter: 'blur(26px) saturate(170%)',
        WebkitBackdropFilter: 'blur(26px) saturate(170%)',
        paddingTop: 'max(1rem, var(--zero-safe-top, 0px))',
        paddingBottom: 'max(1rem, var(--zero-safe-bottom, 0px))',
      }}
    >
      {/* Liquid Glass Top Progress Pill */}
      <div className="max-w-lg mx-auto w-full pt-1">
        <div
          className="liquid-card rounded-2xl px-4 py-3"
          style={{
            background: 'linear-gradient(180deg, rgba(255,255,255,0.09) 0%, rgba(16,26,44,0.48) 100%)',
            border: '1px solid rgba(255, 255, 255, 0.16)',
            boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.22), 0 12px 32px rgba(0,0,0,0.35)',
          }}
        >
          <div className="flex items-center justify-between text-xs font-mono mb-2">
            <span className="flex items-center gap-1.5 font-bold tracking-wider text-white">
              <Sparkles size={14} style={{ color: 'var(--accent-primary, #38bdf8)' }} />
              ZERO CALIBRATION
            </span>
            <span className="text-sky-200/80">
              STEP {step} OF {totalSteps}
            </span>
          </div>
          <div
            className="w-full h-1.5 rounded-full overflow-hidden"
            style={{ backgroundColor: 'rgba(255, 255, 255, 0.10)' }}
          >
            <div
              className="h-full rounded-full transition-all duration-300"
              style={{
                width: `${(step / totalSteps) * 100}%`,
                background:
                  'linear-gradient(90deg, var(--accent-primary, #38bdf8), var(--accent-secondary, #818cf8))',
                boxShadow: '0 0 14px rgba(56, 189, 248, 0.65)',
              }}
            />
          </div>
        </div>
      </div>

      {/* Main Liquid Glass Question Surface */}
      <div className="max-w-lg mx-auto w-full my-auto py-5">
        <div
          className="liquid-card rounded-3xl p-5 sm:p-6"
          style={{
            background:
              'linear-gradient(160deg, rgba(255,255,255,0.10) 0%, rgba(15,24,42,0.52) 48%, rgba(10,16,30,0.68) 100%)',
            border: '1px solid rgba(255, 255, 255, 0.18)',
            boxShadow:
              'inset 0 1px 0 rgba(255,255,255,0.28), inset 0 -1px 0 rgba(255,255,255,0.06), 0 24px 60px -12px rgba(0,0,0,0.65)',
            backdropFilter: 'blur(24px) saturate(180%)',
            WebkitBackdropFilter: 'blur(24px) saturate(180%)',
          }}
        >
          {/* STEP 1: PRIMARY GOAL */}
          {step === 1 && (
            <div className="space-y-4 animate-fadeIn">
              <div>
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full liquid-pill-active text-[11px] font-mono mb-2.5">
                  <Target size={13} /> Question 1 of 5
                </div>
                <h2 className="text-2xl font-bold tracking-tight text-white">
                  What is your primary goal?
                </h2>
                <p className="text-sm text-sky-100/75 mt-1 leading-relaxed">
                  Zero tunes your recommended blocking profiles and friction triggers to your exact intention.
                </p>
              </div>

              <div className="space-y-2.5 pt-1">
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
                      className={`w-full p-3.5 rounded-2xl text-left flex items-start justify-between gap-3 liquid-spring cursor-pointer ${
                        selected ? 'liquid-inset' : 'liquid-row'
                      }`}
                      style={{
                        border: selected
                          ? '1px solid var(--accent-border, rgba(56, 189, 248, 0.6))'
                          : '1px solid rgba(255, 255, 255, 0.12)',
                        background: selected
                          ? 'linear-gradient(135deg, rgba(56, 189, 248, 0.22), rgba(129, 140, 248, 0.12))'
                          : 'rgba(255, 255, 255, 0.04)',
                        boxShadow: selected
                          ? 'inset 0 1px 0 rgba(255,255,255,0.28), 0 8px 24px -6px rgba(56, 189, 248, 0.28)'
                          : 'inset 0 1px 0 rgba(255,255,255,0.10)',
                      }}
                    >
                      <div>
                        <div className="font-semibold text-sm text-white">{g.title}</div>
                        <div className="text-xs text-sky-100/65 mt-0.5 leading-snug">{g.desc}</div>
                      </div>
                      {selected && (
                        <CheckCircle2
                          size={18}
                          className="shrink-0 mt-0.5"
                          style={{ color: 'var(--accent-primary, #38bdf8)' }}
                        />
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Instant Backup Restore Shortcut */}
              <div
                className="pt-3"
                style={{ borderTop: '1px solid rgba(255, 255, 255, 0.10)' }}
              >
                <button
                  type="button"
                  onClick={() => {
                    haptics.tick(900);
                    onOpenRestore();
                  }}
                  className="w-full py-2.5 px-4 rounded-2xl liquid-pill text-xs font-medium text-sky-100/85 hover:text-white flex items-center justify-center gap-2 liquid-spring cursor-pointer"
                  style={{
                    border: '1px solid rgba(255, 255, 255, 0.14)',
                    background: 'rgba(255, 255, 255, 0.05)',
                  }}
                >
                  <Upload size={14} style={{ color: 'var(--accent-primary, #38bdf8)' }} />
                  Already have a backup? Restore File or Cloud Backup
                </button>
              </div>
            </div>
          )}

          {/* STEP 2: DISTRACTION TRIGGERS & APP PICKER */}
          {step === 2 && (
            <div className="space-y-4 animate-fadeIn">
              <div>
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full liquid-pill-active text-[11px] font-mono mb-2.5">
                  <Flame size={13} /> Question 2 of 5
                </div>
                <h2 className="text-2xl font-bold tracking-tight text-white">
                  What hooks your attention?
                </h2>
                <p className="text-sm text-sky-100/75 mt-1">
                  Select your top triggers and the apps that drain the most time.
                </p>
              </div>

              {/* Triggers Pills */}
              <div className="space-y-2">
                <label className="text-[11px] font-mono uppercase text-sky-200/70 tracking-wider">
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
                        className={`px-3.5 py-1.5 rounded-full text-xs font-medium liquid-spring cursor-pointer ${
                          active ? 'liquid-pill-active text-white' : 'liquid-pill text-sky-100/75 hover:text-white'
                        }`}
                        style={{
                          border: active
                            ? '1px solid var(--accent-border, rgba(56, 189, 248, 0.6))'
                            : '1px solid rgba(255, 255, 255, 0.14)',
                          background: active
                            ? 'rgba(56, 189, 248, 0.22)'
                            : 'rgba(255, 255, 255, 0.05)',
                        }}
                      >
                        {trig}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Apps Selection */}
              <div className="space-y-2 pt-2">
                <label className="text-[11px] font-mono uppercase text-sky-200/70 tracking-wider">
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
                        className={`p-2.5 rounded-2xl text-left flex items-center justify-between text-xs liquid-spring cursor-pointer ${
                          checked ? 'liquid-inset text-white font-semibold' : 'liquid-row text-sky-100/75'
                        }`}
                        style={{
                          border: checked
                            ? '1px solid var(--accent-border, rgba(56, 189, 248, 0.6))'
                            : '1px solid rgba(255, 255, 255, 0.12)',
                          background: checked
                            ? 'rgba(56, 189, 248, 0.20)'
                            : 'rgba(255, 255, 255, 0.04)',
                        }}
                      >
                        <span className="truncate">{app.name}</span>
                        {checked && (
                          <Check
                            size={14}
                            className="shrink-0 ml-1"
                            style={{ color: 'var(--accent-primary, #38bdf8)' }}
                          />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: FRICTION LEVEL */}
          {step === 3 && (
            <div className="space-y-4 animate-fadeIn">
              <div>
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full liquid-pill-active text-[11px] font-mono mb-2.5">
                  <Sliders size={13} /> Question 3 of 5
                </div>
                <h2 className="text-2xl font-bold tracking-tight text-white">
                  Select Your Friction Level
                </h2>
                <p className="text-sm text-sky-100/75 mt-1">
                  Friction creates conscious awareness before an impulse turns into mindless scrolling.
                </p>
              </div>

              <div className="space-y-2.5 pt-1">
                {[
                  {
                    id: 'gentle' as FrictionLevel,
                    title: 'Gentle Nudge',
                    badge: '',
                    desc: '5-second breathing circle pause with a simple intention reminder. Easy to bypass if truly needed.',
                  },
                  {
                    id: 'moderate' as FrictionLevel,
                    title: 'Moderate Discipline',
                    badge: 'RECOMMENDED',
                    desc: '10-second wait, mandatory intention sentence (15+ chars), and short-video auto-back overlay.',
                  },
                  {
                    id: 'ironclad' as FrictionLevel,
                    title: 'Ironclad Guard',
                    badge: '',
                    desc: 'Immediate hard block during active routines. Zero bypass without burning an Emergency Escape Ticket.',
                  },
                ].map((opt) => {
                  const active = frictionLevel === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => {
                        haptics.tick(900);
                        setFrictionLevel(opt.id);
                      }}
                      className={`w-full p-4 rounded-2xl text-left liquid-spring cursor-pointer ${
                        active ? 'liquid-inset' : 'liquid-row'
                      }`}
                      style={{
                        border: active
                          ? '1px solid var(--accent-border, rgba(56, 189, 248, 0.6))'
                          : '1px solid rgba(255, 255, 255, 0.12)',
                        background: active
                          ? 'linear-gradient(135deg, rgba(56, 189, 248, 0.22), rgba(129, 140, 248, 0.12))'
                          : 'rgba(255, 255, 255, 0.04)',
                        boxShadow: active
                          ? 'inset 0 1px 0 rgba(255,255,255,0.28), 0 8px 24px -6px rgba(56, 189, 248, 0.28)'
                          : 'inset 0 1px 0 rgba(255,255,255,0.10)',
                      }}
                    >
                      <div className="flex items-center justify-between font-semibold text-sm text-white">
                        <span className="flex items-center gap-2">
                          {opt.title}
                          {opt.badge && (
                            <span
                              className="px-2 py-0.5 rounded-full text-[9px] font-mono font-bold"
                              style={{
                                backgroundColor: 'rgba(56, 189, 248, 0.22)',
                                border: '1px solid rgba(56, 189, 248, 0.45)',
                                color: '#bae6fd',
                              }}
                            >
                              {opt.badge}
                            </span>
                          )}
                        </span>
                        {active && (
                          <CheckCircle2
                            size={18}
                            style={{ color: 'var(--accent-primary, #38bdf8)' }}
                          />
                        )}
                      </div>
                      <div className="text-xs text-sky-100/65 mt-1 leading-relaxed">{opt.desc}</div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* STEP 4: ROUTINE VULNERABILITY WINDOW & DAILY RECLAIM TARGET */}
          {step === 4 && (
            <div className="space-y-4 animate-fadeIn">
              <div>
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full liquid-pill-active text-[11px] font-mono mb-2.5">
                  <Target size={13} /> Questions 4 &amp; 5
                </div>
                <h2 className="text-2xl font-bold tracking-tight text-white">Routine Calibration</h2>
                <p className="text-sm text-sky-100/75 mt-1">
                  When are you most vulnerable to screen time slip-ups?
                </p>
              </div>

              {/* Vulnerability Window */}
              <div className="space-y-2">
                <label className="text-[11px] font-mono uppercase text-sky-200/70 tracking-wider">
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
                        className={`w-full p-3 rounded-2xl text-left text-xs font-medium flex items-center justify-between liquid-spring cursor-pointer ${
                          selected ? 'liquid-inset text-white' : 'liquid-row text-sky-100/80'
                        }`}
                        style={{
                          border: selected
                            ? '1px solid var(--accent-border, rgba(56, 189, 248, 0.6))'
                            : '1px solid rgba(255, 255, 255, 0.12)',
                          background: selected
                            ? 'rgba(56, 189, 248, 0.20)'
                            : 'rgba(255, 255, 255, 0.04)',
                        }}
                      >
                        <span>{win.label}</span>
                        {selected && (
                          <Check
                            size={14}
                            className="shrink-0"
                            style={{ color: 'var(--accent-primary, #38bdf8)' }}
                          />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Daily Reclaim Target */}
              <div
                className="p-3.5 rounded-2xl space-y-2.5"
                style={{
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.12)',
                }}
              >
                <div className="flex items-center justify-between text-xs">
                  <span className="font-mono uppercase text-sky-200/75 tracking-wider">
                    Daily Reclaim Target
                  </span>
                  <span
                    className="font-bold font-mono text-sm"
                    style={{ color: 'var(--accent-primary, #38bdf8)' }}
                  >
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
                  className="w-full cursor-pointer h-2 rounded-lg"
                  style={{ accentColor: 'var(--accent-primary, #38bdf8)' }}
                />
                <div className="flex justify-between text-[10px] text-sky-200/60 font-mono">
                  <span>1h (Light)</span>
                  <span>3h (Standard)</span>
                  <span>6h+ (Deep Focus)</span>
                </div>
              </div>
            </div>
          )}

          {/* STEP 5: SHIELD PERMISSIONS & PLAIN-ENGLISH READ ME */}
          {step === 5 && (
            <div className="space-y-4 animate-fadeIn">
              <div>
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full liquid-pill-active text-[11px] font-mono mb-2.5">
                  <ShieldCheck size={13} /> OS Permissions
                </div>
                <h2 className="text-2xl font-bold tracking-tight text-white">Shield Permissions</h2>
                <p className="text-sm text-sky-100/75 mt-1">
                  Zero runs locally on your Android OS to enforce app limits without background battery drain.
                </p>
              </div>

              <div className="space-y-2.5 pt-1 text-xs">
                <div
                  className="p-3.5 rounded-2xl flex items-start gap-3"
                  style={{
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.12)',
                  }}
                >
                  <Lock
                    size={18}
                    className="shrink-0 mt-0.5"
                    style={{ color: 'var(--accent-primary, #38bdf8)' }}
                  />
                  <div>
                    <div className="font-semibold text-white">Focus Shield &amp; Overlay</div>
                    <div className="text-sky-100/65 text-[11px] mt-0.5 leading-relaxed">
                      Detects foreground app switches to keep The Void active and block distracting apps during focus blocks.
                    </div>
                  </div>
                </div>

                <div
                  className="p-3.5 rounded-2xl flex items-start gap-3"
                  style={{
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.12)',
                  }}
                >
                  <Eye
                    size={18}
                    className="shrink-0 mt-0.5"
                    style={{ color: 'var(--accent-primary, #38bdf8)' }}
                  />
                  <div>
                    <div className="font-semibold text-white">Usage Access</div>
                    <div className="text-sky-100/65 text-[11px] mt-0.5 leading-relaxed">
                      Aggregates daily focus minutes and screen-time reclaim statistics privately on your phone.
                    </div>
                  </div>
                </div>
              </div>

              {/* Plain-English Privacy Card */}
              <div
                className="p-4 rounded-2xl space-y-2"
                style={{
                  background:
                    'linear-gradient(135deg, rgba(52, 211, 153, 0.12), rgba(15, 23, 42, 0.45))',
                  border: '1px solid rgba(52, 211, 153, 0.28)',
                }}
              >
                <div className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                  <CheckCircle2 size={14} className="text-emerald-400" />
                  Plain-English Privacy Guarantee
                </div>
                <p className="text-xs text-sky-100/80 leading-relaxed">
                  Zero is 100% Free and Open-Source Software (FOSS). It contains zero ads, zero telemetry, and zero tracking code. Your data never leaves your phone.
                </p>
                <a
                  href="https://github.com/MDYOUSUF20007-oss/ZERO"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-[11px] font-mono pt-1 hover:underline"
                  style={{ color: 'var(--accent-primary, #38bdf8)' }}
                >
                  Inspect Zero Source Code on GitHub <ExternalLink size={11} />
                </a>
              </div>
            </div>
          )}

          {/* STEP 6: LAUNCH MODES */}
          {step === 6 && (
            <div className="space-y-4 animate-fadeIn">
              <div>
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full liquid-pill-active text-[11px] font-mono mb-2.5">
                  <Sparkles size={13} /> Final Step
                </div>
                <h2 className="text-2xl font-bold tracking-tight text-white">
                  Choose Your Launch Mode
                </h2>
                <p className="text-sm text-sky-100/75 mt-1">
                  Pick how Zero should arm your daily focus starting today.
                </p>
              </div>

              <div className="space-y-2.5 pt-1">
                {[
                  {
                    id: 'recommended' as LaunchModePreset,
                    title: 'Recommended Setup',
                    desc: 'Customized from your survey answers. Recommended routines are prepared in the Schedules tab (initially OFF so you have full control).',
                  },
                  {
                    id: 'full_productive' as LaunchModePreset,
                    title: 'Full Productive Mode',
                    desc: 'High-discipline setting: Strict friction applied to all social apps with zero excuses.',
                  },
                  {
                    id: 'explore' as LaunchModePreset,
                    title: 'Explore by Myself',
                    desc: 'Clean canvas without pre-set rules. Build your own Bags and Schedules from scratch.',
                  },
                ].map((opt) => {
                  const active = launchMode === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => {
                        haptics.tick(900);
                        setLaunchMode(opt.id);
                      }}
                      className={`w-full p-4 rounded-2xl text-left liquid-spring cursor-pointer ${
                        active ? 'liquid-inset' : 'liquid-row'
                      }`}
                      style={{
                        border: active
                          ? '1px solid var(--accent-border, rgba(56, 189, 248, 0.6))'
                          : '1px solid rgba(255, 255, 255, 0.12)',
                        background: active
                          ? 'linear-gradient(135deg, rgba(56, 189, 248, 0.22), rgba(129, 140, 248, 0.12))'
                          : 'rgba(255, 255, 255, 0.04)',
                        boxShadow: active
                          ? 'inset 0 1px 0 rgba(255,255,255,0.28), 0 8px 24px -6px rgba(56, 189, 248, 0.28)'
                          : 'inset 0 1px 0 rgba(255,255,255,0.10)',
                      }}
                    >
                      <div className="flex items-center justify-between font-semibold text-sm text-white">
                        <span>{opt.title}</span>
                        {active && (
                          <CheckCircle2
                            size={18}
                            style={{ color: 'var(--accent-primary, #38bdf8)' }}
                          />
                        )}
                      </div>
                      <div className="text-xs text-sky-100/65 mt-1 leading-relaxed">{opt.desc}</div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Liquid Glass Bottom Navigation Dock */}
      <div className="max-w-lg mx-auto w-full pb-1">
        <div
          className="liquid-card rounded-2xl p-2.5 flex items-center justify-between gap-3"
          style={{
            background: 'linear-gradient(180deg, rgba(255,255,255,0.08) 0%, rgba(12,20,36,0.62) 100%)',
            border: '1px solid rgba(255, 255, 255, 0.16)',
            boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.20), 0 12px 32px rgba(0,0,0,0.45)',
          }}
        >
          {step > 1 ? (
            <button
              type="button"
              onClick={handleBack}
              className="py-2.5 px-4 rounded-xl liquid-pill text-xs font-semibold text-sky-100/85 hover:text-white flex items-center gap-1.5 liquid-spring cursor-pointer"
              style={{
                border: '1px solid rgba(255, 255, 255, 0.14)',
                background: 'rgba(255, 255, 255, 0.05)',
              }}
            >
              <ArrowLeft size={15} /> Back
            </button>
          ) : (
            <div />
          )}

          <button
            type="button"
            onClick={handleNext}
            className="py-2.5 px-6 rounded-xl text-xs font-bold flex items-center gap-2 liquid-spring cursor-pointer"
            style={{
              background:
                'linear-gradient(135deg, var(--accent-primary, #38bdf8), var(--accent-secondary, #818cf8))',
              color: '#061224',
              boxShadow: '0 8px 24px -4px rgba(56, 189, 248, 0.45), inset 0 1px 0 rgba(255,255,255,0.45)',
            }}
          >
            <span>{step === totalSteps ? 'Complete Calibration' : 'Continue'}</span>
            <ArrowRight size={15} />
          </button>
        </div>
      </div>
    </div>
  );
}
