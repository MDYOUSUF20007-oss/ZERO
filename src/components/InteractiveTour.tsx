import { useState } from 'react';
import { haptics } from '../utils/haptics';
import { Sparkles, ArrowRight, X, Clock, BarChart3, Settings, Heart } from 'lucide-react';

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
    description:
      'Dial in your intended focus time and select a session tag (#DeepWork, #Study, #Sleep). Once locked, Zero guards your attention against digital impulses.',
  },
  {
    step: 2,
    tab: 'dashboard' as const,
    title: 'Discipline Insights & Escape Tickets',
    icon: BarChart3,
    badge: 'Step 2 of 4',
    description:
      'Review your daily reclaimed hours and streak calendar. Every 35 hours of clean phone-free discipline earns you 1 Emergency Escape Ticket.',
  },
  {
    step: 3,
    tab: 'schedules' as const,
    title: 'Automated Routines & App Bags',
    icon: Settings,
    badge: 'Step 3 of 4',
    description:
      'Set automated recurring schedules (like Late-Night Sleep or Morning Focus) and organize apps into custom Occasion Bags with tailored friction.',
  },
  {
    step: 4,
    tab: 'support' as const,
    title: 'Pure FOSS & Developer Support',
    icon: Heart,
    badge: 'Step 4 of 4',
    description:
      'ZERO is 100% Free and Open-Source Software built by Mohammed Yusuf (@MDYOUSUF20007-oss). Zero paywalls, zero subscriptions, zero countdown pressure. Support via UPI or Ko-fi if you wish.',
  },
];

export function InteractiveTour({ onComplete, onNavigateTab }: InteractiveTourProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const currentStep = TOUR_STEPS[currentIndex];
  const StepIcon = currentStep.icon;

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
    <div className="fixed inset-0 z-50 pointer-events-none flex flex-col justify-end p-4 pb-20 sm:pb-24">
      {/* Dimmed backdrop highlight */}
      <div className="absolute inset-0 bg-black/60 pointer-events-auto backdrop-blur-[2px]" onClick={handleSkip} />

      {/* Floating Tour Card */}
      <div className="relative pointer-events-auto max-w-md mx-auto w-full bg-zinc-950 border border-zinc-700/80 rounded-2xl p-5 shadow-2xl space-y-4 animate-slideUp">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-blue-500/20 text-blue-400 border border-blue-500/30">
              <StepIcon size={18} />
            </div>
            <div>
              <span className="text-[10px] font-mono uppercase tracking-wider text-blue-400 font-semibold">
                {currentStep.badge}
              </span>
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

        <p className="text-xs text-zinc-300 leading-relaxed">{currentStep.description}</p>

        {/* Step indicators & Next Button */}
        <div className="flex items-center justify-between pt-1">
          <div className="flex items-center gap-1.5">
            {TOUR_STEPS.map((_, i) => (
              <div
                key={i}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  i === currentIndex ? 'w-5 bg-blue-500' : 'w-1.5 bg-zinc-700'
                }`}
              />
            ))}
          </div>

          <button
            type="button"
            onClick={handleNext}
            className="py-2 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold flex items-center gap-1.5 transition-all shadow-md shadow-blue-600/20"
          >
            {currentIndex === TOUR_STEPS.length - 1 ? 'Finish Tour' : 'Next Glance'}
            <ArrowRight size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}
