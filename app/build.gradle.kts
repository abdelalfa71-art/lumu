plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
}
// Notifications par Internet (Firebase) : actif dès que le fichier google-services.json est présent
if (file("google-services.json").exists()) apply(plugin = "com.google.gms.google-services")
android {
    namespace = "com.lumu.app"
    compileSdk = 34
    defaultConfig {
        applicationId = "com.lumu.app"
        minSdk = 24
        targetSdk = 34
        versionCode = 1
        versionName = "1.0"
    }
    flavorDimensions += "cible"
    productFlavors {
        // Variante « app » : l'application Lumu pour le public
        create("app") {
            dimension = "cible"
            // Adresse publique du site Lumu (pour les liens de partage WhatsApp). À renseigner.
            buildConfigField("String", "SITE_URL", "\"\"")
        }
        // Variante « admin » : Lumu Admin (publication)
        create("admin") {
            dimension = "cible"
            applicationId = "com.lumu.admin"
            buildConfigField("String", "SITE_URL", "\"\"")
        }
    }
    buildFeatures { buildConfig = true }
    // Signature fixe de Lumu : les mises à jour s'installent par-dessus sans désinstaller
    val ks = System.getenv("LUMU_KS")
    if (ks != null && file(ks).exists()) {
        signingConfigs { create("lumu") { storeFile = file(ks); storePassword = System.getenv("LUMU_KS_PASS"); keyAlias = "lumu"; keyPassword = System.getenv("LUMU_KS_PASS") } }
        buildTypes { getByName("debug") { signingConfig = signingConfigs.getByName("lumu") } }
    }
    buildTypes { release { isMinifyEnabled = false } }
    compileOptions { sourceCompatibility = JavaVersion.VERSION_17; targetCompatibility = JavaVersion.VERSION_17 }
    kotlinOptions { jvmTarget = "17" }
}
dependencies {
    implementation("androidx.appcompat:appcompat:1.7.0")
    implementation("androidx.activity:activity-ktx:1.9.2")
    implementation("androidx.core:core-ktx:1.13.1")
    implementation("androidx.webkit:webkit:1.11.0")
    implementation("androidx.media3:media3-exoplayer:1.4.1")
    implementation(platform("com.google.firebase:firebase-bom:33.5.1"))
    implementation("com.google.firebase:firebase-messaging")
}
