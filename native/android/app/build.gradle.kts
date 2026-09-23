plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
    id("org.jetbrains.kotlin.plugin.compose")
    id("org.jetbrains.kotlin.plugin.serialization")
}

android {
    namespace = "art.lazying.auspice"
    compileSdk = 36

    defaultConfig {
        applicationId = "art.lazying.auspice"
        minSdk = 26
        targetSdk = 36
        versionCode = 1
        versionName = "0.1.0"
    }

    signingConfigs {
        create("upload") {
            val store = file(System.getenv("AUSPICE_KEYSTORE") ?: "${System.getProperty("user.home")}/.config/lazyoracle/android/upload-keystore.jks")
            if (store.exists()) {
                val secret = file("${System.getProperty("user.home")}/.config/lazyoracle/android/upload-keystore.password")
                    .takeIf { it.exists() }?.readText()?.trim() ?: ""
                storeFile = store
                storePassword = secret
                keyAlias = System.getenv("AUSPICE_KEY_ALIAS") ?: "upload"
                keyPassword = secret
            }
        }
    }

    buildTypes {
        release {
            isMinifyEnabled = false
            signingConfig = signingConfigs.getByName("upload")
        }
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
    kotlinOptions { jvmTarget = "17" }
    buildFeatures { compose = true; buildConfig = true }
    sourceSets["main"].java.srcDirs("src/main/kotlin")
    packaging { resources.excludes += "/META-INF/{AL2.0,LGPL2.1}" }
}

dependencies {
    val composeBom = platform("androidx.compose:compose-bom:2025.09.00")
    implementation(composeBom)
    implementation("androidx.compose.ui:ui")
    implementation("androidx.compose.ui:ui-graphics")
    implementation("androidx.compose.material3:material3")
    implementation("androidx.compose.material:material-icons-extended")
    implementation("androidx.activity:activity-compose:1.10.1")
    implementation("androidx.navigation:navigation-compose:2.8.9")
    implementation("androidx.lifecycle:lifecycle-runtime-compose:2.8.7")

    // The shared rules run here: a JavaScript sandbox with no DOM and no
    // network, the Android counterpart of JavaScriptCore on iOS.
    implementation("androidx.javascriptengine:javascriptengine:1.0.0-beta01")
    implementation("androidx.concurrent:concurrent-futures-ktx:1.2.0")

    implementation("org.jetbrains.kotlinx:kotlinx-serialization-json:1.7.3")
    implementation("com.squareup.okhttp3:okhttp:4.12.0")

    // Camera and the same landmark models the iOS app and the web app use.
    implementation("androidx.camera:camera-camera2:1.4.1")
    implementation("androidx.camera:camera-lifecycle:1.4.1")
    implementation("androidx.camera:camera-view:1.4.1")
    implementation("com.google.mediapipe:tasks-vision:0.10.21")
}
