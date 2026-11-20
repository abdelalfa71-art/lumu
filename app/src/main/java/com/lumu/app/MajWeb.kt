package com.lumu.app

import android.content.Context
import android.webkit.WebResourceResponse
import androidx.webkit.WebViewAssetLoader
import org.json.JSONObject
import java.io.File
import java.io.FileInputStream
import java.net.HttpURLConnection
import java.net.URL
import java.security.MessageDigest

/**
 * Mise à jour de l'interface sans réinstaller l'APK.
 *
 * Au démarrage, l'application lit un petit manifeste publié sur GitHub (maj/web.json) :
 * version, commit et empreinte SHA-256 de chaque fichier de l'interface. Si une version plus
 * récente existe et reste compatible avec ce code Android (natif_min), les fichiers sont
 * téléchargés depuis jsDelivr (épinglés sur le commit), vérifiés un par un, puis servis à la
 * place de ceux livrés dans l'APK. Un fichier dont l'empreinte ne correspond pas annule tout.
 */
object MajWeb {
    /** Version des fonctions Android offertes à la page. À augmenter quand le code Kotlin change. */
    const val NATIF = 2

    private const val MANIFESTE = "https://raw.githubusercontent.com/abdelalfa71-art/lumu/main/maj/web.json"
    private const val CDN = "https://cdn.jsdelivr.net/gh/abdelalfa71-art/lumu@%s/app/src/app/assets/%s"
    /** Secours (jsDelivr refuse certains fichiers, comme les SVG) : GitHub, épinglé sur le même commit */
    private const val BRUT = "https://raw.githubusercontent.com/abdelalfa71-art/lumu/%s/app/src/app/assets/%s"
    private val NOM_SUR = Regex("^[A-Za-z0-9][A-Za-z0-9._-]{0,80}$")
    private val COMMIT_SUR = Regex("^[0-9a-f]{40}$")
    private val SHA_SUR = Regex("^[0-9a-f]{64}$")

    @Volatile private var actif: File? = null
    @Volatile private var lu = false
    @Volatile private var enCours = false
    @Volatile private var derniere = 0L

    private fun racine(ctx: Context) = File(ctx.filesDir, "web")

    /** Numéro de la version livrée dans l'APK (lu dans sw.js : « lumu-vNNN »). */
    fun versionLivree(ctx: Context): Int = try {
        val t = ctx.assets.open("sw.js").bufferedReader().use { it.readText() }
        Regex("lumu-v(\\d+)").find(t)?.groupValues?.get(1)?.toInt() ?: 0
    } catch (e: Exception) { 0 }

    private fun versionDe(d: File): Int = try { File(d, ".v").readText().trim().toInt() } catch (e: Exception) { 0 }

    /** Dossier des fichiers téléchargés à utiliser, ou null pour ceux de l'APK. */
    fun dossierActif(ctx: Context): File? {
        if (lu) return actif
        actif = try {
            val nom = File(racine(ctx), "actuel").readText().trim()
            val d = File(racine(ctx), nom)
            if (COMMIT_SUR.matches(nom) && File(d, "index.html").isFile && versionDe(d) > versionLivree(ctx)) d else null
        } catch (e: Exception) { null }
        lu = true
        return actif
    }

    /** Sert un fichier de l'interface : version téléchargée si elle existe, sinon celle de l'APK. */
    class Gestionnaire(private val ctx: Context) : WebViewAssetLoader.PathHandler {
        private val apk = WebViewAssetLoader.AssetsPathHandler(ctx)
        override fun handle(path: String): WebResourceResponse? {
            val d = dossierActif(ctx)
            if (d != null && NOM_SUR.matches(path)) {
                val f = File(d, path)
                if (f.isFile) {
                    val mime = mime(path)
                    val enc = if (mime.startsWith("text/") || mime.contains("javascript") || mime.contains("json") || mime.contains("svg")) "utf-8" else null
                    return try { WebResourceResponse(mime, enc, FileInputStream(f)) } catch (e: Exception) { apk.handle(path) }
                }
            }
            return apk.handle(path)
        }
    }

    private fun mime(n: String): String = when (n.substringAfterLast('.', "").lowercase()) {
        "html" -> "text/html"; "js" -> "application/javascript"; "json" -> "application/json"
        "css" -> "text/css"; "svg" -> "image/svg+xml"; "png" -> "image/png"; "webp" -> "image/webp"
        "jpg", "jpeg" -> "image/jpeg"; "ico" -> "image/x-icon"; "woff2" -> "font/woff2"
        else -> "application/octet-stream"
    }

    private fun lire(url: String, max: Int): ByteArray {
        val c = URL(url).openConnection() as HttpURLConnection
        c.connectTimeout = 15000; c.readTimeout = 30000; c.useCaches = false
        c.setRequestProperty("Cache-Control", "no-cache")
        try {
            if (c.responseCode != 200) throw Exception("HTTP " + c.responseCode)
            val b = c.inputStream.use { it.readBytes() }
            if (b.size > max) throw Exception("trop gros")
            return b
        } finally { c.disconnect() }
    }

    private fun sha256(b: ByteArray) = MessageDigest.getInstance("SHA-256").digest(b).joinToString("") { "%02x".format(it) }

    /** Vérifie en arrière-plan ; quand une mise à jour est prête, appelle quandPrete (thread de fond). */
    fun verifier(ctx: Context, quandPrete: (Int) -> Unit) {
        val maintenant = System.currentTimeMillis()
        if (enCours || maintenant - derniere < 20 * 60_000L) return
        enCours = true; derniere = maintenant
        Thread {
            try {
                val m = JSONObject(String(lire(MANIFESTE + "?t=" + System.currentTimeMillis() / 60000, 200_000), Charsets.UTF_8))
                val v = m.getInt("v"); val commit = m.getString("commit"); val natifMin = m.optInt("natif_min", 1)
                val deja = dossierActif(ctx)?.let { versionDe(it) } ?: 0
                if (!COMMIT_SUR.matches(commit) || natifMin > NATIF || v <= maxOf(versionLivree(ctx), deja)) return@Thread
                val f = m.getJSONObject("fichiers")
                val r = racine(ctx).apply { mkdirs() }
                val tmp = File(r, "$commit.tmp"); tmp.deleteRecursively(); tmp.mkdirs()
                val noms = f.keys().asSequence().toList()
                if (noms.isEmpty() || !noms.contains("index.html")) return@Thread
                for (n in noms) {
                    val attendu = f.getString(n).lowercase()
                    if (!NOM_SUR.matches(n) || !SHA_SUR.matches(attendu)) throw Exception("manifeste invalide")
                    val b = try { lire(CDN.format(commit, n), 25_000_000) } catch (e: Exception) { lire(BRUT.format(commit, n), 25_000_000) }
                    if (sha256(b) != attendu) throw Exception("empreinte différente : $n")
                    File(tmp, n).writeBytes(b)
                }
                File(tmp, ".v").writeText(v.toString())
                val fin = File(r, commit); fin.deleteRecursively()
                if (!tmp.renameTo(fin)) throw Exception("renommage")
                File(r, "actuel").writeText(commit)
                r.listFiles()?.forEach { if (it.isDirectory && it.name != commit) it.deleteRecursively() }
                actif = fin; lu = true
                quandPrete(v)
            } catch (e: Exception) {
                try { racine(ctx).listFiles()?.forEach { if (it.name.endsWith(".tmp")) it.deleteRecursively() } } catch (x: Exception) {}
            } finally { enCours = false }
        }.start()
    }
}
