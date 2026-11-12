package org.zero.detox;

import static org.junit.Assert.*;

import android.app.AppOpsManager;
import android.content.Context;
import android.content.ContextWrapper;
import android.content.SharedPreferences;
import java.lang.reflect.Proxy;
import java.security.MessageDigest;
import java.util.Arrays;
import java.util.Collections;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import org.json.JSONArray;
import org.json.JSONObject;
import org.junit.Test;
import org.zero.detox.bridge.PermissionStatusHelper;
import org.zero.detox.core.EndpointSecurityPolicy;
import org.zero.detox.core.LockEngine;
import org.zero.detox.data.BagStore;
import org.zero.detox.data.ParachuteStore;
import org.zero.detox.engage.EngageConfig;
import org.zero.detox.engage.EngageConfigStore;
import org.zero.detox.engage.EngageRuntimeEngine;
import org.zero.detox.security.AppSecurityGuard;
import org.zero.detox.ui.PixelFont5x7;
import org.zero.detox.ui.VoidBrandPalette;
import org.zero.detox.ui.VoidThemeStore;
import org.zero.detox.worker.CloudUploadReminderWorker;

public class LockEngineUnitTest {

    private SharedPreferences createInMemoryPrefs() {
        final Map<String, Object> store = new HashMap<>();
        final SharedPreferences.Editor editor = (SharedPreferences.Editor) Proxy.newProxyInstance(
            SharedPreferences.Editor.class.getClassLoader(),
            new Class<?>[] { SharedPreferences.Editor.class },
            (proxy, method, args) -> {
                String name = method.getName();
                if (name.startsWith("put") && args != null && args.length == 2) {
                    store.put((String) args[0], args[1]);
                    return proxy;
                } else if ("clear".equals(name)) {
                    store.clear();
                    return proxy;
                } else if ("remove".equals(name) && args != null && args.length == 1) {
                    store.remove((String) args[0]);
                    return proxy;
                } else if ("commit".equals(name)) {
                    return true;
                }
                return null;
            }
        );

        return (SharedPreferences) Proxy.newProxyInstance(
            SharedPreferences.class.getClassLoader(),
            new Class<?>[] { SharedPreferences.class },
            (proxy, method, args) -> {
                String name = method.getName();
                if ("edit".equals(name)) return editor;
                if ("getBoolean".equals(name)) {
                    Object v = store.get((String) args[0]);
                    return v instanceof Boolean ? v : args[1];
                }
                if ("getLong".equals(name)) {
                    Object v = store.get((String) args[0]);
                    return v instanceof Long ? v : args[1];
                }
                if ("getInt".equals(name)) {
                    Object v = store.get((String) args[0]);
                    return v instanceof Integer ? v : args[1];
                }
                if ("getString".equals(name)) {
                    Object v = store.get((String) args[0]);
                    return v instanceof String ? v : args[1];
                }
                return null;
            }
        );
    }

    @Test
    public void startupInitialization_doesNotThrowNullPointerException() {
        final Map<String, SharedPreferences> prefMap = new HashMap<>();
        Context fakeContext = new ContextWrapper(null) {
            @Override
            public SharedPreferences getSharedPreferences(String name, int mode) {
                return prefMap.computeIfAbsent(name, k -> createInMemoryPrefs());
            }
        };

        ParachuteStore store = new ParachuteStore(fakeContext);
        LockEngine engine = new LockEngine(fakeContext, store);

        assertFalse(engine.getSessionState().getValue().isLocked());
        assertEquals(0, store.getParachuteBalance());
    }

    @Test
    public void parachute20HourMilestone_mathAndSyncWork() {
        final Map<String, SharedPreferences> prefMap = new HashMap<>();
        Context fakeContext = new ContextWrapper(null) {
            @Override
            public SharedPreferences getSharedPreferences(String name, int mode) {
                return prefMap.computeIfAbsent(name, k -> createInMemoryPrefs());
            }
        };

        ParachuteStore store = new ParachuteStore(fakeContext);
        store.syncLedgerState(72_000L + 18_000L, 0);
        assertEquals(1, store.getParachuteBalance());
        assertEquals(5.0, store.getMetrics().getCurrentProgressHours(), 0.01);
    }

    @Test
    public void bonusParachutes_addToBalanceWithoutAffectingHours() {
        final Map<String, SharedPreferences> prefMap = new HashMap<>();
        Context fakeContext = new ContextWrapper(null) {
            @Override
            public SharedPreferences getSharedPreferences(String name, int mode) {
                return prefMap.computeIfAbsent(name, k -> createInMemoryPrefs());
            }
        };

        ParachuteStore store = new ParachuteStore(fakeContext);
        store.syncLedgerState(0L, 0, 1);
        assertEquals(1, store.getParachuteBalance());
        assertEquals(0.0, store.getMetrics().getTotalCumulativeHours(), 0.01);

        assertTrue(store.useParachute("Deep Work", 600L, System.currentTimeMillis()));
        assertEquals(0, store.getParachuteBalance());
    }

    @Test
    public void bagStore_allowsUnlimitedPackingWithPackageIsolation() {
        final Map<String, SharedPreferences> prefMap = new HashMap<>();
        Context fakeContext = new ContextWrapper(null) {
            @Override
            public String getPackageName() {
                return "org.zero.detox";
            }

            @Override
            public SharedPreferences getSharedPreferences(String name, int mode) {
                return prefMap.computeIfAbsent(name, k -> createInMemoryPrefs());
            }
        };

        BagStore bagStore = new BagStore(fakeContext);
        String fourApps = "["
            + "{\"packageName\":\"com.spotify.music\",\"appName\":\"Spotify\"},"
            + "{\"packageName\":\"com.google.android.apps.maps\",\"appName\":\"Maps\"},"
            + "{\"packageName\":\"md.obsidian\",\"appName\":\"Obsidian\"},"
            + "{\"packageName\":\"com.slack\",\"appName\":\"Slack\"}"
            + "]";
        bagStore.saveActiveBag("Commute", fourApps, false, false);

        assertEquals("Commute", bagStore.getActiveBagName());
        assertTrue("Phone calls must remain compulsory even when false is passed", bagStore.isCallsAllowed());
        assertEquals(4, bagStore.getBagApps().size());
        assertTrue(bagStore.isPackageAllowedDuringLock("org.zero.detox"));
        assertTrue(bagStore.isPackageAllowedDuringLock("com.spotify.music"));
        assertTrue(bagStore.isPackageAllowedDuringLock("md.obsidian"));
        assertTrue(bagStore.isPackageAllowedDuringLock("com.slack"));
        assertTrue(
            "Default/core dialer packages must remain accessible during any active lock",
            bagStore.isPackageAllowedDuringLock("com.google.android.dialer")
        );
        assertTrue(
            "In-call UI must remain accessible during any active lock",
            bagStore.isPackageAllowedDuringLock("com.android.incallui")
        );
        assertFalse(bagStore.isPackageAllowedDuringLock("com.instagram.android"));
        assertFalse(bagStore.isPackageAllowedDuringLock("com.android.settings"));
    }

