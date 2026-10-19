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

    fun estAmr(nom: String): Boolean {
        val n = nom.lowercase()
        return n.endsWith(".amr") || n.endsWith(".awb")
    }

    fun amrVersM4a(ctx: Context, src: Uri, dest: File): Boolean {
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

            val rate = if (fmt.containsKey(MediaFormat.KEY_SAMPLE_RATE)) fmt.getInteger(MediaFormat.KEY_SAMPLE_RATE) else 8000
            val canaux = if (fmt.containsKey(MediaFormat.KEY_CHANNEL_COUNT)) fmt.getInteger(MediaFormat.KEY_CHANNEL_COUNT) else 1

            dec = MediaCodec.createDecoderByType(fmt.getString(MediaFormat.KEY_MIME)!!)
            dec.configure(fmt, null, null, 0)
            dec.start()

            val ef = MediaFormat.createAudioFormat(MediaFormat.MIMETYPE_AUDIO_AAC, rate, canaux).apply {
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

            fun nourrir(pcm: ByteBuffer, taille: Int, pts: Long, fin: Boolean) {
                val arr = ByteArray(taille)
                if (taille > 0) pcm.get(arr)
                var off = 0
                while (true) {
                    val i = e.dequeueInputBuffer(10000)
                    if (i < 0) { vider(0); continue }
                    val ib = e.getInputBuffer(i)!!
                    ib.clear()
                    val n = minOf(taille - off, ib.capacity())
                    if (n > 0) ib.put(arr, off, n)
                    val dernier = off + n >= taille
                    val t = pts + (off.toLong() / 2 / canaux) * 1_000_000L / rate
                    e.queueInputBuffer(i, 0, n, t, if (fin && dernier) MediaCodec.BUFFER_FLAG_END_OF_STREAM else 0)
                    off += n
                    vider(0)
                    if (dernier) break
                }
            }

            val d = dec
            val info = MediaCodec.BufferInfo()
            var entreeFinie = false
            var decFini = false
            while (!decFini) {
                if (!entreeFinie) {
                    val i = d.dequeueInputBuffer(10000)
                    if (i >= 0) {
                        val b = d.getInputBuffer(i)!!
                        val n = ex.readSampleData(b, 0)
                        if (n < 0) { d.queueInputBuffer(i, 0, 0, 0, MediaCodec.BUFFER_FLAG_END_OF_STREAM); entreeFinie = true }
                        else { d.queueInputBuffer(i, 0, n, ex.sampleTime, 0); ex.advance() }
                    }
                }
                val o = d.dequeueOutputBuffer(info, 10000)
                if (o >= 0) {
                    val ob = d.getOutputBuffer(o)!!
                    ob.position(info.offset); ob.limit(info.offset + info.size)
                    val fin = info.flags and MediaCodec.BUFFER_FLAG_END_OF_STREAM != 0
                    nourrir(ob, info.size, info.presentationTimeUs, fin)
                    d.releaseOutputBuffer(o, false)
                    if (fin) decFini = true
                }
            }
            var garde = 0
            while (!encFini && garde++ < 500) vider(10000)
            return encFini && demarre
        } catch (x: Exception) {
            return false
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
