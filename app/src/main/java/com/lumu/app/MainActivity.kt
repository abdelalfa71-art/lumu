package com.lumu.app

import android.Manifest
import android.app.Activity
import android.content.ComponentName
import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Bundle
import android.view.View
import android.webkit.GeolocationPermissions
import android.webkit.JavascriptInterface
import android.webkit.PermissionRequest
import android.webkit.ValueCallback
import android.webkit.WebChromeClient
import android.webkit.WebResourceRequest
import android.webkit.WebResourceResponse
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import android.widget.ProgressBar
import androidx.activity.OnBackPressedCallback
import androidx.activity.result.contract.ActivityResultContracts
import androidx.appcompat.app.AppCompatActivity
import androidx.core.content.ContextCompat
import androidx.webkit.WebViewAssetLoader
import java.io.File
import java.io.FileInputStream
import java.net.HttpURLConnection
import java.net.URL

/**
 * Lumu — l'application web est EMBARQUÉE dans l'APK (dossier assets) :
 * plus d'adresse à saisir, démarrage instantané et même sans connexion.
 * Seules les données (Supabase) et les médias passent par Internet.
 */
class MainActivity : AppCompatActivity() {

    private lateinit var webView: WebView
    private lateinit var barre: ProgressBar

    private var fileCallback: ValueCallback<Array<Uri>>? = null
    private var fileParams: WebChromeClient.FileChooserParams? = null
    private var permissionWeb: PermissionRequest? = null
    private var geoOrigine: String? = null
    private var geoCallback: GeolocationPermissions.Callback? = null

    private val assetLoader by lazy {
        WebViewAssetLoader.Builder()
            .addPathHandler("/", WebViewAssetLoader.AssetsPathHandler(this))
            .build()
    }

    /** Exposé à la page : adresse publique du site pour les liens de partage. */
    inner class PontNatif {
        @JavascriptInterface fun site(): String = BuildConfig.SITE_URL

        /** Ouvre le menu de partage du téléphone (WhatsApp, Facebook, SMS…). */
        @JavascriptInterface fun partager(titre: String?, texte: String?) {
            runOnUiThread {
                try {
                    val i = Intent(Intent.ACTION_SEND).apply {
                        type = "text/plain"
                        putExtra(Intent.EXTRA_SUBJECT, titre ?: "Lumu")
                        putExtra(Intent.EXTRA_TEXT, texte ?: "")
                    }
                    startActivity(Intent.createChooser(i, titre ?: "Partager"))
                } catch (e: Exception) { }
            }
        }

        /** Appelé par la page quand le titre ou l'état de lecture change (notification en haut de l'écran). */
        @JavascriptInterface fun media(titre: String?, artiste: String?, jouant: Boolean) {
            lectureEnCours = jouant && !titre.isNullOrEmpty()
            try {
                if (titre.isNullOrEmpty()) {
                    stopService(Intent(this@MainActivity, LectureService::class.java))
                } else {
                    val i = Intent(this@MainActivity, LectureService::class.java)
                        .putExtra("titre", titre).putExtra("artiste", artiste ?: "").putExtra("jouant", jouant)
                    if (jouant) ContextCompat.startForegroundService(this@MainActivity, i)
                    else startService(i)
                }
            } catch (e: Exception) { }
        }
    }

    private var lectureEnCours = false
    private val demandeNotif =
        registerForActivityResult(ActivityResultContracts.RequestPermission()) { }

    // ------------------------------------------------------------------ sélection de fichiers

    private val choixLumu =
        registerForActivityResult(ActivityResultContracts.StartActivityForResult()) { r ->
            if (r.resultCode == Activity.RESULT_OK) {
                fileCallback?.onReceiveValue(WebChromeClient.FileChooserParams.parseResult(r.resultCode, r.data))
                fileCallback = null
            } else if (r.data?.getBooleanExtra("systeme", false) == true && fileParams != null) {
                lancerSelecteurSysteme(fileParams!!)
            } else {
                fileCallback?.onReceiveValue(null); fileCallback = null
            }
        }

    private val choixSysteme =
        registerForActivityResult(ActivityResultContracts.StartActivityForResult()) { r ->
            val uris = if (r.resultCode == Activity.RESULT_OK)
                WebChromeClient.FileChooserParams.parseResult(r.resultCode, r.data) else null
            fileCallback?.onReceiveValue(uris)
            fileCallback = null
        }

    private val demandeMicro =
        registerForActivityResult(ActivityResultContracts.RequestPermission()) { ok ->
            permissionWeb?.let { if (ok) it.grant(it.resources) else it.deny() }
            permissionWeb = null
        }

    private val demandePosition =
        registerForActivityResult(ActivityResultContracts.RequestPermission()) { ok ->
            geoCallback?.invoke(geoOrigine, ok, false)
            geoCallback = null; geoOrigine = null
        }

