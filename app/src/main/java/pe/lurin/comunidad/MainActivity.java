package pe.lurin.comunidad;

import android.app.Activity;
import android.content.ActivityNotFoundException;
import android.content.Intent;
import android.content.res.Configuration;
import android.graphics.Color;
import android.graphics.Insets;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.view.View;
import android.view.WindowInsets;
import android.webkit.JavascriptInterface;
import android.webkit.RenderProcessGoneDetail;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.FrameLayout;
import android.widget.Toast;
import android.window.OnBackInvokedCallback;
import android.window.OnBackInvokedDispatcher;

import androidx.webkit.WebViewAssetLoader;

import java.io.ByteArrayInputStream;

/**
 * Lurín Comunidad: una beta autónoma. No importa clases, claves, repositorios,
 * datos ni almacenamientos de NEXUS o de otras aplicaciones.
 *
 * La aplicación carga la interfaz local y permite datos comunitarios SOLO
 * desde el proyecto remoto Supabase configurado en compilación.
 * No gestiona premios comerciales reales ni emite créditos desde Java.
 */
public final class MainActivity extends Activity {
    private static final String LOCAL_HOST = "appassets.androidplatform.net";
    private static final String START_URL = "https://" + LOCAL_HOST + "/assets/index.html";
    private static final int REQUEST_PHOTO = 2107;

    private FrameLayout root;
    private WebView webView;
    private WebViewAssetLoader assetLoader;
    private ValueCallback<Uri[]> pendingFileChooser;
    private int renderRecoveryCount = 0;
    private OnBackInvokedCallback modernBack;

    /** Only the locally bundled, reviewed page can call this interface. */
    private final class LocalShareBridge {
        @JavascriptInterface
        public void shareText(String text) {
            final String safe = text == null ? "" : text.substring(0, Math.min(text.length(), 1400));
            runOnUiThread(() -> {
                Intent send = new Intent(Intent.ACTION_SEND);
                send.setType("text/plain");
                send.putExtra(Intent.EXTRA_TEXT, safe);
                try {
                    startActivity(Intent.createChooser(send, "Compartir historia de Lurín"));
                } catch (ActivityNotFoundException ex) {
                    Toast.makeText(MainActivity.this, "No hay aplicaciones para compartir", Toast.LENGTH_SHORT).show();
                }
            });
        }
    }

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        getWindow().setStatusBarColor(Color.rgb(58, 71, 126));
        getWindow().setNavigationBarColor(Color.rgb(249, 247, 240));
        int barFlags = View.SYSTEM_UI_FLAG_LIGHT_NAVIGATION_BAR;
        // On Android 15 the status bar is transparent over the light page.
        if (Build.VERSION.SDK_INT >= 35) barFlags |= View.SYSTEM_UI_FLAG_LIGHT_STATUS_BAR;
        getWindow().getDecorView().setSystemUiVisibility(barFlags);

        root = new FrameLayout(this);
        root.setBackgroundColor(Color.rgb(249, 247, 240));
        setContentView(root);
        applyInsetsForModernAndroid();

