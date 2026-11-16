import React, { useState } from 'react';
import { useZeroStore } from '../store/useZeroStore';
import { AetherialNav, type AetherialTab } from './AetherialNav';
import { AetherialLandingView } from './AetherialLandingView';
import { AetherialDashboardView } from './AetherialDashboardView';
import { AetherialBagsView } from './AetherialBagsView';
import { AetherialAnalyticsView } from './AetherialAnalyticsView';
import { SchedulesDonateView } from '../components/SchedulesDonateView';
import { AmbientBackground } from '../components/AmbientBackground';
import { User, Settings, ArrowLeft } from 'lucide-react';

interface AetherialControllerProps {
  onOpenProfileModal?: () => void;
  onOpenBagDrawer?: () => void;
  onOpenThemes?: () => void;
}

export const AetherialController: React.FC<AetherialControllerProps> = ({
  onOpenProfileModal,
  onOpenBagDrawer,
  onOpenThemes,
}) => {
  const store = useZeroStore();
  const [activeTab, setActiveTab] = useState<AetherialTab>('focus');
  const [showSettingsSection, setShowSettingsSection] = useState<
    'themes' | 'schedules' | 'settings' | 'os_security' | 'support' | null
  >(null);

  const handleOpenThemeSettings = () => {
    if (onOpenThemes) {
      onOpenThemes();
    } else {
      setShowSettingsSection('themes');
    }
  };

  // If in settings mode, display full settings overlay with back button
  if (showSettingsSection) {
    return (
      <div className="min-h-screen bg-[#11131b] text-[#e2e1ed] flex flex-col justify-start relative selection:bg-[#38bdf8] selection:text-[#001e2c] font-sans">
        <header
          className="sticky top-0 w-full z-40 bg-[#11131b]/95 backdrop-blur-xl border-b border-white/5 shadow-sm select-none"
          style={{ paddingTop: 'var(--zero-safe-top)' }}
        >
          <div className="h-14 px-4 sm:px-6 flex items-center justify-between">
            <button
              type="button"
              onClick={() => setShowSettingsSection(null)}
              className="flex items-center gap-2 text-xs font-semibold text-[#38bdf8] hover:text-[#7bd0ff] transition-colors cursor-pointer"
            >
              <ArrowLeft size={16} />
              <span>Back to Aetherial Focus</span>
            </button>
            <span className="text-xs uppercase tracking-wider text-[#87929a] font-bold">
              {showSettingsSection === 'themes' ? 'Themes & Styles' : 'Settings & Routines'}
            </span>
          </div>
        </header>

        <main className="p-4 sm:p-6 pb-20 max-w-xl mx-auto w-full">
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
            materialYouSeed={store.materialYouSeed}
            onMaterialYouSeedChange={store.setMaterialYouSeed}
            materialYouAmoled={store.materialYouAmoled}
            onMaterialYouAmoledChange={store.setMaterialYouAmoled}
            sleepFarmingMode={store.sleepFarmingMode}
            onSleepFarmingModeChange={store.setSleepFarmingMode}
            onExportZbakData={store.exportZbakData}
            onOneTapSaveBackup={store.oneTapSaveBackup}
            onImportData={store.importData}
            onResetData={store.resetAllData}
            cloudBackupStatus={store.cloudBackupStatus}
            cloudReminderInterval={store.cloudReminderInterval}
            lastCloudUploadTimestamp={store.lastCloudUploadTimestamp}
            onCloudReminderIntervalChange={store.setCloudReminderInterval}
            isCloudBusy={store.isCloudBusy}
            onEnableCloudAutoBackup={store.enableCloudAutoBackup}
            onDisableCloudAutoBackup={store.disableCloudAutoBackup}
            onOneTapCloudUpload={store.oneTapCloudUpload}
            onRestoreFromCloudPicker={store.restoreBackupFromCloudPicker}
            profile={store.profile}
            isZeroSupporter={store.isZeroSupporter}
            remainingEscapeTickets={store.parachuteMetrics.currentBalance}
            hasClaimedFirstTimeParachute={store.hasClaimedFirstTimeParachute}
            hasClaimedFirstDonationParachute={store.hasClaimedFirstDonationParachute}
            onClaimFirstDonationBonus={store.claimFirstDonationBonus}
            onActivateDonorToken={store.activateDonorUnlockToken}
            onOpenProfileModal={onOpenProfileModal}
            sectionOverride={{ section: showSettingsSection, key: Date.now() }}
            viewMode="all"
          />
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#11131b] text-[#e2e1ed] flex flex-col justify-between relative selection:bg-[#38bdf8] selection:text-[#001e2c] font-sans">
      <AmbientBackground />

      {/* Top Status Bar Scrim */}
      <div
        aria-hidden="true"
        className="fixed top-0 left-0 right-0 z-40 bg-[#11131b]/80 backdrop-blur-md pointer-events-none"
        style={{ height: 'var(--zero-safe-top)' }}
      />

      {/* Header */}
      <header
        className="sticky top-0 w-full z-40 bg-[#11131b]/85 backdrop-blur-xl border-b border-white/5 shadow-sm select-none"
        style={{ paddingTop: 'var(--zero-safe-top)' }}
      >
        <div className="h-16 px-4 sm:px-6 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="font-extrabold text-lg tracking-tight text-[#38bdf8]">ZERO</span>
            <span className="text-[10px] font-bold text-[#bdc8d1] uppercase px-2 py-0.5 rounded-full bg-[#282a32]/80 tracking-wider">
              AETHERIAL FOCUS
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleOpenThemeSettings}
              className="p-2 rounded-full bg-[#1d1f28] hover:bg-[#282a32] text-[#87929a] hover:text-[#38bdf8] transition-colors cursor-pointer border border-white/5 active:scale-95"
              title="Interface Styles & Themes"
            >
              <Settings size={18} />
            </button>

            <button
              type="button"
              onClick={onOpenProfileModal}
              className="w-10 h-10 rounded-full bg-[#1d1f28] hover:bg-[#282a32] flex items-center justify-center text-[#e2e1ed] transition-transform active:scale-95 border border-white/10 cursor-pointer shadow-sm"
              title="Profile & Calibration"
            >
              <User size={18} />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Pane */}
      <main className="relative z-10 flex-1 flex flex-col justify-start">
        {activeTab === 'focus' && (
          <AetherialLandingView
            onIgnite={store.igniteSession}
            activeBag={store.activeBag}
            profile={store.profile}
            customHashtags={store.customHashtags}
            sessions={store.sessions}
            onOpenBagDrawer={onOpenBagDrawer}
            onOpenProfileModal={onOpenProfileModal}
            onOpenThemes={handleOpenThemeSettings}
          />
        )}

        {activeTab === 'dashboard' && (
          <AetherialDashboardView
            profile={store.profile}
            activeBag={store.activeBag}
            bags={store.bags}
            parachuteMetrics={store.parachuteMetrics}
            sessions={store.sessions}
            currentStreak={store.currentStreak}
            todayReclaimedHours={store.todayReclaimedHours}
            onSelectActiveBag={store.setActiveBagId}
            onIgniteSession={store.igniteSession}
            onOpenBagDrawer={onOpenBagDrawer}
          />
        )}

        {activeTab === 'bags' && (
          <AetherialBagsView
            bags={store.bags}
            activeBagId={store.activeBagId}
            onSelectActiveBag={store.setActiveBagId}
            onToggleBagApp={store.toggleBagApp}
            onOpenBagDrawer={onOpenBagDrawer || (() => {})}
          />
        )}

        {activeTab === 'analytics' && (
          <AetherialAnalyticsView
            parachuteMetrics={store.parachuteMetrics}
            sessions={store.sessions}
            profile={store.profile}
            currentStreak={store.currentStreak}
            todayReclaimedHours={store.todayReclaimedHours}
          />
        )}
      </main>

      {/* Stitch Floating Pill Navigation */}
      <AetherialNav activeTab={activeTab} onTabChange={setActiveTab} />
    </div>
  );
};