    private fun lancerSelecteurSysteme(params: WebChromeClient.FileChooserParams) {
        val mimes = params.acceptTypes.flatMap { it.split(",") }
            .map { it.trim() }.filter { it.contains("/") }.distinct()
        val type = if (mimes.size == 1) mimes[0] else "*/*"
        val multiple = params.mode == WebChromeClient.FileChooserParams.MODE_OPEN_MULTIPLE

        val getContent = Intent(Intent.ACTION_GET_CONTENT).apply {
            addCategory(Intent.CATEGORY_OPENABLE)
            this.type = type
            if (mimes.size > 1) putExtra(Intent.EXTRA_MIME_TYPES, mimes.toTypedArray())
            putExtra(Intent.EXTRA_ALLOW_MULTIPLE, multiple)
        }
        val initiaux = mutableListOf<Intent>()
        listOf(
            "com.google.android.apps.nbu.files", "com.google.android.documentsui", "com.android.documentsui",
            "com.transsion.filemanager", "com.coloros.filemanager", "com.oppo.filemanager",
            "com.mi.android.globalFileexplorer", "com.sec.android.app.myfiles"
        ).forEach { pkg -> intentPour(pkg, getContent)?.let { initiaux += it } }

        val openDoc = Intent(Intent.ACTION_OPEN_DOCUMENT).apply {
            addCategory(Intent.CATEGORY_OPENABLE)
            this.type = type
            if (mimes.size > 1) putExtra(Intent.EXTRA_MIME_TYPES, mimes.toTypedArray())
            putExtra(Intent.EXTRA_ALLOW_MULTIPLE, multiple)
        }
        if (openDoc.resolveActivity(packageManager) != null) initiaux += openDoc

        val chooser = Intent.createChooser(getContent, "Choisir un fichier").apply {
            putExtra(Intent.EXTRA_INITIAL_INTENTS, initiaux.toTypedArray())
        }
        try { choixSysteme.launch(chooser) }
        catch (e: Exception) { fileCallback?.onReceiveValue(null); fileCallback = null }
    }

    private fun intentPour(pkg: String, base: Intent): Intent? {
        val copie = Intent(base).setPackage(pkg)
        val info = packageManager.queryIntentActivities(copie, 0).firstOrNull() ?: return null
        return Intent(copie).setComponent(ComponentName(info.activityInfo.packageName, info.activityInfo.name))
    }

    // ------------------------------------------------------------------ cache des scripts CDN (démarrage hors ligne)

    /** Les bibliothèques JS (supabase-js…) sont téléchargées une fois puis servies depuis le téléphone. */
    private fun cdn(req: WebResourceRequest): WebResourceResponse? {
        val u = req.url
        if (req.method != "GET" || u.host != "cdn.jsdelivr.net") return null
        val f = File(cacheDir, "cdn_" + Integer.toHexString(u.toString().hashCode()))
        if (!f.exists() || f.length() == 0L) {
            try {
                val c = URL(u.toString()).openConnection() as HttpURLConnection
                c.connectTimeout = 10000; c.readTimeout = 20000; c.instanceFollowRedirects = true
                if (c.responseCode !in 200..299) return null
                val tmp = File(cacheDir, f.name + ".tmp")
                c.inputStream.use { i -> tmp.outputStream().use { o -> i.copyTo(o) } }
                tmp.renameTo(f)
            } catch (e: Exception) { return null }
        }
        val p = u.path.orEmpty()
        val mime = when {
            p.endsWith(".wasm") -> "application/wasm"
            p.endsWith(".json") -> "application/json"
            p.endsWith(".css") -> "text/css"
            else -> "application/javascript"
        }
        return WebResourceResponse(
            mime, "utf-8", 200, "OK",
            mapOf("Access-Control-Allow-Origin" to "*", "Cache-Control" to "max-age=31536000"),
            FileInputStream(f)
        )
    }

