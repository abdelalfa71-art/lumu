package com.lumu.app

import android.content.Context
import android.media.MediaCodec
import android.media.MediaCodecInfo
import android.media.MediaExtractor
import android.media.MediaFormat
import android.media.MediaMuxer
import android.net.Uri
import java.io.File
import java.nio.ByteBuffer

/** Convertit un audio AMR (enregistreur vocal) en M4A (AAC), lisible partout. Utilise uniquement Android. */
object Convertisseur {
    @Volatile var derniereErreur: String = ""

    fun estAmr(nom: String): Boolean {
        val n = nom.lowercase()
        return n.endsWith(".amr") || n.endsWith(".awb")
    }

    /** Faut-il alléger cet audio ? (débit élevé : on le recompresse en parole légère avant l'envoi) */
    fun aAlleger(ctx: Context, src: Uri, taille: Long): Boolean {
        if (taille < 1_500_000L) return false
        return try {
            val r = android.media.MediaMetadataRetriever()
            r.setDataSource(ctx, src)
            val ms = r.extractMetadata(android.media.MediaMetadataRetriever.METADATA_KEY_DURATION)?.toLongOrNull() ?: 0L
            r.release()
            if (ms <= 0) taille > 5_000_000L else taille * 8.0 / (ms / 1000.0) > 56_000.0
        } catch (e: Exception) { taille > 5_000_000L }
    }

    fun amrVersM4a(ctx: Context, src: Uri, dest: File, progres: (Int) -> Unit = {}, annule: () -> Boolean = { false }): Boolean =
        versM4a(ctx, src, dest, progres, annule)

