package org.zero.detox;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;
import org.zero.detox.bridge.ZeroNativeBridge;
import org.zero.detox.core.LockEngine;
import org.zero.detox.data.ParachuteStore;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        ParachuteStore parachuteStore = new ParachuteStore(this);
        LockEngine lockEngine = new LockEngine(this, parachuteStore);
        ZeroNativeBridge nativeBridge = new ZeroNativeBridge(this, lockEngine, parachuteStore);

        if (getBridge() != null && getBridge().getWebView() != null) {
            getBridge().getWebView().addJavascriptInterface(nativeBridge, "ZeroNative");
        }
    }
}
