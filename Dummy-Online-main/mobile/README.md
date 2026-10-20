# แอป Android (APK) — Dummy Online

ห่อหน้าเว็บใน `client/public/` ด้วย [Capacitor](https://capacitorjs.com) เป็นแอป Android แล้วให้ **GitHub Actions** คอมไพล์ให้ (ไม่ต้องลง Android Studio)

## วิธีได้ไฟล์ .apk
1. push โค้ดขึ้น GitHub (workflow รันเองเมื่อแก้ `client/public/` หรือ `mobile/`) หรือเข้า **Actions → Build Android APK (Dummy Online) → Run workflow**
2. รอราว 5–10 นาที จนขึ้นเครื่องหมายถูกสีเขียว
3. โหลด APK จากหน้า **Releases** ของ repo (แท็ก `android-<เลขรอบ>`) หรือจาก **Artifacts** ของ run นั้น
4. ส่งไฟล์เข้าโทรศัพท์ → เปิดไฟล์ → อนุญาต "ติดตั้งจากแหล่งอื่น" → ติดตั้ง

> เป็น **debug APK** (เซ็นด้วยกุญแจ debug) ติดตั้งเล่นเองได้เลย ถ้าจะขึ้น Google Play ต้องทำ release APK/AAB เซ็นด้วยกุญแจของคุณเอง (ยังไม่ได้ทำ)

## ตั้งที่อยู่เซิร์ฟเวอร์
แอปต่อเซิร์ฟเวอร์เกมผ่านอินเทอร์เน็ต (ต้องมีเน็ตเพื่อเล่น) ลำดับการเลือก URL:
1. ช่อง **backend_url** ตอนกด Run workflow
2. repo variable `BACKEND_URL` (Settings → Secrets and variables → Actions → **Variables**)
3. ค่าใน `client/public/config.js`

เซิร์ฟเวอร์ (`server/src/index.js`) อนุญาต origin ของแอป (`https://localhost`, `capacitor://localhost`) ไว้เสมอ แม้ตั้ง `CLIENT_ORIGIN` เจาะจงเว็บ — **ต้อง deploy เซิร์ฟเวอร์เวอร์ชันนี้** ถ้าเซิร์ฟเวอร์ที่ Render ยังเป็นรุ่นเก่าและตั้ง `CLIENT_ORIGIN` ไว้ ให้เพิ่ม `https://localhost` ต่อท้ายในค่านั้นเอง

## ที่แอปทำเพิ่มจากเว็บ
- ปุ่ม Back ของเครื่อง: ปิดหน้าต่างเลือกไพ่ → ถามก่อนออกจากห้อง → ย้อนหน้า → ที่หน้าแรกปิดแอป (`client/public/native.js`)
- แพ็ก `socket.io` ไว้ในแอป ไม่พึ่ง CDN
- ไอคอนแอปจากตัวละคร (`mobile/res/` สร้างใหม่ได้ ดูหัวข้อด้านล่าง)
- เลขเวอร์ชันในแอป = `client/public/version.js` (versionCode = เลขรอบของ workflow)

## ทดสอบขั้นเตรียมไฟล์ในเครื่อง (ไม่ต้องมี Android SDK)
```bash
cd mobile && npm install && cd ..
BACKEND_URL=https://your-server.onrender.com node mobile/prepare.js www   # ได้โฟลเดอร์ mobile/www
```
สร้าง APK จริงต้องมี JDK 17 + Android SDK: `cd mobile && npx cap add android && cd .. && node mobile/prepare.js android && cd mobile && npx cap sync android && cd android && ./gradlew assembleDebug`

## เปลี่ยนไอคอน
แก้ภาพต้นฉบับแล้วสร้างไฟล์ใน `mobile/res/mipmap-*/` (`ic_launcher.png`, `ic_launcher_round.png`, `ic_launcher_foreground.png`) และสีพื้นหลังใน `mobile/res/values/ic_launcher_background.xml`

## ข้อจำกัด
- ยังไม่ได้ลองบนเครื่องจริง/ยังไม่เคยรัน workflow นี้บน GitHub — ถ้ารอบแรก build ล้มเหลว ให้ส่งข้อความ error ในแท็บ Actions มาแก้ต่อ
- หน้าเว็บบนแอปมองเห็นการแก้ `client/public/` ผ่านการสร้าง APK ใหม่เท่านั้น (ไม่อัปเดตสดเหมือนเว็บ)
