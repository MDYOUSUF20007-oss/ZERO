/**
 * Automated CI Anti-Cheat & Productivity Integrity Verification Script
 * Zero dependencies — runs safely before install steps in GitHub Actions.
 */
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');

const failures = [];

function fail(code, message, detail = '') {
  failures.push({ code, message, detail });
}

function readText(relPath) {
  const full = path.join(ROOT, relPath);
  if (!fs.existsSync(full)) {
    return null;
  }
  return fs.readFileSync(full, 'utf8');
}

function walkFiles(dirRel, extFilter) {
  const startDir = path.join(ROOT, dirRel);
  if (!fs.existsSync(startDir)) return [];
  const results = [];
  const stack = [startDir];
  while (stack.length > 0) {
    const current = stack.pop();
    const entries = fs.readdirSync(current, { withFileTypes: true });
    for (const entry of entries) {
      if (
        entry.name === 'node_modules' ||
        entry.name === '.git' ||
        entry.name === 'dist' ||
        entry.name === 'build'
      ) {
        continue;
      }
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) {
        stack.push(full);
      } else if (!extFilter || extFilter(full)) {
        results.push(path.relative(ROOT, full).replace(/\\/g, '/'));
      }
    }
  }
  return results.sort();
}

function stripXmlComments(xml) {
  return xml.replace(/<!--[\s\S]*?-->/g, '');
}

function stripJsComments(source) {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:\\])\/\/.*$/gm, '$1');
}

