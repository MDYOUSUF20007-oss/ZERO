import { useState } from 'react';
import { useZeroStore } from './store/useZeroStore';
import { LockDialView } from './components/LockDialView';
import { TheVoidView } from './components/TheVoidView';
import { ParachuteDashboardView } from './components/ParachuteDashboardView';
import { SchedulesDonateView } from './components/SchedulesDonateView';
import { haptics } from './utils/haptics';
import { Clock, Heart, BellRing, X } from 'lucide-react';

export function App() {
  const store = useZeroStore();
  const [activeTab, setActiveTab] = useState<'dial' | 'dashboard' | 'schedules'>('dial');

  // If Lock is active, THE VOID takes over everything
  if (store.activeLock.isLocked) {
    return (
      <TheVoidView
        activeLock={store.activeLock}
        parachuteMetrics={store.parachuteMetrics}
        onDeployParachute={store.deployParachute}
        onSimulateReboot={store.simulateReboot}
        onFastForward={store.fastForwardSeconds}
      />
    );
  }

  return (
    <div className="min-h-screen bg-black text-white flex flex-col justify-between relative selection:bg-white selection:text-black">
      {/* 5-Minute Pre-Lock Heads-Up Warning Banner */}
      {store.preLockAlert && (
        <div className="fixed top-3 left-4 right-4 z-50 max-w-md mx-auto bg-amber-500 text-black p-3 rounded-2xl shadow-2xl flex items-center justify-between font-mono animate-bounce">
          <div className="flex items-center gap-2.5">
            <BellRing size={18} className="shrink-0" />
            <div>
              <div className="font-black text-xs uppercase tracking-wider">
                Heads-up: Lock Starts in {store.preLockAlert.minutesLeft}m
              </div>
              <div className="text-[11px] font-medium opacity-90">
                "{store.preLockAlert.scheduleName}" is about to engage The Void.
              </div>
            </div>
          </div>
          <button
            onClick={() => store.triggerTestWarning('')}
            className="p-1 hover:bg-black/10 rounded-lg text-black"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col justify-start">
        {activeTab === 'dial' && (
          <LockDialView
            onIgnite={store.igniteSession}
            parachuteMetrics={store.parachuteMetrics}
            onOpenDashboard={() => setActiveTab('dashboard')}
          />
        )}

        {activeTab === 'dashboard' && (
          <ParachuteDashboardView
            parachuteMetrics={store.parachuteMetrics}
            ledger={store.ledger}
            sessions={store.sessions}
            onFastForward={store.fastForwardSeconds}
          />
        )}

        {activeTab === 'schedules' && (
          <SchedulesDonateView
            schedules={store.schedules}
            onToggleSchedule={store.toggleSchedule}
            onAddSchedule={store.addSchedule}
            onDeleteSchedule={store.deleteSchedule}
            onTriggerTestWarning={store.triggerTestWarning}
            theme={store.theme}
            onThemeChange={store.setTheme}
            sleepFarmingMode={store.sleepFarmingMode}
            onSleepFarmingModeChange={store.setSleepFarmingMode}
            onExportData={store.exportData}
            onResetData={store.resetAllData}
          />
        )}
      </main>

      {/* Neo-Brutalist Bottom Navigation Bar */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-black/90 backdrop-blur-md border-t border-zinc-900 py-2 px-4">
        <div className="max-w-md mx-auto grid grid-cols-3 gap-2">
          {/* Tab 1: Lock Dial */}
          <button
            onClick={() => {
              haptics.tick(900);
              setActiveTab('dial');
            }}
            className={`flex flex-col items-center justify-center py-2 px-3 rounded-2xl transition-all ${
              activeTab === 'dial'
                ? 'bg-zinc-900 text-white font-bold border border-zinc-700 shadow-sm'
                : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            <Clock size={18} />
            <span className="text-[10px] font-mono mt-1 tracking-wider uppercase">Dial</span>
          </button>

          {/* Tab 2: Parachute & Metrics */}
          <button
            onClick={() => {
              haptics.tick(900);
              setActiveTab('dashboard');
            }}
            className={`flex flex-col items-center justify-center py-2 px-3 rounded-2xl transition-all relative ${
              activeTab === 'dashboard'
                ? 'bg-zinc-900 text-white font-bold border border-zinc-700 shadow-sm'
                : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            <div className="relative">
              <span className="text-sm">🪂</span>
              {store.parachuteMetrics.currentBalance > 0 && (
                <span className="absolute -top-1.5 -right-3 text-[9px] font-mono bg-amber-400 text-black px-1 rounded-full font-black">
                  {store.parachuteMetrics.currentBalance}
                </span>
              )}
            </div>
            <span className="text-[10px] font-mono mt-0.5 tracking-wider uppercase">Parachute</span>
          </button>

          {/* Tab 3: Schedules & Donate */}
          <button
            onClick={() => {
              haptics.tick(900);
              setActiveTab('schedules');
            }}
            className={`flex flex-col items-center justify-center py-2 px-3 rounded-2xl transition-all ${
              activeTab === 'schedules'
                ? 'bg-zinc-900 text-white font-bold border border-zinc-700 shadow-sm'
                : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            <Heart size={18} className={activeTab === 'schedules' ? 'text-red-500' : ''} />
            <span className="text-[10px] font-mono mt-1 tracking-wider uppercase">Rules & OS</span>
          </button>
        </div>
      </nav>
    </div>
  );
}

export default App;