    @Test
    public void bagStore_phoneCallsRemainCompulsoryEvenInEmptyMonkModeBag() {
        final Map<String, SharedPreferences> prefMap = new HashMap<>();
        Context fakeContext = new ContextWrapper(null) {
            @Override
            public String getPackageName() {
                return "org.zero.detox";
            }

            @Override
            public SharedPreferences getSharedPreferences(String name, int mode) {
                return prefMap.computeIfAbsent(name, k -> createInMemoryPrefs());
            }
        };

        BagStore bagStore = new BagStore(fakeContext);
        bagStore.saveActiveBag("Empty Work Bag", "[]", false, false);

        assertTrue(bagStore.getBagApps().isEmpty());
        assertTrue(bagStore.isCallsAllowed());
        assertTrue(bagStore.isPackageAllowedDuringLock("com.google.android.dialer"));
        assertTrue(bagStore.isPackageAllowedDuringLock("com.samsung.android.dialer"));
        assertTrue(bagStore.isPackageAllowedDuringLock("com.android.server.telecom"));
        assertFalse(bagStore.isPackageAllowedDuringLock("com.android.settings"));
    }

    @Test
    public void restrictedSettingsEvaluation_respectsSdkAndModes() {
        assertEquals(
            PermissionStatusHelper.RESTRICTED_ALLOWED,
            PermissionStatusHelper.evaluateRestrictedSettingsStatus(31, AppOpsManager.MODE_IGNORED, false)
        );
        assertEquals(
            PermissionStatusHelper.RESTRICTED_ALLOWED,
            PermissionStatusHelper.evaluateRestrictedSettingsStatus(35, AppOpsManager.MODE_ALLOWED, false)
        );
        assertEquals(
            PermissionStatusHelper.RESTRICTED_ALLOWED,
            PermissionStatusHelper.evaluateRestrictedSettingsStatus(35, AppOpsManager.MODE_IGNORED, true)
        );
        assertEquals(
            PermissionStatusHelper.RESTRICTED_BLOCKED,
            PermissionStatusHelper.evaluateRestrictedSettingsStatus(35, AppOpsManager.MODE_IGNORED, false)
        );
        assertEquals(
            PermissionStatusHelper.RESTRICTED_BLOCKED,
            PermissionStatusHelper.evaluateRestrictedSettingsStatus(35, AppOpsManager.MODE_ERRORED, false)
        );
        assertEquals(
            PermissionStatusHelper.RESTRICTED_CHECK_APP_INFO,
            PermissionStatusHelper.evaluateRestrictedSettingsStatus(35, AppOpsManager.MODE_DEFAULT, false)
        );
        assertEquals(
            PermissionStatusHelper.RESTRICTED_CHECK_APP_INFO,
            PermissionStatusHelper.evaluateRestrictedSettingsStatus(35, null, false)
        );
    }

    @Test
    public void nextPermissionPriority_followsRestrictedThenCoreThenOverlayThenNotifications() {
        assertEquals(
            PermissionStatusHelper.NextPermissionAction.ALLOW_RESTRICTED_SETTINGS_APP_INFO,
            PermissionStatusHelper.determineNextPermissionAction(
                false,
                PermissionStatusHelper.RESTRICTED_BLOCKED,
                false,
                false,
                false,
                false
            )
        );
        assertEquals(
            PermissionStatusHelper.NextPermissionAction.GRANT_USAGE_ACCESS,
            PermissionStatusHelper.determineNextPermissionAction(
                false,
                PermissionStatusHelper.RESTRICTED_CHECK_APP_INFO,
                false,
                false,
                false,
                false
            )
        );
        assertEquals(
            PermissionStatusHelper.NextPermissionAction.ENABLE_ACCESSIBILITY,
            PermissionStatusHelper.determineNextPermissionAction(
                true,
                PermissionStatusHelper.RESTRICTED_ALLOWED,
                false,
                false,
                false,
                false
            )
        );
        assertEquals(
            PermissionStatusHelper.NextPermissionAction.GRANT_OVERLAY,
            PermissionStatusHelper.determineNextPermissionAction(
                false,
                PermissionStatusHelper.RESTRICTED_ALLOWED,
                false,
                true,
                false,
                false
            )
        );
        assertEquals(
            PermissionStatusHelper.NextPermissionAction.GRANT_NOTIFICATIONS,
            PermissionStatusHelper.determineNextPermissionAction(
                false,
                PermissionStatusHelper.RESTRICTED_ALLOWED,
                false,
                true,
                true,
                false
            )
        );
        assertEquals(
            PermissionStatusHelper.NextPermissionAction.ALL_GRANTED,
            PermissionStatusHelper.determineNextPermissionAction(
                false,
                PermissionStatusHelper.RESTRICTED_ALLOWED,
                false,
                true,
                true,
                true
            )
        );
    }

    @Test
    public void officialReleaseCertHex_validatesCanonicalSha256() {
        assertTrue(
            PermissionStatusHelper.isOfficialReleaseCertHex(
                "A1:4A:36:1E:D4:B7:F7:D6:6E:57:69:92:99:9D:02:8A:05:32:65:85:0A:6C:A4:AF:EE:4F:C1:2F:29:48:CE:11"
            )
        );
        assertFalse(
            PermissionStatusHelper.isOfficialReleaseCertHex(
                "0D:6F:3C:19:9D:C8:F1:81:D1:0F:02:0A:4C:7B:46:2A:CD:08:61:2A:47:70:91:72:D5:D1:9A:8D:BE:89:E6:93"
            )
        );
    }

