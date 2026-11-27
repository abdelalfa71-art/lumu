package com.lumu.app

import android.app.AlarmManager
import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.pm.ServiceInfo
import android.media.AudioAttributes
import android.media.MediaPlayer
import android.media.RingtoneManager
import android.os.Build
import android.os.IBinder
import android.os.PowerManager
import androidx.core.app.ServiceCompat
import org.json.JSONArray
import java.io.File

/**
 * Adhan à l'heure des prières, même application fermée.
 * La page envoie la liste des prochaines heures (JSON [{t: millisecondes, nom: "Dhuhr"}]) ;
 * chaque heure devient une alarme Android ; à l'alarme, un service joue l'adhan (fichier choisi
 * dans l'application, sinon le son de notification du téléphone) avec une notification « Arrêter ».
 */
object Adhan {
    private const val PREFS = "lumu_adhan"

    fun programmer(ctx: Context, json: String) {
        ctx.getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit().putString("liste", json).apply()
        replanifier(ctx)
    }

    fun replanifier(ctx: Context) {
        val am = ctx.getSystemService(Context.ALARM_SERVICE) as AlarmManager
        // Annule les anciennes alarmes (jusqu'à 60)
        for (i in 0 until 60) {
            val pi = PendingIntent.getBroadcast(ctx, 7000 + i, Intent(ctx, AdhanAlarme::class.java), PendingIntent.FLAG_NO_CREATE or PendingIntent.FLAG_IMMUTABLE)
            if (pi != null) { am.cancel(pi); pi.cancel() }
        }
        val json = ctx.getSharedPreferences(PREFS, Context.MODE_PRIVATE).getString("liste", "[]") ?: "[]"
        val l = try { JSONArray(json) } catch (e: Exception) { JSONArray() }
        val now = System.currentTimeMillis()
        var k = 0
        for (i in 0 until l.length()) {
            if (k >= 60) break
            val o = l.optJSONObject(i) ?: continue
            val t = o.optLong("t"); if (t <= now) continue
            val it = Intent(ctx, AdhanAlarme::class.java).putExtra("nom", o.optString("nom", "Prière"))
            val pi = PendingIntent.getBroadcast(ctx, 7000 + k, it, PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)
            try {
                if (Build.VERSION.SDK_INT >= 31 && !am.canScheduleExactAlarms()) am.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, t, pi)
                else if (Build.VERSION.SDK_INT >= 23) am.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, t, pi)
                else am.setExact(AlarmManager.RTC_WAKEUP, t, pi)
            } catch (e: SecurityException) { am.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, t, pi) }
            k++
        }
    }

    fun fichier(ctx: Context) = File(ctx.filesDir, "adhan.mp3")
}

class AdhanAlarme : BroadcastReceiver() {
    override fun onReceive(ctx: Context, intent: Intent) {
        val s = Intent(ctx, AdhanService::class.java).putExtra("nom", intent.getStringExtra("nom") ?: "Prière")
        try { if (Build.VERSION.SDK_INT >= 26) ctx.startForegroundService(s) else ctx.startService(s) } catch (e: Exception) {}
    }
}

class AdhanDemarrage : BroadcastReceiver() {
    override fun onReceive(ctx: Context, intent: Intent) { Adhan.replanifier(ctx); Azkar.replanifier(ctx) }
}

