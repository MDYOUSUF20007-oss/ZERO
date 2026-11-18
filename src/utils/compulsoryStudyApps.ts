import {
  StudyAppsPlugin,
  isStudyAppsNativeAvailable,
  type VerifiedStudyApp,
} from '../plugins/studyApps';

export const STORAGE_KEY_COMPULSORY_STUDY_APPS = 'zero_compulsory_study_apps_v1';
export const STORAGE_KEY_STUDY_SCAN_DISMISSED = 'zero_study_scan_prompt_dismissed_v1';
export const COMPULSORY_STUDY_APPS_EVENT = 'zero-compulsory-study-apps-updated';

// Ultra-lean cap: AI assistants are already built into Zero-Noise automatically.
// Up to 2 slots covers your core coaching/course app + an online class app (e.g. Google Meet).
// Everything else belongs in a Bag.
export const MAX_COMPULSORY_STUDY_APPS = 2;

export interface CompulsoryStudyAppsConfig {
  enabled: boolean;
  apps: VerifiedStudyApp[];
}

const DEFAULT_CONFIG: CompulsoryStudyAppsConfig = {
  enabled: true,
  apps: [],
};

function notifyStudyAppsUpdated(): void {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event(COMPULSORY_STUDY_APPS_EVENT));
  }
}

export function getCompulsoryStudyAppsConfig(): CompulsoryStudyAppsConfig {
  if (typeof localStorage === 'undefined') return DEFAULT_CONFIG;
  try {
    const raw = localStorage.getItem(STORAGE_KEY_COMPULSORY_STUDY_APPS);
    if (!raw) return DEFAULT_CONFIG;
    const parsed = JSON.parse(raw);
    const enabled = typeof parsed?.enabled === 'boolean' ? parsed.enabled : true;
    const apps: VerifiedStudyApp[] = Array.isArray(parsed?.apps)
      ? parsed.apps
          .filter(
            (a: unknown): a is VerifiedStudyApp =>
              Boolean(a) &&
              typeof (a as VerifiedStudyApp).packageName === 'string' &&
              (a as VerifiedStudyApp).packageName.trim().length > 0
          )
          .slice(0, MAX_COMPULSORY_STUDY_APPS)
      : [];
    return { enabled, apps };
  } catch {
    return DEFAULT_CONFIG;
  }
}

export function saveCompulsoryStudyAppsConfig(
  next: CompulsoryStudyAppsConfig
): CompulsoryStudyAppsConfig {
  const sanitized: CompulsoryStudyAppsConfig = {
    enabled: Boolean(next.enabled),
    apps: (next.apps || []).slice(0, MAX_COMPULSORY_STUDY_APPS),
  };
  if (typeof localStorage !== 'undefined') {
    try {
      localStorage.setItem(STORAGE_KEY_COMPULSORY_STUDY_APPS, JSON.stringify(sanitized));
    } catch {
      // Ignore storage errors
    }
  }
  notifyStudyAppsUpdated();
  void syncCompulsoryStudyAppsToNative(sanitized);
  return sanitized;
}

export function addCompulsoryStudyApp(app: VerifiedStudyApp): CompulsoryStudyAppsConfig {
  const current = getCompulsoryStudyAppsConfig();
  const withoutDup = current.apps.filter((a) => a.packageName !== app.packageName);
  if (withoutDup.length >= MAX_COMPULSORY_STUDY_APPS) {
    return current;
  }
  return saveCompulsoryStudyAppsConfig({
    enabled: current.enabled,
    apps: [...withoutDup, app],
  });
}

export function removeCompulsoryStudyApp(packageName: string): CompulsoryStudyAppsConfig {
  const current = getCompulsoryStudyAppsConfig();
  return saveCompulsoryStudyAppsConfig({
    enabled: current.enabled,
    apps: current.apps.filter((a) => a.packageName !== packageName),
  });
}

export function setCompulsoryStudyAppsEnabled(enabled: boolean): CompulsoryStudyAppsConfig {
  const current = getCompulsoryStudyAppsConfig();
  return saveCompulsoryStudyAppsConfig({
    enabled,
    apps: current.apps,
  });
}

export async function syncCompulsoryStudyAppsToNative(
  override?: CompulsoryStudyAppsConfig
): Promise<void> {
  const cfg = override ?? getCompulsoryStudyAppsConfig();
  const payloadApps = cfg.apps.map((a) => ({
    packageName: a.packageName,
    appName: a.appName,
  }));

  try {
    window.ZeroNative?.syncCompulsoryStudyAppsJson?.(cfg.enabled, JSON.stringify(payloadApps));
  } catch {
    // Web preview
  }

  if (isStudyAppsNativeAvailable()) {
    try {
      await StudyAppsPlugin.syncCompulsoryStudyApps({
        enabled: cfg.enabled,
        apps: payloadApps,
      });
    } catch {
      // Non-fatal
    }
  }
}