    @Test
    public void monotonicClock_blocksWallClockForwardSpoofAndEmitsSignedProofOnCompletion() throws Exception {
        final Map<String, SharedPreferences> prefMap = new HashMap<>();
        Context fakeContext = new ContextWrapper(null) {
            @Override
            public String getPackageName() {
                return "org.zero.detox";
            }

            @Override
            public SharedPreferences getSharedPreferences(String name, int mode) {
                return prefMap.computeIfAbsent(name, k -> createInMemoryPrefs());
            }
        };

        final long[] fakeElapsedMs = new long[] { 500_000L };
        final long[] fakeWallMs = new long[] { 1_794_000_000_000L };

        ParachuteStore store = new ParachuteStore(fakeContext);
        LockEngine engine = new LockEngine(
            fakeContext,
            store,
            () -> fakeElapsedMs[0],
            () -> fakeWallMs[0]
        );

        engine.igniteSession(3600L, "Deep Work");
        assertTrue(engine.getCurrentTiming().isLocked());

        // Attack: User advances device Date/Time clock +12 hours in Android Settings!
        fakeWallMs[0] += 12L * 3600L * 1000L;
        fakeElapsedMs[0] += 60_000L; // Only 1 real monotonic minute passed

        LockEngine.LockTimingSnapshot afterSpoof = engine.refreshAndCompleteIfExpired();
        assertTrue("Wall clock spoof must NOT unlock active session", afterSpoof.isLocked());
        assertFalse("Wall clock spoof must NOT mark session expired", afterSpoof.isExpired());
        assertEquals(60L, afterSpoof.getElapsedSeconds());
        assertFalse("completeSession must reject early wall-clock spoof", engine.completeSession());
        assertEquals(0, store.getPendingVerifiedCompletionsJson().length());
        assertEquals(0L, store.getMetrics().getTotalCumulativeSeconds());

        // Legitimate completion: monotonic elapsedRealtime advances remaining 3540s
        fakeElapsedMs[0] += 3540L * 1000L;
        assertTrue(engine.completeSession());
        assertFalse(engine.getCurrentTiming().isLocked());
        assertEquals(3600L, store.getMetrics().getTotalCumulativeSeconds());

        JSONArray pending = store.getPendingVerifiedCompletionsJson();
        assertEquals(1, pending.length());
        JSONObject ev = pending.getJSONObject(0);
        assertEquals(LockEngine.MONOTONIC_SOURCE, ev.getString("monotonicSource"));
        assertEquals(3600L, ev.getLong("durationSeconds"));
        assertFalse(ev.getBoolean("usedRebootFallback"));

        String expectedDigest = LockEngine.computeNativeProofDigest(
            ev.getString("eventId"),
            ev.getString("sessionId"),
            ev.getString("tag"),
            ev.getLong("startTime"),
            ev.getLong("endTime"),
            ev.getLong("durationSeconds"),
            ev.getLong("elapsedMonotonicMs"),
            ev.getBoolean("usedRebootFallback")
        );
        assertEquals(expectedDigest, ev.getString("proofDigest"));

        store.acknowledgeVerifiedCompletions("[\"" + ev.getString("eventId") + "\"]");
        assertEquals(0, store.getPendingVerifiedCompletionsJson().length());
    }

    @Test
    public void coldRebootFallback_rebasesAndCompletesSafely() {
        final Map<String, SharedPreferences> prefMap = new HashMap<>();
        Context fakeContext = new ContextWrapper(null) {
            @Override
            public SharedPreferences getSharedPreferences(String name, int mode) {
                return prefMap.computeIfAbsent(name, k -> createInMemoryPrefs());
            }
        };

        final long[] fakeElapsedMs = new long[] { 1_000_000L };
        final long[] fakeWallMs = new long[] { 1_794_100_000_000L };

        ParachuteStore store = new ParachuteStore(fakeContext);
        LockEngine engine = new LockEngine(
            fakeContext,
            store,
            () -> fakeElapsedMs[0],
            () -> fakeWallMs[0]
        );

        engine.igniteSession(3600L, "Study");

        // User cold-reboots phone after 20 minutes: elapsedRealtime resets below bootAnchor!
        fakeWallMs[0] += 1200L * 1000L;
        fakeElapsedMs[0] = 15_000L; // 15s since fresh boot

        LockEngine.LockTimingSnapshot rebased = engine.getCurrentTiming();
        assertTrue(rebased.isLocked());
        assertFalse(rebased.isExpired());
        assertTrue(rebased.getUsedRebootFallback());
        assertEquals(2400L, rebased.getRemainingSeconds());

        // Remaining 2400s tracked monotonically from the new boot's elapsedRealtime
        fakeElapsedMs[0] += 2400L * 1000L;
        assertTrue(engine.completeSession());
        assertEquals(3600L, store.getMetrics().getTotalCumulativeSeconds());
        assertEquals(1, store.getPendingVerifiedCompletionsJson().length());
    }

    @Test
    public void bagStore_stripsProtectedSettingsAndInstallers() {
        final Map<String, SharedPreferences> prefMap = new HashMap<>();
        Context fakeContext = new ContextWrapper(null) {
            @Override
            public String getPackageName() {
                return "org.zero.detox";
            }

            @Override
            public SharedPreferences getSharedPreferences(String name, int mode) {
                return prefMap.computeIfAbsent(name, k -> createInMemoryPrefs());
            }
        };

        BagStore bagStore = new BagStore(fakeContext);
        String sneakyJson = "["
            + "{\"packageName\":\"com.android.settings\",\"appName\":\"Settings\"},"
            + "{\"packageName\":\"com.google.android.packageinstaller\",\"appName\":\"Installer\"},"
            + "{\"packageName\":\"md.obsidian\",\"appName\":\"Obsidian\"}"
            + "]";
        bagStore.saveActiveBag("BypassTry", sneakyJson, false, false);

        assertEquals(1, bagStore.getBagApps().size());
        assertEquals("md.obsidian", bagStore.getBagApps().get(0).getPackageName());
        assertFalse(bagStore.isPackageAllowedDuringLock("com.android.settings"));
        assertFalse(bagStore.isPackageAllowedDuringLock("com.google.android.packageinstaller"));
    }