class AdhanService : Service() {
    private var mp: MediaPlayer? = null
    private var verrou: PowerManager.WakeLock? = null
    override fun onBind(intent: Intent?): IBinder? = null

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        if (intent?.action == "stop") { arreter(); return START_NOT_STICKY }
        val nom = intent?.getStringExtra("nom") ?: "Prière"
        val nm = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        if (Build.VERSION.SDK_INT >= 26) nm.createNotificationChannel(NotificationChannel(CANAL, "Adhan", NotificationManager.IMPORTANCE_HIGH).apply { setSound(null, null) })
        val ouvrir = PendingIntent.getActivity(this, 0, Intent(this, MainActivity::class.java).addFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP), PendingIntent.FLAG_IMMUTABLE)
        val stop = PendingIntent.getService(this, 1, Intent(this, AdhanService::class.java).setAction("stop"), PendingIntent.FLAG_IMMUTABLE)
        val b = if (Build.VERSION.SDK_INT >= 26) Notification.Builder(this, CANAL) else @Suppress("DEPRECATION") Notification.Builder(this)
        val n = b.setSmallIcon(android.R.drawable.ic_lock_idle_alarm)
            .setContentTitle("🕌 C'est l'heure de la prière")
            .setContentText(nom + " · Allâhu akbar")
            .setContentIntent(ouvrir).setDeleteIntent(stop)
            .addAction(Notification.Action.Builder(android.graphics.drawable.Icon.createWithResource(this, android.R.drawable.ic_media_pause), "Arrêter l'adhan", stop).build())
            .setCategory(Notification.CATEGORY_ALARM).build()
        ServiceCompat.startForeground(this, 77, n, if (Build.VERSION.SDK_INT >= 29) ServiceInfo.FOREGROUND_SERVICE_TYPE_MEDIA_PLAYBACK else 0)
        verrou = (getSystemService(Context.POWER_SERVICE) as PowerManager).newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "lumu:adhan").apply { acquire(6 * 60 * 1000L) }
        try {
            mp?.release()
            val f = Adhan.fichier(this)
            mp = MediaPlayer().apply {
                setAudioAttributes(AudioAttributes.Builder().setUsage(AudioAttributes.USAGE_ALARM).setContentType(AudioAttributes.CONTENT_TYPE_MUSIC).build())
                if (f.exists() && f.length() > 10000) setDataSource(f.absolutePath)
                else setDataSource(this@AdhanService, RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION))
                setOnCompletionListener { arreter() }
                setOnErrorListener { _, _, _ -> arreter(); true }
                prepare(); start()
            }
        } catch (e: Exception) { arreter() }
        return START_NOT_STICKY
    }

    private fun arreter() {
        try { mp?.release() } catch (e: Exception) {}
        mp = null
        try { verrou?.release() } catch (e: Exception) {}
        ServiceCompat.stopForeground(this, ServiceCompat.STOP_FOREGROUND_REMOVE)
        stopSelf()
    }

    override fun onDestroy() { try { mp?.release() } catch (e: Exception) {}; super.onDestroy() }

    companion object { const val CANAL = "lumu_adhan" }
}

/**
 * Rappels des adhkâr (matin, soir, coucher) dans la barre de notification, même application fermée.
 * La page envoie [{t: millisecondes, l: "matin"|"soir"|"coucher", titre, texte}] ; chaque heure devient
 * une alarme ; à l'alarme, une notification s'affiche et, touchée, ouvre la bonne liste d'invocations.
 */
object Azkar {
    private const val PREFS = "lumu_azkar"
    const val CANAL = "lumu_azkar"
    private val TEXTES = mapOf(
        "matin" to arrayOf("🌅 Adhkâr du matin", "Protégez votre journée · touchez pour les lire (≈ 5 min)"),
        "soir" to arrayOf("🌇 Adhkâr du soir", "Avant le Maghrib · touchez pour les lire (≈ 5 min)"),
        "coucher" to arrayOf("🌙 Avant de dormir", "Les invocations du coucher selon la Sounna"))

    fun programmer(ctx: Context, json: String) {
        ctx.getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit().putString("liste", json).apply()
        replanifier(ctx)
    }

    /** Position mémorisée : le téléphone calcule ensuite lui-même les heures, sans ouvrir l'application */
    fun lieu(ctx: Context, lat: Double, lng: Double) {
        ctx.getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit().putString("lat", lat.toString()).putString("lng", lng.toString()).apply()
        replanifier(ctx)
    }

