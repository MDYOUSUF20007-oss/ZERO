package org.zero.detox.security;

import android.content.Context;
import android.content.pm.PackageInfo;
import android.content.pm.PackageManager;
import android.content.pm.Signature;
import android.content.pm.SigningInfo;
import android.os.Build;
import java.io.File;
import java.security.MessageDigest;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import org.json.JSONArray;
import org.json.JSONObject;
import org.zero.detox.bridge.PermissionStatusHelper;

/**
 * AppSecurityGuard:
 * Native runtime integrity checks protecting ZERO against:
 * 1. APK cloning, decompile/repack & re-signing tampering (SHA-256 signing certificate guard)
 * 2. Rooted devices, custom test-keys ROMs, Superuser/Magisk/KernelSU/LSPosed managers
 * 3. Debug emulators & QEMU/x86 instrumentation sandboxes
 *
 * Signature verification is enforced unconditionally (no debuggable bypass) before
 * loading Capacitor or native bridges. Root/emulator checks feed graceful feature restrictions
 * for backup restore and preset Bag tampering protection.
 */
public final class AppSecurityGuard {

    public static final String OFFICIAL_RELEASE_CERT_SHA256_HEX =
        PermissionStatusHelper.OFFICIAL_RELEASE_CERT_SHA256_HEX;

    private static final byte[] OFFICIAL_RELEASE_CERT_SHA256_BYTES =
        hexToBytes(OFFICIAL_RELEASE_CERT_SHA256_HEX);

    public static final List<String> ROOT_BINARY_PATHS = Collections.unmodifiableList(Arrays.asList(
        "/system/bin/su",
        "/system/xbin/su",
        "/sbin/su",
        "/system/sd/xbin/su",
        "/system/bin/failsafe/su",
        "/data/local/xbin/su",
        "/data/local/bin/su",
        "/data/local/su",
        "/su/bin/su",
        "/vendor/bin/su",
        "/apex/com.android.runtime/bin/su",
        "/system/bin/.ext/.su",
        "/system/usr/we-need-root/su-backup",
        "/system/xbin/mu",
        "/system/xbin/daemonsu",
        "/system/etc/init.d/99SuperSUDaemon",
        "/system/app/Superuser.apk",
        "/sbin/.magisk",
        "/data/adb/magisk",
        "/data/adb/ksu",
        "/data/adb/ap",
        "/dev/.magisk.unblock"
    ));

    public static final List<String> ROOT_MANAGER_PACKAGES = Collections.unmodifiableList(Arrays.asList(
        "com.topjohnwu.magisk",
        "io.github.vvb2060.magisk",
        "me.weishu.kernelsu",
        "me.bmax.apatch",
        "eu.chainfire.supersu",
        "com.noshufou.android.su",
        "com.noshufou.android.su.elite",
        "com.koushikdutta.superuser",
        "com.thirdparty.superuser",
        "com.yellowes.su",
        "com.kingroot.kinguser",
        "com.kingo.root",
        "com.smedialink.oneclickroot",
        "com.zhiqupk.root.global",
        "com.alephzain.framaroot",
        "com.devadvance.rootcloak",
        "com.devadvance.rootcloak2",
        "de.robv.android.xposed.installer",
        "org.meowcat.edxposed.manager",
        "org.lsposed.manager"
    ));

    private static final List<String> QEMU_PIPE_PATHS = Collections.unmodifiableList(Arrays.asList(
        "/dev/socket/qemud",
        "/dev/qemu_pipe",
        "/sys/qemu_trace"
    ));

    private static final List<String> READONLY_SYSTEM_PATHS = Collections.unmodifiableList(Arrays.asList(
        "/system",
        "/system/bin",
        "/system/xbin",
        "/vendor/bin"
    ));

    private AppSecurityGuard() {}

    public static final class EnvironmentSecurityStatus {
        public final boolean signatureValid;
        public final boolean rooted;
        public final boolean emulator;
        public final boolean compromised;
        public final boolean backupRestoreDisabled;
        public final boolean presetBagEditingDisabled;
        public final List<String> reasons;

