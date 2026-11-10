import { Capacitor, registerPlugin } from '@capacitor/core';
import type { EngageSessionPayload } from '../types';

export interface ZeroEngageSessionStateResult {
  active: boolean;
  bagId: string;
  bagName: string;
  masterTimerSeconds: number;
  allowSms: boolean;
  configuredAppCount: number;
  compulsoryCount: number;
}

export interface ZeroEngagePluginInterface {
  startEngageSession(payload: EngageSessionPayload): Promise<ZeroEngageSessionStateResult>;
  stopEngageSession(): Promise<{ stopped: boolean }>;
  getEngageSessionState(): Promise<ZeroEngageSessionStateResult>;
}

export const ZeroEngage = registerPlugin<ZeroEngagePluginInterface>('ZeroEngage');

export function isZeroEngagePluginAvailable(): boolean {
  try {
    return Capacitor.isNativePlatform() && Capacitor.isPluginAvailable('ZeroEngage');
  } catch {
    return false;
  }
}

/**
 * Dispatches the dynamic Phase 2 Engage session configuration across the native bridge.
 * Writes synchronously via ZeroNativeBridge first (when attached) so native lock startup
 * never observes a race, and invokes the Capacitor ZeroEngage plugin method as well.
 */
export function startNativeEngageSession(payload: EngageSessionPayload): boolean {
  let ok = false;
  try {
    if (typeof window !== 'undefined' && window.ZeroNative?.startEngageSessionJson) {
      ok = window.ZeroNative.startEngageSessionJson(JSON.stringify(payload)) !== false;
    }
  } catch {
    // Ignore bridge error and try Capacitor plugin
  }

  try {
    if (isZeroEngagePluginAvailable()) {
      void ZeroEngage.startEngageSession(payload).catch(() => {});
      ok = true;
    }
  } catch {
    // Web preview fallback
  }

  return ok;
}

export function stopNativeEngageSession(): void {
  try {
    if (typeof window !== 'undefined' && window.ZeroNative?.stopEngageSession) {
      window.ZeroNative.stopEngageSession();
    }
  } catch {
    // Ignore
  }

  try {
    if (isZeroEngagePluginAvailable()) {
      void ZeroEngage.stopEngageSession().catch(() => {});
    }
  } catch {
    // Ignore
  }
}
