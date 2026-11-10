import type { NativePermissionStatus, RestrictedSettingsStatus } from '../types';

export type PermissionPriorityStepKey =
  | 'restricted_settings'
  | 'usage_or_accessibility'
  | 'overlay'
  | 'notifications'
  | 'all_done';

export interface PermissionPrioritySummary {
  nextStep: PermissionPriorityStepKey;
  nextButtonLabel: string;
  restrictedStatus: RestrictedSettingsStatus;
  coreGuardGranted: boolean;
  allRecommendedGranted: boolean;
  missingRequiredCount: number;
}

export function normalizeRestrictedSettingsStatus(
  permissions: NativePermissionStatus
): RestrictedSettingsStatus {
  if (permissions.restrictedSettingsStatus === 'allowed') return 'allowed';
  if (permissions.restrictedSettingsStatus === 'blocked') return 'blocked';
  if (permissions.restrictedSettingsStatus === 'check_app_info') return 'check_app_info';
  if (permissions.hasRestrictedSettingsAllowed === true) return 'allowed';
  const coreGranted = permissions.isStrictAccessibilityBuild
    ? permissions.isAccessibilityEnabled
    : permissions.hasUsageStatsPermission;
  return coreGranted ? 'allowed' : 'check_app_info';
}

/**
 * Computes the strict permission setup priority:
 * 1. Check Allow Restricted Settings (if blocked -> App Info)
 * 2. Usage Access (Standard) / Accessibility Service (Strict)
 * 3. Display Over Other Apps (Overlay)
 * 4. Notifications
 */
export function evaluatePermissionPriority(
  permissions: NativePermissionStatus
): PermissionPrioritySummary {
  const restrictedStatus = normalizeRestrictedSettingsStatus(permissions);
  const coreGuardGranted = permissions.isStrictAccessibilityBuild
    ? permissions.isAccessibilityEnabled
    : permissions.hasUsageStatsPermission;

  const missingRequiredCount =
    (coreGuardGranted ? 0 : 1) + (permissions.hasOverlayPermission ? 0 : 1);
  const allRecommendedGranted =
    Boolean(permissions.strictReady) && Boolean(permissions.hasNotificationPermission);

  if (!coreGuardGranted && restrictedStatus === 'blocked') {
    return {
      nextStep: 'restricted_settings',
      nextButtonLabel: 'Grant Missing Permissions → Allow Restricted Settings',
      restrictedStatus,
      coreGuardGranted,
      allRecommendedGranted,
      missingRequiredCount,
    };
  }

  if (!coreGuardGranted) {
    return {
      nextStep: 'usage_or_accessibility',
      nextButtonLabel: permissions.isStrictAccessibilityBuild
        ? 'Grant Missing Permissions → Accessibility Service'
        : 'Grant Missing Permissions → Usage Access (Find Zero)',
      restrictedStatus,
      coreGuardGranted,
      allRecommendedGranted,
      missingRequiredCount,
    };
  }

  if (!permissions.hasOverlayPermission) {
    return {
      nextStep: 'overlay',
      nextButtonLabel: 'Grant Missing Permissions → Display Over Other Apps',
      restrictedStatus,
      coreGuardGranted,
      allRecommendedGranted,
      missingRequiredCount,
    };
  }

  if (!permissions.hasNotificationPermission) {
    return {
      nextStep: 'notifications',
      nextButtonLabel: 'Grant Missing Permissions → Allow Notifications',
      restrictedStatus,
      coreGuardGranted,
      allRecommendedGranted,
      missingRequiredCount,
    };
  }

  return {
    nextStep: 'all_done',
    nextButtonLabel: 'All Permissions Armed',
    restrictedStatus,
    coreGuardGranted,
    allRecommendedGranted,
    missingRequiredCount,
  };
}
