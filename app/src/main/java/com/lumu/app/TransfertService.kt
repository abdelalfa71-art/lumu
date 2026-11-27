package com.lumu.app

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Intent
import android.content.pm.ServiceInfo
import android.os.Build
import android.os.IBinder
import androidx.core.app.NotificationCompat
import androidx.core.app.ServiceCompat

/** Téléchargements et envois : simple barre de progression (pas un lecteur), garde Lumu actif en arrière-plan. */
class TransfertService : Service() {
    companion object { const val CANAL = "lumu_transferts"; const val ID = 7301 }
    override fun onBind(i: Intent?): IBinder? = null
    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        val texte = intent?.getStringExtra("texte") ?: "Téléchargement en cours"
        val pct = intent?.getIntExtra("pct", -1) ?: -1
        val nm = getSystemService(NOTIFICATION_SERVICE) as NotificationManager
        if (Build.VERSION.SDK_INT >= 26 && nm.getNotificationChannel(CANAL) == null)
            nm.createNotificationChannel(NotificationChannel(CANAL, "Téléchargements", NotificationManager.IMPORTANCE_LOW).apply { setShowBadge(false) })
        val ouvrir = PendingIntent.getActivity(this, 7302, packageManager.getLaunchIntentForPackage(packageName), PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT)
        val n = NotificationCompat.Builder(this, CANAL)
            .setSmallIcon(R.drawable.ic_notif)
            .setContentTitle(texte)
            .setContentText(if (pct >= 0) "$pct %" else "Lumu")
            .setProgress(100, pct.coerceIn(0, 100), pct < 0)
            .setOngoing(true).setOnlyAlertOnce(true).setSilent(true)
            .setCategory(NotificationCompat.CATEGORY_PROGRESS)
            .setContentIntent(ouvrir)
            .build()
        try {
            if (Build.VERSION.SDK_INT >= 29) ServiceCompat.startForeground(this, ID, n, ServiceInfo.FOREGROUND_SERVICE_TYPE_DATA_SYNC)
            else startForeground(ID, n)
        } catch (e: Exception) { nm.notify(ID, n) }
        return START_NOT_STICKY
    }
    override fun onDestroy() { try { stopForeground(STOP_FOREGROUND_REMOVE) } catch (e: Exception) {}; super.onDestroy() }
}