    /** Heures (ms) des adhkâr pour les jours à venir, calculées sur place (méthode Ligue islamique mondiale) */
    private fun calculer(lat: Double, lng: Double, jours: Int): List<Pair<Long, String>> {
        val out = ArrayList<Pair<Long, String>>()
        val cal = java.util.Calendar.getInstance()
        for (j in 0 until jours) {
            val c = cal.clone() as java.util.Calendar; c.add(java.util.Calendar.DAY_OF_MONTH, j)
            val y = c.get(java.util.Calendar.YEAR); val m = c.get(java.util.Calendar.MONTH) + 1; val d = c.get(java.util.Calendar.DAY_OF_MONTH)
            val h = HeuresPriere.calculer(y, m, d, lat, lng)
            val u = java.util.Calendar.getInstance(java.util.TimeZone.getTimeZone("UTC")); u.clear(); u.set(y, m - 1, d, 0, 0, 0)
            val base = u.timeInMillis
            fun ms(hh: Double) = base + (hh * 3600000.0).toLong()
            if (!h[0].isNaN()) out.add(ms(h[0]) + 20 * 60000L to "matin")
            if (!h[1].isNaN()) out.add(ms(h[1]) + 20 * 60000L to "soir")
            if (!h[2].isNaN()) out.add(ms(h[2]) + 75 * 60000L to "coucher")
        }
        return out
    }

    fun replanifier(ctx: Context) {
        val am = ctx.getSystemService(Context.ALARM_SERVICE) as AlarmManager
        for (i in 0 until 40) {
            val pi = PendingIntent.getBroadcast(ctx, 8000 + i, Intent(ctx, AzkarAlarme::class.java), PendingIntent.FLAG_NO_CREATE or PendingIntent.FLAG_IMMUTABLE)
            if (pi != null) { am.cancel(pi); pi.cancel() }
        }
        val sp = ctx.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
        val now = System.currentTimeMillis()
        val liste = ArrayList<Pair<Long, String>>()
        val lat = sp.getString("lat", null)?.toDoubleOrNull(); val lng = sp.getString("lng", null)?.toDoubleOrNull()
        if (lat != null && lng != null) liste.addAll(calculer(lat, lng, 10))
        else {
            val l = try { JSONArray(sp.getString("liste", "[]") ?: "[]") } catch (e: Exception) { JSONArray() }
            for (i in 0 until l.length()) { val o = l.optJSONObject(i) ?: continue; liste.add(o.optLong("t") to o.optString("l", "matin")) }
        }
        var k = 0
        var prochain = 0L
        for ((t, l) in liste.sortedBy { it.first }) {
            if (k >= 30) break
            if (t <= now + 5000) continue
            val tx = TEXTES[l] ?: TEXTES["matin"]!!
            val it = Intent(ctx, AzkarAlarme::class.java).putExtra("l", l).putExtra("titre", tx[0]).putExtra("texte", tx[1])
            val pi = PendingIntent.getBroadcast(ctx, 8000 + k, it, PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)
            try {
                if (Build.VERSION.SDK_INT >= 31 && !am.canScheduleExactAlarms()) am.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, t, pi)
                else if (Build.VERSION.SDK_INT >= 23) am.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, t, pi)
                else am.setExact(AlarmManager.RTC_WAKEUP, t, pi)
            } catch (e: Exception) { try { am.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, t, pi) } catch (e2: Exception) {} }
            if (prochain == 0L) prochain = t
            k++
        }
        sp.edit().putLong("prochain", prochain).putInt("nb", k).apply()
    }
}

fun azkarEtat(ctx: Context): String {
    val sp = ctx.getSharedPreferences("lumu_azkar", Context.MODE_PRIVATE)
    return org.json.JSONObject().put("prochain", sp.getLong("prochain", 0L)).put("nb", sp.getInt("nb", 0)).put("lieu", sp.getString("lat", null) != null).toString()
}