// ============================================================================
// CHECK A: No android:debuggable="true" & Release Signing Integrity
// ============================================================================
const manifestFiles = walkFiles('android/app', (f) => path.basename(f) === 'AndroidManifest.xml');
if (manifestFiles.length === 0) {
  fail('A1', 'No AndroidManifest.xml files found under android/app.');
}
for (const relManifest of manifestFiles) {
  const raw = readText(relManifest) || '';
  const uncommented = stripXmlComments(raw);
  if (/android:debuggable\s*=\s*["']true["']/i.test(uncommented)) {
    fail(
      'A2',
      `Forbidden android:debuggable="true" detected in ${relManifest}.`,
      'Release APKs must never enable android:debuggable.'
    );
  }
}

function extractBracedBlock(text, headerRegex) {
  const m = headerRegex.exec(text);
  if (!m) return null;
  const openIdx = text.indexOf('{', m.index);
  if (openIdx === -1) return null;
  let depth = 0;
  for (let i = openIdx; i < text.length; i++) {
    if (text[i] === '{') depth++;
    else if (text[i] === '}') {
      depth--;
      if (depth === 0) return text.slice(openIdx + 1, i);
    }
  }
  return null;
}

const appBuildGradle = readText('android/app/build.gradle');
if (!appBuildGradle) {
  fail('A3', 'Missing android/app/build.gradle.');
} else {
  const buildTypesBlock = extractBracedBlock(appBuildGradle, /\bbuildTypes\s*\{/) || '';
  const releaseBlock = extractBracedBlock(buildTypesBlock, /\brelease\s*\{/) || '';
  if (releaseBlock && /\bdebuggable\s*=?\s*true\b/i.test(releaseBlock)) {
    fail('A4', 'Release buildType in android/app/build.gradle must not enable debuggable = true.');
  }
  if (!/applicationId\s+["']org\.zero\.detox["']/.test(appBuildGradle)) {
    fail('A5', 'applicationId must remain "org.zero.detox" to preserve in-place APK updates.');
  }
  if (
    !/enableV1Signing\s*=\s*true/.test(appBuildGradle) ||
    !/enableV2Signing\s*=\s*true/.test(appBuildGradle) ||
    !/enableV3Signing\s*=\s*true/.test(appBuildGradle)
  ) {
    fail('A6', 'V1 + V2 + V3 release signing flags must stay enabled for in-place APK updates.');
  }
}

// ============================================================================
// CHECK B: Monotonic Clock (SystemClock.elapsedRealtime()) & Settings Protection
// ============================================================================
const accServiceRel = 'android/app/src/strict/java/org/zero/detox/service/ZeroAccessibilityService.kt';
const accService = readText(accServiceRel);
if (!accService) {
  fail('B1', `Missing native AccessibilityService at ${accServiceRel}.`);
} else {
  const cleanAcc = stripJsComments(accService);
  if (!cleanAcc.includes('SystemClock.elapsedRealtime()')) {
    fail(
      'B2',
      `Monotonic clock protection removed from ${accServiceRel}.`,
      'ZeroAccessibilityService must evaluate SystemClock.elapsedRealtime().'
    );
  }
  if (!cleanAcc.includes('"com.android.settings"')) {
    fail(
      'B3',
      `Settings blocking protection ("com.android.settings") missing from ${accServiceRel}.`,
      'ZeroAccessibilityService must block Settings access during active locks.'
    );
  }
  if (!cleanAcc.includes('performGlobalAction')) {
    fail('B4', `Global back/home action missing from ${accServiceRel}.`);
  }
}

const lockEngineRel = 'android/app/src/main/java/org/zero/detox/core/LockEngine.kt';
const lockEngine = readText(lockEngineRel);
if (!lockEngine) {
  fail('B5', `Missing LockEngine at ${lockEngineRel}.`);
} else {
  const cleanEngine = stripJsComments(lockEngine);
  if (!cleanEngine.includes('SystemClock.elapsedRealtime()')) {
    fail('B6', `SystemClock.elapsedRealtime() removed from ${lockEngineRel}.`);
  }
  if (!cleanEngine.includes('computeNativeProofDigest') || !cleanEngine.includes('HmacSHA256')) {
    fail('B7', `Native HMAC proof generation missing from ${lockEngineRel}.`);
  }
}

const fgServiceRel = 'android/app/src/main/java/org/zero/detox/service/LockForegroundService.kt';
const fgService = readText(fgServiceRel);
if (!fgService) {
  fail('B8', `Missing LockForegroundService at ${fgServiceRel}.`);
} else {
  const cleanFg = stripJsComments(fgService);
  if (!cleanFg.includes('SystemClock.elapsedRealtime()')) {
    fail('B9', `SystemClock.elapsedRealtime() removed from ${fgServiceRel}.`);
  }
  if (!cleanFg.includes('"com.android.settings"')) {
    fail('B10', `Settings protection ("com.android.settings") missing from ${fgServiceRel}.`);
  }
}

const bagStoreRel = 'android/app/src/main/java/org/zero/detox/data/BagStore.kt';
const bagStore = readText(bagStoreRel);
if (!bagStore || !stripJsComments(bagStore).includes('"com.android.settings"')) {
  fail('B11', `BagStore must explicitly blacklist "com.android.settings" (${bagStoreRel}).`);
}

// ============================================================================
// CHECK C: IntegrityEngine Isolation & No Bypass Writes Outside src/core/integrity
// ============================================================================
const integrityEngineRel = 'src/core/integrity/IntegrityEngine.ts';
const integrityEngine = readText(integrityEngineRel);
if (!integrityEngine) {
  fail('C1', `Missing isolated Core Integrity Engine at ${integrityEngineRel}.`);
} else {
  if (!integrityEngine.includes('Object.freeze(')) {
    fail('C2', 'IntegrityEngine must be exported via Object.freeze(...) as read-only.');
  }
  if (
    !integrityEngine.includes("'android_elapsed_realtime'") ||
    !integrityEngine.includes('verifyNativeCompletionEvent')
  ) {
    fail(
      'C3',
      'IntegrityEngine must enforce android_elapsed_realtime monotonic native verification.'
    );
  }
}

const PROTECTED_STORAGE_PATTERNS = [
  'zero_cumulative_parachute_seconds',
  'zero_total_reclaimed_seconds',
  'zero_used_parachutes',
  'zero_bonus_parachutes',
  'zero_claimed_first_donation',
  'zero_claimed_first_time',
  'zero_sessions_history',
  'zero_parachute_ledger',
  'zero_consumed_native_events',
];

const FORBIDDEN_CHEAT_IDENTIFIERS = [
  'addFakeHours',
  'setStats',
  'fastForwardSeconds',
  'setCumulativeSeconds',
  'setTotalReclaimedSeconds',
  'setUsedParachutes',
  'setBonusParachutes',
  'setIsZeroSupporter',
  'skipTimer',
  'bypassLock',
];

const srcCodeFiles = walkFiles('src', (f) => /\.(ts|tsx|js|jsx|mjs|cjs)$/.test(f));
for (const relFile of srcCodeFiles) {
  const isIntegrityModule = relFile.startsWith('src/core/integrity/');
  const raw = readText(relFile) || '';
  const code = stripJsComments(raw);

  // Never allow cheat mutators anywhere in src/ (including IntegrityEngine)
  for (const cheatName of FORBIDDEN_CHEAT_IDENTIFIERS) {
    const regex = new RegExp(`\\b${cheatName}\\b`);
    if (regex.test(code)) {
      fail(
        'C4',
        `Forbidden cheat/bypass identifier "${cheatName}" found in ${relFile}.`,
        'UI and core modules must never expose fake hour injectors or timer skips.'
      );
    }
  }

  if (!isIntegrityModule) {
    // Disallow protected key references or localStorage.clear() outside src/core/integrity/
    for (const protectedKey of PROTECTED_STORAGE_PATTERNS) {
      if (code.includes(protectedKey)) {
        fail(
          'C5',
          `Direct reference to protected storage key "${protectedKey}" outside src/core/integrity in ${relFile}.`,
          'All focus stats, donor badges, Escape Tickets, and ledger writes must route exclusively through IntegrityEngine.'
        );
      }
    }

    if (/\blocalStorage\.clear\s*\(/.test(code)) {
      fail(
        'C6',
        `Direct localStorage.clear() bypass found outside src/core/integrity in ${relFile}.`
      );
    }
  }
}

const useZeroStoreRel = 'src/store/useZeroStore.ts';
const useZeroStore = readText(useZeroStoreRel);
if (!useZeroStore) {
  fail('C7', `Missing ${useZeroStoreRel}.`);
} else {
  const cleanStore = stripJsComments(useZeroStore);
  if (
    !cleanStore.includes("from '../core/integrity/IntegrityEngine'") ||
    !cleanStore.includes('IntegrityEngine.commitNativeSessionCompletions') ||
    !cleanStore.includes('IntegrityEngine.commitEscapeTicketAbort')
  ) {
    fail(
      'C8',
      `${useZeroStoreRel} must route session completions and Escape Ticket deductions through IntegrityEngine.`
    );
  }
  if (/if\s*\(\s*Date\.now\(\)\s*>=\s*current\.targetEndTime\s*\)/.test(cleanStore)) {
    fail(
      'C9',
      `${useZeroStoreRel} must not complete sessions using raw wall-clock Date.now() >= targetEndTime.`
    );
  }
}

// ============================================================================
// CHECK D: Repository Governance, CI Pipeline & APK Update Continuity
// ============================================================================
const codeowners = readText('.github/CODEOWNERS');
if (
  !codeowners ||
  !codeowners.includes('@MDYOUSUF20007-oss') ||
  !codeowners.includes('/android/app/src/main/java/**') ||
  !codeowners.includes('/android/app/proguard-rules.pro') ||
  !codeowners.includes('/src/core/integrity/**') ||
  !codeowners.includes('/.github/workflows/**') ||
  !codeowners.includes('/android/app/src/main/res/xml/network_security_config.xml') ||
  !codeowners.includes('/index.html')
) {
  fail(
    'D1',
    '.github/CODEOWNERS is missing mandatory @MDYOUSUF20007-oss ownership rules for protected paths.'
  );
}

const contributing = readText('CONTRIBUTING.md');
if (!contributing || !contributing.includes('Productivity Integrity Policy')) {
  fail('D2', 'CONTRIBUTING.md must declare the Productivity Integrity Policy.');
}

const mainWorkflow = readText('.github/workflows/main.yml');
if (!mainWorkflow) {
  fail('D3', 'Missing .github/workflows/main.yml release workflow.');
} else {
  if (!mainWorkflow.includes('node scripts/verify-integrity.mjs')) {
    fail('D4', '.github/workflows/main.yml must execute node scripts/verify-integrity.mjs.');
  }
  if (!mainWorkflow.includes('A1:4A:36:1E:D4:B7:F7:D6:6E:57:69:92:99:9D:02:8A:05:32:65:85:0A:6C:A4:AF:EE:4F:C1:2F:29:48:CE:11')) {
    fail('D5', 'Permanent official APK certificate SHA-256 missing from .github/workflows/main.yml.');
  }
  if (!mainWorkflow.includes('100 + GITHUB_RUN_NUMBER')) {
    fail('D6', 'Monotonic ZERO_VERSION_CODE calculation altered in .github/workflows/main.yml.');
  }
}

const buildWorkflow = readText('.github/workflows/build.yml');
if (!buildWorkflow || !buildWorkflow.includes('node scripts/verify-integrity.mjs')) {
  fail(
    'D7',
    '.github/workflows/build.yml must exist and execute node scripts/verify-integrity.mjs.'
  );
}

// ============================================================================
// CHECK E: Anti-Exfiltration, Hardcoded Backup URIs, Network Security & CSP
// ============================================================================
const netSecRel = 'android/app/src/main/res/xml/network_security_config.xml';
const netSecXmlRaw = readText(netSecRel);
if (!netSecXmlRaw) {
  fail('E1', `Missing Android network security config at ${netSecRel}.`);
} else {
  const netSecXml = stripXmlComments(netSecXmlRaw);
  if (!/<base-config[^>]*cleartextTrafficPermitted\s*=\s*["']false["']/i.test(netSecXml)) {
    fail('E1', `${netSecRel} must restrict cleartext HTTP via <base-config cleartextTrafficPermitted="false">.`);
  }
  if (/cleartextTrafficPermitted\s*=\s*["']true["']/i.test(netSecXml)) {
    fail('E1', `${netSecRel} must NEVER set cleartextTrafficPermitted="true".`);
  }
  if (/<certificates\s+[^>]*src\s*=\s*["']user["']/i.test(netSecXml)) {
    fail('E1', `${netSecRel} must not trust user-installed certificates in release builds.`);
  }
  if (/<domain[^>]*>\s*\*\s*<\/domain>/i.test(netSecXml)) {
    fail('E1', `${netSecRel} must not declare wildcard domains.`);
  }
}

const mainManifest = stripXmlComments(readText('android/app/src/main/AndroidManifest.xml') || '');
if (
  !/android:networkSecurityConfig\s*=\s*["']@xml\/network_security_config["']/.test(mainManifest) ||
  !/android:usesCleartextTraffic\s*=\s*["']false["']/.test(mainManifest)
) {
  fail(
    'E2',
    'android/app/src/main/AndroidManifest.xml must bind @xml/network_security_config and android:usesCleartextTraffic="false".'
  );
}

const indexHtml = readText('index.html');
if (!indexHtml) {
  fail('E3', 'Missing root index.html.');
} else {
  const cspMatch = /<meta\s+[^>]*http-equiv\s*=\s*["']Content-Security-Policy["'][^>]*content\s*=\s*(?:"([^"]*)"|'([^']*)')/i.exec(
    indexHtml
  );
  if (!cspMatch) {
    fail('E3', 'index.html must define a strict Content-Security-Policy meta tag.');
  } else {
    const csp = cspMatch[1] ?? cspMatch[2] ?? '';
    const directives = new Map();
    for (const part of csp.split(';')) {
      const trimmed = part.trim();
      if (!trimmed) continue;
      const tokens = trimmed.split(/\s+/);
      directives.set(tokens[0].toLowerCase(), tokens.slice(1));
    }

    const ALLOWED_CONNECT = new Set([
      "'self'",
      'https://mdyousuf20007-oss.github.io',
      'https://api.github.com',
      'content:',
    ]);
    const ALLOWED_FORM = new Set(["'self'", 'https://mdyousuf20007-oss.github.io', 'content:']);

    const defaultSrc = directives.get('default-src') || [];
    if (!defaultSrc.includes("'self'") || defaultSrc.includes('*')) {
      fail('E3', 'CSP default-src in index.html must strictly enforce self.');
    }

    const scriptSrc = directives.get('script-src') || [];
    if (
      !scriptSrc.includes("'self'") ||
      scriptSrc.includes("'unsafe-inline'") ||
      scriptSrc.includes("'unsafe-eval'") ||
      scriptSrc.includes('*')
    ) {
      fail('E3', 'CSP script-src in index.html must forbid unsafe-inline/unsafe-eval/wildcards.');
    }

    const connectSrc = directives.get('connect-src') || [];
    if (
      connectSrc.length === 0 ||
      connectSrc.some((tok) => !ALLOWED_CONNECT.has(tok)) ||
      !connectSrc.includes("'self'") ||
      !connectSrc.includes('content:')
    ) {
      fail(
        'E3',
        `CSP connect-src contains unauthorized tokens or misses required restrictions: [${connectSrc.join(' ')}].`
      );
    }

    const formAction = directives.get('form-action') || [];
    if (
      formAction.length === 0 ||
      formAction.some((tok) => !ALLOWED_FORM.has(tok)) ||
      !formAction.includes("'self'")
    ) {
      fail(
        'E3',
        `CSP form-action contains unauthorized tokens: [${formAction.join(' ')}].`
      );
    }
  }
}

const cloudPluginKtRel = 'android/app/src/main/java/org/zero/detox/plugin/CloudAutoBackupPlugin.kt';
const cloudPluginKt = stripJsComments(readText(cloudPluginKtRel) || '');
if (
  !cloudPluginKt ||
  !cloudPluginKt.includes('Intent.ACTION_CREATE_DOCUMENT') ||
  !cloudPluginKt.includes('Intent.ACTION_OPEN_DOCUMENT') ||
  !cloudPluginKt.includes('EndpointSecurityPolicy.validateSafDocumentUriString') ||
  !cloudPluginKt.includes('UNTRUSTED_URI')
) {
  fail('E4', `${cloudPluginKtRel} must enforce system SAF intents and EndpointSecurityPolicy validation.`);
} else if (
  /(HttpURLConnection|OkHttpClient|Retrofit|java\.net\.URL|https?:\/\/|\bwebhook\b)/i.test(
    cloudPluginKt
  )
) {
  fail('E4', `${cloudPluginKtRel} must not contain HTTP clients, webhooks, or external network URLs.`);
}

const cloudBackupTsRel = 'src/plugins/cloudAutoBackup.ts';
const cloudBackupTs = stripJsComments(readText(cloudBackupTsRel) || '');
if (
  !cloudBackupTs ||
  !cloudBackupTs.includes('IntegrityEngine.isAllowedBackupUri') ||
  /(https?:\/\/|\bfetch\s*\(|\bXMLHttpRequest\b|\bWebSocket\b|sendBeacon|\bwebhook\b)/i.test(
    cloudBackupTs
  )
) {
  fail(
    'E4',
    `${cloudBackupTsRel} must enforce IntegrityEngine.isAllowedBackupUri and contain zero network upload endpoints or webhooks.`
  );
}

const endpointPolicyRel = 'android/app/src/main/java/org/zero/detox/core/EndpointSecurityPolicy.kt';
const endpointPolicy = stripJsComments(readText(endpointPolicyRel) || '');
const nativeBridgeKt = stripJsComments(
  readText('android/app/src/main/java/org/zero/detox/bridge/ZeroNativeBridge.kt') || ''
);
const mainActivityJava = stripJsComments(
  readText('android/app/src/main/java/org/zero/detox/MainActivity.java') || ''
);
if (
  !endpointPolicy ||
  !endpointPolicy.includes('"mdyousuf982007@proton.me"') ||
  !endpointPolicy.includes('"https://ko-fi.com/mdyousuf2620"') ||
  !nativeBridgeKt.includes('EndpointSecurityPolicy.parseAndValidateExternalUrl') ||
  !mainActivityJava.includes('EndpointSecurityPolicy.isAllowedWebViewRequestUrl')
) {
  fail(
    'E5',
    'EndpointSecurityPolicy.kt must lock official destinations/email and be enforced in ZeroNativeBridge.kt & MainActivity.java.'
  );
}

const ALLOWED_NETWORK_PRIMITIVE_FILES = new Set([
  'src/components/CreditsModal.tsx',
  'src/utils/autoUpdater.ts',
]);

for (const relFile of srcCodeFiles) {
  const code = stripJsComments(readText(relFile) || '');
  if (/\bfetch\s*\(|\bXMLHttpRequest\b|\bnew\s+WebSocket\b|navigator\.sendBeacon\s*\(/.test(code)) {
    if (ALLOWED_NETWORK_PRIMITIVE_FILES.has(relFile)) {
      if (/\bXMLHttpRequest\b|\bnew\s+WebSocket\b|navigator\.sendBeacon\s*\(/.test(code)) {
        fail(
          'E6',
          `Unauthorized network exfiltration primitive (XHR/WebSocket/sendBeacon) found in ${relFile}.`
        );
      }
      const fetchUrls = [...code.matchAll(/\bfetch\s*\(\s*[`'"]([^`'"]+)[`'"]/g)].map((m) => m[1]);
      for (const url of fetchUrls) {
        if (!url.startsWith('https://api.github.com/repos/MDYOUSUF20007-oss/ZERO/')) {
          fail(
            'E6',
            `Unauthorized fetch URL "${url}" in ${relFile}. Must strictly target official GitHub repo API.`
          );
        }
      }
    } else {
      fail(
        'E6',
        `Unauthorized network exfiltration primitive (fetch/XHR/WebSocket/sendBeacon) found in ${relFile}.`
      );
    }
  }
}

// ============================================================================
// CHECK F: Release Hardening (R8/ProGuard, Runtime APK Signature, Root/Emulator)
// ============================================================================
if (appBuildGradle) {
  const buildTypesBlock = extractBracedBlock(appBuildGradle, /\bbuildTypes\s*\{/) || '';
  const releaseBlock = extractBracedBlock(buildTypesBlock, /\brelease\s*\{/) || '';
  if (
    !releaseBlock ||
    !/\bminifyEnabled\s+true\b/.test(releaseBlock) ||
    !/\bshrinkResources\s+true\b/.test(releaseBlock) ||
    !/proguard-android-optimize\.txt/.test(releaseBlock) ||
    !/['"]proguard-rules\.pro['"]/.test(releaseBlock)
  ) {
    fail(
      'F1',
      'android/app/build.gradle release block must enable R8/ProGuard shrinking & obfuscation (minifyEnabled true, shrinkResources true, proguard-android-optimize.txt, proguard-rules.pro).'
    );
  }
}

const proguardRulesRaw = readText('android/app/proguard-rules.pro');
const proguardActive = (proguardRulesRaw || '')
  .split(/\r?\n/)
  .map((line) => line.trim())
  .filter((line) => line && !line.startsWith('#'))
  .join('\n');
if (
  !proguardRulesRaw ||
  !proguardActive.includes('@com.getcapacitor.annotation.CapacitorPlugin') ||
  !proguardActive.includes('org.zero.detox.plugin.**') ||
  !proguardActive.includes('org.zero.detox.service.ZeroAccessibilityService') ||
  !proguardActive.includes('android.accessibilityservice.AccessibilityService') ||
  !proguardActive.includes('@android.webkit.JavascriptInterface') ||
  !proguardActive.includes('androidx.work.ListenableWorker')
) {
  fail(
    'F2',
    'android/app/proguard-rules.pro must preserve Capacitor plugins, ZeroAccessibilityService, JavascriptInterface, and WorkManager workers under R8.'
  );
}

const permHelperKt = stripJsComments(
  readText('android/app/src/main/java/org/zero/detox/bridge/PermissionStatusHelper.kt') || ''
);
const securityGuardRel = 'android/app/src/main/java/org/zero/detox/security/AppSecurityGuard.java';
const securityGuardRaw = readText(securityGuardRel);
const securityGuard = stripJsComments(securityGuardRaw || '');
const hasOfficialHash =
  securityGuard.includes('A14A361ED4B7F7D66E576992999D028A053265850A6CA4AFEE4FC12F2948CE11') ||
  (securityGuard.includes('PermissionStatusHelper.OFFICIAL_RELEASE_CERT_SHA256_HEX') &&
    permHelperKt.includes('A14A361ED4B7F7D66E576992999D028A053265850A6CA4AFEE4FC12F2948CE11'));
if (
  !securityGuardRaw ||
  /FLAG_DEBUGGABLE/i.test(securityGuard) ||
  !hasOfficialHash ||
  !securityGuard.includes('MessageDigest.getInstance("SHA-256")') ||
  !securityGuard.includes('"/system/bin/su"') ||
  !securityGuard.includes('"test-keys"') ||
  !securityGuard.includes('detectEmulatorReasons')
) {
  fail(
    'F3',
    `${securityGuardRel} must verify the official SHA-256 release signature (with zero FLAG_DEBUGGABLE bypass) and detect root/test-keys/emulators.`
  );
}

if (
  !mainActivityJava.includes('AppSecurityGuard.isAppSignatureValid(this)') ||
  !mainActivityJava.includes('showTamperAlertAndTerminate()') ||
  !mainActivityJava.includes('Process.killProcess') ||
  /FLAG_DEBUGGABLE/i.test(mainActivityJava)
) {
  fail(
    'F4',
    'MainActivity.java must enforce AppSecurityGuard.isAppSignatureValid(this) before loading Capacitor and terminate tampered builds unconditionally.'
  );
}

if (
  !nativeBridgeKt.includes('AppSecurityGuard.evaluateEnvironment') ||
  !nativeBridgeKt.includes('presetBagEditingDisabled') ||
  !nativeBridgeKt.includes('getEnvironmentSecurityJson') ||
  !cloudPluginKt.includes('AppSecurityGuard.evaluateEnvironment') ||
  !cloudPluginKt.includes('backupRestoreDisabled') ||
  !cloudPluginKt.includes('SECURITY_RESTRICTED') ||
  !(integrityEngine || '').includes('isSensitiveFeatureRestricted')
) {
  fail(
    'F5',
    'Root/emulator detection must disable sensitive backup restore & preset Bag editing in both native Android (ZeroNativeBridge/CloudAutoBackupPlugin) and IntegrityEngine.'
  );
}

if (failures.length > 0) {
  console.error('\n[INTEGRITY CHECK FAILED] Violations detected:\n');
  for (const f of failures) {
    console.error(`  - [${f.code}] ${f.message}`);
    if (f.detail) console.error(`      Detail: ${f.detail}`);
  }
  console.error('\nSee CONTRIBUTING.md for ZERO Productivity Integrity Policy.\n');
  process.exit(1);
}

console.log('[PASS] ZERO Core Productivity Integrity verification succeeded:');
console.log('  - AndroidManifest debuggable & V1+V2+V3 release update signing: OK');
console.log('  - Release R8/ProGuard shrinking & keep rules: OK');
console.log('  - Runtime APK SHA-256 signature tamper guard & root/emulator restrictions: OK');
console.log('  - Native SystemClock.elapsedRealtime() & Settings protection: OK');
console.log('  - IntegrityEngine isolation & zero raw stat/donor bypasses: OK');
console.log('  - Anti-exfiltration (hardcoded URIs, network_security_config, strict CSP): OK');
console.log('  - CODEOWNERS, CONTRIBUTING policy & release continuity: OK');