    /** Tout audio → M4A (AAC) mono 32 kbit/s : voix claire, fichier 4 à 5 fois plus léger. */
    fun versM4a(ctx: Context, src: Uri, dest: File, progres: (Int) -> Unit = {}, annule: () -> Boolean = { false }): Boolean {
        val ex = MediaExtractor()
        var dec: MediaCodec? = null
        var enc: MediaCodec? = null
        var mux: MediaMuxer? = null
        var demarre = false
        try {
            ex.setDataSource(ctx, src, null)
            var idx = -1
            var fmt: MediaFormat? = null
            for (i in 0 until ex.trackCount) {
                val f = ex.getTrackFormat(i)
                if ((f.getString(MediaFormat.KEY_MIME) ?: "").startsWith("audio/")) { idx = i; fmt = f; break }
            }
            if (idx < 0 || fmt == null) return false
            ex.selectTrack(idx)

            val dureeUs = if (fmt.containsKey(MediaFormat.KEY_DURATION)) fmt.getLong(MediaFormat.KEY_DURATION) else 0L
            var dernierPct = -1
            val rate = if (fmt.containsKey(MediaFormat.KEY_SAMPLE_RATE)) fmt.getInteger(MediaFormat.KEY_SAMPLE_RATE) else 8000
            val canaux = if (fmt.containsKey(MediaFormat.KEY_CHANNEL_COUNT)) fmt.getInteger(MediaFormat.KEY_CHANNEL_COUNT) else 1
            if (canaux > 2) { derniereErreur = "canaux"; return false }
            val can = 1 // sortie mono

            dec = MediaCodec.createDecoderByType(fmt.getString(MediaFormat.KEY_MIME)!!)
            dec.configure(fmt, null, null, 0)
            dec.start()

            val ef = MediaFormat.createAudioFormat(MediaFormat.MIMETYPE_AUDIO_AAC, rate, can).apply {
                setInteger(MediaFormat.KEY_AAC_PROFILE, MediaCodecInfo.CodecProfileLevel.AACObjectLC)
                setInteger(MediaFormat.KEY_BIT_RATE, 32000)
                setInteger(MediaFormat.KEY_MAX_INPUT_SIZE, 65536)
            }
            enc = MediaCodec.createEncoderByType(MediaFormat.MIMETYPE_AUDIO_AAC)
            enc.configure(ef, null, null, MediaCodec.CONFIGURE_FLAG_ENCODE)
            enc.start()

            dest.parentFile?.mkdirs()
            if (dest.exists()) dest.delete()
            mux = MediaMuxer(dest.absolutePath, MediaMuxer.OutputFormat.MUXER_OUTPUT_MPEG_4)

            val e = enc
            val m = mux
            var piste = -1
            var encFini = false
            val einfo = MediaCodec.BufferInfo()

            fun vider(delai: Long) {
                while (true) {
                    val o = e.dequeueOutputBuffer(einfo, delai)
                    when {
                        o == MediaCodec.INFO_TRY_AGAIN_LATER -> return
                        o == MediaCodec.INFO_OUTPUT_FORMAT_CHANGED -> {
                            piste = m.addTrack(e.outputFormat); m.start(); demarre = true
                        }
                        o >= 0 -> {
                            val b = e.getOutputBuffer(o)!!
                            if (einfo.flags and MediaCodec.BUFFER_FLAG_CODEC_CONFIG != 0) einfo.size = 0
                            if (einfo.size > 0 && demarre) {
                                b.position(einfo.offset); b.limit(einfo.offset + einfo.size)
                                m.writeSampleData(piste, b, einfo)
                            }
                            e.releaseOutputBuffer(o, false)
                            if (einfo.flags and MediaCodec.BUFFER_FLAG_END_OF_STREAM != 0) { encFini = true; return }
                        }
                    }
                }
            }

            var echantillons = 0L
            fun nourrir(arr: ByteArray, taille: Int, fin: Boolean) {
                var off = 0
                while (true) {
                    if (annule()) throw InterruptedException("annule")
                    val i = e.dequeueInputBuffer(2000)
                    if (i < 0) { vider(0); continue }
                    val ib = e.getInputBuffer(i)!!
                    ib.clear()
                    val n = minOf(taille - off, ib.capacity())
                    if (n > 0) ib.put(arr, off, n)
                    val dernier = off + n >= taille
                    val t = (echantillons + (off.toLong() / 2 / can)) * 1_000_000L / rate
                    e.queueInputBuffer(i, 0, n, t, if (fin && dernier) MediaCodec.BUFFER_FLAG_END_OF_STREAM else 0)
                    off += n
                    vider(0)
                    if (dernier) break
                }
                echantillons += taille.toLong() / 2 / can
            }

            val d = dec
            val info = MediaCodec.BufferInfo()
            var entreeFinie = false
            var decFini = false
            val tampon = ByteArray(16384)
            var nT = 0
            while (!decFini) {
                if (annule()) throw InterruptedException("annule")
                if (!entreeFinie) {
                    val i = d.dequeueInputBuffer(2000)
                    if (i >= 0) {
                        val b = d.getInputBuffer(i)!!
                        val n = ex.readSampleData(b, 0)
                        if (n < 0) { d.queueInputBuffer(i, 0, 0, 0, MediaCodec.BUFFER_FLAG_END_OF_STREAM); entreeFinie = true }
                        else {
                            val st = ex.sampleTime
                            d.queueInputBuffer(i, 0, n, st, 0); ex.advance()
                            if (dureeUs > 0) { val pc = (st * 100 / dureeUs).toInt().coerceIn(0, 99); if (pc != dernierPct) { dernierPct = pc; progres(pc) } }
                        }
                    }
                }
                val o = d.dequeueOutputBuffer(info, 2000)
                if (o >= 0) {
                    val ob = d.getOutputBuffer(o)!!
                    ob.position(info.offset); ob.limit(info.offset + info.size)
                    val fin = info.flags and MediaCodec.BUFFER_FLAG_END_OF_STREAM != 0
                    val brut = ByteArray(info.size)
                    ob.get(brut)
                    val pcm = if (canaux == 2) {
                        val m = ByteArray(brut.size / 2)
                        var a = 0; var b = 0
                        while (a + 3 < brut.size) {
                            val l = ((brut[a].toInt() and 0xFF) or (brut[a + 1].toInt() shl 8)).toShort().toInt()
                            val r = ((brut[a + 2].toInt() and 0xFF) or (brut[a + 3].toInt() shl 8)).toShort().toInt()
                            val v = (l + r) / 2
                            m[b] = (v and 0xFF).toByte(); m[b + 1] = (v shr 8).toByte()
                            a += 4; b += 2
                        }
                        m
                    } else brut
                    var restant = pcm.size
                    var pos = 0
                    while (restant > 0) {
                        val n = minOf(restant, tampon.size - nT)
                        System.arraycopy(pcm, pos, tampon, nT, n); nT += n; restant -= n; pos += n
                        if (nT == tampon.size) { nourrir(tampon, nT, false); nT = 0 }
                    }
                    if (fin) { nourrir(tampon, nT, true); nT = 0; decFini = true }
                    d.releaseOutputBuffer(o, false)
                }
            }
            var garde = 0
            while (!encFini && garde++ < 200) { if (annule()) throw InterruptedException("annule"); vider(10000) }
            progres(100)
            return encFini && demarre
        } catch (x: InterruptedException) {
            derniereErreur = "annule"; return false
        } catch (x: Exception) {
            derniereErreur = x.toString(); return false
        } finally {
            try { dec?.stop() } catch (x: Exception) {}
            try { dec?.release() } catch (x: Exception) {}
            try { enc?.stop() } catch (x: Exception) {}
            try { enc?.release() } catch (x: Exception) {}
            try { if (demarre) mux?.stop() } catch (x: Exception) {}
            try { mux?.release() } catch (x: Exception) {}
            try { ex.release() } catch (x: Exception) {}
        }
    }
}
