import { Capacitor, registerPlugin } from '@capacitor/core';

export interface VerifiedStudyApp {
  packageName: string;
  appName: string;
  categoryLabel: string;
  source: 'builtin' | 'coaching_sdk' | 'play_store' | 'manual_unlisted';
  addedAt: number;
}

export interface ScannedStudyCandidate {
  packageName: string;
  appName: string;
  categoryLabel: string;
  reason: string;
  source: 'builtin' | 'coaching_sdk' | 'play_store';
}

export interface VerifyStudyAppResult {
  packageName: string;
  appName: string;
  status: 'verified' | 'rejected' | 'unlisted';
  categoryLabel: string;
  reason: string;
  source: string;
}

export interface StudyAppsPluginInterface {
  scanInstalledStudyApps(): Promise<{
    apps: ScannedStudyCandidate[];
    scannedCount: number;
  }>;
  verifyStudyApp(options: {
    packageName: string;
    appName?: string;
  }): Promise<VerifyStudyAppResult>;
  syncCompulsoryStudyApps(options: {
    enabled: boolean;
    apps: Array<{ packageName: string; appName: string }>;
  }): Promise<{ synced: boolean; enabled: boolean; count: number }>;
}

export const StudyAppsPlugin = registerPlugin<StudyAppsPluginInterface>('StudyApps');

export function isStudyAppsNativeAvailable(): boolean {
  return Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android';
}
