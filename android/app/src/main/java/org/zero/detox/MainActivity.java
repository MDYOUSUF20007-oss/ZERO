package org.zero.detox;

import android.os.Bundle;
import android.util.Log;
import com.getcapacitor.BridgeActivity;
import org.zero.detox.bridge.ZeroNativeBridge;
import org.zero.detox.core.LockEngine;
import org.zero.detox.data.BagStore;
import org.zero.detox.data.ParachuteStore;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        try {
            ParachuteStore parachuteStore = new ParachuteStore(this);
            BagStore bagStore = new BagStore(this);
            LockEngine lockEngine = new LockEngine(this, parachuteStore);
            ZeroNativeBridge nativeBridge = new ZeroNativeBridge(this, lockEngine, parachuteStore, bagStore);

            if (getBridge() != null && getBridge().getWebView() != null) {
                getBridge().getWebView().addJavascriptInterface(nativeBridge, "ZeroNative");
            }
        } catch (Throwable t) {
            Log.e("ZeroMainActivity", "Failed to initialize native bridge", t);
        }
    }

    @Override
    public void onRequestPermissionsResult(int requestCode, String[] permissions, int[] grantResults) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults);
        try {
            if (getBridge() != null && getBridge().getWebView() != null) {
                getBridge().getWebView().post(() ->
                    getBridge().getWebView().evaluateJavascript(
                        "window.dispatchEvent(new Event('zero-permissions-updated'))",
                        null
                    )
                );
            }
        } catch (Throwable ignored) {}
    }
}