    @Test
    public void endpointSecurityPolicy_enforcesSafUrisAndBlocksExfiltration() {
        // Hardcoded SAF cloud & local storage URIs allowed
        assertTrue(
            EndpointSecurityPolicy.validateSafDocumentUriString(
                "content://com.google.android.apps.docs.storage/document/acc%3D1%3Bdoc%3D123",
                "org.zero.detox"
            )
        );
        assertTrue(
            EndpointSecurityPolicy.validateSafDocumentUriString(
                "content://com.microsoft.skydrive.content.StorageAccessProvider/document/zero-backup.zbak",
                "org.zero.detox"
            )
        );
        assertTrue(
            EndpointSecurityPolicy.validateSafDocumentUriString(
                "content://com.ril.jio.jiodrive.provider/document/zero-backup.zbak",
                "org.zero.detox"
            )
        );
        assertTrue(
            EndpointSecurityPolicy.validateSafDocumentUriString(
                "content://com.android.externalstorage.documents/document/primary%3ADownload%2Fzero-backup.zbak",
                "org.zero.detox"
            )
        );

        // External webhooks, HTTP, file:// paths, self-package FileProvider & system settings blocked
        assertFalse(EndpointSecurityPolicy.validateSafDocumentUriString("https://webhook.site/abc", "org.zero.detox"));
        assertFalse(EndpointSecurityPolicy.validateSafDocumentUriString("http://10.0.0.5/backup", "org.zero.detox"));
        assertFalse(EndpointSecurityPolicy.validateSafDocumentUriString("file:///sdcard/Download/zero.zbak", "org.zero.detox"));
        assertFalse(
            EndpointSecurityPolicy.validateSafDocumentUriString(
                "content://org.zero.detox.fileprovider/backups/zero.zbak",
                "org.zero.detox"
            )
        );
        assertFalse(
            EndpointSecurityPolicy.validateSafDocumentUriString(
                "content://com.android.providers.settings/system",
                "org.zero.detox"
            )
        );

        // External link & email redirection guards
        assertNotNull(EndpointSecurityPolicy.parseAndValidateExternalUrl("https://ko-fi.com/mdyousuf2620"));
        assertNotNull(EndpointSecurityPolicy.parseAndValidateExternalUrl("https://github.com/MDYOUSUF20007-oss/ZERO/releases"));
        assertNotNull(EndpointSecurityPolicy.parseAndValidateExternalUrl("mailto:mdyousuf982007@proton.me?subject=Receipt"));
        assertNotNull(EndpointSecurityPolicy.parseAndValidateExternalUrl("upi://pay?pa=md.y2007@ptaxis&am=50&cu=INR"));

        assertNull(EndpointSecurityPolicy.parseAndValidateExternalUrl("http://ko-fi.com/mdyousuf2620"));
        assertNull(EndpointSecurityPolicy.parseAndValidateExternalUrl("https://webhook.site/exfiltrate"));
        assertNull(EndpointSecurityPolicy.parseAndValidateExternalUrl("https://ko-fi.com/someoneelse"));
        assertNull(EndpointSecurityPolicy.parseAndValidateExternalUrl("mailto:attacker@evil.com?subject=Steal"));
        assertNull(EndpointSecurityPolicy.parseAndValidateExternalUrl("mailto:mdyousuf982007@proton.me?bcc=attacker@evil.com"));
        assertNull(EndpointSecurityPolicy.parseAndValidateExternalUrl("upi://pay?pa=attacker@okaxis&am=500"));

        // WebView subresource allowlist
        assertTrue(EndpointSecurityPolicy.isAllowedWebViewRequestUrl("https://localhost/assets/index.js"));
        assertTrue(EndpointSecurityPolicy.isAllowedWebViewRequestUrl("https://fonts.googleapis.com/css2?family=Inter"));
        assertTrue(EndpointSecurityPolicy.isAllowedWebViewRequestUrl("https://fonts.gstatic.com/s/inter/v1/font.woff2"));
        assertTrue(EndpointSecurityPolicy.isAllowedWebViewRequestUrl("data:image/png;base64,iVBORw0KGgo="));
        assertFalse(EndpointSecurityPolicy.isAllowedWebViewRequestUrl("http://localhost/assets/index.js"));
        assertFalse(EndpointSecurityPolicy.isAllowedWebViewRequestUrl("https://evil.com/leak?hours=100"));

        // Path traversal filename sanitization
        assertEquals("passwd", EndpointSecurityPolicy.sanitizeBackupFileName("../../etc/passwd"));
        assertEquals("zero-backup.zbak", EndpointSecurityPolicy.sanitizeBackupFileName(".."));
    }

    @Test
    public void appSecurityGuard_validatesOfficialReleaseSignatureAndRejectsTamperedOrMultiSigner() throws Exception {
        String officialHex =
            "A1:4A:36:1E:D4:B7:F7:D6:6E:57:69:92:99:9D:02:8A:05:32:65:85:0A:6C:A4:AF:EE:4F:C1:2F:29:48:CE:11";
        String attackerHex =
            "0D:6F:3C:19:9D:C8:F1:81:D1:0F:02:0A:4C:7B:46:2A:CD:08:61:2A:47:70:91:72:D5:D1:9A:8D:BE:89:E6:93";

        assertTrue(AppSecurityGuard.isValidReleaseSignatureHexList(Collections.singletonList(officialHex)));
        assertTrue(
            AppSecurityGuard.isValidReleaseSignatureHexList(
                Collections.singletonList(officialHex.replace(":", "").toLowerCase())
            )
        );
        assertFalse(AppSecurityGuard.isValidReleaseSignatureHexList(Collections.singletonList(attackerHex)));
        assertFalse(AppSecurityGuard.isValidReleaseSignatureHexList(Collections.emptyList()));
        assertFalse(AppSecurityGuard.isValidReleaseSignatureHexList(null));
        // Multi-signer APK must always be rejected even if one entry matches official key
        assertFalse(
            AppSecurityGuard.isValidReleaseSignatureHexList(Arrays.asList(officialHex, attackerHex))
        );

        byte[] officialDigest = new byte[32];
        String cleanHex = officialHex.replace(":", "");
        for (int i = 0; i < 32; i++) {
            officialDigest[i] = (byte) Integer.parseInt(cleanHex.substring(i * 2, i * 2 + 2), 16);
        }
        byte[] fakeDigest = MessageDigest.getInstance("SHA-256").digest("tampered-apk".getBytes("UTF-8"));

        assertTrue(AppSecurityGuard.isValidReleaseSignatureDigests(Collections.singletonList(officialDigest)));
        assertFalse(AppSecurityGuard.isValidReleaseSignatureDigests(Collections.singletonList(fakeDigest)));
        assertFalse(AppSecurityGuard.isValidReleaseSignatureDigests(Collections.singletonList(new byte[16])));
        assertFalse(AppSecurityGuard.isValidReleaseSignatureDigests(Arrays.asList(officialDigest, fakeDigest)));
    }

