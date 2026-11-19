import { Capacitor, registerPlugin } from '@capacitor/core';

export interface ZeroBridgePluginInterface {
  verifyAuthorIntegrity(): Promise<{
    valid: boolean;
    author: string;
    kofi: string;
    supportEmail: string;
  }>;
  syncRoutinesToNative(options: { routinesJson: string }): Promise<{ success: boolean }>;
  exitApp(): Promise<void>;
  setTargetFps(options: { fps: number }): Promise<{ success: boolean; fps: number }>;
  getTargetFps(): Promise<{ fps: number }>;
}

export const ZeroBridge = registerPlugin<ZeroBridgePluginInterface>('ZeroBridge');

export function isZeroBridgePluginAvailable(): boolean {
  try {
    return Capacitor.isNativePlatform() && Capacitor.isPluginAvailable('ZeroBridge');
  } catch {
    return false;
  }
}

/**
 * Dispatches the target display refresh rate / frame rate (24, 30, 60, 90, 120 FPS or 0 for display native).
 * Android's WindowManager.LayoutParams sets preferredDisplayRefreshRate via SurfaceFlinger.
 */
export async function setNativeTargetFps(fps: number): Promise<boolean> {
  try {
    if (isZeroBridgePluginAvailable()) {
      await ZeroBridge.setTargetFps({ fps });
      return true;
    }
  } catch {
    // Graceful fallback on web or unsupported platforms
  }
  return false;
}
