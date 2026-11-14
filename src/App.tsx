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
import { AmbientBackground } from './components/AmbientBackground';
import { LiquidDock } from './components/LiquidDock';
import { OnboardingWizard } from './components/OnboardingWizard';
import { InteractiveTour } from './components/InteractiveTour';
import { InterfaceStyleProvider } from './context/InterfaceStyleContext';
import { IntegrityEngine } from './core/integrity/IntegrityEngine';
import { checkForAppUpdate, isUpdatePromptDue, recordUpdatePromptShown } from './utils/autoUpdater';
import { checkAndEnforceRoutines } from './utils/routineEngine';
import { haptics } from './utils/haptics';
import type { AppUpdateReleaseInfo, HabitCalibrationProfile, RecurringSchedule, OccasionBag } from './types';
import { Clock, Heart, BellRing, Settings, X, BarChart3, AlertTriangle, Download, Sparkles, Upload } from 'lucide-react';

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
  const [showOnboardingWizard, setShowOnboardingWizard] = useState(!store.onboardingComplete);
  const [showInteractiveTour, setShowInteractiveTour] = useState(false);
  const [exitToast, setExitToast] = useState(false);
  const [integrityViolation, setIntegrityViolation] = useState<string | null>(null);
  const [updateInfo, setUpdateInfo] = useState<AppUpdateReleaseInfo | null>(null);
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [backupNudgeVisible, setBackupNudgeVisible] = useState(false);
  const lastBackPressRef = useRef<number>(0);
  const hasAutoPromptedRef = useRef(false);

  // Author integrity verification on startup
  useEffect(() => {
    const check = IntegrityEngine.verifyAuthorIntegrity();
    if (!check.ok || !check.signatureValid) {
      setIntegrityViolation(
        check.error || 'CRITICAL INTEGRITY VIOLATION: Author credits or support endpoints have been modified.'
      );
    }
  }, []);

  // Auto-updater check on launch (throttled to 24h)
  useEffect(() => {
    checkForAppUpdate().then((info) => {
      if (info && isUpdatePromptDue()) {
        setUpdateInfo(info);
        setShowUpdateModal(true);
      }
    });
  }, []);

  // 7-day recurring local backup reminder nudge
  useEffect(() => {
    if (!store.autoBackupEnabled && IntegrityEngine.isWeeklyBackupDue(false, store.lastBackupTimestamp)) {
      setBackupNudgeVisible(true);
    }
  }, [store.autoBackupEnabled, store.lastBackupTimestamp]);

  // Routine execution engine synchronization
  useEffect(() => {
    checkAndEnforceRoutines(store.schedules);
  }, [store.schedules]);

  useEffect(() => {
    const onResume = () => {
      checkAndEnforceRoutines(store.schedules);
    };
    window.addEventListener('focus', onResume);
    document.addEventListener('visibilitychange', onResume);
    return () => {
      window.removeEventListener('focus', onResume);
      document.removeEventListener('visibilitychange', onResume);
    };
  }, [store.schedules]);

  // Android Back Gesture & Navigation Stack Hierarchical Popping
  useEffect(() => {
    const onBackAction = () => {
      if (showTicketModal) {
        setShowTicketModal(false);
        return;
      }
      if (showProfileModal) {
        setShowProfileModal(false);
        return;
      }
      if (showBagModal) {
        setShowBagModal(false);
        return;
      }
      if (showPermissionModal) {
        setShowPermissionModal(false);
        return;
      }
      if (showSessionFlexModal) {
        setShowSessionFlexModal(false);
        return;
      }
      if (showUpdateModal) {
        setShowUpdateModal(false);
        return;
      }
      if (showInteractiveTour) {
        setShowInteractiveTour(false);
        return;
      }
      if (showOnboardingWizard) {
        return;
      }

      if (activeTab !== 'dial') {
        setActiveTab('dial');
        return;
      }

      const now = Date.now();
      if (now - lastBackPressRef.current < 2000) {
        try {
          if (window.ZeroNative?.exitApp) {
            window.ZeroNative.exitApp();
          } else if ((window as any).Capacitor?.Plugins?.App?.exitApp) {
            (window as any).Capacitor.Plugins.App.exitApp();
          }
        } catch {}
      } else {
        lastBackPressRef.current = now;
        setExitToast(true);
        setTimeout(() => setExitToast(false), 2000);
      }
    };

    const capApp = (window as any).Capacitor?.Plugins?.App;
    let removeListener: (() => void) | undefined;
    if (capApp?.addListener) {
      capApp.addListener('backButton', onBackAction).then((sub: any) => {
        if (sub?.remove) removeListener = () => sub.remove();
      });
    }

    document.addEventListener('backbutton', onBackAction);

    if (typeof window !== 'undefined') {
      window.history.pushState({ page: 'zero_root' }, '');
      const onPopState = () => {
        window.history.pushState({ page: 'zero_root' }, '');
        onBackAction();
      };
      window.addEventListener('popstate', onPopState);
      return () => {
        if (removeListener) removeListener();
        document.removeEventListener('backbutton', onBackAction);
        window.removeEventListener('popstate', onPopState);
      };
    }
  }, [
    showTicketModal,
    showProfileModal,
    showBagModal,
    showPermissionModal,
    showSessionFlexModal,
    showUpdateModal,
    showInteractiveTour,
    showOnboardingWizard,
    activeTab,
  ]);

  const handleOnboardingComplete = (
    profile: HabitCalibrationProfile,
    recommendedSchedules: RecurringSchedule[],
    recommendedBags: OccasionBag[]
  ) => {
    store.completeOnboarding({
      schedules: recommendedSchedules,
      bags: recommendedBags,
      profile,
    });
    localStorage.setItem('zero_habit_calibration_profile_v1', JSON.stringify(profile));

    if (!store.profile) {
      store.saveProfileAndClaimGift({
        displayName: 'Zero User',
        handle: 'focus',
        primaryMission: 'Deep Work',
        dailyGoalHours: profile.dailyReclaimTargetHours || 3,
        motto: profile.primaryGoal,
        avatarId: 'zen_circle',
        accentColor: '#3B82F6',
      });
    }

    setShowOnboardingWizard(false);
    setShowInteractiveTour(true);
  };

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

  const isBespoke = store.interfaceStyle === 'bespoke';
  const isFluentGlass = store.interfaceStyle === 'fluent_glass';

  // If Lock is active, THE VOID takes over everything
  if (store.activeLock.isLocked) {
    return (
      <InterfaceStyleProvider
        interfaceStyle={store.interfaceStyle}
        setInterfaceStyle={store.setInterfaceStyle}
      >
        <TheVoidView
          activeLock={store.activeLock}
          parachuteMetrics={store.parachuteMetrics}
          activeBag={store.activeBag}
          profile={store.profile}
          themeConfig={store.themeConfig}
          onDeployParachute={store.deployParachute}
        />
      </InterfaceStyleProvider>
    );
  }

  return (
    <InterfaceStyleProvider
      interfaceStyle={store.interfaceStyle}
      setInterfaceStyle={store.setInterfaceStyle}
    >
      <div className="min-h-screen zero-app-shell flex flex-col justify-between relative selection:bg-white selection:text-black">
        {isFluentGlass && <AmbientBackground />}

        {/* Top Status Bar Safe-Area Scrim */}
        <div
          aria-hidden="true"
          data-frosted-chrome="true"
          className={`fixed top-0 left-0 right-0 z-40 zero-top-scrim pointer-events-none ${
            isBespoke ? '' : 'backdrop-blur-md'
          }`}
          style={{ height: 'var(--zero-safe-top)' }}
        />

        {/* 5-Minute Pre-Lock Heads-Up Warning Banner */}
        {store.preLockAlert && (
          <div
            className={`fixed left-4 right-4 z-50 max-w-md mx-auto ${
              isBespoke || isFluentGlass ? '' : 'animate-bounce'
            }`}
            style={{ top: 'calc(0.75rem + var(--zero-safe-top))' }}
          >
            <ObsidianCard
              ambientGlow={!isBespoke}
              className={isBespoke || isFluentGlass ? 'font-sans' : 'font-mono shadow-2xl'}
              headerClassName={
                isBespoke
                  ? 'p-3.5 flex items-center justify-between gap-3'
                  : 'p-3 flex items-center justify-between gap-2.5'
              }
              headerContent={
                <>
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={
                        isFluentGlass
                          ? 'liquid-squircle text-cyan-200'
                          : `w-9 h-9 obsidian-icon-box flex items-center justify-center shrink-0 ${
                              isBespoke ? 'rounded-md' : 'rounded-xl'
                            }`
                      }
                      style={
                        isFluentGlass
                          ? undefined
                          : { color: isBespoke ? '#3B82F6' : 'var(--accent-hex, #FFFFFF)' }
                      }
                    >
                      <BellRing size={17} strokeWidth={1.75} />
                    </div>
                    <div className="min-w-0">
                      <div
                        className={`text-xs uppercase tracking-wider ${
                          isBespoke || isFluentGlass ? 'font-semibold' : 'font-black'
                        }`}
                        style={{
                          color: isFluentGlass
                            ? '#7DD3FC'
                            : isBespoke
                            ? '#60A5FA'
                            : 'var(--accent-hex, #FFFFFF)',
                        }}
                      >
                        Heads-up: Lock Starts in{' '}
                        <span className="font-mono tabular-nums">
                          {store.preLockAlert.minutesLeft}m
                        </span>
                      </div>
                      <div className="text-[11px] text-zinc-300 truncate">
                        &ldquo;{store.preLockAlert.scheduleName}&rdquo; is about to engage The Void.
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => store.triggerTestWarning('')}
                    className={`p-1.5 border text-zinc-400 hover:text-white shrink-0 ${
                      isFluentGlass
                        ? 'rounded-xl liquid-pill border-transparent'
                        : isBespoke
                        ? 'rounded-md bg-neutral-950 border-neutral-800 transition-colors duration-75'
                        : 'rounded-xl bg-zinc-900 border-white/10'
                    }`}
                    aria-label="Dismiss Heads-up Warning"
                  >
                    <X size={15} strokeWidth={1.75} />
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
              ambientGlow={!isBespoke}
              className={
                isBespoke || isFluentGlass ? 'font-sans text-xs' : 'font-mono text-xs shadow-2xl'
              }
              headerClassName="p-3 flex items-center justify-between gap-2"
              style={
                isBespoke || isFluentGlass
                  ? undefined
                  : {
                      backgroundColor: '#000000',
                      borderColor: 'rgba(139, 92, 246, 0.7)',
                      color: '#FFFFFF',
                    }
              }
              headerContent={
                <>
                  <span className="amoled-banner-title font-bold">{restoreToast}</span>
                  <button
                    type="button"
                    onClick={() => setRestoreToast('')}
                    className="p-1 text-zinc-400 hover:text-white shrink-0"
                    aria-label="Dismiss Cloud Restore Notification"
                  >
                    <X size={14} strokeWidth={1.75} />
                  </button>
                </>
              }
            />
          </div>
        )}

      {/* Main Content Area */}
      <main
        className="relative z-10 flex-1 flex flex-col justify-start"
        style={{
          paddingTop: 'var(--zero-safe-top)',
          paddingBottom: 'var(--zero-safe-bottom)',
        }}
      >
        {activeTab === 'dial' && (
          <LockDialView
            onIgnite={integrityViolation ? () => false : store.igniteSession}
            parachuteMetrics={store.parachuteMetrics}
            activeBag={store.activeBag}
            permissions={store.permissions}
            profile={store.profile}
            customHashtags={store.customHashtags}
            onAddCustomHashtag={store.addCustomHashtag}
            isZeroSupporter={store.isZeroSupporter}
            sessions={store.sessions}
            hasClaimedFirstTimeParachute={store.hasClaimedFirstTimeParachute}
            todayReclaimedHours={store.todayReclaimedHours}
            justEarnedParachute={store.justEarnedParachute}
            showWeeklyBackupBanner={store.weeklyBackupDue}
            cloudReminderInterval={store.cloudReminderInterval}
            isCloudBusy={store.isCloudBusy}
            onOneTapUpload={store.oneTapCloudUpload}
            onOneTapSave={store.oneTapSaveBackup}
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
            themeConfig={store.themeConfig}
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
            interfaceStyle={store.interfaceStyle}
            onInterfaceStyleChange={store.setInterfaceStyle}
            sectionOverride={rulesSectionOverride}
            viewMode={activeTab === 'support' ? 'support' : 'settings_os'}
            sleepFarmingMode={store.sleepFarmingMode}
            onSleepFarmingModeChange={store.setSleepFarmingMode}
            onExportZbakData={store.exportZbakData}
            onOneTapSaveBackup={store.oneTapSaveBackup}
            onImportData={store.importData}
            onResetData={store.resetAllData}
            cloudBackupStatus={store.cloudBackupStatus}
            cloudReminderInterval={store.cloudReminderInterval}
            lastCloudUploadTimestamp={store.lastCloudUploadTimestamp}
            nextCloudReminderInfo={store.nextCloudReminderInfo}
            onCloudReminderIntervalChange={store.setCloudReminderInterval}
            isCloudBusy={store.isCloudBusy}
            onEnableCloudAutoBackup={store.enableCloudAutoBackup}
            onDisableCloudAutoBackup={store.disableCloudAutoBackup}
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
            onRecalibrateHabitProfile={() => setShowOnboardingWizard(true)}
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
        onUpdateBagAppRule={store.updateBagAppRule}
        onCreateCustomBag={store.createCustomBag}
        onDeleteCustomBag={store.deleteCustomBag}
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
        themeConfig={store.themeConfig}
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
        themeConfig={store.themeConfig}
        onThemeConfigChange={store.setThemeConfig}
        customHashtags={store.customHashtags}
        onAddCustomHashtag={store.addCustomHashtag}
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

      {/* Bottom Navigation Dock */}
      {isFluentGlass ? (
        <LiquidDock
          activeTab={activeTab}
          ticketCount={store.parachuteMetrics.currentBalance}
          onSelectTab={setActiveTab}
        />
      ) : (
        <nav
          data-frosted-chrome="true"
          className={`fixed bottom-0 left-0 right-0 z-40 border-t pt-2 px-2 sm:px-3 ${
            isBespoke ? 'bg-black' : 'obsidian-shell-bar backdrop-blur-md'
          }`}
          style={{
            paddingBottom: 'calc(0.5rem + var(--zero-safe-bottom))',
            borderColor: isBespoke ? '#262626' : 'rgba(var(--accent-rgb, 255, 255, 255), 0.35)',
          }}
        >
          {!isBespoke && (
            <div
              aria-hidden="true"
              className="absolute top-0 left-8 right-8 h-[1.5px] pointer-events-none"
              style={{
                background:
                  'linear-gradient(90deg, transparent 0%, var(--accent-hex, #FFFFFF) 50%, transparent 100%)',
                opacity: 0.75,
              }}
            />
          )}
          <div className={`max-w-md mx-auto grid grid-cols-4 ${isBespoke ? 'gap-1.5' : 'gap-1'}`}>
            <button
              onClick={() => {
                haptics.tick(900);
                setActiveTab('dial');
              }}
              className={`flex flex-col items-center justify-center py-2 px-1 ${
                isBespoke
                  ? `rounded-md transition-colors duration-75 border ${
                      activeTab === 'dial'
                        ? 'bg-neutral-950 border-neutral-700 font-semibold text-white'
                        : 'text-neutral-500 hover:text-neutral-200 border-transparent'
                    }`
                  : `rounded-2xl transition-all ${
                      activeTab === 'dial'
                        ? 'obsidian-inset font-bold text-white shadow-sm'
                        : 'text-zinc-400 hover:text-zinc-200 border border-transparent'
                    }`
              }`}
            >
              <Clock
                size={17}
                style={activeTab === 'dial' ? { color: 'var(--accent-hex, #FFFFFF)' } : undefined}
              />
              <span
                className={`text-[10px] mt-1 tracking-tight uppercase whitespace-nowrap ${
                  isBespoke ? 'font-sans font-medium' : 'font-mono sm:tracking-wider'
                }`}
                style={activeTab === 'dial' ? { color: 'var(--accent-hex, #FFFFFF)' } : undefined}
              >
                Dial
              </span>
            </button>

            <button
              onClick={() => {
                haptics.tick(900);
                setActiveTab('dashboard');
              }}
              className={`flex flex-col items-center justify-center py-2 px-1 relative ${
                isBespoke
                  ? `rounded-md transition-colors duration-75 border ${
                      activeTab === 'dashboard'
                        ? 'bg-neutral-950 border-neutral-700 font-semibold text-white'
                        : 'text-neutral-500 hover:text-neutral-200 border-transparent'
                    }`
                  : `rounded-2xl transition-all ${
                      activeTab === 'dashboard'
                        ? 'obsidian-inset font-bold text-white shadow-sm'
                        : 'text-zinc-400 hover:text-zinc-200 border border-transparent'
                    }`
              }`}
            >
              <BarChart3
                size={17}
                style={
                  activeTab === 'dashboard' ? { color: 'var(--accent-hex, #FFFFFF)' } : undefined
                }
              />
              <span
                className={`text-[10px] mt-1 tracking-tight uppercase whitespace-nowrap ${
                  isBespoke ? 'font-sans font-medium' : 'font-mono sm:tracking-wider'
                }`}
                style={
                  activeTab === 'dashboard' ? { color: 'var(--accent-hex, #FFFFFF)' } : undefined
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
              className={`flex flex-col items-center justify-center py-2 px-1 ${
                isBespoke
                  ? `rounded-md transition-colors duration-75 border ${
                      activeTab === 'schedules'
                        ? 'bg-neutral-950 border-neutral-700 font-semibold text-white'
                        : 'text-neutral-500 hover:text-neutral-200 border-transparent'
                    }`
                  : `rounded-2xl transition-all ${
                      activeTab === 'schedules'
                        ? 'obsidian-inset font-bold text-white shadow-sm'
                        : 'text-zinc-400 hover:text-zinc-200 border border-transparent'
                    }`
              }`}
            >
              <Settings
                size={17}
                style={
                  activeTab === 'schedules' ? { color: 'var(--accent-hex, #FFFFFF)' } : undefined
                }
              />
              <span
                className={`text-[10px] mt-1 tracking-tight uppercase whitespace-nowrap ${
                  isBespoke ? 'font-sans font-medium' : 'font-mono sm:tracking-normal'
                }`}
                style={
                  activeTab === 'schedules' ? { color: 'var(--accent-hex, #FFFFFF)' } : undefined
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
              className={`flex flex-col items-center justify-center py-2 px-1 ${
                isBespoke
                  ? `rounded-md transition-colors duration-75 border ${
                      activeTab === 'support'
                        ? 'bg-neutral-950 border-neutral-700 font-semibold text-white'
                        : 'text-neutral-500 hover:text-neutral-200 border-transparent'
                    }`
                  : `rounded-2xl transition-all ${
                      activeTab === 'support'
                        ? 'obsidian-inset font-bold text-white shadow-sm'
                        : 'text-zinc-400 hover:text-zinc-200 border border-transparent'
                    }`
              }`}
            >
              <Heart
                size={17}
                style={activeTab === 'support' ? { color: 'var(--accent-hex, #FFFFFF)' } : undefined}
              />
              <span
                className={`text-[10px] mt-1 tracking-tight uppercase whitespace-nowrap ${
                  isBespoke ? 'font-sans font-medium' : 'font-mono sm:tracking-wider'
                }`}
                style={activeTab === 'support' ? { color: 'var(--accent-hex, #FFFFFF)' } : undefined}
              >
                Support
              </span>
            </button>
          </div>
        </nav>
      )}

      {/* Integrity Violation Unremovable Banner */}
      {integrityViolation && (
        <div className="fixed top-0 left-0 right-0 z-50 p-4 bg-red-950 border-b border-red-500 text-white flex items-center justify-between gap-3 shadow-2xl">
          <div className="flex items-center gap-2.5">
            <AlertTriangle size={20} className="text-red-400 shrink-0" />
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-red-200">
                Tamper Alert: Integrity Verification Failed
              </h4>
              <p className="text-[11px] text-red-300">
                Official author constants or support endpoints have been modified. Focus blocking actions are locked.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* FTUE Theme-First & Habit Calibration Wizard */}
      {(showOnboardingWizard || !store.onboardingComplete) && (
        <OnboardingWizard
          themeConfig={store.themeConfig}
          setThemeConfig={store.setThemeConfig}
          interfaceStyle={store.interfaceStyle}
          setInterfaceStyle={store.setInterfaceStyle}
          installedApps={store.installedApps}
          onComplete={handleOnboardingComplete}
          onOpenRestore={() => {
            setShowOnboardingWizard(false);
            openInteractiveProfile();
          }}
        />
      )}

      {/* 4-Step Interactive Tour */}
      {showInteractiveTour && (
        <InteractiveTour
          onComplete={() => setShowInteractiveTour(false)}
          onNavigateTab={setActiveTab}
        />
      )}

      {/* 2-Second Swipe Again to Exit Toast */}
      {exitToast && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 pointer-events-none">
          <div className="px-4 py-2 rounded-full bg-zinc-900/95 border border-zinc-700 text-xs font-medium text-white shadow-xl flex items-center gap-2">
            <span>Swipe back again to exit Zero</span>
          </div>
        </div>
      )}

      {/* 7-Day Recurring Local Backup Reminder Nudge */}
      {backupNudgeVisible && (
        <div className="fixed bottom-24 right-4 z-40 max-w-sm pointer-events-auto">
          <div className="p-3.5 rounded-2xl bg-zinc-950 border border-zinc-700 shadow-2xl space-y-2">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-bold text-white flex items-center gap-1.5">
                <Upload size={14} className="text-blue-400" />
                Backup Due (7 Days)
              </span>
              <button
                type="button"
                onClick={() => setBackupNudgeVisible(false)}
                className="text-zinc-500 hover:text-white"
              >
                <X size={14} />
              </button>
            </div>
            <p className="text-[11px] text-zinc-300 leading-snug">
              Your discipline stats and Escape Tickets are stored locally. Export a .zbak backup to prevent data loss.
            </p>
            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={() => {
                  setBackupNudgeVisible(false);
                  store.exportZbakData();
                }}
                className="flex-1 py-1.5 px-3 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold text-center"
              >
                Save .zbak
              </button>
              <button
                type="button"
                onClick={() => setBackupNudgeVisible(false)}
                className="py-1.5 px-3 rounded-lg bg-zinc-900 text-zinc-400 hover:text-white text-xs"
              >
                Later
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Auto-Updater Release Prompt Modal */}
      {showUpdateModal && updateInfo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="max-w-md w-full bg-zinc-950 border border-zinc-700 rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-zinc-800">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-blue-500/20 text-blue-400">
                  <Download size={18} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Update Available: v{updateInfo.latestVersion}</h3>
                  <p className="text-[11px] text-zinc-400">Current version: v{updateInfo.currentVersion}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  recordUpdatePromptShown();
                  setShowUpdateModal(false);
                }}
                className="p-1 text-zinc-400 hover:text-white"
              >
                <X size={16} />
              </button>
            </div>
            <div className="text-xs text-zinc-300 max-h-40 overflow-y-auto space-y-1.5 p-3 rounded-xl bg-zinc-900 border border-zinc-800 whitespace-pre-wrap font-mono">
              {updateInfo.releaseNotes}
            </div>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  recordUpdatePromptShown();
                  setShowUpdateModal(false);
                }}
                className="px-4 py-2 text-xs font-semibold text-zinc-400 hover:text-white"
              >
                Remind Me in 7 Days
              </button>
              <a
                href={updateInfo.apkDownloadUrl || updateInfo.htmlUrl}
                target="_blank"
                rel="noreferrer"
                onClick={() => {
                  recordUpdatePromptShown();
                  setShowUpdateModal(false);
                }}
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-colors flex items-center gap-1.5"
              >
                <Download size={14} />
                <span>Download APK</span>
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
    </InterfaceStyleProvider>
  );
}

export default App;