        assetLoader = new WebViewAssetLoader.Builder()
                .setDomain(LOCAL_HOST)
                .addPathHandler("/assets/", new WebViewAssetLoader.AssetsPathHandler(this))
                .build();
        createWebView();
        if (Build.VERSION.SDK_INT >= 33) {
            modernBack = this::handleBackNavigation;
            getOnBackInvokedDispatcher().registerOnBackInvokedCallback(
                    OnBackInvokedDispatcher.PRIORITY_DEFAULT, modernBack);
        }
    }

    private void applyInsetsForModernAndroid() {
        // Android 15/target 35 is edge-to-edge. Keep the app above system bars.
        // Older devices already receive decor-managed insets.
        if (Build.VERSION.SDK_INT >= 35) {
            root.setOnApplyWindowInsetsListener((view, insets) -> {
                Insets bars = insets.getInsets(
                        WindowInsets.Type.systemBars() | WindowInsets.Type.displayCutout());
                view.setPadding(bars.left, bars.top, bars.right, bars.bottom);
                return insets;
            });
            root.requestApplyInsets();
        }
    }

    private static WebResourceResponse forbidden(String reason, int status) {
        return new WebResourceResponse("text/plain", "UTF-8", status, reason,
                java.util.Collections.emptyMap(), new ByteArrayInputStream(new byte[0]));
    }

    private void createWebView() {
        webView = new WebView(this);
        root.addView(webView, new FrameLayout.LayoutParams(-1, -1));

        WebSettings s = webView.getSettings();
        s.setJavaScriptEnabled(true); // UI local con comunicación autenticada al backend configurado.
        s.setDomStorageEnabled(true); // Sesión local persistida y datos del usuario.
        s.setAllowFileAccess(false);
        s.setAllowContentAccess(true); // System photo picker supplies content: URIs.
        s.setAllowFileAccessFromFileURLs(false);
        s.setAllowUniversalAccessFromFileURLs(false);
        s.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        s.setJavaScriptCanOpenWindowsAutomatically(false);
        s.setSupportMultipleWindows(false);
        s.setMediaPlaybackRequiresUserGesture(true);
        s.setSupportZoom(false);
        if (Build.VERSION.SDK_INT >= 26) s.setSafeBrowsingEnabled(true);

        // Permitir solo WebViewAssetLoader y el host HTTPS del backend propio.
        // Evita que HTML no confiable cargue recursos o exfiltre datos a terceros.
        webView.setWebViewClient(new WebViewClient() {
            @Override
            public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
                Uri url = request.getUrl();
                String scheme = url.getScheme();
                if ("data".equalsIgnoreCase(scheme) || "blob".equalsIgnoreCase(scheme)) return null;
                if (!"https".equalsIgnoreCase(scheme)) {
                    return forbidden("Solo HTTPS", 403);
                }
                String host = url.getHost();
                if (LOCAL_HOST.equalsIgnoreCase(host)) {
                    WebResourceResponse local = assetLoader.shouldInterceptRequest(url);
                    return local != null ? local : forbidden("Recurso local no encontrado", 404);
                }
                // BuildConfig sólo se obtiene de -PLURIN_SUPABASE_HOST; no se incluye
                // una clave privada ni se aceptan otros dominios.
                if (!BuildConfig.SUPABASE_HOST.isEmpty()
                        && BuildConfig.SUPABASE_HOST.equalsIgnoreCase(host)) {
                    return null;
                }
                return forbidden("Host fuera del backend de Lurín", 403);
            }

            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                Uri url = request.getUrl();
                if ("https".equalsIgnoreCase(url.getScheme())
                        && LOCAL_HOST.equalsIgnoreCase(url.getHost())) return false;
                if (!request.isForMainFrame()) return true;
                if (!"https".equalsIgnoreCase(url.getScheme())) return true;
                try {
                    startActivity(new Intent(Intent.ACTION_VIEW, url));
                } catch (Exception ex) {
                    Toast.makeText(MainActivity.this, "Enlace externo no disponible", Toast.LENGTH_SHORT).show();
                }
                return true;
            }

            @Override
            public boolean onRenderProcessGone(WebView view, RenderProcessGoneDetail detail) {
                // A terminated renderer must be removed; the original WebView
                // cannot be reused. Progress is stored in the WebView profile.
                root.removeView(view);
                view.destroy();
                if (view == webView) webView = null;
                if (pendingFileChooser != null) {
                    pendingFileChooser.onReceiveValue(null);
                    pendingFileChooser = null;
                }
                renderRecoveryCount++;
                if (renderRecoveryCount <= 2) {
                    Toast.makeText(MainActivity.this,
                            "Restaurando Lurín Comunidad...", Toast.LENGTH_SHORT).show();
                    createWebView();
                } else {
                    Toast.makeText(MainActivity.this,
                            "La vista no pudo recuperarse. Reabre la app.", Toast.LENGTH_LONG).show();
                }
                return true;
            }
        });
        webView.setWebChromeClient(new WebChromeClient() {
            @Override
            public boolean onShowFileChooser(WebView view, ValueCallback<Uri[]> callback, FileChooserParams params) {
                if (pendingFileChooser != null) pendingFileChooser.onReceiveValue(null);
                pendingFileChooser = callback;
                Intent intent = new Intent(Intent.ACTION_GET_CONTENT);
                intent.setType("image/*");
                intent.addCategory(Intent.CATEGORY_OPENABLE);
                try {
                    startActivityForResult(Intent.createChooser(intent, "Elige una fotografía"), REQUEST_PHOTO);
                    return true;
                } catch (Exception ex) {
                    pendingFileChooser = null;
                    callback.onReceiveValue(null);
                    return false;
                }
            }
        });
        // The share bridge has no network or file access. Never load untrusted
        // web pages into this WebView (external links open in another app).
        webView.addJavascriptInterface(new LocalShareBridge(), "LurinAndroid");
        webView.loadUrl(START_URL);
    }

    @Override
    @Deprecated
    protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        super.onActivityResult(requestCode, resultCode, data);
        if (requestCode == REQUEST_PHOTO && pendingFileChooser != null) {
            Uri[] chosen = resultCode == RESULT_OK && data != null && data.getData() != null
                    ? new Uri[]{data.getData()} : null;
            pendingFileChooser.onReceiveValue(chosen);
            pendingFileChooser = null;
        }
    }

    private void handleBackNavigation() {
        if (webView == null) { finish(); return; }
        webView.evaluateJavascript(
                "window.lurinAndroidBack ? window.lurinAndroidBack() : false",
                result -> { if (!"true".equals(result)) finish(); });
    }

    @Override
    @Deprecated
    public void onBackPressed() {
        handleBackNavigation();
    }

    @Override
    public void onConfigurationChanged(Configuration config) {
        super.onConfigurationChanged(config);
        // Keep in-memory navigation when the phone rotates.
    }

    @Override protected void onPause() {
        if (webView != null) webView.onPause();
        super.onPause();
    }
    @Override protected void onResume() {
        super.onResume();
        if (webView != null) {
            webView.onResume();
            webView.evaluateJavascript("window.LurinLive && window.LurinLive.onResume ? window.LurinLive.onResume() : null", null);
        }
    }
    @Override protected void onDestroy() {
        if (Build.VERSION.SDK_INT >= 33 && modernBack != null) {
            getOnBackInvokedDispatcher().unregisterOnBackInvokedCallback(modernBack);
            modernBack = null;
        }
        if (pendingFileChooser != null) {
            pendingFileChooser.onReceiveValue(null);
            pendingFileChooser = null;
        }
        if (webView != null) {
            root.removeView(webView);
            webView.stopLoading();
            webView.destroy();
            webView = null;
        }
        super.onDestroy();
    }
}