    // ------------------------------------------------------------------ cycle de vie

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)
        instance = this
        if (android.os.Build.VERSION.SDK_INT >= 33 &&
            ContextCompat.checkSelfPermission(this, Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED
        ) demandeNotif.launch(Manifest.permission.POST_NOTIFICATIONS)
        webView = findViewById(R.id.webView)
        barre = findViewById(R.id.chargement)

        webView.settings.apply {
            javaScriptEnabled = true
            domStorageEnabled = true
            databaseEnabled = true
            allowContentAccess = true
            allowFileAccess = false
            mediaPlaybackRequiresUserGesture = false
            cacheMode = WebSettings.LOAD_DEFAULT
            mixedContentMode = WebSettings.MIXED_CONTENT_NEVER_ALLOW
            setSupportZoom(false)
        }
        webView.addJavascriptInterface(PontNatif(), "LumuNative")

        webView.webViewClient = object : WebViewClient() {
            override fun shouldInterceptRequest(v: WebView, r: WebResourceRequest): WebResourceResponse? =
                assetLoader.shouldInterceptRequest(r.url) ?: cdn(r)

            override fun shouldOverrideUrlLoading(v: WebView, r: WebResourceRequest): Boolean {
                val u = r.url
                if (u.host == "appassets.androidplatform.net" || u.scheme == "blob") return false
                // WhatsApp, YouTube, liens externes : ouvrir hors de l'app
                return try { startActivity(Intent(Intent.ACTION_VIEW, u)); true } catch (e: Exception) { false }
            }
        }

        webView.webChromeClient = object : WebChromeClient() {

            override fun onProgressChanged(v: WebView, p: Int) {
                barre.progress = p
                barre.visibility = if (p in 1..99) View.VISIBLE else View.GONE
            }

            override fun onShowFileChooser(
                view: WebView, callback: ValueCallback<Array<Uri>>, params: FileChooserParams
            ): Boolean {
                fileCallback?.onReceiveValue(null)
                fileCallback = callback
                fileParams = params

                val mimes = params.acceptTypes.flatMap { it.split(",") }
                    .map { it.trim().lowercase() }.filter { it.isNotEmpty() }
                val audio = mimes.any { it.startsWith("audio/") || it in AUDIO_EXT }
                val video = mimes.any { it.startsWith("video/") || it in VIDEO_EXT }
                val autre = mimes.any { it.startsWith("image/") || it == "application/pdf" || it == ".pdf" }
                val multiple = params.mode == FileChooserParams.MODE_OPEN_MULTIPLE

                val lumu = when {
                    (audio || video) && !autre -> if (audio && video) "tous" else if (audio) "audio" else "video"
                    mimes.isEmpty() || mimes.contains("*/*") -> "tous"
                    else -> null
                }
                if (lumu == null) { lancerSelecteurSysteme(params); return true }
                return try {
                    choixLumu.launch(
                        Intent(this@MainActivity, AudioPickerActivity::class.java)
                            .putExtra("mode", lumu).putExtra("multiple", multiple)
                    ); true
                } catch (e: Exception) { lancerSelecteurSysteme(params); true }
            }

            override fun onPermissionRequest(request: PermissionRequest) {
                runOnUiThread {
                    if (!request.resources.contains(PermissionRequest.RESOURCE_AUDIO_CAPTURE)) { request.deny(); return@runOnUiThread }
                    if (ContextCompat.checkSelfPermission(this@MainActivity, Manifest.permission.RECORD_AUDIO) == PackageManager.PERMISSION_GRANTED) {
                        request.grant(request.resources)
                    } else { permissionWeb = request; demandeMicro.launch(Manifest.permission.RECORD_AUDIO) }
                }
            }

            override fun onGeolocationPermissionsShowPrompt(origin: String, cb: GeolocationPermissions.Callback) {
                if (ContextCompat.checkSelfPermission(this@MainActivity, Manifest.permission.ACCESS_COARSE_LOCATION) == PackageManager.PERMISSION_GRANTED) {
                    cb.invoke(origin, true, false)
                } else { geoOrigine = origin; geoCallback = cb; demandePosition.launch(Manifest.permission.ACCESS_COARSE_LOCATION) }
            }
        }

        onBackPressedDispatcher.addCallback(this, object : OnBackPressedCallback(true) {
            override fun handleOnBackPressed() {
                if (webView.canGoBack()) webView.goBack() else { isEnabled = false; onBackPressedDispatcher.onBackPressed() }
            }
        })

        if (savedInstanceState != null) webView.restoreState(savedInstanceState)
        else webView.loadUrl(DEPART)
    }

    override fun onSaveInstanceState(out: Bundle) { super.onSaveInstanceState(out); webView.saveState(out) }
    override fun onPause() { super.onPause(); if (!lectureEnCours) webView.onPause() }
    override fun onResume() { super.onResume(); webView.onResume() }
    override fun onDestroy() {
        fileCallback?.onReceiveValue(null)
        if (instance === this) instance = null
        stopService(Intent(this, LectureService::class.java))
        webView.destroy(); super.onDestroy()
    }

    companion object {
        @Volatile var instance: MainActivity? = null

        /** Renvoie à la page une action venue de la notification : pp, next, prev, stop. */
        fun action(a: String) {
            val m = instance ?: return
            m.runOnUiThread { m.webView.evaluateJavascript("window.__lumuMedia&&window.__lumuMedia('$a')", null) }
        }

        private const val DEPART = "https://appassets.androidplatform.net/index.html"
        private val AUDIO_EXT = setOf(".mp3", ".m4a", ".aac", ".ogg", ".oga", ".opus", ".wav", ".amr", ".wma", ".flac")
        private val VIDEO_EXT = setOf(".mp4", ".mov", ".mkv", ".webm", ".3gp")
    }
}