/** Calcul astronomique des heures de prière (Fajr 18°, Asr chaféite, Isha 17°), en heures UTC */
object HeuresPriere {
    private fun rad(x: Double) = Math.toRadians(x); private fun deg(x: Double) = Math.toDegrees(x)
    private fun fixA(a: Double) = ((a % 360.0) + 360.0) % 360.0
    private fun fixH(a: Double) = ((a % 24.0) + 24.0) % 24.0
    private fun soleil(jd: Double): DoubleArray {
        val D = jd - 2451545.0
        val g = fixA(357.529 + 0.98560028 * D); val q = fixA(280.459 + 0.98564736 * D)
        val L = fixA(q + 1.915 * Math.sin(rad(g)) + 0.020 * Math.sin(rad(2 * g)))
        val e = 23.439 - 0.00000036 * D
        val ra = deg(Math.atan2(Math.cos(rad(e)) * Math.sin(rad(L)), Math.cos(rad(L)))) / 15.0
        return doubleArrayOf(deg(Math.asin(Math.sin(rad(e)) * Math.sin(rad(L)))), q / 15.0 - fixH(ra))
    }
    /** [fajr, asr, isha] en heures UTC du jour donné (NaN si impossible) */
    fun calculer(y0: Int, m0: Int, d: Int, lat: Double, lng: Double): DoubleArray {
        var y = y0; var m = m0; if (m <= 2) { y -= 1; m += 12 }
        val A = Math.floor(y / 100.0); val B = 2 - A + Math.floor(A / 4.0)
        val jd = Math.floor(365.25 * (y + 4716)) + Math.floor(30.6001 * (m + 1)) + d + B - 1524.5 - lng / (15.0 * 24.0)
        fun midi(t: Double) = fixH(12 - soleil(jd + t)[1])
        fun angle(a: Double, t: Double, avant: Boolean): Double {
            val dec = soleil(jd + t)[0]
            val c = (-Math.sin(rad(a)) - Math.sin(rad(dec)) * Math.sin(rad(lat))) / (Math.cos(rad(dec)) * Math.cos(rad(lat)))
            if (c < -1 || c > 1) return Double.NaN
            val T = deg(Math.acos(c)) / 15.0
            return midi(t) + if (avant) -T else T
        }
        fun asr(t: Double): Double {
            val dec = soleil(jd + t)[0]
            val a = -deg(Math.atan(1.0 / (1.0 + Math.tan(rad(Math.abs(lat - dec))))))
            return angle(a, t, false)
        }
        // deux passes pour affiner
        var f = angle(18.0, 5 / 24.0, true); var s = asr(13 / 24.0); var i = angle(17.0, 18 / 24.0, false)
        if (!f.isNaN()) f = angle(18.0, f / 24.0, true); if (!s.isNaN()) s = asr(s / 24.0); if (!i.isNaN()) i = angle(17.0, i / 24.0, false)
        return doubleArrayOf(f - lng / 15.0, s - lng / 15.0, i - lng / 15.0)
    }
}

class AzkarAlarme : BroadcastReceiver() {
    override fun onReceive(ctx: Context, intent: Intent) {
        val l = intent.getStringExtra("l") ?: "matin"
        val nm = ctx.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        if (Build.VERSION.SDK_INT >= 26 && nm.getNotificationChannel(Azkar.CANAL) == null)
            nm.createNotificationChannel(NotificationChannel(Azkar.CANAL, "Rappels des adhkâr", NotificationManager.IMPORTANCE_DEFAULT).apply { description = "Adhkâr du matin, du soir et du coucher" })
        val code = when (l) { "soir" -> 2; "coucher" -> 3; else -> 1 }
        val ouvrir = PendingIntent.getActivity(ctx, 8100 + code,
            Intent(ctx, MainActivity::class.java).putExtra("azkar", l).addFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP or Intent.FLAG_ACTIVITY_CLEAR_TOP),
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)
        val b = if (Build.VERSION.SDK_INT >= 26) Notification.Builder(ctx, Azkar.CANAL) else Notification.Builder(ctx)
        b.setSmallIcon(R.drawable.ic_notif)
            .setContentTitle(intent.getStringExtra("titre") ?: "Adhkâr")
            .setContentText(intent.getStringExtra("texte") ?: "Touchez pour les lire")
            .setContentIntent(ouvrir).setAutoCancel(true)
            .addAction(Notification.Action.Builder(null, "Lire maintenant", ouvrir).build())
        // Même étiquette que les rappels envoyés par Internet : pas de doublon si les deux arrivent
        try { nm.notify("azkar-$l", 0, b.build()) } catch (e: SecurityException) {}
        try { Azkar.replanifier(ctx) } catch (e: Exception) {} // enchaîne les rappels suivants, sans ouvrir l'application
    }
}