    @Test
    public void appSecurityGuard_detectsRootAndEmulatorEnvironmentsWithoutFalsePositives() {
        List<String> cleanRoot = AppSecurityGuard.detectRootReasons(
            "release-keys",
            Collections.emptyList(),
            Collections.emptyList(),
            false
        );
        assertTrue("Clean release-keys device must not flag root", cleanRoot.isEmpty());

        List<String> testKeysRoot = AppSecurityGuard.detectRootReasons(
            "test-keys",
            Collections.emptyList(),
            Collections.emptyList(),
            false
        );
        assertTrue(testKeysRoot.contains("test_keys_rom"));

        List<String> binaryAndPkgRoot = AppSecurityGuard.detectRootReasons(
            "release-keys",
            Collections.singletonList("/system/bin/su"),
            Collections.singletonList("com.topjohnwu.magisk"),
            true
        );
        assertTrue(binaryAndPkgRoot.contains("root_binary"));
        assertTrue(binaryAndPkgRoot.contains("root_manager_app"));
        assertTrue(binaryAndPkgRoot.contains("writable_system_partition"));

        List<String> cleanDevice = AppSecurityGuard.detectEmulatorReasons(
            "google/cheetah/cheetah:15/AP4A/123456:user/release-keys",
            "Pixel 7 Pro",
            "Google",
            "google",
            "cheetah",
            "cloudripper",
            "cheetah",
            false
        );
        assertTrue("Genuine Pixel properties must not trigger emulator detection", cleanDevice.isEmpty());

        List<String> sdkEmulator = AppSecurityGuard.detectEmulatorReasons(
            "google/sdk_gphone64_x86_64/emu64xa:14/UE1A/123:userdebug/dev-keys",
            "sdk_gphone64_x86_64",
            "Google",
            "google",
            "emu64xa",
            "ranchu",
            "sdk_gphone64_x86_64",
            true
        );
        assertTrue(sdkEmulator.contains("emulator_environment"));

        List<String> genymotion = AppSecurityGuard.detectEmulatorReasons(
            "generic/vbox86p/vbox86p:11/RSR1/1:userdebug/test-keys",
            "Custom Phone",
            "Genymotion",
            "Android",
            "vbox86p",
            "goldfish",
            "vbox86p",
            false
        );
        assertTrue(genymotion.contains("emulator_environment"));
    }

    @Test
    public void appSecurityGuard_environmentStatusDisablesSensitiveFeaturesWhenCompromised() throws Exception {
        AppSecurityGuard.EnvironmentSecurityStatus clean =
            new AppSecurityGuard.EnvironmentSecurityStatus(true, false, false, Collections.emptyList());
        assertFalse(clean.compromised);
        assertFalse(clean.backupRestoreDisabled);
        assertFalse(clean.presetBagEditingDisabled);

        JSONObject cleanJson = new JSONObject(clean.toJsonString());
        assertTrue(cleanJson.getBoolean("isSignatureValid"));
        assertFalse(cleanJson.getBoolean("isCompromised"));
        assertFalse(cleanJson.getJSONObject("restrictions").getBoolean("backupRestoreDisabled"));
        assertFalse(cleanJson.getJSONObject("restrictions").getBoolean("presetBagEditingDisabled"));

        AppSecurityGuard.EnvironmentSecurityStatus rooted =
            new AppSecurityGuard.EnvironmentSecurityStatus(
                true,
                true,
                false,
                Arrays.asList("root_binary", "test_keys_rom")
            );
        assertTrue(rooted.compromised);
        assertTrue(rooted.backupRestoreDisabled);
        assertTrue(rooted.presetBagEditingDisabled);

        JSONObject rootedJson = new JSONObject(rooted.toJsonString());
        assertTrue(rootedJson.getBoolean("isRooted"));
        assertTrue(rootedJson.getBoolean("isCompromised"));
        assertTrue(rootedJson.getJSONObject("restrictions").getBoolean("backupRestoreDisabled"));
        assertTrue(rootedJson.getJSONObject("restrictions").getBoolean("presetBagEditingDisabled"));
        assertEquals(2, rootedJson.getJSONArray("reasons").length());
    }

    @Test
    public void voidClockPixelFont_normalizesTimeAndBuildsCrispMatrix() {
        assertEquals("3:39 PM", PixelFont5x7.normalizeClockText(" 3:39 pm "));
        assertEquals("3:39 PM", PixelFont5x7.normalizeClockText("invalid"));
        assertEquals("00:45:00", PixelFont5x7.normalizeClockText("00:45:00"));

        PixelFont5x7.Layout layout = PixelFont5x7.buildLayout("11:42 am");
        assertEquals("11:42 AM", layout.getNormalizedText());
        assertEquals(PixelFont5x7.ROWS, layout.getTotalRows());
        assertTrue(layout.getTotalCols() > 20f);
        assertTrue(layout.getCells().size() > 50);

        PixelFont5x7.Layout timerA = PixelFont5x7.buildLayout("00:45:00");
        PixelFont5x7.Layout timerB = PixelFont5x7.buildLayout("00:44:59");
        assertEquals("00:45:00", timerA.getNormalizedText());
        assertEquals(PixelFont5x7.ROWS, timerA.getTotalRows());
        assertEquals(41.75f, timerA.getTotalCols(), 0.01f);
        assertEquals(timerA.getTotalCols(), timerB.getTotalCols(), 0.001f);
        assertTrue(timerA.getCells().size() > 80);
    }

    @Test
    public void voidBrandPalette_mapsAppsAndComputesContrastCleanly() {
        assertEquals(
            "#16A34A",
            VoidBrandPalette.resolveBrandHexForPackage("com.whatsapp", "WhatsApp", "custom", "#F59E0B")
        );
        assertEquals(
            "#1DB954",
            VoidBrandPalette.resolveBrandHexForPackage("com.spotify.music", "Spotify", "custom", "#F59E0B")
        );
        assertEquals(
            "#2563EB",
            VoidBrandPalette.resolveBrandHexForPackage("com.google.android.apps.maps", "Maps", "custom", "#F59E0B")
        );
        assertEquals(
            "#16A34A",
            VoidBrandPalette.resolveBrandHexForPackage("com.custom.dialer", "Dialer", "calls", "#F59E0B")
        );
        assertEquals("#09090B", VoidBrandPalette.contrastTextHexForBg("#FDE047"));
        assertEquals("#FFFFFF", VoidBrandPalette.contrastTextHexForBg("#16A34A"));
    }

