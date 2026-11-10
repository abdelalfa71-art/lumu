package com.lumu.app

import android.os.Handler
import android.os.Looper
import androidx.media3.common.AudioAttributes
import androidx.media3.common.C
import androidx.media3.common.MediaItem
import androidx.media3.common.PlaybackException
import androidx.media3.common.Player
import androidx.media3.exoplayer.ExoPlayer

/** Lecteur natif (ExoPlayer) : lit les formats que le navigateur ne lit pas (AMR, etc.). Commandé par la page. */
class NatifLecteur(private val act: MainActivity) {
    private val repere = Handler(Looper.getMainLooper())
    private var lecteur: ExoPlayer? = null
    private var id = ""

    private val tick = object : Runnable {
        override fun run() {
            val p = lecteur ?: return
            etat(p)
            repere.postDelayed(this, 500)
        }
    }

    private fun etat(p: ExoPlayer) {
        val pos = p.currentPosition / 1000.0
        val dur = if (p.duration == C.TIME_UNSET) -1.0 else p.duration / 1000.0
        val fin = p.playbackState == Player.STATE_ENDED
        act.envoyerJs("window.__natifEtat&&window.__natifEtat('$id',$pos,$dur,${p.isPlaying},$fin)")
    }

    fun lire(url: String, nid: String, debut: Double) {
        arreter()
        id = nid
        val p = ExoPlayer.Builder(act).build()
        p.setAudioAttributes(AudioAttributes.Builder().setUsage(C.USAGE_MEDIA).setContentType(C.AUDIO_CONTENT_TYPE_MUSIC).build(), true)
        p.addListener(object : Player.Listener {
            override fun onPlaybackStateChanged(playbackState: Int) { etat(p) }
            override fun onIsPlayingChanged(isPlaying: Boolean) { etat(p) }
            override fun onPlayerError(error: PlaybackException) {
                act.envoyerJs("window.__natifErreur&&window.__natifErreur('$id')")
            }
        })
        p.setMediaItem(MediaItem.fromUri(url))
        p.prepare()
        if (debut > 1) p.seekTo((debut * 1000).toLong())
        p.playWhenReady = true
        lecteur = p
        repere.removeCallbacks(tick)
        repere.post(tick)
    }

    fun play() { lecteur?.play() }
    fun pause() { lecteur?.pause() }
    fun aller(sec: Double) { lecteur?.seekTo((sec * 1000).toLong()) }
    fun vitesse(v: Double) { lecteur?.setPlaybackSpeed(v.toFloat()) }

    fun arreter() {
        repere.removeCallbacks(tick)
        lecteur?.release()
        lecteur = null
    }
}
