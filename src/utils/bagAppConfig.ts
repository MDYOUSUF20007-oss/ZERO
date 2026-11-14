import type {
  AppAccessMode,
  AppLockRuleConfig,
  BagApp,
  EngageSessionPayload,
  OccasionBag,
  ShortVideoAction,
} from '../types';

export const COMPULSORY_DIALER_PACKAGES: readonly string[] = [
  'com.android.dialer',
  'com.google.android.dialer',
  'com.android.incallui',
  'com.android.phone',
  'com.android.server.telecom',
  'com.samsung.android.dialer',
  'com.samsung.android.incallui',
  'com.oneplus.dialer',
  'com.oplus.dialer',
  'com.coloros.dialer',
  'com.miui.phone',
  'com.asus.dialer',
];

export const DEFAULT_SMS_PACKAGES: readonly string[] = [
  'com.android.mms',
  'com.google.android.apps.messaging',
  'com.samsung.android.messaging',
];

export const COMPULSORY_AI_ASSISTANT_PACKAGES: readonly string[] = [
  'com.google.android.apps.bard',
  'com.google.android.googlequicksearchbox',
  'com.openai.chatgpt',
  'com.anthropic.claude',
  'ai.perplexity.app.android',
  'com.microsoft.copilot',
  'com.deepseek.chat',
];

export const PROTECTED_SYSTEM_PACKAGES: readonly string[] = [
  'com.android.settings',
  'com.android.packageinstaller',
  'com.google.android.packageinstaller',
  'com.samsung.android.packageinstaller',
];

const PROTECTED_SYSTEM_SET = new Set(PROTECTED_SYSTEM_PACKAGES);
const COMPULSORY_DIALER_SET = new Set(COMPULSORY_DIALER_PACKAGES);
const COMPULSORY_AI_ASSISTANT_SET = new Set(COMPULSORY_AI_ASSISTANT_PACKAGES);

function clampNonNegativeInt(raw: unknown, maxVal = 86_400 * 7): number {
  const num = Number(raw);
  if (!Number.isFinite(num) || num <= 0) return 0;
  return Math.min(maxVal, Math.round(num));
}

export function isProtectedSystemPackage(packageName?: string | null): boolean {
  if (!packageName) return false;
  return PROTECTED_SYSTEM_SET.has(packageName.trim());
}

export function isCompulsoryDialerPackage(appOrPkg: BagApp | string | null | undefined): boolean {
  if (!appOrPkg) return false;
  if (typeof appOrPkg === 'string') {
    const trimmed = appOrPkg.trim();
    return COMPULSORY_DIALER_SET.has(trimmed) || COMPULSORY_AI_ASSISTANT_SET.has(trimmed);
  }
  const pkg = appOrPkg.packageName.trim();
  return (
    appOrPkg.category === 'calls' ||
    appOrPkg.category === 'assistant' ||
    COMPULSORY_DIALER_SET.has(pkg) ||
    COMPULSORY_AI_ASSISTANT_SET.has(pkg)
  );
}

export function isCompulsoryAiAssistantPackage(appOrPkg: BagApp | string | null | undefined): boolean {
  if (!appOrPkg) return false;
  if (typeof appOrPkg === 'string') {
    return COMPULSORY_AI_ASSISTANT_SET.has(appOrPkg.trim());
  }
  return (
    appOrPkg.category === 'assistant' ||
    COMPULSORY_AI_ASSISTANT_SET.has(appOrPkg.packageName.trim())
  );
}

export function createDefaultAppRuleConfig(mode: AppAccessMode = 'unrestricted'): AppLockRuleConfig {
  return {
    mode,
    quotaSeconds: 0,
    maxContinuousSeconds: 0,
    cooldownSeconds: 0,
    frictionEnabled: false,
    frictionDelaySeconds: 0,
    showBreathingCircle: false,
    requireIntentText: false,
    minIntentChars: 0,
    reEntryGraceSeconds: 0,
    blockShortVideos: false,
    shortVideoAction: 'overlay',
    scrollVelocityLimit: 0,
    nudgeIntervalSeconds: 0,
  };
}

export function sanitizeAccessMode(raw: unknown, fallback: AppAccessMode = 'unrestricted'): AppAccessMode {
  if (raw === 'hard_block' || raw === 'controlled' || raw === 'unrestricted') {
    return raw;
  }
  return fallback;
}

