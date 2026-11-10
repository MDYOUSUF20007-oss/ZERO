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
  !codeowners.includes('/src/core/integrity/**') ||
  !codeowners.includes('/.github/workflows/**')
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
console.log('  - Native SystemClock.elapsedRealtime() & Settings protection: OK');
console.log('  - IntegrityEngine isolation & zero raw stat/donor bypasses: OK');
console.log('  - CODEOWNERS, CONTRIBUTING policy & release continuity: OK');
