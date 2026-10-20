package com.lumu.app

import android.Manifest
import android.content.ClipData
import android.content.ContentUris
import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.provider.MediaStore
import android.provider.Settings
import android.text.Editable
import android.text.TextWatcher
import android.view.Gravity
import android.view.View
import android.view.ViewGroup
import android.widget.ArrayAdapter
import android.widget.Button
import android.widget.CheckedTextView
import android.widget.EditText
import android.widget.LinearLayout
import android.widget.ListView
import android.widget.TextView
import androidx.activity.result.contract.ActivityResultContracts
import androidx.appcompat.app.AppCompatActivity
import androidx.core.content.ContextCompat
import java.text.DateFormat
import java.util.Date

/**
 * Sélecteur d'audios / vidéos propre à Lumu (comme dans WhatsApp ou Telegram).
 * Il lit directement la bibliothèque média du téléphone : il ne dépend pas de l'application « Fichiers ».
 * Entrée : extra "mode" = "audio" | "video" | "tous".  Sortie : une ou plusieurs Uri (ClipData).
 */
class AudioPickerActivity : AppCompatActivity() {

    private data class Item(val uri: Uri, val nom: String, val taille: Long, val date: Long, val video: Boolean)

    private val tous = mutableListOf<Item>()
    private var affiches: List<Item> = emptyList()
    private val choisis = LinkedHashSet<Uri>()

    private var filtre = "audio"          // audio | video | tous
    private var texte = ""
    private var multiple = true

    private lateinit var liste: ListView
    private lateinit var info: TextView
    private lateinit var valider: Button
    private lateinit var barre: android.widget.ProgressBar
    @Volatile private var conversion = false
    @Volatile private var annuleConv = false
    private lateinit var adaptateur: ArrayAdapter<Item>
    private val btns = mutableMapOf<String, Button>()

    private val demandePermissions =
        registerForActivityResult(ActivityResultContracts.RequestMultiplePermissions()) { charger() }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        filtre = intent.getStringExtra("mode") ?: "audio"
        if (filtre !in listOf("audio", "video", "tous")) filtre = "audio"
        multiple = intent.getBooleanExtra("multiple", true)