    @Test
    public void voidThemeStore_persistsAccentAndParsesSafeColors() {
        final Map<String, SharedPreferences> prefMap = new HashMap<>();
        Context fakeContext = new ContextWrapper(null) {
            @Override
            public SharedPreferences getSharedPreferences(String name, int mode) {
                return prefMap.computeIfAbsent(name, k -> createInMemoryPrefs());
            }
        };

        assertEquals(0xFF10B981, VoidThemeStore.parseHexColorSafe("#10B981", 0xFFF59E0B));
        assertEquals(0xFFF59E0B, VoidThemeStore.parseHexColorSafe("not-a-color", 0xFFF59E0B));

        VoidThemeStore.saveAccent(fakeContext, "#10b981", "16, 185, 129", "#09090B");
        VoidThemeStore.VoidAccentConfig loaded = VoidThemeStore.loadAccent(fakeContext);
        assertEquals("#10B981", loaded.getAccentHex());
        assertEquals("16, 185, 129", loaded.getAccentRgb());
        assertEquals("#09090B", loaded.getBadgeTextHex());
        assertEquals(0xFF10B981, loaded.getAccentColor());
        assertEquals(0xFF09090B, loaded.getBadgeTextColor());

        assertEquals("classic", VoidThemeStore.loadInterfaceStyle(fakeContext));
        assertFalse(VoidThemeStore.isBespokeStyle(fakeContext));
        VoidThemeStore.saveInterfaceStyle(fakeContext, "bespoke");
        assertEquals("bespoke", VoidThemeStore.loadInterfaceStyle(fakeContext));
        assertTrue(VoidThemeStore.isBespokeStyle(fakeContext));
        VoidThemeStore.saveInterfaceStyle(fakeContext, "unexpected-value");
        assertEquals("classic", VoidThemeStore.loadInterfaceStyle(fakeContext));

        // Liquid Glass 3rd preset normalisation
        assertEquals("liquid_glass", VoidThemeStore.normalizeInterfaceStyle("liquid_glass"));
        assertEquals("liquid_glass", VoidThemeStore.normalizeInterfaceStyle("LIQUID_GLASS"));
        assertEquals("liquid_glass", VoidThemeStore.normalizeInterfaceStyle("  liquid_glass  "));
        VoidThemeStore.saveInterfaceStyle(fakeContext, "liquid_glass");
        assertEquals("liquid_glass", VoidThemeStore.loadInterfaceStyle(fakeContext));
        assertTrue(VoidThemeStore.isLiquidGlassStyle(fakeContext));
        assertFalse(VoidThemeStore.isBespokeStyle(fakeContext));
        // Reset to classic for subsequent tests
        VoidThemeStore.saveInterfaceStyle(fakeContext, "classic");

        int liftedInk = VoidThemeStore.ensureReadableOnBlack(0xFF1F2937);
        assertTrue(
            "Dark Kindle ink should lift luminance for legibility on pure black Void screen",
            VoidThemeStore.relativeLuminance(liftedInk) > VoidThemeStore.relativeLuminance(0xFF1F2937)
        );
        assertEquals(0xFFF59E0B, VoidThemeStore.ensureReadableOnBlack(0xFFF59E0B));
    }

    @Test
    public void bagStore_tracksBagIdAndDetectsWorkBagForLockLayout() {
        final Map<String, SharedPreferences> prefMap = new HashMap<>();
        Context fakeContext = new ContextWrapper(null) {
            @Override
            public SharedPreferences getSharedPreferences(String name, int mode) {
                return prefMap.computeIfAbsent(name, k -> createInMemoryPrefs());
            }
        };

        assertTrue(BagStore.isWorkBag("bag-work", "Custom Name"));
        assertTrue(BagStore.isWorkBag("bag-2", "Work Bag"));
        assertTrue(BagStore.isWorkBag("", "Morning Work"));
        assertFalse(BagStore.isWorkBag("bag-study", "Study Bag"));

        BagStore bagStore = new BagStore(fakeContext);
        bagStore.saveActiveBag("bag-work", "Work Bag", "[]", true, false);
        assertEquals("bag-work", bagStore.getActiveBagId());
        assertTrue(bagStore.isWorkBagActive());

        bagStore.saveActiveBag("bag-study", "Study Bag", "[]", true, false);
        assertEquals("bag-study", bagStore.getActiveBagId());
        assertFalse(bagStore.isWorkBagActive());
    }

    @Test
    public void cloudUploadReminderWorker_calculatesWeeklyMonthlyAndOffIntervals() {
        assertEquals("weekly", CloudUploadReminderWorker.sanitizeInterval(null));
        assertEquals("weekly", CloudUploadReminderWorker.sanitizeInterval("invalid"));
        assertEquals("monthly", CloudUploadReminderWorker.sanitizeInterval("MONTHLY"));
        assertEquals("off", CloudUploadReminderWorker.sanitizeInterval("off"));

        long weekMs = 7L * 24L * 60L * 60L * 1000L;
        long monthMs = 30L * 24L * 60L * 60L * 1000L;
        assertEquals(weekMs, CloudUploadReminderWorker.intervalMillis("weekly"));
        assertEquals(monthMs, CloudUploadReminderWorker.intervalMillis("monthly"));
        assertEquals(0L, CloudUploadReminderWorker.intervalMillis("off"));

        long now = 2_000_000_000_000L;
        assertEquals(-1L, CloudUploadReminderWorker.computeDelayMillis("off", now - monthMs, now));
        assertEquals(weekMs, CloudUploadReminderWorker.computeDelayMillis("weekly", 0L, now));
        assertEquals(monthMs, CloudUploadReminderWorker.computeDelayMillis("monthly", 0L, now));
        assertEquals(
            10L * 24L * 60L * 60L * 1000L,
            CloudUploadReminderWorker.computeDelayMillis("monthly", now - (20L * 24L * 60L * 60L * 1000L), now)
        );
        assertEquals(0L, CloudUploadReminderWorker.computeDelayMillis("weekly", now - weekMs - 5000L, now));
    }

