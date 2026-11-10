import { Capacitor, registerPlugin } from '@capacitor/core';
import { IntegrityEngine } from '../core/integrity/IntegrityEngine';
import type { CloudAutoBackupStatus, CloudReminderInterval } from '../types';
import { ZBAK_FILE_NAME } from '../utils/zbakCodec';

export const ALLOWED_CLOUD_DESTINATIONS = IntegrityEngine.HARDCODED_CLOUD_SAF_DESTINATIONS;

export interface CloudAutoBackupPluginInterface {
  enableAutoBackup(options: {
    fileName?: string;
    data?: string;
  }): Promise<{
    enabled: boolean;
    uri: string | null;
    displayName: string | null;
    providerLabel: string | null;
    hasPersistedPermission: boolean;
    lastBackupTimestamp: number;
    lastCloudUploadTimestamp?: number;
    reminderInterval?: CloudReminderInterval;
    bytesWritten?: number;
    synced?: boolean;
  }>;
  writeAutoBackup(options: {
    data: string;
    uri?: string;
  }): Promise<{
    ok: boolean;
    timestamp: number;
    uri: string;
    displayName: string;
    providerLabel: string;
    bytesWritten: number;
  }>;
  getAutoBackupStatus(): Promise<{
    enabled: boolean;
    uri: string | null;
    displayName: string | null;
    providerLabel: string | null;
    hasPersistedPermission: boolean;
    lastBackupTimestamp: number;
    lastCloudUploadTimestamp?: number;
    reminderInterval?: CloudReminderInterval;
  }>;
  disableAutoBackup(): Promise<{
    enabled: boolean;
    uri: null;
    displayName: null;
    providerLabel: null;
    hasPersistedPermission: boolean;
    lastBackupTimestamp: number;
    lastCloudUploadTimestamp?: number;
    reminderInterval?: CloudReminderInterval;
  }>;
  saveManualBackupToStorage(options: {
    data: string;
    fileName?: string;
  }): Promise<{
    ok: boolean;
    timestamp: number;
    fileName: string;
    locationLabel?: string;
    usedAutoSyncTarget?: boolean;
  }>;
  configureCloudReminder(options: {
    interval: CloudReminderInterval;
    lastCloudUploadTimestamp?: number;
  }): Promise<{
    ok: boolean;
    interval: CloudReminderInterval;
    lastCloudUploadTimestamp: number;
    nextReminderAtMs: number;
  }>;
  shareManualBackup(options: {
    data: string;
    fileName?: string;
  }): Promise<{
    ok: boolean;
    timestamp: number;
    lastCloudUploadTimestamp?: number;
    fileName: string;
  }>;
  pickAndReadBackupFile(): Promise<{
    data: string;
    fileName: string;
    uri: string;
    providerLabel?: string;
  }>;
}

const NativeCloudAutoBackup = registerPlugin<CloudAutoBackupPluginInterface>('CloudAutoBackup');

export function isNativeAndroidCloudPluginAvailable(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return (
      Capacitor.getPlatform() === 'android' ||
      (Capacitor.isNativePlatform() && /Android/i.test(navigator.userAgent)) ||
      Capacitor.isPluginAvailable('CloudAutoBackup')
    );
  } catch {
    return false;
  }
}

interface WebFileHandle {
  name?: string;
  createWritable: () => Promise<{
    write: (data: string) => Promise<void>;
    close: () => Promise<void>;
  }>;
}

let webFileHandle: WebFileHandle | null = null;