export function sanitizeShortVideoAction(
  raw: unknown,
  fallback: ShortVideoAction = 'overlay'
): ShortVideoAction {
  if (raw === 'back_action' || raw === 'overlay') {
    return raw;
  }
  return fallback;
}

export function sanitizeAppRuleConfig(
  raw: Partial<AppLockRuleConfig> | null | undefined,
  options?: { isCompulsory?: boolean; isProtectedSystem?: boolean; defaultMode?: AppAccessMode }
): AppLockRuleConfig {
  const defaultMode = options?.defaultMode ?? 'unrestricted';
  if (options?.isProtectedSystem) {
    return createDefaultAppRuleConfig('hard_block');
  }
  if (options?.isCompulsory) {
    return createDefaultAppRuleConfig('unrestricted');
  }

  const mode = sanitizeAccessMode(raw?.mode, defaultMode);
  const shortVideoAction = sanitizeShortVideoAction(raw?.shortVideoAction, 'overlay');

  return {
    mode,
    quotaSeconds: clampNonNegativeInt(raw?.quotaSeconds, 86_400 * 30),
    maxContinuousSeconds: clampNonNegativeInt(raw?.maxContinuousSeconds, 86_400),
    cooldownSeconds: clampNonNegativeInt(raw?.cooldownSeconds, 86_400),
    frictionEnabled: Boolean(raw?.frictionEnabled),
    frictionDelaySeconds: clampNonNegativeInt(raw?.frictionDelaySeconds, 3600),
    showBreathingCircle: Boolean(raw?.showBreathingCircle),
    requireIntentText: Boolean(raw?.requireIntentText),
    minIntentChars: clampNonNegativeInt(raw?.minIntentChars, 500),
    reEntryGraceSeconds: clampNonNegativeInt(raw?.reEntryGraceSeconds, 86_400),
    blockShortVideos: Boolean(raw?.blockShortVideos),
    shortVideoAction,
    scrollVelocityLimit: clampNonNegativeInt(raw?.scrollVelocityLimit, 5000),
    nudgeIntervalSeconds: clampNonNegativeInt(raw?.nudgeIntervalSeconds, 86_400),
  };
}

export function resolveEffectiveAppRuleConfig(app: BagApp): AppLockRuleConfig {
  return sanitizeAppRuleConfig(app.ruleConfig, {
    isCompulsory: isCompulsoryDialerPackage(app),
    isProtectedSystem: isProtectedSystemPackage(app.packageName),
    defaultMode: 'unrestricted',
  });
}

export function sanitizeBagApp(app: BagApp): BagApp | null {
  const pkg = (app?.packageName || '').trim();
  if (!pkg || isProtectedSystemPackage(pkg)) return null;
  const appName = (app.appName || pkg).trim().slice(0, 64) || pkg;
  const compulsory = isCompulsoryDialerPackage({ ...app, packageName: pkg });
  return {
    packageName: pkg,
    appName,
    category: app.category || 'custom',
    ...(app.iconBgColor ? { iconBgColor: app.iconBgColor } : {}),
    ruleConfig: sanitizeAppRuleConfig(app.ruleConfig, {
      isCompulsory: compulsory,
      defaultMode: 'unrestricted',
    }),
  };
}

export function sanitizeOccasionBag(raw: Partial<OccasionBag>, index = 0): OccasionBag {
  const cleanApps: BagApp[] = [];
  const seen = new Set<string>();
  const rawApps = Array.isArray(raw.apps) ? raw.apps : [];
  for (const item of rawApps) {
    if (cleanApps.length >= 500) break;
    const sanitized = sanitizeBagApp(item);
    if (!sanitized || seen.has(sanitized.packageName)) continue;
    seen.add(sanitized.packageName);
    cleanApps.push(sanitized);
  }
  const cleanId =
    typeof raw.id === 'string' && raw.id.trim()
      ? raw.id.trim().slice(0, 64)
      : `bag-${index + 1}`;
  const cleanName =
    typeof raw.name === 'string' && raw.name.trim()
      ? raw.name.trim().slice(0, 28)
      : `Bag ${index + 1}`;
  const cleanLabel =
    typeof raw.occasionLabel === 'string' && raw.occasionLabel.trim()
      ? raw.occasionLabel.trim().slice(0, 40)
      : 'Custom Occasion';

  return {
    id: cleanId,
    name: cleanName,
    occasionLabel: cleanLabel,
    apps: cleanApps,
    allowCalls: true,
    allowSms: Boolean(raw.allowSms),
    isCustom: Boolean(raw.isCustom),
  };
}