        public EnvironmentSecurityStatus(
            boolean signatureValid,
            boolean rooted,
            boolean emulator,
            List<String> reasons
        ) {
            this.signatureValid = signatureValid;
            this.rooted = rooted;
            this.emulator = emulator;
            this.compromised = (!signatureValid) || rooted || emulator;
            this.backupRestoreDisabled = this.compromised;
            this.presetBagEditingDisabled = this.compromised;
            this.reasons = reasons != null
                ? Collections.unmodifiableList(new ArrayList<>(reasons))
                : Collections.emptyList();
        }

        public String toJsonString() {
            JSONObject root = new JSONObject();
            try {
                root.put("isSignatureValid", signatureValid);
                root.put("isRooted", rooted);
                root.put("isEmulator", emulator);
                root.put("isCompromised", compromised);

                JSONObject restrictions = new JSONObject();
                restrictions.put("backupRestoreDisabled", backupRestoreDisabled);
                restrictions.put("presetBagEditingDisabled", presetBagEditingDisabled);
                root.put("restrictions", restrictions);

                JSONArray arr = new JSONArray();
                for (String reason : reasons) {
                    arr.put(reason);
                }
                root.put("reasons", arr);
            } catch (Throwable ignored) {
                return "{\"isSignatureValid\":" + signatureValid
                    + ",\"isRooted\":" + rooted
                    + ",\"isEmulator\":" + emulator
                    + ",\"isCompromised\":" + compromised
                    + ",\"restrictions\":{\"backupRestoreDisabled\":" + backupRestoreDisabled
                    + ",\"presetBagEditingDisabled\":" + presetBagEditingDisabled + "}"
                    + ",\"reasons\":[]}";
            }
            return root.toString();
        }
    }

    /**
     * Checks running APK signing certificate SHA-256 against ZERO's permanent official release key.
     * Always enforces strictly (no debuggable bypass) and rejects multi-signer certificates.
     */
    public static boolean isAppSignatureValid(Context context) {
        if (context == null) return false;
        try {
            List<byte[]> certDigests = getSigningCertSha256Digests(context);
            return isValidReleaseSignatureDigests(certDigests);
        } catch (Throwable t) {
            return false;
        }
    }

    public static List<String> getSigningSha256HexList(Context context) {
        List<byte[]> rawCerts = extractRawSigningCertificates(context);
        List<String> hexList = new ArrayList<>();
        for (byte[] certBytes : rawCerts) {
            if (certBytes == null || certBytes.length == 0) continue;
            try {
                byte[] digest = MessageDigest.getInstance("SHA-256").digest(certBytes);
                hexList.add(bytesToHex(digest));
            } catch (Throwable ignored) {
                // Skip unreadable cert bytes
            }
        }
        return hexList;
    }

    public static List<byte[]> getSigningCertSha256Digests(Context context) {
        List<byte[]> rawCerts = extractRawSigningCertificates(context);
        List<byte[]> digests = new ArrayList<>();
        for (byte[] certBytes : rawCerts) {
            if (certBytes == null || certBytes.length == 0) continue;
            try {
                digests.add(MessageDigest.getInstance("SHA-256").digest(certBytes));
            } catch (Throwable ignored) {
                return Collections.emptyList();
            }
        }
        return digests;
    }

    @SuppressWarnings("deprecation")
    private static List<byte[]> extractRawSigningCertificates(Context context) {
        if (context == null) return Collections.emptyList();
        try {
            PackageManager pm = context.getPackageManager();
            String packageName = context.getPackageName();
            if (pm == null || packageName == null || packageName.isEmpty()) {
                return Collections.emptyList();
            }

            PackageInfo packageInfo;
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                packageInfo = pm.getPackageInfo(
                    packageName,
                    PackageManager.PackageInfoFlags.of(PackageManager.GET_SIGNING_CERTIFICATES)
                );
            } else if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
                packageInfo = pm.getPackageInfo(packageName, PackageManager.GET_SIGNING_CERTIFICATES);
            } else {
                packageInfo = pm.getPackageInfo(packageName, PackageManager.GET_SIGNATURES);
            }

            if (packageInfo == null) return Collections.emptyList();

