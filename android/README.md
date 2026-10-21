# Dummy Dummy — แอป Android

เปลือก WebView ที่แพ็กหน้าเกมจาก `client/public/` ไว้ในแอป (ผ่าน `WebViewAssetLoader`)
ส่วนการเล่นออนไลน์เชื่อมต่อเซิร์ฟเวอร์ตาม `BACKEND_URL` ใน `client/public/config.js`

## ได้ไฟล์ APK ยังไง
1. อัปโค้ดขึ้น GitHub (branch ที่ใช้งาน)
2. ไปที่ **Actions → Build Dummy Dummy APK → Run workflow** (หรือจะรอให้รันเองตอน push ไฟล์ใน `client/public/` / `android/`)
3. เสร็จแล้วโหลด `.apk` ได้ที่หน้า **Releases** ของ repo (หรือ Artifacts ของ run นั้น) แล้วติดตั้งบนมือถือ (อนุญาต "ติดตั้งจากแหล่งอื่น")

## ค่าที่แก้ได้
- ชื่อเกม: `app/src/main/res/values/strings.xml` (`app_name`)
- ไอคอน: `app/src/main/res/drawable-nodpi/ic_launcher_foreground.png` (ตัวละคร) และ `ic_launcher_background.png` (พื้นหลัง) ขนาด 432×432
- ไอคอนต้นฉบับสร้างจาก `client/public/skin/characters/girl.webp`
- รหัสแอป: `com.dummyonline.dummydummy`
- เลขรุ่น: workflow ใส่ให้อัตโนมัติตามเลข run (ติดตั้งทับรุ่นเก่าได้)

## การเซ็นไฟล์
`app/dummydummy.jks` เป็น keystore สำหรับใช้ส่วนตัว (รหัสอยู่ใน `app/build.gradle.kts`) ทำให้ทุกรุ่นเซ็นด้วยกุญแจเดียวกันและอัปเดตทับกันได้
ถ้าจะขึ้น Google Play ให้สร้าง keystore ของตัวเองและเก็บเป็นความลับ

## build เองในเครื่อง
```bash
(cd client && npm ci --omit=dev)
bash scripts/prepare-android-web.sh
gradle -p android :app:assembleRelease
```