        val racine = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(dp(14), dp(14), dp(14), dp(10))
        }
        racine.addView(TextView(this).apply {
            text = "Choisir mes fichiers"; textSize = 22f; setTypeface(typeface, android.graphics.Typeface.BOLD)
        })

        val recherche = EditText(this).apply {
            hint = "🔍 Chercher par nom"; textSize = 18f; setSingleLine(true)
            addTextChangedListener(object : TextWatcher {
                override fun afterTextChanged(s: Editable?) { texte = s?.toString()?.trim().orEmpty(); appliquer() }
                override fun beforeTextChanged(s: CharSequence?, a: Int, b: Int, c: Int) {}
                override fun onTextChanged(s: CharSequence?, a: Int, b: Int, c: Int) {}
            })
        }
        racine.addView(recherche, lp(top = 8))

        val rangee = LinearLayout(this).apply { orientation = LinearLayout.HORIZONTAL }
        listOf("audio" to "🎵 Audios", "video" to "🎬 Vidéos", "tous" to "Tout").forEach { (k, l) ->
            val b = Button(this).apply { text = l; textSize = 15f; isAllCaps = false; setOnClickListener { filtre = k; appliquer() } }
            btns[k] = b
            rangee.addView(b, LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1f))
        }
        racine.addView(rangee)

        info = TextView(this).apply { textSize = 14f; setPadding(0, dp(4), 0, dp(4)) }
        racine.addView(info)

        liste = ListView(this).apply { divider = null; selector = android.graphics.drawable.ColorDrawable(0x1125A06B); setPadding(0, dp(4), 0, dp(4)); clipToPadding = false }
        adaptateur = object : ArrayAdapter<Item>(this, 0, mutableListOf()) {
            override fun getView(position: Int, convertView: View?, parent: ViewGroup): View {
                val it = getItem(position)!!
                val ligne = (convertView as? LinearLayout) ?: LinearLayout(context).apply {
                    orientation = LinearLayout.HORIZONTAL; gravity = Gravity.CENTER_VERTICAL
                    setPadding(dp(8), dp(8), dp(8), dp(8))
                    val pastille = TextView(context).apply { id = 1001; gravity = Gravity.CENTER; textSize = 22f }
                    addView(pastille, LinearLayout.LayoutParams(dp(48), dp(48)))
                    val col = LinearLayout(context).apply { orientation = LinearLayout.VERTICAL }
                    col.addView(TextView(context).apply {
                        id = 1002; textSize = 16f; maxLines = 2; ellipsize = android.text.TextUtils.TruncateAt.MIDDLE
                        textDirection = View.TEXT_DIRECTION_FIRST_STRONG_LTR
                    })
                    col.addView(TextView(context).apply { id = 1003; textSize = 13f; alpha = 0.65f })
                    addView(col, LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1f).apply { leftMargin = dp(12); rightMargin = dp(8) })
                    addView(android.widget.CheckBox(context).apply { id = 1004; isClickable = false; isFocusable = false }, LinearLayout.LayoutParams(dp(40), dp(40)))
                }
                val choisi = it.uri in choisis
                val past = ligne.findViewById<TextView>(1001)
                past.text = if (it.video) "🎬" else "🎵"
                past.background = android.graphics.drawable.GradientDrawable().apply {
                    shape = android.graphics.drawable.GradientDrawable.OVAL
                    setColor(if (it.video) 0x33E57373 else 0x3325A06B.toInt())
                }
                ligne.findViewById<TextView>(1002).text = it.nom.substringBeforeLast('.', it.nom)
                ligne.findViewById<TextView>(1003).text = it.nom.substringAfterLast('.', "").uppercase().let { e -> if (e.isEmpty() || e.length > 5) "" else "$e · " } +
                        taille(it.taille) + " · " + DateFormat.getDateInstance(DateFormat.MEDIUM).format(Date(it.date * 1000))
                ligne.findViewById<android.widget.CheckBox>(1004).isChecked = choisi
                ligne.setBackgroundColor(if (choisi) 0x2225A06B else 0)
                return ligne
            }
        }
        liste.adapter = adaptateur
        liste.setOnItemClickListener { _, _, pos, _ ->
            val it = adaptateur.getItem(pos) ?: return@setOnItemClickListener
            if (it.uri in choisis) choisis.remove(it.uri)
            else { if (!multiple) choisis.clear(); choisis.add(it.uri) }
            adaptateur.notifyDataSetChanged(); majBouton()
        }
        racine.addView(liste, LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, 0, 1f))

        valider = Button(this).apply {
            textSize = 18f; isAllCaps = false
            setOnClickListener { terminer() }
        }
        barre = android.widget.ProgressBar(this, null, android.R.attr.progressBarStyleHorizontal).apply { max = 100; visibility = View.GONE }
        racine.addView(barre, LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, dp(10)))
        racine.addView(valider, lp(top = 6))

        racine.addView(Button(this).apply {
            text = "Autres fichiers (PDF, images…)"; textSize = 14f; isAllCaps = false
            setOnClickListener { setResult(RESULT_CANCELED, Intent().putExtra("systeme", true)); finish() }
        })
        racine.addView(Button(this).apply {
            text = "Annuler"; textSize = 14f; isAllCaps = false
            setOnClickListener { if (conversion) { annuleConv = true } else { setResult(RESULT_CANCELED); finish() } }
        })

        setContentView(racine)
        majBouton()
        charger()
    }

    private fun permissionsNecessaires(): Array<String> =
        if (Build.VERSION.SDK_INT >= 33) arrayOf(Manifest.permission.READ_MEDIA_AUDIO, Manifest.permission.READ_MEDIA_VIDEO)
        else arrayOf(Manifest.permission.READ_EXTERNAL_STORAGE)

    private fun charger() {
        val manque = permissionsNecessaires().filter {
            ContextCompat.checkSelfPermission(this, it) != PackageManager.PERMISSION_GRANTED
        }
        if (manque.isNotEmpty()) {
            if (!demande) { demande = true; demandePermissions.launch(manque.toTypedArray()); return }
            info.text = "Lumu a besoin d'accéder à vos audios et vidéos."
            valider.text = "Autoriser dans les réglages"
            valider.setOnClickListener {
                startActivity(Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS, Uri.parse("package:$packageName")))
            }
            return
        }
        valider.setOnClickListener { terminer() }
        info.text = "Chargement…"
        Thread {
            val res = lire()
            runOnUiThread { tous.clear(); tous.addAll(res); appliquer() }
        }.start()
    }
    private var demande = false

    private fun lire(): List<Item> {
        val out = mutableListOf<Item>()
        try {
            val base = MediaStore.Files.getContentUri("external")
            val proj = arrayOf(
                MediaStore.Files.FileColumns._ID, MediaStore.Files.FileColumns.DISPLAY_NAME,
                MediaStore.Files.FileColumns.SIZE, MediaStore.Files.FileColumns.DATE_ADDED,
                MediaStore.Files.FileColumns.MIME_TYPE
            )
            val sel = "${MediaStore.Files.FileColumns.MIME_TYPE} LIKE 'audio/%' OR ${MediaStore.Files.FileColumns.MIME_TYPE} LIKE 'video/%' " +
                    "OR ${MediaStore.Files.FileColumns.MEDIA_TYPE} IN (${MediaStore.Files.FileColumns.MEDIA_TYPE_AUDIO}, ${MediaStore.Files.FileColumns.MEDIA_TYPE_VIDEO})"
            contentResolver.query(base, proj, sel, null, "${MediaStore.Files.FileColumns.DATE_ADDED} DESC")?.use { c ->
                val iId = c.getColumnIndexOrThrow(MediaStore.Files.FileColumns._ID)
                val iNom = c.getColumnIndexOrThrow(MediaStore.Files.FileColumns.DISPLAY_NAME)
                val iTaille = c.getColumnIndexOrThrow(MediaStore.Files.FileColumns.SIZE)
                val iDate = c.getColumnIndexOrThrow(MediaStore.Files.FileColumns.DATE_ADDED)
                val iMime = c.getColumnIndexOrThrow(MediaStore.Files.FileColumns.MIME_TYPE)
                while (c.moveToNext()) {
                    val taille = c.getLong(iTaille)
                    if (taille <= 0) continue
                    val mime = c.getString(iMime).orEmpty()
                    out += Item(
                        ContentUris.withAppendedId(base, c.getLong(iId)),
                        c.getString(iNom) ?: "fichier",
                        taille, c.getLong(iDate), mime.startsWith("video/")
                    )
                }
            }
        } catch (e: Exception) { /* liste vide */ }
        return out
    }

    private fun appliquer() {
        affiches = tous.filter {
            (filtre == "tous" || (filtre == "video") == it.video) &&
                    (texte.isEmpty() || it.nom.contains(texte, ignoreCase = true))
        }
        adaptateur.clear(); adaptateur.addAll(affiches); adaptateur.notifyDataSetChanged()
        btns.forEach { (k, b) -> b.alpha = if (k == filtre) 1f else 0.5f; b.setTypeface(null, if (k == filtre) android.graphics.Typeface.BOLD else android.graphics.Typeface.NORMAL) }
        info.text = if (affiches.isEmpty()) "Aucun fichier trouvé." else "${affiches.size} fichier(s) · touchez pour choisir"
        majBouton()
    }

    private fun majBouton() {
        val n = choisis.size
        valider.text = if (n == 0) "Choisissez au moins un fichier" else "✅ Utiliser $n fichier" + if (n > 1) "s" else ""
        valider.isEnabled = n > 0
        valider.gravity = Gravity.CENTER
    }

    private fun terminer() {
        if (choisis.isEmpty()) return
        val uris = choisis.toList()
        val noms = uris.map { u -> tous.firstOrNull { it.uri == u }?.nom ?: "" }
        val besoin = noms.any { Convertisseur.estAmr(it) }
        if (!besoin) { rendre(uris); return }
        valider.isEnabled = false
        valider.text = "⏳ Conversion… 0 %"
        barre.progress = 0; barre.visibility = View.VISIBLE
        conversion = true; annuleConv = false
        val total = noms.count { Convertisseur.estAmr(it) }
        Thread {
            val finaux = mutableListOf<Uri>()
            var echecs = 0
            var rang = 0
            var raison = ""
            uris.forEachIndexed { k, u ->
                if (annuleConv) return@forEachIndexed
                if (Convertisseur.estAmr(noms[k])) {
                    rang++
                    val r = rang
                    val base = noms[k].substringBeforeLast('.').replace(Regex("[^A-Za-z0-9._-]"), "_").ifEmpty { "audio" }
                    val f = java.io.File(cacheDir, "conv/${base}_${System.currentTimeMillis()}.m4a")
                    val ok = Convertisseur.amrVersM4a(this, u, f, { pc ->
                        runOnUiThread {
                            barre.progress = pc
                            valider.text = "⏳ Conversion " + (if (total > 1) "$r/$total · " else "") + "$pc %  (patientez)"
                        }
                    }, { annuleConv })
                    if (ok) finaux += androidx.core.content.FileProvider.getUriForFile(this, "$packageName.fp", f)
                    else { echecs++; if (raison.isEmpty()) raison = Convertisseur.derniereErreur }
                } else finaux += u
            }
            runOnUiThread {
                conversion = false; barre.visibility = View.GONE
                if (annuleConv) {
                    valider.isEnabled = true; majBouton()
                    android.widget.Toast.makeText(this, "Conversion annulée", android.widget.Toast.LENGTH_SHORT).show()
                } else if (finaux.isEmpty()) {
                    valider.text = "❌ Conversion impossible — choisissez un MP3 ou M4A"
                    valider.isEnabled = true
                    if (raison.isNotEmpty()) android.widget.Toast.makeText(this, "Détail : $raison", android.widget.Toast.LENGTH_LONG).show()
                } else {
                    if (echecs > 0) android.widget.Toast.makeText(this, "$echecs fichier(s) AMR non convertis", android.widget.Toast.LENGTH_LONG).show()
                    rendre(finaux)
                }
            }
        }.start()
    }

    private fun rendre(uris: List<Uri>) {
        val data = Intent().apply {
            val cd = ClipData.newRawUri(null, uris[0])
            uris.drop(1).forEach { cd.addItem(ClipData.Item(it)) }
            clipData = cd
            if (uris.size == 1) setData(uris[0])
            addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
        }
        setResult(RESULT_OK, data); finish()
    }

    private fun taille(o: Long): String =
        if (o >= 1_048_576) "${o / 1_048_576} Mo" else "${maxOf(1, o / 1024)} Ko"

    private fun dp(v: Int) = (v * resources.displayMetrics.density).toInt()
    private fun lp(top: Int = 0) = LinearLayout.LayoutParams(
        ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT
    ).apply { topMargin = dp(top) }
}
