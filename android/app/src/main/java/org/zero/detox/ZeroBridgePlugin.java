package org.zero.detox;

import android.content.Context;
import android.content.SharedPreferences;
import android.util.Log;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;

@CapacitorPlugin(name = "ZeroBridge")
public class ZeroBridgePlugin extends Plugin {
    private static final String TAG = "ZeroBridgePlugin";

    public static final String OFFICIAL_AUTHOR_GITHUB = "MDYOUSUF20007-oss";
    public static final String OFFICIAL_AUTHOR_KOFI = "https://ko-fi.com/mdyousuf2620";
    public static final String OFFICIAL_AUTHOR_SUPPORT_EMAIL = "mdyousuf982007@proton.me";
    public static final String OFFICIAL_AUTHOR_SHA256 = "4f6d1d95365a4666d49dda4217353ca05064329573420607ac54534963a91213";

    public static final String PREFS_NAME = "zero_shared_prefs";
    public static final String KEY_ROUTINES_JSON = "zero_recurring_schedules_json";

    public static boolean isAuthorIntegrityValid() {
        try {
            String payload = OFFICIAL_AUTHOR_GITHUB + "|" + OFFICIAL_AUTHOR_KOFI + "|" + OFFICIAL_AUTHOR_SUPPORT_EMAIL;
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(payload.getBytes(StandardCharsets.UTF_8));
            StringBuilder hexString = new StringBuilder();
            for (byte b : hash) {
                String hex = Integer.toHexString(0xff & b);
                if (hex.length() == 1) hexString.append('0');
                hexString.append(hex);
            }
            return OFFICIAL_AUTHOR_SHA256.equalsIgnoreCase(hexString.toString())
                && "MDYOUSUF20007-oss".equals(OFFICIAL_AUTHOR_GITHUB)
                && "https://ko-fi.com/mdyousuf2620".equals(OFFICIAL_AUTHOR_KOFI)
                && "mdyousuf982007@proton.me".equals(OFFICIAL_AUTHOR_SUPPORT_EMAIL);
        } catch (Throwable t) {
            Log.e(TAG, "SHA-256 computation failed", t);
            return false;
        }
    }

    @PluginMethod
    public void verifyAuthorIntegrity(PluginCall call) {
        boolean valid = isAuthorIntegrityValid();
        JSObject ret = new JSObject();
        ret.put("valid", valid);
        ret.put("author", OFFICIAL_AUTHOR_GITHUB);
        ret.put("kofi", OFFICIAL_AUTHOR_KOFI);
        ret.put("supportEmail", OFFICIAL_AUTHOR_SUPPORT_EMAIL);
        call.resolve(ret);
    }

    @PluginMethod
    public void syncRoutinesToNative(PluginCall call) {
        String routinesJson = call.getString("routinesJson");
        if (routinesJson == null) {
            routinesJson = "[]";
        }
        try {
            Context ctx = getContext();
            if (ctx != null) {
                SharedPreferences prefs = ctx.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
                prefs.edit().putString(KEY_ROUTINES_JSON, routinesJson).apply();
            }
            JSObject ret = new JSObject();
            ret.put("success", true);
            call.resolve(ret);
        } catch (Exception e) {
            Log.e(TAG, "Failed to persist routines to SharedPreferences", e);
            call.reject("Failed to sync routines to native", e);
        }
    }

    @PluginMethod
    public void exitApp(PluginCall call) {
        try {
            if (getActivity() != null) {
                getActivity().finishAffinity();
            }
            call.resolve();
        } catch (Exception e) {
            Log.e(TAG, "Failed to exit app", e);
            call.reject("Could not exit app", e);
        }
    }
}