            List<byte[]> out = new ArrayList<>();
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
                SigningInfo signingInfo = packageInfo.signingInfo;
                if (signingInfo == null || signingInfo.hasMultipleSigners()) {
                    return Collections.emptyList();
                }
                Signature[] signers = signingInfo.getApkContentsSigners();
                if (signers == null || signers.length != 1) {
                    return Collections.emptyList();
                }
                out.add(signers[0].toByteArray());
                return out;
            }

            Signature[] legacySignatures = packageInfo.signatures;
            if (legacySignatures == null || legacySignatures.length != 1) {
                return Collections.emptyList();
            }
            out.add(legacySignatures[0].toByteArray());
            return out;
        } catch (Throwable t) {
            return Collections.emptyList();
        }
    }

    /**
     * Pure JVM-testable verifier: requires exactly 1 SHA-256 digest matching official release key.
     */
    public static boolean isValidReleaseSignatureDigests(List<byte[]> certSha256Digests) {
        if (certSha256Digests == null || certSha256Digests.size() != 1) {
            return false;
        }
        byte[] actual = certSha256Digests.get(0);
        if (actual == null || actual.length != 32 || OFFICIAL_RELEASE_CERT_SHA256_BYTES.length != 32) {
            return false;
        }
        return MessageDigest.isEqual(actual, OFFICIAL_RELEASE_CERT_SHA256_BYTES);
    }

    /**
     * Pure JVM-testable verifier for hex strings (colon-separated or plain).
     */
    public static boolean isValidReleaseSignatureHexList(List<String> sha256HexList) {
        if (sha256HexList == null || sha256HexList.size() != 1) {
            return false;
        }
        String raw = sha256HexList.get(0);
        if (raw == null) return false;
        byte[] actual = hexToBytes(raw);
        if (actual.length != 32) return false;
        return MessageDigest.isEqual(actual, OFFICIAL_RELEASE_CERT_SHA256_BYTES);
    }

    public static EnvironmentSecurityStatus evaluateEnvironment(Context context) {
        boolean sigValid = isAppSignatureValid(context);
        List<String> reasons = new ArrayList<>();
        if (!sigValid) {
            reasons.add("invalid_apk_signature");
        }

        List<String> rootReasons = collectRuntimeRootReasons(context);
        boolean rooted = !rootReasons.isEmpty();
        reasons.addAll(rootReasons);

        List<String> emuReasons = collectRuntimeEmulatorReasons();
        boolean emulator = !emuReasons.isEmpty();
        reasons.addAll(emuReasons);

        return new EnvironmentSecurityStatus(sigValid, rooted, emulator, reasons);
    }

    public static boolean isDeviceRooted(Context context) {
        return !collectRuntimeRootReasons(context).isEmpty();
    }

    public static boolean isEmulator() {
        return !collectRuntimeEmulatorReasons().isEmpty();
    }

    private static List<String> collectRuntimeRootReasons(Context context) {
        List<String> foundBinaries = new ArrayList<>();
        for (String path : ROOT_BINARY_PATHS) {
            try {
                if (new File(path).exists()) {
                    foundBinaries.add(path);
                }
            } catch (Throwable ignored) {}
        }

        String envPath = System.getenv("PATH");
        if (envPath != null && !envPath.isEmpty()) {
            for (String dir : envPath.split(":")) {
                if (dir == null || dir.trim().isEmpty()) continue;
                try {
                    File suCandidate = new File(dir.trim(), "su");
                    if (suCandidate.exists()) {
                        foundBinaries.add(suCandidate.getAbsolutePath());
                    }
                } catch (Throwable ignored) {}
            }
        }

        List<String> installedRootApps = new ArrayList<>();
        if (context != null) {
            PackageManager pm = context.getPackageManager();
            if (pm != null) {
                for (String pkg : ROOT_MANAGER_PACKAGES) {
                    if (isPackageInstalled(pm, pkg)) {
                        installedRootApps.add(pkg);
                    }
                }
            }
        }

        boolean systemWritable = false;
        for (String sysPath : READONLY_SYSTEM_PATHS) {
            try {
                if (new File(sysPath).canWrite()) {
                    systemWritable = true;
                    break;
                }
            } catch (Throwable ignored) {}
        }

        return detectRootReasons(Build.TAGS, foundBinaries, installedRootApps, systemWritable);
    }

    /**
     * Pure JVM-testable root / custom test-keys evaluation.
     */
    public static List<String> detectRootReasons(
        String buildTags,
        List<String> existingRootPaths,
        List<String> installedRootPackages,
        boolean systemPartitionWritable
    ) {
        Set<String> reasons = new LinkedHashSet<>();

        if (buildTags != null && buildTags.toLowerCase(Locale.US).contains("test-keys")) {
            reasons.add("test_keys_rom");
        }
        if (existingRootPaths != null && !existingRootPaths.isEmpty()) {
            reasons.add("root_binary");
        }
        if (installedRootPackages != null && !installedRootPackages.isEmpty()) {
            reasons.add("root_manager_app");
        }
        if (systemPartitionWritable) {
            reasons.add("writable_system_partition");
        }

        return new ArrayList<>(reasons);
    }

    private static List<String> collectRuntimeEmulatorReasons() {
        boolean qemuPipeExists = false;
        for (String pipe : QEMU_PIPE_PATHS) {
            try {
                if (new File(pipe).exists()) {
                    qemuPipeExists = true;
                    break;
                }
            } catch (Throwable ignored) {}
        }

        return detectEmulatorReasons(
            Build.FINGERPRINT,
            Build.MODEL,
            Build.MANUFACTURER,
            Build.BRAND,
            Build.DEVICE,
            Build.HARDWARE,
            Build.PRODUCT,
            qemuPipeExists
        );
    }

    /**
     * Pure JVM-testable emulator / debug VM evaluation.
     */
    public static List<String> detectEmulatorReasons(
        String fingerprint,
        String model,
        String manufacturer,
        String brand,
        String device,
        String hardware,
        String product,
        boolean qemuPipePresent
    ) {
        List<String> reasons = new ArrayList<>();
        String fp = norm(fingerprint);
        String mdl = norm(model);
        String mfg = norm(manufacturer);
        String brd = norm(brand);
        String dev = norm(device);
        String hw = norm(hardware);
        String prod = norm(product);

        boolean propSignal =
            fp.startsWith("generic")
                || fp.startsWith("unknown")
                || fp.contains("emulator")
                || fp.contains("sdk_gphone")
                || fp.contains("vbox")
                || mdl.contains("google_sdk")
                || mdl.contains("emulator")
                || mdl.contains("android sdk built for")
                || mdl.contains("droid4x")
                || mfg.contains("genymotion")
                || mfg.contains("bluestacks")
                || mfg.contains("nox")
                || mfg.contains("ldplayer")
                || mfg.contains("memu")
                || (brd.startsWith("generic") && dev.startsWith("generic"))
                || hw.contains("goldfish")
                || hw.contains("ranchu")
                || hw.contains("vbox86")
                || hw.contains("nox")
                || hw.contains("bstack")
                || hw.contains("ttvm_x86")
                || "google_sdk".equals(prod)
                || "sdk".equals(prod)
                || "sdk_x86".equals(prod)
                || "sdk_gphone64_x86_64".equals(prod)
                || "sdk_gphone64_arm64".equals(prod)
                || "vbox86p".equals(prod)
                || "emulator".equals(prod)
                || "simulator".equals(prod);

        if (propSignal || qemuPipePresent) {
            reasons.add("emulator_environment");
        }
        return reasons;
    }

    @SuppressWarnings("deprecation")
    private static boolean isPackageInstalled(PackageManager pm, String packageName) {
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                pm.getPackageInfo(packageName, PackageManager.PackageInfoFlags.of(0L));
            } else {
                pm.getPackageInfo(packageName, 0);
            }
            return true;
        } catch (Throwable ignored) {
            return false;
        }
    }

    private static String norm(String val) {
        return val == null ? "" : val.trim().toLowerCase(Locale.US);
    }

    private static byte[] hexToBytes(String hex) {
        if (hex == null) return new byte[0];
        String clean = hex.replace(":", "").replace(" ", "").trim();
        int len = clean.length();
        if (len == 0 || len % 2 != 0) return new byte[0];
        byte[] data = new byte[len / 2];
        for (int i = 0; i < len; i += 2) {
            int hi = Character.digit(clean.charAt(i), 16);
            int lo = Character.digit(clean.charAt(i + 1), 16);
            if (hi < 0 || lo < 0) return new byte[0];
            data[i / 2] = (byte) ((hi << 4) + lo);
        }
        return data;
    }

    private static String bytesToHex(byte[] bytes) {
        StringBuilder sb = new StringBuilder(bytes.length * 2);
        for (byte b : bytes) {
            sb.append(String.format(Locale.US, "%02X", b));
        }
        return sb.toString();
    }
}
