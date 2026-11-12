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
import { InterfaceStyleProvider } from './context/InterfaceStyleContext';
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

  const isBespoke = store.interfaceStyle === 'bespoke';
  const isLiquidGlass = store.interfaceStyle === 'liquid_glass';

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
        {isLiquidGlass && <AmbientBackground />}

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
              isBespoke || isLiquidGlass ? '' : 'animate-bounce'
            }`}
            style={{ top: 'calc(0.75rem + var(--zero-safe-top))' }}
          >
            <ObsidianCard
              ambientGlow={!isBespoke}
              className={isBespoke || isLiquidGlass ? 'font-sans' : 'font-mono shadow-2xl'}
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
                        isLiquidGlass
                          ? 'liquid-squircle text-cyan-200'
                          : `w-9 h-9 obsidian-icon-box flex items-center justify-center shrink-0 ${
                              isBespoke ? 'rounded-md' : 'rounded-xl'
                            }`
                      }
                      style={
                        isLiquidGlass
                          ? undefined
                          : { color: isBespoke ? '#3B82F6' : 'var(--accent-hex, #FFFFFF)' }
                      }
                    >
                      <BellRing size={17} strokeWidth={1.75} />
                    </div>
                    <div className="min-w-0">
                      <div
                        className={`text-xs uppercase tracking-wider ${
                          isBespoke || isLiquidGlass ? 'font-semibold' : 'font-black'
                        }`}
                        style={{
                          color: isLiquidGlass
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
                      isLiquidGlass
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
                isBespoke || isLiquidGlass ? 'font-sans text-xs' : 'font-mono text-xs shadow-2xl'
              }
              headerClassName="p-3 flex items-center justify-between gap-2"
              style={
                isBespoke || isLiquidGlass
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
            onIgnite={store.igniteSession}
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
      {isLiquidGlass ? (
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
              <div className="relative">
                <span className="text-sm leading-none">🎫</span>
                {store.parachuteMetrics.currentBalance > 0 && (
                  <span
                    className={`absolute -top-1.5 -right-3 text-[9px] font-mono tabular-nums px-1 font-bold ${
                      isBespoke
                        ? 'rounded-sm bg-blue-600 text-white border border-blue-500'
                        : 'rounded-full font-black obsidian-pill-active'
                    }`}
                  >
                    {store.parachuteMetrics.currentBalance}
                  </span>
                )}
              </div>
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
    </div>
    </InterfaceStyleProvider>
  );
}

export default App;