function downloadZbakBlob(zbakContent: string, fileName: string = ZBAK_FILE_NAME): void {
  const blob = new Blob([zbakContent], { type: 'application/octet-stream' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export async function enableUniversalCloudAutoBackup(
  initialZbakContent: string
): Promise<{ ok: boolean; cancelled?: boolean; message: string; status?: Partial<CloudAutoBackupStatus> }> {
  if (isNativeAndroidCloudPluginAvailable()) {
    try {
      const res = await NativeCloudAutoBackup.enableAutoBackup({
        fileName: ZBAK_FILE_NAME,
        data: initialZbakContent,
      });
      if (!IntegrityEngine.isAllowedBackupUri(res.uri)) {
        return {
          ok: false,
          message: 'Blocked unverified backup destination. Only Android SAF content:// providers are allowed.',
        };
      }
      const provider = res.providerLabel || 'Device Storage';
      const fileLabel = res.displayName || ZBAK_FILE_NAME;
      return {
        ok: true,
        message: `Auto-Save file linked (${provider} • ${fileLabel}). Zero now syncs automatically when you start or end a session.`,
        status: {
          supported: true,
          enabled: res.enabled,
          uri: res.uri,
          displayName: res.displayName,
          providerLabel: res.providerLabel,
          lastBackupTimestamp: res.lastBackupTimestamp || Date.now(),
          hasPersistedPermission: res.hasPersistedPermission,
          lastError: null,
        },
      };
    } catch (err: unknown) {
      const e = err as { code?: string; message?: string };
      if (e?.code === 'CANCELLED') {
        return { ok: false, cancelled: true, message: 'Cloud folder selection cancelled.' };
      }
      return {
        ok: false,
        message: e?.message || 'Unable to enable native Cloud Auto-Backup.',
      };
    }
  }

  // Web fallback (Chrome Desktop / Android Web File System Access API)
  const w = window as unknown as {
    showSaveFilePicker?: (opts: unknown) => Promise<WebFileHandle>;
  };
  if (typeof w.showSaveFilePicker === 'function') {
    try {
      const handle = await w.showSaveFilePicker({
        suggestedName: ZBAK_FILE_NAME,
        types: [
          {
            description: 'Zero Signed Cloud Backup',
            accept: { 'application/octet-stream': ['.zbak'] },
          },
        ],
      });
      const writable = await handle.createWritable();
      await writable.write(initialZbakContent);
      await writable.close();
      webFileHandle = handle;
      const now = Date.now();
      return {
        ok: true,
        message: `Auto-Backup active for ${handle.name || ZBAK_FILE_NAME} (session file handle).`,
        status: {
          supported: true,
          enabled: true,
          uri: `web-handle://${handle.name || ZBAK_FILE_NAME}`,
          displayName: handle.name || ZBAK_FILE_NAME,
          providerLabel: 'Local / Synced Folder',
          lastBackupTimestamp: now,
          hasPersistedPermission: true,
          lastError: null,
        },
      };
    } catch (err: unknown) {
      const e = err as { name?: string; message?: string };
      if (e?.name === 'AbortError') {
        return { ok: false, cancelled: true, message: 'File picker cancelled.' };
      }
    }
  }

  downloadZbakBlob(initialZbakContent);
  return {
    ok: false,
    message:
      'Persistent background Cloud Auto-Backup requires the Android APK (SAF). Saved zero-backup.zbak manually instead!',
  };
}

export async function writeUniversalCloudAutoBackup(
  zbakContent: string,
  persistedUri?: string | null
): Promise<{
  ok: boolean;
  timestamp?: number;
  permissionRevoked?: boolean;
  error?: string;
}> {
  if (persistedUri && !IntegrityEngine.isAllowedBackupUri(persistedUri)) {
    return {
      ok: false,
      permissionRevoked: true,
      error: 'Blocked unverified backup destination. Only Android SAF content:// providers are allowed.',
    };
  }
  if (isNativeAndroidCloudPluginAvailable()) {
    try {
      // Never pass mutable or external upload URLs from JS; native layer reads strictly from persisted SAF SharedPreferences.
      const res = await NativeCloudAutoBackup.writeAutoBackup({
        data: zbakContent,
      });
      if (!IntegrityEngine.isAllowedBackupUri(res.uri)) {
        return {
          ok: false,
          permissionRevoked: true,
          error: 'Blocked non-SAF backup response destination.',
        };
      }
      return {
        ok: Boolean(res.ok),
        timestamp: res.timestamp || Date.now(),
      };
    } catch (err: unknown) {
      const e = err as { code?: string; message?: string };
      return {
        ok: false,
        permissionRevoked:
          e?.code === 'PERMISSION_REVOKED' || e?.code === 'NO_URI' || e?.code === 'UNTRUSTED_URI',
        error: e?.message || 'Background auto-backup write failed.',
      };
    }
  }

  if (webFileHandle) {
    try {
      const writable = await webFileHandle.createWritable();
      await writable.write(zbakContent);
      await writable.close();
      return { ok: true, timestamp: Date.now() };
    } catch (err: unknown) {
      const e = err as { message?: string };
      return { ok: false, error: e?.message || 'Web file handle write failed.' };
    }
  }

  return { ok: false, error: 'Native Android SAF handle unavailable in browser preview.' };
}

export async function fetchUniversalCloudAutoBackupStatus(): Promise<Partial<CloudAutoBackupStatus> | null> {
  if (!isNativeAndroidCloudPluginAvailable()) return null;
  try {
    const res = await NativeCloudAutoBackup.getAutoBackupStatus();
    const safeUri = IntegrityEngine.isAllowedBackupUri(res.uri) ? res.uri : null;
    return {
      supported: true,
      enabled: Boolean(res.enabled && safeUri),
      uri: safeUri,
      displayName: safeUri ? res.displayName || null : null,
      providerLabel: safeUri ? res.providerLabel || null : null,
      hasPersistedPermission: Boolean(safeUri && res.hasPersistedPermission),
      lastBackupTimestamp: Number(res.lastBackupTimestamp) || 0,
      lastCloudUploadTimestamp:
        typeof res.lastCloudUploadTimestamp === 'number' ? res.lastCloudUploadTimestamp : undefined,
      reminderInterval: res.reminderInterval
        ? IntegrityEngine.sanitizeCloudReminderInterval(res.reminderInterval)
        : undefined,
    };
  } catch {
    return null;
  }
}

export async function disableUniversalCloudAutoBackup(): Promise<{ ok: boolean }> {
  webFileHandle = null;
  if (isNativeAndroidCloudPluginAvailable()) {
    try {
      await NativeCloudAutoBackup.disableAutoBackup();
    } catch {
      // Clear React/localStorage state anyway
    }
  }
  return { ok: true };
}

export async function oneTapSaveZbakToStorage(zbakContent: string): Promise<{
  ok: boolean;
  timestamp?: number;
  locationLabel?: string;
  fileName?: string;
  message: string;
}> {
  if (isNativeAndroidCloudPluginAvailable()) {
    try {
      const res = await NativeCloudAutoBackup.saveManualBackupToStorage({
        data: zbakContent,
        fileName: ZBAK_FILE_NAME,
      });
      const where = res.locationLabel || 'Device Storage';
      return {
        ok: Boolean(res.ok),
        timestamp: res.timestamp || Date.now(),
        locationLabel: where,
        fileName: res.fileName || ZBAK_FILE_NAME,
        message: res.usedAutoSyncTarget
          ? `Saved latest stats & donor data to ${where}.`
          : `Saved ${res.fileName || ZBAK_FILE_NAME} to ${where}.`,
      };
    } catch (err: unknown) {
      const e = err as { message?: string };
      return {
        ok: false,
        message: e?.message || 'Could not save zero-backup.zbak to storage.',
      };
    }
  }

  if (webFileHandle) {
    try {
      const writable = await webFileHandle.createWritable();
      await writable.write(zbakContent);
      await writable.close();
      return {
        ok: true,
        timestamp: Date.now(),
        locationLabel: webFileHandle.name || ZBAK_FILE_NAME,
        fileName: webFileHandle.name || ZBAK_FILE_NAME,
        message: `Saved ${webFileHandle.name || ZBAK_FILE_NAME} to linked local file.`,
      };
    } catch {
      // Fall back to direct download
    }
  }

  downloadZbakBlob(zbakContent);
  return {
    ok: true,
    timestamp: Date.now(),
    locationLabel: 'Downloads',
    fileName: ZBAK_FILE_NAME,
    message: `Saved ${ZBAK_FILE_NAME} (stats, tickets & donor perks) to Downloads.`,
  };
}

export async function syncCloudReminderSchedule(
  interval: CloudReminderInterval,
  lastCloudUploadTimestamp: number
): Promise<void> {
  if (!isNativeAndroidCloudPluginAvailable()) return;
  try {
    await NativeCloudAutoBackup.configureCloudReminder({
      interval: IntegrityEngine.sanitizeCloudReminderInterval(interval),
      lastCloudUploadTimestamp:
        Number.isFinite(lastCloudUploadTimestamp) && lastCloudUploadTimestamp > 0
          ? Math.round(lastCloudUploadTimestamp)
          : 0,
    });
  } catch {
    // Non-fatal in case plugin is unavailable in web preview
  }
}

export async function triggerOneTapCloudUpload(zbakContent: string): Promise<{
  ok: boolean;
  cancelled?: boolean;
  timestamp?: number;
  lastCloudUploadTimestamp?: number;
  message: string;
}> {
  if (isNativeAndroidCloudPluginAvailable()) {
    try {
      const res = await NativeCloudAutoBackup.shareManualBackup({
        data: zbakContent,
        fileName: ZBAK_FILE_NAME,
      });
      const ts = res.lastCloudUploadTimestamp || res.timestamp || Date.now();
      return {
        ok: true,
        timestamp: res.timestamp || ts,
        lastCloudUploadTimestamp: ts,
        message: 'Choose your cloud app (Drive, OneDrive, Proton Drive, JioDrive) to upload zero-backup.zbak.',
      };
    } catch (err: unknown) {
      const e = err as { message?: string };
      return {
        ok: false,
        message: e?.message || 'Could not launch Android Cloud app chooser.',
      };
    }
  }

  // Web Share API with File support -> fallback download
  try {
    const file = new File([zbakContent], ZBAK_FILE_NAME, {
      type: 'application/octet-stream',
    });
    if (navigator.share && navigator.canShare?.({ files: [file] })) {
      await navigator.share({
        title: 'ZERO Stats & Donor Backup (zero-backup.zbak)',
        text: 'Upload zero-backup.zbak (stats, Escape Tickets & donor perks) to your cloud app.',
        files: [file],
      });
      const now = Date.now();
      return {
        ok: true,
        timestamp: now,
        lastCloudUploadTimestamp: now,
        message: 'Shared zero-backup.zbak to your cloud app & reset reminder timer.',
      };
    }
  } catch (err: unknown) {
    const e = err as { name?: string };
    if (e?.name === 'AbortError') {
      return { ok: false, cancelled: true, message: 'Cloud upload cancelled.' };
    }
  }

  downloadZbakBlob(zbakContent);
  const now = Date.now();
  return {
    ok: true,
    timestamp: now,
    lastCloudUploadTimestamp: now,
    message: 'Downloaded zero-backup.zbak! Upload it in your Drive / OneDrive / cloud app.',
  };
}

export async function pickCloudBackupFileContent(): Promise<{
  ok: boolean;
  cancelled?: boolean;
  data?: string;
  fileName?: string;
  message?: string;
}> {
  if (isNativeAndroidCloudPluginAvailable()) {
    try {
      const res = await NativeCloudAutoBackup.pickAndReadBackupFile();
      return {
        ok: true,
        data: res.data,
        fileName: res.fileName || ZBAK_FILE_NAME,
      };
    } catch (err: unknown) {
      const e = err as { code?: string; message?: string };
      if (e?.code === 'CANCELLED') {
        return { ok: false, cancelled: true };
      }
      return {
        ok: false,
        message: e?.message || 'Could not read selected cloud backup file.',
      };
    }
  }

  return await new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.zbak,.json,*/*';

    let settled = false;
    const finish = (res: {
      ok: boolean;
      cancelled?: boolean;
      data?: string;
      fileName?: string;
      message?: string;
    }) => {
      if (settled) return;
      settled = true;
      resolve(res);
    };

    input.addEventListener('change', () => {
      const file = input.files?.[0];
      if (!file) {
        finish({ ok: false, cancelled: true });
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        const content = typeof reader.result === 'string' ? reader.result : '';
        finish({ ok: true, data: content, fileName: file.name });
      };
      reader.onerror = () => {
        finish({ ok: false, message: 'Failed to read selected backup file.' });
      };
      reader.readAsText(file);
    });

    input.addEventListener('cancel', () => {
      finish({ ok: false, cancelled: true });
    });

    input.click();
  });
}
