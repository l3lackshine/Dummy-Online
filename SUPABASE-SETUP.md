# ตั้งค่า Supabase (เฟส 1: ล็อกอิน · เหรียญ · ร้านค้า · ประวัติแพ้/ชนะ)

## ภาพรวม
```
เบราว์เซอร์/แอป ──ล็อกอิน (อีเมล+รหัสผ่าน)──▶ Supabase Auth ──▶ access_token
      │                                                          │
      └── socket: auth:token ──▶ เซิร์ฟเวอร์เกม (ตรวจโทเคนกับ Supabase, ผูก userId กับผู้เล่น)
                                   │  ใช้ service_role key (เก็บเป็นความลับบน Render เท่านั้น)
                                   ▼
                      Postgres: profiles · shop_items · purchases · matches · match_players · coin_ledger
```
- **เหรียญ/ของที่ซื้อ/ผลเกมเป็นของเซิร์ฟเวอร์ทั้งหมด** client แก้ไม่ได้ (RLS ห้าม client เขียน; การเขียนทำผ่านฟังก์ชัน SQL ที่เรียกได้เฉพาะ service_role)
- ราคาสินค้าอ่านจากตาราง `shop_items` (สร้างจาก `skins.json`) ไม่ใช่ราคาที่ client ส่งมา
- จบตาแล้ว `settle(room)` ใน `server/src/index.js` เรียก `settle_match()` ครั้งเดียวต่อเกม (`gid` ซ้ำ = ไม่จ่ายซ้ำ)

## ขั้นตอน
1. **สร้างโปรเจกต์** ที่ supabase.com
2. **สร้างตาราง**: SQL Editor → รันทั้งไฟล์ `supabase/migrations/20261021000000_phase1_accounts_wallet_shop_matches.sql`
3. **ใส่รายการสินค้า**: รันไฟล์ `supabase/seed_shop.sql` (เปลี่ยนราคา/เพิ่มสกินใน `skins.json` แล้ว `node scripts/gen-shop-sql.js` เพื่อสร้างไฟล์ใหม่ รันซ้ำได้ปลอดภัย)
4. **ตั้งค่าอีเมล**: Authentication → Providers → Email · ตอนทดสอบจะปิด *Confirm email* ก็ได้ (ถ้าเปิด ผู้สมัครต้องกดลิงก์ในอีเมลก่อนเข้าสู่ระบบ)
5. **Render (Backend)** → Environment เพิ่ม
   - `SUPABASE_URL` = Project URL (Project Settings → API)
   - `SUPABASE_SERVICE_ROLE_KEY` = `service_role` key — **ความลับ ห้ามใส่ในโค้ด/client/GitHub**
   
   แล้ว Deploy ใหม่ (Build: `npm install` จะติดตั้ง `@supabase/supabase-js`) เปิด `https://<backend>/health` ต้องเห็น `"db":"supabase"` (ถ้าเห็น `"memory"` แปลว่า env ยังไม่ถูกอ่าน)
6. **Client** → แก้ `client/public/config.js`
   ```js
   SUPABASE_URL: 'https://xxxx.supabase.co',
   SUPABASE_ANON_KEY: 'eyJ...'   // anon public key (เปิดเผยได้) ไม่ใช่ service_role
   ```
   แอป Android: ตั้ง repo variables `SUPABASE_URL` และ `SUPABASE_ANON_KEY` (Settings → Secrets and variables → Actions → Variables) เหมือน `BACKEND_URL`
7. **ลอง**: โปรไฟล์ → สมัครสมาชิก/เข้าสู่ระบบ → ซื้อของ → เล่นให้จบหนึ่งตา แล้วดูใน SQL Editor
   ```sql
   select * from matches order by ended_at desc limit 5;
   select m.gid, p.seat, p.name, p.delta, p.applied, p.won from match_players p join matches m using (gid) order by m.ended_at desc limit 12;
   select name, coins, games, wins from profiles;
   select * from coin_ledger order by id desc limit 10;   -- เหรียญทุกการเปลี่ยนแปลงมีที่มา (grant/shop/match)
   ```

## พฤติกรรมที่ควรรู้
- **แขก (ไม่ล็อกอิน)** เล่นได้เหมือนเดิม เหรียญเก็บใน localStorage ของเครื่อง **ไม่ย้ายเข้าบัญชี** (ย้ายไม่ได้อย่างปลอดภัย เพราะแก้ค่าในเครื่องเองได้) บัญชีใหม่เริ่มที่ 5000 เหรียญ
- **บัญชีที่ล็อกอิน**: ชื่อในห้องใช้ชื่อบัญชี, ใช้ตัวละคร/พื้นหลังได้เฉพาะที่ซื้อแล้ว, เปลี่ยนบัญชีหรือออกจากระบบกลางห้องไม่ได้
- **ตาที่มีแต่แขก/บอท** ไม่ถูกบันทึก · คนที่หลุดกลางเกมแล้วบอทเล่นแทน ยังได้รับ/เสียเหรียญตามผลจริง
- ยอดเหรียญไม่ติดลบ: ถ้าแพ้เกินที่มี หักได้เท่าที่มี (`match_players.applied`) ส่วนผลตามกติกาเก็บไว้ที่ `delta`
- `matches.humans` = จำนวนผู้เล่นจริงต่อตา เตรียมไว้ให้เฟสแรงค์นับเฉพาะตาที่มีคนจริง ≥ 2 (กันฟาร์มแต้มกับบอท)
- **ยังไม่ทำ (เฟส 3)**: **รางวัลเควส · อัปสกิล · โบนัสเหรียญจากสกิล** ยังเป็นระบบในเครื่อง จึง **ปิดสำหรับบัญชีที่ล็อกอิน** (แสดงข้อความ "เร็วๆ นี้") เพื่อไม่ให้เหรียญเพี้ยนจากเซิร์ฟเวอร์ แขกใช้ได้ตามเดิม
- ถ้าเขียน DB ไม่สำเร็จ เซิร์ฟเวอร์ลองใหม่ 4 ครั้ง (1s, 3s, 9s) ถ้ายังไม่สำเร็จจะพิมพ์ `SETTLE_LOST {json}` ในล็อก — เอา JSON นั้นไปรันซ้ำได้ปลอดภัย:
  ```sql
  select public.settle_match('{...วาง JSON ตรงนี้...}'::jsonb);
  ```
  (ถ้า Render restart ระหว่างลองใหม่ ผลตานั้นจะหาย — ยังไม่มีคิวถาวร)

## ทดสอบ
`cd server && npm test` — เพิ่ม `test-db.js` (ชั้นข้อมูล), `test-account.js` (ฝั่งเซิร์ฟเวอร์ทั้งเส้นทาง), `test-client-account.js` (client จริงล็อกอิน→ซื้อ→เล่นจบ)
ชุดเทสต์ใช้ที่เก็บแบบหน่วยความจำและ Supabase ปลอม — **ยังไม่เคยทดสอบกับ Supabase จริง** ให้ทำขั้นตอน 7 ด้านบนหลัง deploy ก่อนเปิดให้ผู้เล่นจริง
