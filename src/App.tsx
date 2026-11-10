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
import { EscapeTicketModal } from './components/EscapeTicketModal';
import { ObsidianCard } from './components/ObsidianCard';
import { haptics } from './utils/haptics';
import { Clock, Heart, BellRing, Settings, X } from 'lucide-react';

export function App() {
  const store = useZeroStore();
  const [activeTab, setActiveTab] = useState<'dial' | 'dashboard' | 'schedules' | 'support'>('dial');
  const [rulesSectionOverride, setRulesSectionOverride] = useState<{
    section: 'schedules' | 'themes' | 'settings' | 'os_security' | 'support';
    key: number;
  } | null>(null);
  const [showBagModal, setShowBagModal] = useState(false);
  const [showPermissionModal, setShowPermissionModal] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showTicketModal, setShowTicketModal] = useState(false);
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

  // First-timer special popup: make an interactive profile & claim 1 free starter Escape Ticket
  useEffect(() => {
    if (
      !hasAutoShownWelcomeRef.current &&
      !store.onboardingComplete &&
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
    store.onboardingComplete,
    store.activeLock.isLocked,
    showPermissionModal,
    store.profile,
    store.hasClaimedFirstTimeParachute,
    store.hasDismissedWelcomeModal,
  ]);

  const [restoreToast, setRestoreToast] = useState<string>('');

  const handleCloudRestoreSuccess = () => {
    setShowProfileModal(false);
    setActiveTab('dashboard');
    setRestoreToast('Cloud Backup Restored — Welcome back to Zero App!');
    setTimeout(() => setRestoreToast(''), 4200);
  };

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
        profile={store.profile}
        themeConfig={store.themeConfig}
        onDeployParachute={store.deployParachute}
      />
    );
  }

  return (
    <div className="min-h-screen zero-app-shell flex flex-col justify-between relative selection:bg-white selection:text-black">
      {/* Top Status Bar Safe-Area Scrim (prevents scrolled content from clashing with Android system icons) */}
      <div
        aria-hidden="true"
        data-frosted-chrome="true"
        className="fixed top-0 left-0 right-0 z-40 zero-top-scrim backdrop-blur-md pointer-events-none"
        style={{ height: 'var(--zero-safe-top)' }}
      />

      {/* 5-Minute Pre-Lock Heads-Up Warning Banner */}
      {store.preLockAlert && (
        <div
          className="fixed left-4 right-4 z-50 max-w-md mx-auto animate-bounce"
          style={{ top: 'calc(0.75rem + var(--zero-safe-top))' }}
        >
          <ObsidianCard
            accentOverride={{ hex: '#F59E0B', rgb: '245, 158, 11' }}
            ambientGlow
            className="font-mono shadow-2xl"
            headerClassName="p-3 flex items-center justify-between gap-2.5"
            headerContent={
              <>
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-9 h-9 rounded-xl obsidian-icon-box flex items-center justify-center shrink-0 text-amber-400">
                    <BellRing size={17} />
                  </div>
                  <div className="min-w-0">
                    <div className="font-black text-xs uppercase tracking-wider text-amber-300">
                      Heads-up: Lock Starts in {store.preLockAlert.minutesLeft}m
                    </div>
                    <div className="text-[11px] text-zinc-300 truncate">
                      &ldquo;{store.preLockAlert.scheduleName}&rdquo; is about to engage The Void.
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => store.triggerTestWarning('')}
                  className="p-1.5 rounded-xl bg-zinc-900 border border-white/10 text-zinc-400 hover:text-white shrink-0"
                  aria-label="Dismiss Heads-up Warning"
                >
                  <X size={15} />
                </button>
              </>
            }
          />
        </div>
      )}

      {/* Cloud Restore Confirmation Toast */}
      {restoreToast && (
        <div
          className="fixed left-4 right-4 z-50 max-w-md mx-auto"
          style={{ top: 'calc(0.75rem + var(--zero-safe-top))' }}
        >
          <ObsidianCard
            data-amoled-banner="true"
            accentOverride={{ hex: '#8B5CF6', rgb: '139, 92, 246' }}
            ambientGlow
            className="font-mono text-xs shadow-2xl"
            headerClassName="p-3 flex items-center justify-between gap-2"
            style={{
              backgroundColor: '#000000',
              borderColor: 'rgba(139, 92, 246, 0.7)',
              color: '#FFFFFF',
            }}
            headerContent={
              <>
                <span className="amoled-banner-title font-bold">{restoreToast}</span>
                <button
                  type="button"
                  onClick={() => setRestoreToast('')}
                  className="p-1 text-zinc-400 hover:text-white shrink-0"
                  aria-label="Dismiss Cloud Restore Notification"
                >
                  <X size={14} />
                </button>
              </>
            }
          />
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
            showWeeklyBackupBanner={store.weeklyBackupDue}
            isCloudBusy={store.isCloudBusy}
            onOneTapUpload={store.oneTapCloudUpload}
            onTurnOnAutoBackup={store.enableCloudAutoBackup}
            onExportZbakData={store.exportZbakData}
            onOpenTicketModal={() => setShowTicketModal(true)}
            onOpenBagDrawer={() => {
              store.refreshInstalledApps();
              setShowBagModal(true);
            }}
            onOpenPermissionGate={() => {
              store.refreshPermissions();
              setShowPermissionModal(true);
            }}
            onOpenProfileModal={openInteractiveProfile}
            onOpenThemes={() => {
              setRulesSectionOverride({ section: 'themes', key: Date.now() });
              setActiveTab('schedules');
            }}
            onOpenManualBackup={() => {
              setRulesSectionOverride({ section: 'settings', key: Date.now() });
              setActiveTab('schedules');
            }}
          />
        )}

        {activeTab === 'dashboard' && (
          <ParachuteDashboardView
            parachuteMetrics={store.parachuteMetrics}
            ledger={store.ledger}
            sessions={store.sessions}
            profile={store.profile}
            widgetsConfig={store.widgetsConfig}
            onWidgetsConfigChange={store.setWidgetsConfig}
            isZeroSupporter={store.isZeroSupporter}
            hasClaimedFirstTimeParachute={store.hasClaimedFirstTimeParachute}
            todayReclaimedHours={store.todayReclaimedHours}
            justEarnedParachute={store.justEarnedParachute}
            onOpenProfileModal={openInteractiveProfile}
            onOpenTicketModal={() => setShowTicketModal(true)}
          />
        )}

        {(activeTab === 'schedules' || activeTab === 'support') && (
          <SchedulesDonateView
            schedules={store.schedules}
            permissions={store.permissions}
            appBuildInfo={store.appBuildInfo}
            environmentSecurity={store.environmentSecurity}
            onRefreshPermissions={store.refreshPermissions}
            onToggleSchedule={store.toggleSchedule}
            onAddSchedule={store.addSchedule}
            onDeleteSchedule={store.deleteSchedule}
            onTriggerTestWarning={store.triggerTestWarning}
            themeConfig={store.themeConfig}
            onThemeConfigChange={store.setThemeConfig}
            sectionOverride={rulesSectionOverride}
            viewMode={activeTab === 'support' ? 'support' : 'settings_os'}
            sleepFarmingMode={store.sleepFarmingMode}
            onSleepFarmingModeChange={store.setSleepFarmingMode}
            onBuildBackupJson={store.buildBackupJson}
            onBuildZbakString={store.buildZbakString}
            onExportData={store.exportData}
            onExportZbakData={store.exportZbakData}
            onImportData={store.importData}
            onResetData={store.resetAllData}
            cloudBackupStatus={store.cloudBackupStatus}
            isCloudBusy={store.isCloudBusy}
            onEnableCloudAutoBackup={store.enableCloudAutoBackup}
            onDisableCloudAutoBackup={store.disableCloudAutoBackup}
            onSyncCloudBackupNow={store.syncCloudBackupNow}
            onOneTapCloudUpload={store.oneTapCloudUpload}
            onRestoreFromCloudPicker={store.restoreBackupFromCloudPicker}
            onRestoreSuccess={handleCloudRestoreSuccess}
            tipSkipRemaining={store.tipSkipRemaining}
            onResetTipPromptBlock={store.resetTipPromptBlock}
            profile={store.profile}
            isZeroSupporter={store.isZeroSupporter}
            remainingEscapeTickets={store.parachuteMetrics.currentBalance}
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
        environmentSecurity={store.environmentSecurity}
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
        isCloudBusy={store.isCloudBusy}
        environmentSecurity={store.environmentSecurity}
        onRestoreFromCloud={store.restoreBackupFromCloudPicker}
        onRestoreSuccess={handleCloudRestoreSuccess}
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

      <EscapeTicketModal
        isOpen={showTicketModal}
        parachuteMetrics={store.parachuteMetrics}
        profile={store.profile}
        isZeroSupporter={store.isZeroSupporter}
        hasClaimedFirstTimeParachute={store.hasClaimedFirstTimeParachute}
        hasClaimedFirstDonationParachute={store.hasClaimedFirstDonationParachute}
        onClose={() => setShowTicketModal(false)}
        onOpenProfile={() => {
          setShowTicketModal(false);
          openInteractiveProfile();
        }}
        onOpenSupport={() => {
          setShowTicketModal(false);
          setActiveTab('support');
        }}
        onOpenInsights={() => {
          setShowTicketModal(false);
          setActiveTab('dashboard');
        }}
      />

      {/* Frosted Two-Tier Obsidian Bottom Navigation Dock */}
      <nav
        data-frosted-chrome="true"
        className="fixed bottom-0 left-0 right-0 z-40 obsidian-shell-bar backdrop-blur-md border-t pt-2 px-2 sm:px-3"
        style={{
          paddingBottom: 'calc(0.5rem + var(--zero-safe-bottom))',
          borderColor: 'rgba(var(--accent-rgb, 245, 158, 11), 0.35)',
        }}
      >
        <div
          aria-hidden="true"
          className="absolute top-0 left-8 right-8 h-[1.5px] pointer-events-none"
          style={{
            background:
              'linear-gradient(90deg, transparent 0%, var(--accent-hex, #F59E0B) 50%, transparent 100%)',
            opacity: 0.75,
          }}
        />
        <div className="max-w-md mx-auto grid grid-cols-4 gap-1">
          <button
            onClick={() => {
              haptics.tick(900);
              setActiveTab('dial');
            }}
            className={`flex flex-col items-center justify-center py-2 px-1 rounded-2xl transition-all ${
              activeTab === 'dial'
                ? 'obsidian-inset font-bold text-white shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200 border border-transparent'
            }`}
          >
            <Clock
              size={17}
              style={activeTab === 'dial' ? { color: 'var(--accent-hex, #F59E0B)' } : undefined}
            />
            <span
              className="text-[9px] sm:text-[10px] font-mono mt-1 tracking-tight sm:tracking-wider uppercase whitespace-nowrap"
              style={activeTab === 'dial' ? { color: 'var(--accent-hex, #F59E0B)' } : undefined}
            >
              Dial
            </span>
          </button>

          <button
            onClick={() => {
              haptics.tick(900);
              setActiveTab('dashboard');
            }}
            className={`flex flex-col items-center justify-center py-2 px-1 rounded-2xl transition-all relative ${
              activeTab === 'dashboard'
                ? 'obsidian-inset font-bold text-white shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200 border border-transparent'
            }`}
          >
            <div className="relative">
              <span className="text-sm leading-none">🎫</span>
              {store.parachuteMetrics.currentBalance > 0 && (
                <span className="absolute -top-1.5 -right-3 text-[9px] font-mono px-1 rounded-full font-black obsidian-pill-active">
                  {store.parachuteMetrics.currentBalance}
                </span>
              )}
            </div>
            <span
              className="text-[9px] sm:text-[10px] font-mono mt-1 tracking-tight sm:tracking-wider uppercase whitespace-nowrap"
              style={
                activeTab === 'dashboard' ? { color: 'var(--accent-hex, #F59E0B)' } : undefined
              }
            >
              Insights
            </span>
          </button>

          <button
            onClick={() => {
              haptics.tick(900);
              setActiveTab('schedules');
            }}
            className={`flex flex-col items-center justify-center py-2 px-1 rounded-2xl transition-all ${
              activeTab === 'schedules'
                ? 'obsidian-inset font-bold text-white shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200 border border-transparent'
            }`}
          >
            <Settings
              size={17}
              style={
                activeTab === 'schedules' ? { color: 'var(--accent-hex, #F59E0B)' } : undefined
              }
            />
            <span
              className="text-[9px] sm:text-[10px] font-mono mt-1 tracking-tight sm:tracking-normal uppercase whitespace-nowrap"
              style={
                activeTab === 'schedules' ? { color: 'var(--accent-hex, #F59E0B)' } : undefined
              }
            >
              Settings &amp; OS
            </span>
          </button>

          <button
            onClick={() => {
              haptics.tick(900);
              setActiveTab('support');
            }}
            className={`flex flex-col items-center justify-center py-2 px-1 rounded-2xl transition-all ${
              activeTab === 'support'
                ? 'obsidian-inset font-bold text-white shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200 border border-transparent'
            }`}
          >
            <Heart
              size={17}
              style={activeTab === 'support' ? { color: 'var(--accent-hex, #F59E0B)' } : undefined}
            />
            <span
              className="text-[9px] sm:text-[10px] font-mono mt-1 tracking-tight sm:tracking-wider uppercase whitespace-nowrap"
              style={activeTab === 'support' ? { color: 'var(--accent-hex, #F59E0B)' } : undefined}
            >
              Support
            </span>
          </button>
        </div>
      </nav>
    </div>
  );
}

export default App;
