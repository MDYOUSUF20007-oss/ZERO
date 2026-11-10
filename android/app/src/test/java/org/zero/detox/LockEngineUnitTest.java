package org.zero.detox;

import static org.junit.Assert.*;

import android.content.Context;
import android.content.ContextWrapper;
import android.content.SharedPreferences;
import java.lang.reflect.Proxy;
import java.util.HashMap;
import java.util.Map;
import org.junit.Test;
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
}
