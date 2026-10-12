package com.praxi.mobile;

import android.appwidget.AppWidgetManager;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.webkit.CookieManager;
import android.webkit.JavascriptInterface;
import android.webkit.WebView;

import com.getcapacitor.BridgeActivity;

/**
 * Praxi mobile host.
 *
 * Besides loading the web dashboard, this exposes a tiny native
 * bridge (window.PraxiNative) used only to keep the home-screen
 * widget in sync with the "Allow home-screen widget" setting.
 */
public class MainActivity extends BridgeActivity {

    public static final String PREFS = "praxi_native";
    public static final String KEY_WIDGET_ENABLED = "widgetEnabled";

    /** Page to open when launched from a widget button (consumed by the web layer). */
    private String pendingRoute = null;

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        setIntent(intent);
        captureRoute(intent);
        // The app may already be running, so the web layer has no way
        // to know a widget button / notification asked for a page.
        deliverPendingRoute();
    }

    private void captureRoute(Intent intent) {
        if (intent == null) {
            return;
        }
        String route = intent.getStringExtra("praxi_route");
        if (route != null && !route.isEmpty()) {
            pendingRoute = route;
        }
    }

    /**
     * Ask the running web layer to consume a route that arrived while
     * the app was alive (widget button, notification tap).
     */
    private void deliverPendingRoute() {
        if (pendingRoute == null) {
            return;
        }
        try {
            final WebView webView = getBridge().getWebView();
            if (webView == null) {
                return;
            }
            webView.postDelayed(new Runnable() {
                @Override
                public void run() {
                    try {
                        WebView wv = getBridge().getWebView();
                        if (wv != null) {
                            wv.evaluateJavascript(
                                    "window.PraxiConsumeRoute && window.PraxiConsumeRoute()",
                                    null);
                        }
                    } catch (Exception ignored) {
                        // Page not ready; the next launch will pick it up.
                    }
                }
            }, 350);
        } catch (Exception ignored) {
            // Bridge not ready yet.
        }
    }

    public static boolean isWidgetEnabled(Context ctx) {
        return ctx.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
                .getBoolean(KEY_WIDGET_ENABLED, true);
    }

    /** Exposed to the web layer as window.PraxiNative. */
    public class WidgetBridge {

        @JavascriptInterface
        public void setWidgetEnabled(boolean enabled) {
            getSharedPreferences(PREFS, Context.MODE_PRIVATE)
                    .edit()
                    .putBoolean(KEY_WIDGET_ENABLED, enabled)
                    .apply();
            // Re-render any widgets already placed on the home screen.
            PraxiWidgetProvider.refreshAll(MainActivity.this);
        }

        @JavascriptInterface
        public boolean getWidgetEnabled() {
            return getSharedPreferences(PREFS, Context.MODE_PRIVATE)
                    .getBoolean(KEY_WIDGET_ENABLED, true);
        }

        /**
         * Ask the system to pin the Praxi widget to the home screen.
         * Returns true when the launcher supports the request (the
         * user still confirms it) and false when it does not.
         */
        @JavascriptInterface
        public boolean requestPinWidget() {
            try {
                if (android.os.Build.VERSION.SDK_INT < 26) {
                    return false;
                }
                AppWidgetManager manager = AppWidgetManager.getInstance(MainActivity.this);
                if (manager == null || !manager.isRequestPinAppWidgetSupported()) {
                    return false;
                }
                ComponentName provider = new ComponentName(
                        MainActivity.this, PraxiWidgetProvider.class);
                return manager.requestPinAppWidget(provider, null, null);
            } catch (Exception e) {
                return false;
            }
        }

        @JavascriptInterface
        public void openExternal(String url) {
            try {
                Intent view = new Intent(Intent.ACTION_VIEW, Uri.parse(url));
                view.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                startActivity(view);
            } catch (Exception ignored) {
                // No handler for the link; nothing we can do.
            }
        }

        @JavascriptInterface
        public void setReaderOpen(boolean open) {
            readerOpen = open;
        }

        /**
         * Apply the reminder settings the web layer just saved. The
         * payload is { settings, messages } and drives the phone's
         * whole notification schedule.
         */
        @JavascriptInterface
        public void scheduleReminders(String payload) {
            PraxiNotifications.apply(MainActivity.this, payload);
        }

        /** Post an immediate sample notification. */
        @JavascriptInterface
        public void postTestNotification(String payload) {
            PraxiNotifications.postTest(MainActivity.this, payload);
        }

        @JavascriptInterface
        public String getLaunchRoute() {
            String route = pendingRoute;
            pendingRoute = null;
            return route;
        }
    }

    // True while the in-app reader (Rhapsody / Pray-A-Thon) overlay is
    // showing, so the system Back gesture closes the reader instead of
    // leaving the app.
    private volatile boolean readerOpen = false;

    @Override
    public void onBackPressed() {
        if (readerOpen) {
            try {
                WebView webView = getBridge().getWebView();
                if (webView != null) {
                    webView.evaluateJavascript(
                            "window.PraxiReaderBack && window.PraxiReaderBack()", null);
                    return;
                }
            } catch (Exception ignored) {
                // Fall through to the default behaviour.
            }
        }
        super.onBackPressed();
    }

    private boolean nativeBridgeAttached = false;

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        captureRoute(getIntent());
        attachNativeBridge();
        enableThirdPartyCookies();
        PraxiNotifications.ensureChannel(this);
    }

    @Override
    public void onResume() {
        super.onResume();
        // The WebView can be (re)created after onCreate in some
        // Capacitor versions; make sure the bridge is present.
        attachNativeBridge();
        enableThirdPartyCookies();
        PraxiNotifications.ensureChannel(this);
        ensureNotificationPermission();
        deliverPendingRoute();
    }

    /**
     * Android 13+ requires an explicit runtime grant before we may
     * post notifications. Ask once, up front.
     */
    private boolean notificationPermissionRequested = false;

    private void ensureNotificationPermission() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.TIRAMISU) {
            return;
        }
        if (notificationPermissionRequested) {
            return;
        }
        try {
            if (checkSelfPermission(android.Manifest.permission.POST_NOTIFICATIONS)
                    == PackageManager.PERMISSION_GRANTED) {
                return;
            }
            notificationPermissionRequested = true;
            requestPermissions(
                    new String[] { android.Manifest.permission.POST_NOTIFICATIONS },
                    1001);
        } catch (Exception ignored) {
            // If the request fails the user can still enable it in Settings.
        }
    }

    /**
     * Let the in-app reader (Pray-A-Thon) keep its session and any
     * third-party media working inside its frame.
     */
    private void enableThirdPartyCookies() {
        try {
            WebView webView = getBridge().getWebView();
            if (webView != null) {
                CookieManager cookies = CookieManager.getInstance();
                cookies.setAcceptCookie(true);
                cookies.setAcceptThirdPartyCookies(webView, true);
            }
        } catch (Exception ignored) {
            // Cookie store not ready; safe to skip.
        }
    }

    private void attachNativeBridge() {
        if (nativeBridgeAttached) return;
        try {
            WebView webView = getBridge().getWebView();
            if (webView != null) {
                webView.addJavascriptInterface(new WidgetBridge(), "PraxiNative");
                nativeBridgeAttached = true;
            }
        } catch (Exception ignored) {
            // Bridge not ready for some reason; widget control still
            // works through the default enabled state.
        }
    }
}
