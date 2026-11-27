package com.lumu.app

import android.content.Context
import android.content.Intent
import com.google.firebase.messaging.FirebaseMessaging
import com.google.firebase.messaging.FirebaseMessagingService
import com.google.firebase.messaging.RemoteMessage

/** Rappels des adhkâr reçus par Internet (comme Telegram) : affichés même si Lumu est fermé. */
class LumuFcm : FirebaseMessagingService() {
    override fun onNewToken(token: String) {
        getSharedPreferences("lumu_azkar", Context.MODE_PRIVATE).edit().putString("fcm", token).apply()
    }
    // Lumu ouvert : Android n'affiche pas lui-même la notification, on la montre comme les rappels locaux
    override fun onMessageReceived(m: RemoteMessage) {
        val l = m.data["azkar"] ?: return
        try {
            sendBroadcast(Intent(applicationContext, AzkarAlarme::class.java).putExtra("l", l)
                .putExtra("titre", m.notification?.title ?: "Adhkâr").putExtra("texte", m.notification?.body ?: ""))
        } catch (e: Exception) {}
    }
    companion object {
        fun recupererJeton(ctx: Context) {
            try {
                FirebaseMessaging.getInstance().token.addOnSuccessListener { t ->
                    ctx.getSharedPreferences("lumu_azkar", Context.MODE_PRIVATE).edit().putString("fcm", t).apply()
                }
            } catch (e: Exception) {} // Firebase pas encore configuré
        }
    }
}
