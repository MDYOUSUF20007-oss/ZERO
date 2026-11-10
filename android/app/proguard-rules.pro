# ============================================================================
# ZERO R8 / ProGuard Obfuscation & Shrinking Rules
# Enables aggressive code shrinking & obfuscation for internal logic while
# preserving Capacitor plugins, Android AccessibilityService, WebView bridges,
# WorkManager workers, and manifest entry points.
# ============================================================================

# Preserve WebView JS interface & runtime annotation metadata; scrub real source file names
-keepattributes JavascriptInterface,*Annotation*,Signature,InnerClasses,EnclosingMethod,SourceFile,LineNumberTable
-renamesourcefileattribute SourceFile

# Preserve WebView @JavascriptInterface bridge methods (ZeroNativeBridge)
-keepclassmembers class * {
    @android.webkit.JavascriptInterface <methods>;
}

# Preserve Capacitor Plugins, PluginMethods & Activity/Permission Callbacks under R8 full mode
-keep @com.getcapacitor.annotation.CapacitorPlugin public class * {
    <init>(...);
    @com.getcapacitor.PluginMethod public <methods>;
    @com.getcapacitor.annotation.ActivityCallback <methods>;
    @com.getcapacitor.annotation.PermissionCallback <methods>;
    @com.getcapacitor.annotation.Permission <methods>;
}
-keep class org.zero.detox.plugin.** { *; }
-keep public class * extends com.getcapacitor.Plugin { *; }
-keepclassmembers class * extends com.getcapacitor.Plugin {
    @com.getcapacitor.PluginMethod <methods>;
    @com.getcapacitor.annotation.ActivityCallback <methods>;
    @com.getcapacitor.annotation.PermissionCallback <methods>;
}
-keep @interface com.getcapacitor.annotation.** { *; }
-keep @interface com.getcapacitor.PluginMethod { *; }

# Preserve Strict Edition AccessibilityService (loaded by OS & checked via Class.forName)
-keep class org.zero.detox.service.ZeroAccessibilityService { *; }
-keep public class * extends android.accessibilityservice.AccessibilityService { *; }

# Preserve Manifest-declared Activities, Foreground Services, Receivers & FileProvider
-keep class org.zero.detox.MainActivity { *; }
-keep class org.zero.detox.ui.TheVoidActivity { *; }
-keep class org.zero.detox.service.LockForegroundService { *; }
-keep class org.zero.detox.receiver.BootReceiver { *; }
-keep class org.zero.detox.receiver.ZeroDeviceAdminReceiver { *; }
-keep public class * extends androidx.core.content.FileProvider { *; }

# Preserve WorkManager Coroutine/ListenableWorker constructors invoked by reflection
-keep class * extends androidx.work.ListenableWorker {
    public <init>(android.content.Context, androidx.work.WorkerParameters);
}

# Preserve Kotlin coroutines ServiceLoader & atomic updater fields
-keepnames class kotlinx.coroutines.internal.MainDispatcherFactory {}
-keepnames class kotlinx.coroutines.CoroutineExceptionHandler {}
-keepclassmembers class kotlinx.coroutines.** {
    volatile <fields>;
}

# Suppress benign third-party annotation warnings during R8 optimization
-dontwarn com.google.errorprone.annotations.**
-dontwarn javax.annotation.**
-dontwarn org.codehaus.mojo.animal_snuff.IgnoreJRERequirement