    @Test
    public void engageConfig_parsesDynamicRulesEnforcesCompulsoryAndHardBlocksSettings() {
        String payload = "{"
            + "\"bagId\":\"study\","
            + "\"bagName\":\"Study Bag\","
            + "\"masterTimerSeconds\":7200,"
            + "\"allowSms\":false,"
            + "\"compulsoryPackages\":[\"com.google.android.dialer\",\"com.android.settings\"],"
            + "\"appConfigs\":{"
            + "\"com.instagram.android\":{"
            + "\"mode\":\"controlled\","
            + "\"quotaSeconds\":1800,"
            + "\"maxContinuousSeconds\":300,"
            + "\"cooldownSeconds\":120,"
            + "\"frictionEnabled\":true,"
            + "\"frictionDelaySeconds\":15,"
            + "\"showBreathingCircle\":true,"
            + "\"requireIntentText\":true,"
            + "\"minIntentChars\":10,"
            + "\"reEntryGraceSeconds\":60,"
            + "\"blockShortVideos\":true,"
            + "\"shortVideoAction\":\"back_action\","
            + "\"scrollVelocityLimit\":8,"
            + "\"nudgeIntervalSeconds\":300"
            + "},"
            + "\"com.zhiliaoapp.musically\":{\"mode\":\"hard_block\"},"
            + "\"com.google.android.dialer\":{\"mode\":\"hard_block\",\"quotaSeconds\":60},"
            + "\"com.android.settings\":{\"mode\":\"unrestricted\",\"quotaSeconds\":9999}"
            + "}"
            + "}";

        EngageConfig.SessionPayloadConfig cfg = EngageConfig.parseSessionPayload(payload, "org.zero.detox");
        assertNotNull(cfg);
        assertEquals("study", cfg.getBagId());
        assertEquals("Study Bag", cfg.getBagName());
        assertEquals(7200L, cfg.getMasterTimerSeconds());
        assertFalse(cfg.getCompulsoryPackages().contains("com.android.settings"));
        assertTrue(cfg.getCompulsoryPackages().contains("com.google.android.dialer"));

        EngageConfig.AppRuleConfig ig = cfg.getAppConfigs().get("com.instagram.android");
        assertNotNull(ig);
        assertEquals(EngageConfig.AccessMode.CONTROLLED, ig.getMode());
        assertEquals(1800L, ig.getQuotaSeconds());
        assertEquals(300L, ig.getMaxContinuousSeconds());
        assertEquals(120L, ig.getCooldownSeconds());
        assertTrue(ig.getFrictionEnabled());
        assertEquals(15, ig.getFrictionDelaySeconds());
        assertTrue(ig.getShowBreathingCircle());
        assertTrue(ig.getRequireIntentText());
        assertEquals(10, ig.getMinIntentChars());
        assertEquals(60, ig.getReEntryGraceSeconds());
        assertTrue(ig.getBlockShortVideos());
        assertEquals(EngageConfig.ShortVideoAction.BACK_ACTION, ig.getShortVideoAction());
        assertEquals(8, ig.getScrollVelocityLimit());
        assertEquals(300L, ig.getNudgeIntervalSeconds());

        EngageConfig.AppRuleConfig tiktok = cfg.getAppConfigs().get("com.zhiliaoapp.musically");
        assertNotNull(tiktok);
        assertEquals(EngageConfig.AccessMode.HARD_BLOCK, tiktok.getMode());

        // Compulsory dialers stay UNRESTRICTED even if tampered; protected Settings stays HARD_BLOCK
        assertEquals(
            EngageConfig.AccessMode.UNRESTRICTED,
            cfg.getAppConfigs().get("com.google.android.dialer").getMode()
        );
        assertEquals(
            EngageConfig.AccessMode.HARD_BLOCK,
            cfg.getAppConfigs().get("com.android.settings").getMode()
        );
    }

    @Test
    public void engageRuntime_enforcesQuotaCooldownFrictionAndTransientImmunity() {
        String payload = "{"
            + "\"bagId\":\"study\","
            + "\"bagName\":\"Study Bag\","
            + "\"masterTimerSeconds\":3600,"
            + "\"allowSms\":false,"
            + "\"compulsoryPackages\":[\"com.google.android.dialer\"],"
            + "\"appConfigs\":{"
            + "\"com.instagram.android\":{"
            + "\"mode\":\"controlled\","
            + "\"quotaSeconds\":10,"
            + "\"maxContinuousSeconds\":5,"
            + "\"cooldownSeconds\":4,"
            + "\"frictionEnabled\":true,"
            + "\"frictionDelaySeconds\":10,"
            + "\"showBreathingCircle\":true,"
            + "\"requireIntentText\":true,"
            + "\"minIntentChars\":10,"
            + "\"reEntryGraceSeconds\":30,"
            + "\"blockShortVideos\":false,"
            + "\"shortVideoAction\":\"overlay\","
            + "\"scrollVelocityLimit\":0,"
            + "\"nudgeIntervalSeconds\":0"
            + "}"
            + "}"
            + "}";

        EngageConfig.SessionPayloadConfig cfg = EngageConfig.parseSessionPayload(payload, "org.zero.detox");
        assertNotNull(cfg);
        EngageRuntimeEngine engine = new EngageRuntimeEngine("org.zero.detox");
        engine.configure(cfg, 1L);

        Set<String> imes = new HashSet<>(Collections.singletonList("com.google.android.inputmethod.latin"));
        Set<String> launchers = new HashSet<>(Collections.singletonList("com.google.android.apps.nexuslauncher"));

        // 1. Opening controlled app with friction triggers REQUIRE_FRICTION
        EngageRuntimeEngine.TickDecision d1 = engine.onForegroundTick(
            "com.instagram.android",
            10_000L,
            imes,
            launchers,
            pkg -> Boolean.FALSE
        );
        assertEquals(EngageRuntimeEngine.TickAction.REQUIRE_FRICTION, d1.getAction());

        // 2. Completing friction grants access cleanly
        engine.markFrictionPassed("com.instagram.android", 11_000L);
        EngageRuntimeEngine.TickDecision d2 = engine.onForegroundTick(
            "com.instagram.android",
            12_000L,
            imes,
            launchers,
            pkg -> Boolean.FALSE
        );
        assertEquals(EngageRuntimeEngine.TickAction.ALLOW, d2.getAction());
        assertEquals(9L, d2.getRemainingQuotaSeconds());
        assertEquals(1L, d2.getContinuousSeconds());

        // 3. Soft keyboard (IME), SystemUI, and transient Launcher ticks never reset continuous time or friction
        EngageRuntimeEngine.TickDecision dIme = engine.onForegroundTick(
            "com.google.android.inputmethod.latin",
            13_000L,
            imes,
            launchers,
            pkg -> Boolean.FALSE
        );
        assertEquals(EngageRuntimeEngine.TickAction.ALLOW, dIme.getAction());
        assertEquals("com.instagram.android", dIme.getPackageName());
        assertEquals(2L, dIme.getContinuousSeconds());

        EngageRuntimeEngine.TickDecision dSys = engine.onForegroundTick(
            "com.android.systemui",
            14_000L,
            imes,
            launchers,
            pkg -> Boolean.FALSE
        );
        assertEquals(EngageRuntimeEngine.TickAction.NONE, dSys.getAction());

        EngageRuntimeEngine.TickDecision dHome = engine.onForegroundTick(
            "com.google.android.apps.nexuslauncher",
            14_500L,
            imes,
            launchers,
            pkg -> Boolean.FALSE
        );
        assertEquals(EngageRuntimeEngine.TickAction.NONE, dHome.getAction());

        // Back to Instagram -> no re-entry friction, continuous session advances cleanly
        EngageRuntimeEngine.TickDecision dBack = engine.onForegroundTick(
            "com.instagram.android",
            15_000L,
            imes,
            launchers,
            pkg -> Boolean.FALSE
        );
        assertEquals(EngageRuntimeEngine.TickAction.ALLOW, dBack.getAction());
        assertEquals(4L, dBack.getContinuousSeconds());

        // 4. Hitting continuous limit (5s) triggers BLOCK_COOLDOWN (4s)
        EngageRuntimeEngine.TickDecision dCool = engine.onForegroundTick(
            "com.instagram.android",
            16_000L,
            imes,
            launchers,
            pkg -> Boolean.FALSE
        );
        assertEquals(EngageRuntimeEngine.TickAction.BLOCK_COOLDOWN, dCool.getAction());
        assertEquals(4L, dCool.getCooldownRemainingSeconds());

        // While cooldown active, user stays locked out
        EngageRuntimeEngine.TickDecision dStillCool = engine.onForegroundTick(
            "com.instagram.android",
            19_000L,
            imes,
            launchers,
            pkg -> Boolean.FALSE
        );
        assertEquals(EngageRuntimeEngine.TickAction.BLOCK_COOLDOWN, dStillCool.getAction());
        assertEquals(1L, dStillCool.getCooldownRemainingSeconds());

        // Cooldown expires at 20_000 -> requires friction again because cooldown cleared session verification
        EngageRuntimeEngine.TickDecision dPostCool = engine.onForegroundTick(
            "com.instagram.android",
            20_500L,
            imes,
            launchers,
            pkg -> Boolean.FALSE
        );
        assertEquals(EngageRuntimeEngine.TickAction.REQUIRE_FRICTION, dPostCool.getAction());

        // Pass friction, leave briefly (<= 30s reEntryGraceSeconds), return -> grace skips friction!
        engine.markFrictionPassed("com.instagram.android", 21_000L);
        engine.onForegroundTick("org.zero.detox", 22_000L, imes, launchers, pkg -> Boolean.FALSE);
        EngageRuntimeEngine.TickDecision dWithinGrace = engine.onForegroundTick(
            "com.instagram.android",
            35_000L,
            imes,
            launchers,
            pkg -> Boolean.FALSE
        );
        assertEquals(EngageRuntimeEngine.TickAction.ALLOW, dWithinGrace.getAction());

        // 5. Remaining quota (7s left) depletes completely -> BLOCK_QUOTA permanently for session
        EngageRuntimeEngine.TickDecision dDepleted = null;
        for (long t = 36_000L; t <= 45_000L; t += 1000L) {
            dDepleted = engine.onForegroundTick(
                "com.instagram.android",
                t,
                imes,
                launchers,
                pkg -> Boolean.FALSE
            );
            if (dDepleted.getAction() == EngageRuntimeEngine.TickAction.BLOCK_QUOTA) {
                break;
            }
        }
        assertNotNull(dDepleted);
        assertEquals(EngageRuntimeEngine.TickAction.BLOCK_QUOTA, dDepleted.getAction());
        assertEquals(0L, dDepleted.getRemainingQuotaSeconds());
    }

