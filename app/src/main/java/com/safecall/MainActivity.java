package com.safecall;

import android.Manifest;
import android.app.Activity;
import android.content.pm.PackageManager;
import android.os.Build;
import android.os.Bundle;
import android.util.Log;
import android.view.ViewGroup;
import android.webkit.ConsoleMessage;
import android.webkit.WebChromeClient;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.FrameLayout;
import android.widget.Toast;

import com.safecall.bridge.SafeCallNativeBridge;
import com.safecall.db.CallRepository;
import com.safecall.engine.WeightedRuleEngine;
import com.safecall.model.CallerProfile;

import java.util.List;

public class MainActivity extends Activity {

    private static final String TAG = "SafeCallAI";
    private static final int PERMISSION_REQUEST_CODE = 200;

    private CallRepository repository;
    private WeightedRuleEngine engine;
    private WebView webView;
    private com.safecall.receiver.SafeCallPhoneStateReceiver phoneStateReceiver;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        requestWindowFeature(android.view.Window.FEATURE_NO_TITLE);
        super.onCreate(savedInstanceState);

        repository = new CallRepository(this);
        engine = new WeightedRuleEngine();

        // Seed default sample contacts if database is empty
        seedSampleContactsIfEmpty();

        // Check runtime permissions on startup
        checkAndRequestPermissions();

        // Root container for WebView
        FrameLayout rootLayout = new FrameLayout(this);
        rootLayout.setLayoutParams(new ViewGroup.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT));

        webView = new WebView(this);
        webView.setLayoutParams(new FrameLayout.LayoutParams(
                FrameLayout.LayoutParams.MATCH_PARENT, FrameLayout.LayoutParams.MATCH_PARENT));

        configureWebView(webView);
        rootLayout.addView(webView);

        setContentView(rootLayout);

        // Load the bundled React production assets
        webView.loadUrl("file:///android_asset/www/index.html");
    }

    @Override
    protected void onResume() {
        super.onResume();

        // 1. Reschedule or finalize pending grace periods from previous sessions
        com.safecall.engine.SequenceTracker.getInstance().checkPendingGracePeriods(this);

        // 2. Elderly user activity: Opening the app proves activity and cancels pending non-response sequence
        com.safecall.engine.SequenceTracker.getInstance().onUserActivity(this);

        // Register dynamic receiver for maximum reliability across modern Android versions
        try {
            if (phoneStateReceiver == null) {
                phoneStateReceiver = new com.safecall.receiver.SafeCallPhoneStateReceiver();
                android.content.IntentFilter filter = new android.content.IntentFilter();
                filter.addAction(android.telephony.TelephonyManager.ACTION_PHONE_STATE_CHANGED);
                registerReceiver(phoneStateReceiver, filter);
            }
        } catch (Exception e) {
            Log.w(TAG, "Dynamic receiver registration error: " + e.getMessage());
        }

        // Drain any pending offline alerts
        com.safecall.engine.CallEventProcessor.drainOfflineAlerts(this);
    }

    private void configureWebView(WebView webView) {
        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setAllowFileAccess(true);
        settings.setAllowContentAccess(true);
        settings.setDatabaseEnabled(true);
        settings.setSupportZoom(false);
        settings.setBuiltInZoomControls(false);

        settings.setAllowFileAccessFromFileURLs(true);
        settings.setAllowUniversalAccessFromFileURLs(true);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
            settings.setMixedContentMode(WebSettings.MIXED_CONTENT_ALWAYS_ALLOW);
        }
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.KITKAT) {
            WebView.setWebContentsDebuggingEnabled(true);
        }

        // Attach safe native bridge interface
        SafeCallNativeBridge bridge = new SafeCallNativeBridge(this, repository, engine);
        webView.addJavascriptInterface(bridge, "SafeCallNative");

        webView.setWebChromeClient(new WebChromeClient() {
            @Override
            public boolean onConsoleMessage(ConsoleMessage consoleMessage) {
                Log.d(TAG, "[WebView Console] " + consoleMessage.message() +
                        " -- From line " + consoleMessage.lineNumber() + " of " + consoleMessage.sourceId());
                return true;
            }
        });

        webView.setWebViewClient(new WebViewClient() {
            @Override
            public void onReceivedError(WebView view, int errorCode, String description, String failingUrl) {
                super.onReceivedError(view, errorCode, description, failingUrl);
                Log.e(TAG, "WebView error (" + errorCode + "): " + description + " for " + failingUrl);
            }
        });
    }

    private void seedSampleContactsIfEmpty() {
        List<CallerProfile> existing = repository.getAllContacts();
        if (existing == null || existing.isEmpty()) {
            repository.addOrUpdateContact(new CallerProfile(
                    0, "Mom", "9876543210", "Family", CallerProfile.Priority.EMERGENCY));
            repository.addOrUpdateContact(new CallerProfile(
                    0, "Dr. Anita", "9812345678", "Doctor", CallerProfile.Priority.TRUSTED));
            repository.addOrUpdateContact(new CallerProfile(
                    0, "Courier / Delivery", "9123456789", "Service", CallerProfile.Priority.NORMAL));
        }
    }

    private void checkAndRequestPermissions() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            java.util.List<String> list = new java.util.ArrayList<>();
            list.add(Manifest.permission.SEND_SMS);
            list.add(Manifest.permission.READ_PHONE_STATE);
            list.add(Manifest.permission.READ_CALL_LOG);
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                list.add(Manifest.permission.POST_NOTIFICATIONS);
            }

            java.util.List<String> needed = new java.util.ArrayList<>();
            for (String perm : list) {
                if (checkSelfPermission(perm) != PackageManager.PERMISSION_GRANTED) {
                    needed.add(perm);
                }
            }

            if (!needed.isEmpty()) {
                requestPermissions(needed.toArray(new String[0]), PERMISSION_REQUEST_CODE);
            }
        }
    }

    @Override
    public void onRequestPermissionsResult(int requestCode, String[] permissions, int[] grantResults) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults);
        if (requestCode == PERMISSION_REQUEST_CODE || requestCode == 201) {
            // Inform webview if ready
            if (webView != null) {
                webView.post(() -> webView.evaluateJavascript("window.onNativePermissionsUpdated && window.onNativePermissionsUpdated();", null));
            }
        }
    }

    @Override
    public void onBackPressed() {
        if (webView != null && webView.canGoBack()) {
            webView.goBack();
        } else {
            super.onBackPressed();
        }
    }

    @Override
    protected void onDestroy() {
        if (phoneStateReceiver != null) {
            try {
                unregisterReceiver(phoneStateReceiver);
            } catch (Exception ignored) {}
            phoneStateReceiver = null;
        }
        if (webView != null) {
            webView.destroy();
        }
        super.onDestroy();
    }
}
