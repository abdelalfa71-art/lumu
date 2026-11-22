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
    override fun onReceive(ctx: Context, intent: Intent) { Adhan.replanifier(ctx) }
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
