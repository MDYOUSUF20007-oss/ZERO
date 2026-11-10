package org.zero.detox;

import static org.junit.Assert.*;

import android.app.AppOpsManager;
import android.content.Context;
import android.content.ContextWrapper;
import android.content.SharedPreferences;
import java.lang.reflect.Proxy;
import java.util.HashMap;
import java.util.Map;
import org.junit.Test;
import org.zero.detox.bridge.PermissionStatusHelper;
import org.zero.detox.core.LockEngine;
import org.zero.detox.data.BagStore;
import org.zero.detox.data.ParachuteStore;

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
    public void bagStore_enforcesThreeAppCapAndPackageIsolation() {
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
            + "{\"packageName\":\"com.instagram.android\",\"appName\":\"Instagram\"}"
            + "]";
        bagStore.saveActiveBag("Commute", fourApps, false, false);

        assertEquals("Commute", bagStore.getActiveBagName());
        assertEquals(3, bagStore.getBagApps().size());
        assertTrue(bagStore.isPackageAllowedDuringLock("org.zero.detox"));
        assertTrue(bagStore.isPackageAllowedDuringLock("com.spotify.music"));
        assertTrue(bagStore.isPackageAllowedDuringLock("md.obsidian"));
        assertFalse(bagStore.isPackageAllowedDuringLock("com.instagram.android"));
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
}
