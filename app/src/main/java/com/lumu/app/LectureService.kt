package com.lumu.app

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.content.pm.ServiceInfo
import android.media.session.MediaSession
import android.media.session.PlaybackState
import android.os.Build
import android.os.IBinder
import android.os.PowerManager
import androidx.core.app.ServiceCompat

/**
 * Notification de lecture (barre en haut de l'écran + écran verrouillé) pendant que l'audio joue
 * en arrière-plan. La page web envoie le titre et l'état ; les boutons renvoient l'action à la page.
 */
class LectureService : Service() {

    private var session: MediaSession? = null
    private var verrou: PowerManager.WakeLock? = null

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onCreate() {
        super.onCreate()
        if (Build.VERSION.SDK_INT >= 26) {
            val nm = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
            nm.createNotificationChannel(
                NotificationChannel(CANAL, "Lecture audio", NotificationManager.IMPORTANCE_LOW).apply { setSound(null, null) }
            )
        }
        session = MediaSession(this, "Lumu").apply {
            setCallback(object : MediaSession.Callback() {
                override fun onPlay() { MainActivity.action("pp") }
                override fun onPause() { MainActivity.action("pp") }
                override fun onSkipToNext() { MainActivity.action("next") }
                override fun onSkipToPrevious() { MainActivity.action("prev") }
                override fun onStop() { MainActivity.action("stop") }
            })
            isActive = true
        }
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        when (intent?.action) {
            A_PP -> { MainActivity.action("pp"); return START_NOT_STICKY }
            A_NEXT -> { MainActivity.action("next"); return START_NOT_STICKY }
            A_PREV -> { MainActivity.action("prev"); return START_NOT_STICKY }
            A_STOP -> { MainActivity.action("stop"); return START_NOT_STICKY }
        }
        val titre = intent?.getStringExtra("titre").orEmpty()
        val artiste = intent?.getStringExtra("artiste").orEmpty()
        val jouant = intent?.getBooleanExtra("jouant", false) ?: false
        if (titre.isEmpty()) { arreter(); return START_NOT_STICKY }
        afficher(titre, artiste, jouant)
        return START_NOT_STICKY
    }

    private fun action(code: String, icone: Int, texte: String, req: Int): Notification.Action {
        val pi = PendingIntent.getService(
            this, req, Intent(this, LectureService::class.java).setAction(code),
            PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT
        )
        return Notification.Action.Builder(android.graphics.drawable.Icon.createWithResource(this, icone), texte, pi).build()
    }

    private fun afficher(titre: String, artiste: String, jouant: Boolean) {
        session?.setPlaybackState(
            PlaybackState.Builder()
                .setActions(
                    PlaybackState.ACTION_PLAY or PlaybackState.ACTION_PAUSE or PlaybackState.ACTION_PLAY_PAUSE or
                            PlaybackState.ACTION_SKIP_TO_NEXT or PlaybackState.ACTION_SKIP_TO_PREVIOUS or PlaybackState.ACTION_STOP
                )
                .setState(if (jouant) PlaybackState.STATE_PLAYING else PlaybackState.STATE_PAUSED, PlaybackState.PLAYBACK_POSITION_UNKNOWN, 1f)
                .build()
        )
        session?.setMetadata(
            android.media.MediaMetadata.Builder()
                .putString(android.media.MediaMetadata.METADATA_KEY_TITLE, titre)
                .putString(android.media.MediaMetadata.METADATA_KEY_ARTIST, artiste)
                .build()
        )
        val ouvrir = PendingIntent.getActivity(
            this, 0, Intent(this, MainActivity::class.java).addFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP or Intent.FLAG_ACTIVITY_CLEAR_TOP),
            PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT
        )
        val b = if (Build.VERSION.SDK_INT >= 26) Notification.Builder(this, CANAL) else Notification.Builder(this)
        b.setSmallIcon(R.drawable.ic_notif)
            .setContentTitle(titre)
            .setContentText(artiste)
            .setContentIntent(ouvrir)
            .setOngoing(jouant)
            .setShowWhen(false)
            .setVisibility(Notification.VISIBILITY_PUBLIC)
            .addAction(action(A_PREV, android.R.drawable.ic_media_previous, "Précédent", 1))
            .addAction(
                if (jouant) action(A_PP, android.R.drawable.ic_media_pause, "Pause", 2)
                else action(A_PP, android.R.drawable.ic_media_play, "Lecture", 2)
            )
            .addAction(action(A_NEXT, android.R.drawable.ic_media_next, "Suivant", 3))
            .setStyle(Notification.MediaStyle().setShowActionsInCompactView(0, 1, 2).setMediaSession(session?.sessionToken))
        val n = b.build()
        if (Build.VERSION.SDK_INT >= 29) {
            ServiceCompat.startForeground(this, ID, n, ServiceInfo.FOREGROUND_SERVICE_TYPE_MEDIA_PLAYBACK)
        } else {
            startForeground(ID, n)
        }
        if (jouant) prendreVerrou() else rendreVerrou()
    }

    private fun prendreVerrou() {
        if (verrou?.isHeld == true) return
        try {
            val pm = getSystemService(Context.POWER_SERVICE) as PowerManager
            verrou = pm.newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "lumu:lecture").apply { acquire(4 * 60 * 60 * 1000L) }
        } catch (e: Exception) { }
    }

    private fun rendreVerrou() { try { if (verrou?.isHeld == true) verrou?.release() } catch (e: Exception) { } }

    private fun arreter() {
        rendreVerrou()
        ServiceCompat.stopForeground(this, ServiceCompat.STOP_FOREGROUND_REMOVE)
        stopSelf()
    }

    override fun onDestroy() {
        rendreVerrou()
        session?.release(); session = null
        super.onDestroy()
    }

    companion object {
        const val CANAL = "lumu_lecture"
        const val ID = 42
        const val A_PP = "com.lumu.PP"
        const val A_NEXT = "com.lumu.NEXT"
        const val A_PREV = "com.lumu.PREV"
        const val A_STOP = "com.lumu.STOP"
    }
}
