import { useState, useEffect } from 'react';
import { haptics } from '../utils/haptics';
import { ArrowRight, X, Clock, BarChart3, Settings, Heart, Sparkles } from 'lucide-react';
import { useInterfaceStyle } from '../context/InterfaceStyleContext';

interface InteractiveTourProps {
  onComplete: () => void;
  onNavigateTab: (tab: 'dial' | 'dashboard' | 'schedules' | 'support') => void;
}

const TOUR_STEPS = [
  {
    step: 1,
    tab: 'dial' as const,
    title: 'The Focus Dial',
    icon: Clock,
    badge: 'Step 1 of 4',
    spotlight: 'Active Screen: Focus Dial & Intention Locking',
    description:
      'Dial in your intended focus time and select a session tag (#DeepWork, #Study, #Sleep). Once locked, Zero guards your attention against digital impulses.',
  },
  {
    step: 2,
    tab: 'dashboard' as const,
    title: 'Discipline Insights & Escape Tickets',
    icon: BarChart3,
    badge: 'Step 2 of 4',
    spotlight: 'Active Screen: Escape Tickets & Reclaimed Hours (Look Above)',
    description:
      'Review your daily reclaimed hours and streak calendar. Every 35 hours of clean phone-free discipline earns you 1 Emergency Escape Ticket.',
  },
  {
    step: 3,
    tab: 'schedules' as const,
    title: 'Automated Routines & App Bags',
    icon: Settings,
    badge: 'Step 3 of 4',
    spotlight: 'Active Screen: Automated Shields & Occasion Bags',
    description:
      'Set automated recurring schedules (like Late-Night Sleep or Morning Focus) and organize apps into custom Occasion Bags with tailored friction.',
  },
  {
    step: 4,
    tab: 'support' as const,
    title: 'Pure FOSS & Developer Support',
    icon: Heart,
    badge: 'Step 4 of 4',
    spotlight: 'Active Screen: 100% Free & Open-Source Guarantee',
    description:
      'ZERO is 100% Free and Open-Source Software built by Mohammed Yusuf (@MDYOUSUF20007-oss). Zero paywalls, zero subscriptions, zero countdown pressure. Support via UPI or Ko-fi if you wish.',
  },
];

export function InteractiveTour({ onComplete, onNavigateTab }: InteractiveTourProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const currentStep = TOUR_STEPS[currentIndex];
  const StepIcon = currentStep.icon;
  const { accent } = useInterfaceStyle();
  const isCyan = accent === 'cyan';

  useEffect(() => {
    onNavigateTab(TOUR_STEPS[0].tab);
  }, [onNavigateTab]);

  const handleNext = () => {
    haptics.tick(900);
    if (currentIndex < TOUR_STEPS.length - 1) {
      const nextIdx = currentIndex + 1;
      setCurrentIndex(nextIdx);
      onNavigateTab(TOUR_STEPS[nextIdx].tab);
    } else {
      onComplete();
    }
  };

  const handleSkip = () => {
    haptics.tick(900);
    onComplete();
  };

  return (
    <div className="fixed inset-0 z-50 pointer-events-none flex flex-col justify-between p-4 pb-20 sm:pb-24">
      {/* Crystal-clear non-blurring touch backdrop to allow underlying cards to remain 100% sharp & visible */}
      <div
        className="absolute inset-0 bg-black/20 pointer-events-auto transition-opacity"
        onClick={handleSkip}
        aria-label="Tap to skip tour"
      />

      {/* Top Floating Spotlight Badge pointing to the exact feature on screen */}
      <div className="relative pointer-events-none w-full flex justify-center pt-3 animate-fadeIn">
        <div
          className={`px-3.5 py-1.5 rounded-full border shadow-lg flex items-center gap-2 backdrop-blur-md ${
            isCyan
              ? 'bg-cyan-950/80 border-cyan-400/50 shadow-cyan-500/20 text-cyan-200'
              : 'bg-purple-950/80 border-purple-400/50 shadow-purple-500/20 text-purple-200'
          }`}
        >
          <span
            className={`w-2 h-2 rounded-full animate-ping shrink-0 ${
              isCyan ? 'bg-cyan-400' : 'bg-purple-400'
            }`}
          />
          <span className="text-xs font-semibold">{currentStep.spotlight}</span>
        </div>
      </div>

      {/* Floating Tour Card Docked Neatly at Bottom */}
      <div className="relative pointer-events-auto max-w-md mx-auto w-full bg-zinc-950/95 border border-white/20 rounded-2xl p-5 shadow-2xl space-y-4 backdrop-blur-xl animate-slideUp">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div
              className={`p-2 rounded-xl border ${
                isCyan
                  ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40 shadow-sm shadow-cyan-500/20'
                  : 'bg-purple-500/20 text-purple-300 border-purple-500/40 shadow-sm shadow-purple-500/20'
              }`}
            >
              <StepIcon size={18} />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <Sparkles size={11} className={isCyan ? 'text-cyan-400' : 'text-purple-400'} />
                <span
                  className={`text-[10px] font-mono uppercase tracking-wider font-bold ${
                    isCyan ? 'text-cyan-400' : 'text-purple-400'
                  }`}
                >
                  {currentStep.badge}
                </span>
              </div>
              <h3 className="text-base font-bold text-white">{currentStep.title}</h3>
            </div>
          </div>

          <button
            type="button"
            onClick={handleSkip}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
            title="Skip Tour"
          >
            <X size={16} />
          </button>
        </div>

        <p className="text-xs text-zinc-200 leading-relaxed font-sans">{currentStep.description}</p>

        {/* Step indicators & Next Button */}
        <div className="flex items-center justify-between pt-1">
          <div className="flex items-center gap-1.5">
            {TOUR_STEPS.map((_, i) => (
              <div
                key={i}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  i === currentIndex
                    ? isCyan
                      ? 'w-6 bg-cyan-400 shadow-sm shadow-cyan-400/50'
                      : 'w-6 bg-purple-400 shadow-sm shadow-purple-400/50'
                    : 'w-1.5 bg-zinc-700'
                }`}
              />
            ))}
          </div>

          <button
            type="button"
            onClick={handleNext}
            className={`py-2 px-4 rounded-xl text-white text-xs font-bold flex items-center gap-1.5 transition-all shadow-md ${
              isCyan
                ? 'bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 shadow-cyan-500/25'
                : 'bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 shadow-purple-600/25'
            }`}
          >
            <span>{currentIndex === TOUR_STEPS.length - 1 ? 'Finish Tour' : 'Next Glance'}</span>
            <ArrowRight size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}
