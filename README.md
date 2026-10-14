# ดัมมี่ออนไลน์ 5 คน (Starter Project)

โปรเจกต์ตัวอย่างแบบ Full-stack: หน้าเว็บ + Node.js/Express + Socket.IO สำหรับห้องออนไลน์จริง  
ออกแบบเป็นเกมไพ่เล่นสนุก ไม่มีการเดิมพันหรือถอนเงินจริง

## โหมดฝึกซ้อม
- กด “เล่นคนเดียวกับบอท” เพื่อเริ่มเล่นได้ทันทีโดยไม่ต้องเปิด backend
- โหมดนี้แจกไพ่ให้ผู้เล่น 1 คนและบอท 4 ตัว พร้อมจั่ว/ทิ้งไพ่และผลัดตาอัตโนมัติ
- การลงชุดไพ่และการตรวจจับผู้ชนะยังเป็นงานที่ต้องพัฒนาต่อ

## ต้องมี
- Node.js 18+ (แนะนำ 20+)
- npm
- สำหรับ deploy จริง: เซิร์ฟเวอร์ที่รองรับ WebSocket เช่น Render/Railway/Fly.io และ URL สำหรับ frontend เช่น GitHub Pages/Netlify
- GitHub Pages ใช้ได้เฉพาะ frontend; **ไม่สามารถรัน backend Socket.IO ได้**

## เริ่มเล่นในเครื่อง
เปิด terminal 2 หน้าต่าง

### 1) Backend
```bash
cd server
npm install
npm start
```
Backend จะเปิดที่ `http://localhost:3000`

### 2) Frontend
เปิดไฟล์ `client/public/index.html` ผ่าน Live Server หรือรัน:
```bash
cd client
npm install
npm run dev
```
จากนั้นเปิด URL ที่ Vite แสดงให้ (ปกติ `http://localhost:5173`) โดย Vite จะให้บริการไฟล์จาก `client/public/`

ค่าเริ่มต้นเชื่อม backend ที่ `http://localhost:3000`. ถ้า deploy ให้แก้ `client/public/config.js` เป็น URL backend ของคุณ

## ฟีเจอร์ใน starter นี้
- สร้าง/เข้าห้องด้วยรหัส, ห้องละไม่เกิน 5 คน
- ซิงก์สถานะห้องด้วย Socket.IO
- แจกไพ่เริ่มต้น 7 ใบต่อคน (จำนวนไพ่/กติกาจริงอาจแตกต่างตามกติกากลุ่ม)
- จั่วจากกองหรือหยิบใบบนกองทิ้ง และทิ้งไพ่
- ตรวจชุดเบื้องต้น: ไพ่เรียงดอกเดียวกัน หรือเลขเดียวกันคนละดอก
- เหรียญฟรีแบบ local demo และร้านสกินไพ่
- Assets แยกไฟล์ใน `client/public/assets/`

## ข้อจำกัดสำคัญก่อนเปิดให้ผู้เล่นทั่วไป
นี่คือ **ต้นแบบที่รันได้** ไม่ใช่ระบบ production สำเร็จรูป:
- กติกาดัมมี่ไทยมีรายละเอียดหลายแบบ ควรให้ผู้เล่นยืนยันกติกาที่ใช้ก่อนเปิดจริง
- บัญชีผู้เล่น/เหรียญ/ไอเทมในตัวอย่างยังเป็นข้อมูลในหน่วยความจำของเซิร์ฟเวอร์และ localStorage ฝั่ง client; รีสตาร์ต backend แล้วห้องหาย
- ยังไม่มีระบบยืนยันตัวตน, ฐานข้อมูลถาวร, anti-cheat, rate limit, reconnect recovery หรือระบบชำระเงินจริง
- ปุ่มเติมเงินในเดโมไม่ตัดเงินจริง หากจะรับเงินจริงต้องต่อ payment gateway ที่ถูกต้อง ตรวจ webhook ฝั่ง server และไม่เชื่อราคาที่ส่งจาก browser
- ห้ามใช้เหรียญที่ซื้อด้วยเงินจริงเป็นชิปเดิมพันหรือเปิดระบบ cash-out โดยไม่ตรวจข้อกฎหมายที่เกี่ยวข้อง

## Deploy แบบย่อ
1. Push repository นี้ขึ้น GitHub
2. Deploy `server/` ไป Render/Railway เป็น Node Web Service, ตั้ง root directory เป็น `server`, build command `npm install`, start command `npm start`
3. ตั้งค่า CORS origin ใน `server/src/index.js` ให้เป็นโดเมน frontend ของคุณ
4. ตั้งค่า `client/public/config.js` ให้ `BACKEND_URL` เป็น HTTPS URL ของ backend
5. Deploy `client/public/` เป็น static site (GitHub Pages/Netlify) หรือใช้ Vite build
6. ทดสอบผู้เล่น 5 คนจากอุปกรณ์/เครือข่ายต่างกันก่อนเผยแพร่จริง

## โครงสร้าง
```text
dummy-online-5p/
  client/
    index.html
    package.json
    public/
      index.html
      config.js
      style.css
      app.js
      assets/
        logo.png
        README.md
  server/
    package.json
    src/index.js
```