    @Test
    public void engageRuntime_enforces400msDebounceScrollVelocityAndNudgeIntervals() {
        String payload = "{"
            + "\"bagId\":\"work\","
            + "\"bagName\":\"Work Bag\","
            + "\"masterTimerSeconds\":3600,"
            + "\"allowSms\":false,"
            + "\"compulsoryPackages\":[],"
            + "\"appConfigs\":{"
            + "\"com.google.android.youtube\":{"
            + "\"mode\":\"controlled\","
            + "\"quotaSeconds\":0,"
            + "\"maxContinuousSeconds\":0,"
            + "\"cooldownSeconds\":0,"
            + "\"frictionEnabled\":false,"
            + "\"frictionDelaySeconds\":0,"
            + "\"showBreathingCircle\":false,"
            + "\"requireIntentText\":false,"
            + "\"minIntentChars\":0,"
            + "\"reEntryGraceSeconds\":0,"
            + "\"blockShortVideos\":true,"
            + "\"shortVideoAction\":\"overlay\","
            + "\"scrollVelocityLimit\":3,"
            + "\"nudgeIntervalSeconds\":10"
            + "}"
            + "}"
            + "}";

        EngageConfig.SessionPayloadConfig cfg = EngageConfig.parseSessionPayload(payload, "org.zero.detox");
        assertNotNull(cfg);
        EngageRuntimeEngine engine = new EngageRuntimeEngine("org.zero.detox");
        engine.configure(cfg, 1L);

        // 400ms content sniff debounce
        assertTrue(engine.shouldInspectWindowContent(1000L));
        assertFalse(engine.shouldInspectWindowContent(1399L));
        assertTrue(engine.shouldInspectWindowContent(1400L));

        // 10s scroll velocity ring buffer (limit = 3 -> 4th scroll in <= 10s triggers)
        assertFalse(engine.onScrollEvent("com.google.android.youtube", 5000L));
        assertFalse(engine.onScrollEvent("com.google.android.youtube", 6000L));
        assertFalse(engine.onScrollEvent("com.google.android.youtube", 7000L));
        assertTrue(engine.onScrollEvent("com.google.android.youtube", 8000L));

        // Old scroll timestamps outside 10s sliding window get pruned automatically without manual clear
        assertFalse(engine.onScrollEvent("com.google.android.youtube", 18_500L));
        engine.clearScrollBuffer("com.google.android.youtube");
        assertFalse(engine.onScrollEvent("com.google.android.youtube", 20_000L));
        assertFalse(engine.onScrollEvent("com.google.android.youtube", 21_000L));

        // Nudge interval milestones (every 10s)
        Set<String> empty = Collections.emptySet();
        engine.onForegroundTick("com.google.android.youtube", 30_000L, empty, empty, pkg -> Boolean.FALSE);
        assertNull(engine.consumePendingNudge("com.google.android.youtube"));
        engine.onForegroundTick("com.google.android.youtube", 35_000L, empty, empty, pkg -> Boolean.FALSE);
        engine.onForegroundTick("com.google.android.youtube", 40_000L, empty, empty, pkg -> Boolean.FALSE);
        EngageRuntimeEngine.NudgeDecision nudge = engine.consumePendingNudge("com.google.android.youtube");
        assertNotNull(nudge);
        assertEquals(10L, nudge.getContinuousSeconds());
        // Consumed once -> null until next 10s interval (20s)
        assertNull(engine.consumePendingNudge("com.google.android.youtube"));
    }
}
