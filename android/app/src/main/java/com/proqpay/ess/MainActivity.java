package com.proqpay.ess;

import android.app.Activity;
import android.content.Intent;
import android.net.Uri;
import android.os.Bundle;
import android.print.PrintManager;
import android.webkit.*;
import android.widget.FrameLayout;
import android.widget.Toast;

public final class MainActivity extends Activity {
    private static final String HOST = "proqpay-ess.arywibowo.workers.dev";
    private static final String HOME = "https://" + HOST + "/";
    private WebView portal;

    @Override public void onCreate(Bundle state) {
        super.onCreate(state);
        FrameLayout root = new FrameLayout(this);
        portal = new WebView(this);
        root.addView(portal, new FrameLayout.LayoutParams(-1, -1));
        setContentView(root);
        root.setOnApplyWindowInsetsListener((view, insets) -> {
            if (android.os.Build.VERSION.SDK_INT >= 30) {
                android.graphics.Insets edges = insets.getInsets(
                    android.view.WindowInsets.Type.systemBars() | android.view.WindowInsets.Type.ime());
                view.setPadding(edges.left, edges.top, edges.right, edges.bottom);
            } else {
                view.setPadding(0, insets.getSystemWindowInsetTop(), 0, insets.getSystemWindowInsetBottom());
            }
            return insets;
        });
        WebSettings settings = portal.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setAllowFileAccess(false);
        settings.setAllowContentAccess(false);
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        CookieManager.getInstance().setAcceptThirdPartyCookies(portal, false);
        
        portal.setWebViewClient(new WebViewClient() {
            @Override public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                Uri uri = request.getUrl();
                if (trusted(uri)) {
                    if (request.isForMainFrame() && "/android-print-payslip".equals(uri.getPath())) {
                        printPayslip();
                        return true;
                    }
                    return false;
                }
                if (request.isForMainFrame()) openExternal(uri);
                return true;
            }
            @Override public void onPageFinished(WebView view, String url) {
                if (trusted(Uri.parse(url))) {
                    view.evaluateJavascript("window.print = () => { location.href = '/android-print-payslip'; };", null);
                }
            }
        });
        portal.setDownloadListener((url, agent, disposition, mime, length) -> openExternal(Uri.parse(url)));
        if (state == null || portal.restoreState(state) == null) portal.loadUrl(HOME);
    }

    private boolean trusted(Uri uri) {
        return "https".equals(uri.getScheme()) && HOST.equalsIgnoreCase(uri.getHost())
            && (uri.getPort() == -1 || uri.getPort() == 443);
    }

    private void openExternal(Uri uri) {
        String scheme = uri.getScheme();
        if (!"https".equals(scheme) && !"mailto".equals(scheme) && !"tel".equals(scheme)) return;
        try {
            startActivity(new Intent(Intent.ACTION_VIEW, uri));
        } catch (android.content.ActivityNotFoundException error) {
            Toast.makeText(this, "Tidak ada aplikasi untuk membuka tautan.", Toast.LENGTH_SHORT).show();
        }
    }

    private void printPayslip() {
        if (portal.getUrl() == null || !trusted(Uri.parse(portal.getUrl()))) return;
        PrintManager manager = getSystemService(PrintManager.class);
        manager.print("Slip Gaji ProQPay", portal.createPrintDocumentAdapter("Slip Gaji ProQPay"), null);
    }

    @Override protected void onSaveInstanceState(Bundle state) {
        portal.saveState(state);
        super.onSaveInstanceState(state);
    }

    @Override public void onBackPressed() {
        if (portal.canGoBack()) portal.goBack();
        else super.onBackPressed();
    }
}