export function getAllowedBagAppsForNative(bag: OccasionBag): BagApp[] {
  return bag.apps.filter((app) => resolveEffectiveAppRuleConfig(app).mode !== 'hard_block');
}

export function buildEngageSessionPayload(input: {
  bag: OccasionBag;
  masterTimerSeconds: number;
  installedApps?: BagApp[];
  extraCompulsoryPackages?: string[];
}): EngageSessionPayload {
  const compulsorySet = new Set<string>([
    ...COMPULSORY_DIALER_PACKAGES,
    ...COMPULSORY_AI_ASSISTANT_PACKAGES,
  ]);
  if (input.bag.allowSms) {
    for (const smsPkg of DEFAULT_SMS_PACKAGES) {
      compulsorySet.add(smsPkg);
    }
  }
  if (Array.isArray(input.installedApps)) {
    for (const installed of input.installedApps) {
      if (isProtectedSystemPackage(installed.packageName)) continue;
      if (installed.category === 'calls') {
        compulsorySet.add(installed.packageName);
      } else if (input.bag.allowSms && installed.category === 'messages') {
        compulsorySet.add(installed.packageName);
      }
    }
  }
  if (Array.isArray(input.extraCompulsoryPackages)) {
    for (const pkg of input.extraCompulsoryPackages) {
      const clean = (pkg || '').trim();
      if (clean && !isProtectedSystemPackage(clean)) {
        compulsorySet.add(clean);
      }
    }
  }

  const appConfigs: Record<string, AppLockRuleConfig> = {};
  for (const app of input.bag.apps) {
    const pkg = (app.packageName || '').trim();
    if (!pkg || isProtectedSystemPackage(pkg)) continue;
    const compulsory = compulsorySet.has(pkg) || isCompulsoryDialerPackage(app);
    appConfigs[pkg] = sanitizeAppRuleConfig(app.ruleConfig, {
      isCompulsory: compulsory,
      defaultMode: 'unrestricted',
    });
  }

  return {
    bagId: input.bag.id,
    bagName: input.bag.name,
    masterTimerSeconds: clampNonNegativeInt(input.masterTimerSeconds, 86_400 * 30),
    allowSms: Boolean(input.bag.allowSms),
    compulsoryPackages: Array.from(compulsorySet),
    appConfigs,
  };
}

export function formatCompactDuration(totalSeconds: number, zeroLabel = 'Unlimited'): string {
  const safe = Math.max(0, Math.floor(totalSeconds));
  if (safe === 0) return zeroLabel;
  const h = Math.floor(safe / 3600);
  const m = Math.floor((safe % 3600) / 60);
  const s = safe % 60;
  const parts: string[] = [];
  if (h > 0) parts.push(`${h}h`);
  if (m > 0) parts.push(`${m}m`);
  if (s > 0 && h === 0) parts.push(`${s}s`);
  return parts.join(' ') || `${safe}s`;
}

export function formatRuleSummary(rule: AppLockRuleConfig): string {
  if (rule.mode === 'hard_block') {
    return 'HARD BLOCKED';
  }
  if (rule.mode === 'unrestricted') {
    return 'UNRESTRICTED';
  }
  const bits: string[] = [];
  if (rule.quotaSeconds > 0) {
    bits.push(`${formatCompactDuration(rule.quotaSeconds)} quota`);
  } else {
    bits.push('Unlimited quota');
  }
  if (rule.maxContinuousSeconds > 0) {
    bits.push(`${formatCompactDuration(rule.maxContinuousSeconds, 'Off')} streak`);
  }
  if (rule.frictionEnabled) {
    const delayLabel = rule.frictionDelaySeconds > 0 ? `${rule.frictionDelaySeconds}s` : 'instant';
    bits.push(rule.requireIntentText ? `${delayLabel} + intent` : `${delayLabel} friction`);
  }
  if (rule.blockShortVideos) {
    bits.push(rule.shortVideoAction === 'back_action' ? 'no-shorts (back)' : 'no-shorts (mask)');
  }
  if (rule.scrollVelocityLimit > 0) {
    bits.push(`<=${rule.scrollVelocityLimit} scrolls/10s`);
  }
  if (rule.nudgeIntervalSeconds > 0) {
    bits.push(`nudge ${formatCompactDuration(rule.nudgeIntervalSeconds, 'Off')}`);
  }
  return bits.join(' · ');
}
