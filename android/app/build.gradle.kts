plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
}

// workflow ส่งเลขรุ่นเข้ามาเพื่อให้ติดตั้งทับรุ่นเก่าได้ (-PversionCode=… -PversionName=…)
val appVersionCode = (project.findProperty("versionCode") as String?)?.toIntOrNull() ?: 1
val appVersionName = (project.findProperty("versionName") as String?) ?: "1.0.0"

android {
    namespace = "com.dummyonline.dummydummy"
    compileSdk = 34

    defaultConfig {
        applicationId = "com.dummyonline.dummydummy"
        minSdk = 26
        targetSdk = 34
        versionCode = appVersionCode
        versionName = appVersionName
    }

    // ใช้ keystore ตัวเดียวกันทุกครั้ง เพื่อให้อัปเดตแอปทับของเดิมได้
    // (ถ้าจะขึ้น Google Play ให้สร้าง keystore ของตัวเองแล้วเก็บเป็นความลับ)
    signingConfigs {
        create("game") {
            storeFile = file("dummydummy.jks")
            storePassword = "dummydummy"
            keyAlias = "dummydummy"
            keyPassword = "dummydummy"
        }
    }

    buildTypes {
        release {
            isMinifyEnabled = false
            signingConfig = signingConfigs.getByName("game")
        }
        debug {
            signingConfig = signingConfigs.getByName("game")
        }
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
    kotlinOptions {
        jvmTarget = "17"
    }
}

dependencies {
    implementation("androidx.webkit:webkit:1.11.0")
}
