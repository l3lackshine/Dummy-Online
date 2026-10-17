package com.dummyonline.skinstudio

import android.annotation.SuppressLint
import android.app.Activity
import android.content.Intent
import android.graphics.Color
import android.net.Uri
import android.os.Bundle
import android.webkit.ValueCallback
import android.webkit.WebChromeClient
import android.webkit.WebResourceRequest
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient

/**
 * เปลือกแอป: แสดงหน้าเว็บใน assets/ (index.html) ด้วย WebView
 * ตรรกะทั้งหมด (จัดการสกิน/ร้านค้า/อัปโหลดขึ้น GitHub) อยู่ใน core.js + app.js
 */
class MainActivity : Activity() {

    private lateinit var web: WebView
    private var chooser: ValueCallback<Array<Uri>>? = null

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        window.statusBarColor = Color.parseColor("#12151f")
        window.navigationBarColor = Color.parseColor("#0e111a")

        web = WebView(this)
        web.setBackgroundColor(Color.parseColor("#12151f"))
        setContentView(web)

        web.settings.apply {
            javaScriptEnabled = true
            domStorageEnabled = true
            allowFileAccess = true
            allowContentAccess = true
            mixedContentMode = WebSettings.MIXED_CONTENT_NEVER_ALLOW
        }

        web.webViewClient = object : WebViewClient() {
            override fun shouldOverrideUrlLoading(view: WebView, request: WebResourceRequest): Boolean {
                val url = request.url
                if (url.scheme == "file") return false
                // ลิงก์ภายนอก (เช่น หน้า commit บน GitHub) เปิดในเบราว์เซอร์
                try {
                    startActivity(Intent(Intent.ACTION_VIEW, url))
                } catch (_: Exception) {
                }
                return true
            }
        }

        web.webChromeClient = object : WebChromeClient() {
            override fun onShowFileChooser(
                webView: WebView,
                filePathCallback: ValueCallback<Array<Uri>>,
                fileChooserParams: FileChooserParams
            ): Boolean {
                chooser?.onReceiveValue(null)
                chooser = filePathCallback
                return try {
                    startActivityForResult(fileChooserParams.createIntent(), REQ_PICK)
                    true
                } catch (e: Exception) {
                    chooser = null
                    false
                }
            }
        }

        web.loadUrl("file:///android_asset/index.html")
    }

    @Deprecated("Deprecated in Java")
    override fun onActivityResult(requestCode: Int, resultCode: Int, data: Intent?) {
        if (requestCode == REQ_PICK) {
            chooser?.onReceiveValue(WebChromeClient.FileChooserParams.parseResult(resultCode, data))
            chooser = null
        } else {
            super.onActivityResult(requestCode, resultCode, data)
        }
    }

    @Deprecated("Deprecated in Java")
    override fun onBackPressed() {
        // ให้หน้าเว็บจัดการปุ่มย้อนกลับก่อน (ปิดหน้าต่างย่อย / กลับแท็บร้านค้า) ถ้าไม่มีอะไรให้ย้อนค่อยออกจากแอป
        web.evaluateJavascript("(window.__back && window.__back()) === true") { result ->
            if (result != "true") finish()
        }
    }

    companion object {
        private const val REQ_PICK = 4101
    }
}
