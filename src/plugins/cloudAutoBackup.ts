import { Capacitor, registerPlugin } from '@capacitor/core';
import { IntegrityEngine } from '../core/integrity/IntegrityEngine';
import type { CloudAutoBackupStatus } from '../types';
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
  }>;
  disableAutoBackup(): Promise<{
    enabled: boolean;
    uri: null;
    displayName: null;
    providerLabel: null;
    hasPersistedPermission: boolean;
    lastBackupTimestamp: number;
  }>;
  shareManualBackup(options: {
    data: string;
    fileName?: string;
  }): Promise<{
    ok: boolean;
    timestamp: number;
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
      const provider = res.providerLabel || 'Cloud Storage';
      const fileLabel = res.displayName || ZBAK_FILE_NAME;
      return {
        ok: true,
        message: `Auto-Backup linked to ${provider} (${fileLabel}). Changes now sync automatically.`,
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

export async function triggerOneTapCloudUpload(zbakContent: string): Promise<{
  ok: boolean;
  cancelled?: boolean;
  timestamp?: number;
  message: string;
}> {
  if (isNativeAndroidCloudPluginAvailable()) {
    try {
      const res = await NativeCloudAutoBackup.shareManualBackup({
        data: zbakContent,
        fileName: ZBAK_FILE_NAME,
      });
      return {
        ok: true,
        timestamp: res.timestamp || Date.now(),
        message: 'Choose Google Drive, OneDrive, JioDrive, or Files to finish saving zero-backup.zbak.',
      };
    } catch (err: unknown) {
      const e = err as { message?: string };
      return {
        ok: false,
        message: e?.message || 'Could not launch Android Share sheet.',
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
        title: 'ZERO Cloud Backup (zero-backup.zbak)',
        text: 'Save zero-backup.zbak to Google Drive, OneDrive, JioDrive, or local storage.',
        files: [file],
      });
      return {
        ok: true,
        timestamp: Date.now(),
        message: 'Shared zero-backup.zbak — 7-day weekly backup timer reset.',
      };
    }
  } catch (err: unknown) {
    const e = err as { name?: string };
    if (e?.name === 'AbortError') {
      return { ok: false, cancelled: true, message: 'Share cancelled.' };
    }
  }

  downloadZbakBlob(zbakContent);
  return {
    ok: true,
    timestamp: Date.now(),
    message: 'Downloaded zero-backup.zbak! Save it in your Drive / OneDrive / JioDrive app.',
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
