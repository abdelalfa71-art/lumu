package com.lumu.app

import android.net.Uri
import androidx.core.content.FileProvider

/** Fournit les audios convertis (m4a) avec un type MIME lisible par le navigateur. */
class LumuFileProvider : FileProvider() {
    override fun getType(uri: Uri): String? =
        if (uri.lastPathSegment.orEmpty().endsWith(".m4a", true)) "audio/mp4" else super.getType(uri)
}
