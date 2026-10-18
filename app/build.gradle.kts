plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
}
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
    buildTypes { release { isMinifyEnabled = false } }
    compileOptions { sourceCompatibility = JavaVersion.VERSION_17; targetCompatibility = JavaVersion.VERSION_17 }
    kotlinOptions { jvmTarget = "17" }
}
dependencies {
    implementation("androidx.appcompat:appcompat:1.7.0")
    implementation("androidx.activity:activity-ktx:1.9.2")
    implementation("androidx.core:core-ktx:1.13.1")
    implementation("androidx.webkit:webkit:1.11.0")
}
