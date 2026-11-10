import { useState, useEffect, useRef } from 'react';
import { useZeroStore } from './store/useZeroStore';
import { LockDialView } from './components/LockDialView';
import { TheVoidView } from './components/TheVoidView';
import { ParachuteDashboardView } from './components/ParachuteDashboardView';
import { SchedulesDonateView } from './components/SchedulesDonateView';
import { BagDrawerModal } from './components/BagDrawerModal';
import { PermissionGateModal } from './components/PermissionGateModal';
import { TipAfterSessionModal } from './components/TipAfterSessionModal';
import { ProfileModal } from './components/ProfileModal';
import { ParachuteRewardAnimation } from './components/ParachuteRewardAnimation';
import { ShareStatsModal } from './components/ShareStatsModal';
import { haptics } from './utils/haptics';
import { Clock, Heart, BellRing, X } from 'lucide-react';

export function App() {
  const store = useZeroStore();
  const [activeTab, setActiveTab] = useState<'dial' | 'dashboard' | 'schedules'>('dial');
  const [showBagModal, setShowBagModal] = useState(false);
  const [showPermissionModal, setShowPermissionModal] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [profileModalMode, setProfileModalMode] = useState<'welcome' | 'edit'>('welcome');
  const [showSessionFlexModal, setShowSessionFlexModal] = useState(false);
  const hasAutoPromptedRef = useRef(false);
  const hasAutoShownWelcomeRef = useRef(false);

  // Ask for required Android permissions upfront on first launch if not armed yet
  useEffect(() => {
    if (
      !hasAutoPromptedRef.current &&
      !store.activeLock.isLocked &&
      store.permissions.isNativeAndroid &&
      !store.permissions.strictReady
    ) {
      hasAutoPromptedRef.current = true;
      setShowPermissionModal(true);
    }
  }, [
    store.activeLock.isLocked,
    store.permissions.isNativeAndroid,
    store.permissions.strictReady,
  ]);

  // First-timer special popup: make an interactive profile & claim 1 free starter Parachute
  useEffect(() => {
    if (
      !hasAutoShownWelcomeRef.current &&
      !store.activeLock.isLocked &&
      !showPermissionModal &&
      !store.profile &&
      !store.hasClaimedFirstTimeParachute &&
      !store.hasDismissedWelcomeModal
    ) {
      hasAutoShownWelcomeRef.current = true;
      setProfileModalMode('welcome');
      setShowProfileModal(true);
    }
  }, [
    store.activeLock.isLocked,
    showPermissionModal,
    store.profile,
    store.hasClaimedFirstTimeParachute,
    store.hasDismissedWelcomeModal,
  ]);

  const openInteractiveProfile = () => {
    setProfileModalMode(!store.profile && !store.hasClaimedFirstTimeParachute ? 'welcome' : 'edit');
    setShowProfileModal(true);
  };

  // If Lock is active, THE VOID takes over everything
  if (store.activeLock.isLocked) {
    return (
      <TheVoidView
        activeLock={store.activeLock}
        parachuteMetrics={store.parachuteMetrics}
        activeBag={store.activeBag}
        onDeployParachute={store.deployParachute}
      />
    );
  }

  return (
    <div className="min-h-screen bg-black text-white flex flex-col justify-between relative selection:bg-white selection:text-black">
      {/* Top Status Bar Safe-Area Scrim (prevents scrolled content from clashing with Android system icons) */}
      <div
        aria-hidden="true"
        className="fixed top-0 left-0 right-0 z-40 bg-black/90 backdrop-blur-md pointer-events-none"
        style={{ height: 'var(--zero-safe-top)' }}
      />

      {/* 5-Minute Pre-Lock Heads-Up Warning Banner */}
      {store.preLockAlert && (
        <div
          className="fixed left-4 right-4 z-50 max-w-md mx-auto bg-amber-500 text-black p-3 rounded-2xl shadow-2xl flex items-center justify-between font-mono animate-bounce"
          style={{ top: 'calc(0.75rem + var(--zero-safe-top))' }}
        >
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
      <main
        className="flex-1 flex flex-col justify-start"
        style={{
          paddingTop: 'var(--zero-safe-top)',
          paddingBottom: 'var(--zero-safe-bottom)',
        }}
      >
        {activeTab === 'dial' && (
          <LockDialView
            onIgnite={store.igniteSession}
            parachuteMetrics={store.parachuteMetrics}
            activeBag={store.activeBag}
            permissions={store.permissions}
            profile={store.profile}
            isZeroSupporter={store.isZeroSupporter}
            sessions={store.sessions}
            hasClaimedFirstTimeParachute={store.hasClaimedFirstTimeParachute}
            todayReclaimedHours={store.todayReclaimedHours}
            justEarnedParachute={store.justEarnedParachute}
            onOpenDashboard={() => setActiveTab('dashboard')}
            onOpenBagDrawer={() => {
              store.refreshInstalledApps();
              setShowBagModal(true);
            }}
            onOpenPermissionGate={() => {
              store.refreshPermissions();
              setShowPermissionModal(true);
            }}
            onOpenProfileModal={openInteractiveProfile}
          />
        )}

        {activeTab === 'dashboard' && (
          <ParachuteDashboardView
            parachuteMetrics={store.parachuteMetrics}
            ledger={store.ledger}
            sessions={store.sessions}
            profile={store.profile}
            isZeroSupporter={store.isZeroSupporter}
            hasClaimedFirstTimeParachute={store.hasClaimedFirstTimeParachute}
            todayReclaimedHours={store.todayReclaimedHours}
            justEarnedParachute={store.justEarnedParachute}
            onOpenProfileModal={openInteractiveProfile}
          />
        )}

        {activeTab === 'schedules' && (
          <SchedulesDonateView
            schedules={store.schedules}
            permissions={store.permissions}
            onRefreshPermissions={store.refreshPermissions}
            onToggleSchedule={store.toggleSchedule}
            onAddSchedule={store.addSchedule}
            onDeleteSchedule={store.deleteSchedule}
            onTriggerTestWarning={store.triggerTestWarning}
            theme={store.theme}
            onThemeChange={store.setTheme}
            sleepFarmingMode={store.sleepFarmingMode}
            onSleepFarmingModeChange={store.setSleepFarmingMode}
            onBuildBackupJson={store.buildBackupJson}
            onExportData={store.exportData}
            onImportData={store.importData}
            onResetData={store.resetAllData}
            tipSkipRemaining={store.tipSkipRemaining}
            onResetTipPromptBlock={store.resetTipPromptBlock}
            profile={store.profile}
            isZeroSupporter={store.isZeroSupporter}
            hasClaimedFirstTimeParachute={store.hasClaimedFirstTimeParachute}
            hasClaimedFirstDonationParachute={store.hasClaimedFirstDonationParachute}
            onOpenProfileModal={openInteractiveProfile}
            onClaimFirstDonationBonus={store.claimFirstDonationBonus}
          />
        )}
      </main>

      {/* Modals */}
      <BagDrawerModal
        isOpen={showBagModal}
        bags={store.bags}
        activeBagId={store.activeBagId}
        installedApps={store.installedApps}
        onClose={() => setShowBagModal(false)}
        onSelectActiveBag={store.setActiveBagId}
        onUpdateBag={store.updateBag}
        onToggleBagApp={store.toggleBagApp}
        onRefreshInstalledApps={store.refreshInstalledApps}
      />

      <PermissionGateModal
        isOpen={showPermissionModal}
        permissions={store.permissions}
        onClose={() => setShowPermissionModal(false)}
        onRefresh={store.refreshPermissions}
        onProceedReady={() => setShowPermissionModal(false)}
      />

      <TipAfterSessionModal
        completedSession={store.postSessionTipPrompt}
        hasClaimedFirstDonationParachute={store.hasClaimedFirstDonationParachute}
        onClaimFirstDonationBonus={store.claimFirstDonationBonus}
        onShareResults={() => {
          store.dismissPostSessionTipPrompt();
          setShowSessionFlexModal(true);
        }}
        onDismiss={store.dismissPostSessionTipPrompt}
        onBlockFiveSessions={store.blockTipPromptForFiveSessions}
      />

      <ShareStatsModal
        isOpen={showSessionFlexModal}
        sessions={store.sessions}
        parachuteMetrics={store.parachuteMetrics}
        currentStreak={store.currentStreak}
        profile={store.profile}
        isZeroSupporter={store.isZeroSupporter}
        onClose={() => setShowSessionFlexModal(false)}
      />

      <ProfileModal
        isOpen={showProfileModal}
        mode={profileModalMode}
        initialProfile={store.profile}
        hasClaimedFirstTimeParachute={store.hasClaimedFirstTimeParachute}
        isZeroSupporter={store.isZeroSupporter}
        sessions={store.sessions}
        totalReclaimedHours={store.parachuteMetrics.totalReclaimedHours}
        onSaveProfile={store.saveProfileAndClaimGift}
        onClose={() => {
          setShowProfileModal(false);
          if (profileModalMode === 'welcome') {
            store.dismissWelcomePrompt();
          }
        }}
      />

      <ParachuteRewardAnimation
        reward={store.parachuteRewardEvent}
        onDismiss={store.dismissParachuteRewardAnimation}
      />

      {/* Neo-Brutalist Bottom Navigation Bar */}
      <nav
        className="fixed bottom-0 left-0 right-0 z-40 bg-black/90 backdrop-blur-md border-t border-zinc-900 pt-2 px-4"
        style={{ paddingBottom: 'calc(0.5rem + var(--zero-safe-bottom))' }}
      >
        <div className="max-w-md mx-auto grid grid-cols-3 gap-2">
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
            <span className="text-[10px] font-mono mt-0.5 tracking-wider uppercase">Insights</span>
          </button>

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
            <span className="text-[10px] font-mono mt-1 tracking-wider uppercase">Rules &amp; OS</span>
          </button>
        </div>
      </nav>
    </div>
  );
}

export default App;
