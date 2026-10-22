# ฐานข้อมูลผู้เล่น (Supabase) — Dummy Online

เก็บต่อบัญชีผู้เล่น: เหรียญเดิมพัน · **MCash** (เหรียญเติมเงิน) · ผลแพ้/ชนะ/จำนวนครั้งที่เล่น **แยกตามเกม** · วันเวลาล็อกอินล่าสุด · จำนวนวันล็อกอินติดต่อกัน · ของที่ซื้อจากร้านค้า · เควสรายวัน/สัปดาห์ · เกมที่เล่นล่าสุด · ดาวของตัวละคร

## ตั้งค่าครั้งแรก (ทำครั้งเดียว)
1. **Supabase → Authentication → Providers → Email** : ปิด **Confirm email** (ผู้เล่นสมัครด้วย "ชื่อผู้ใช้" ระบบสร้างอีเมลภายในให้ `<ชื่อ>@example.com` — เปลี่ยนโดเมนได้ที่ `AUTH_EMAIL_DOMAIN` ใน `client/public/config.js`)
2. **SQL Editor** : วางและรัน `supabase/schema.sql` ทั้งไฟล์ แล้วตามด้วย `supabase/seed_catalog.sql` (รันซ้ำได้ ปลอดภัย)
3. **เซิร์ฟเวอร์เกม (Render)** : ตั้ง Environment ตาม `server/.env.example` (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SECRET_KEY`) แล้ว deploy ใหม่ — รันในเครื่องใช้ `server/.env` (ตั้งไว้ให้แล้ว)
4. **client** : ค่า URL/publishable key อยู่ใน `client/public/config.js` แล้ว (สร้างจาก `client/.env` ด้วย `node scripts/apply-env.js`)

> ⚠️ `SUPABASE_SECRET_KEY` (`sb_secret_...`) ใช้ได้ที่เซิร์ฟเวอร์เท่านั้น — ห้ามใส่ใน client/GitHub. เพราะเคยแปะในแชท แนะนำให้ **Rotate** คีย์ใน Supabase (Settings → API Keys) แล้วใส่คีย์ใหม่ที่ `server/.env` และ Render

## หลักการทำงาน (กันโกง)
- ผู้เล่น **อ่านข้อมูลตัวเองได้** แต่ **เขียนตรง ๆ ไม่ได้** (RLS) — ทุกการเปลี่ยนค่าผ่านฟังก์ชันที่ตรวจในฐานข้อมูล: `buy_item`, `upgrade_star`, `claim_login_reward`, `claim_quest` ฯลฯ
- **ผลเกม/เหรียญ** บันทึกโดยเซิร์ฟเวอร์เกมด้วย secret key (`record_game_result`) หลังตาจบ — client ส่งยอดเหรียญเองไม่ได้ · กันบันทึกซ้ำด้วย `gid`
- เซิร์ฟเวอร์เกมตรวจ access token ทุกการเชื่อมต่อ และใช้ชื่อจากฐานข้อมูล
- "วัน" นับตามเวลาไทย · เควสรายวันรีเซ็ตเที่ยงคืน, รายสัปดาห์ทุกวันจันทร์ — **ไม่ต้องใช้ cron**: เควสผูกกับคีย์วัน/สัปดาห์ ช่วงใหม่เริ่มนับ 0 เอง และความคืบหน้าคำนวณจาก `game_log`

## ตาราง
| ตาราง | เก็บอะไร |
|---|---|
| `profiles` | ชื่อ/ฉายา · `coins` · `mcash` · `last_login_at` · `login_streak` · `best_streak` · `last_game` · ของที่ใส่อยู่ |
| `game_stats` | ต่อเกม: `plays` `wins` `losses` `draws` `coins_won` `coins_lost` |
| `game_log` | ทุกตาที่เล่นจบ (ใช้นับเควส + กันซ้ำ) |
| `inventory` | ของที่ซื้อจากร้านค้า (ราคา/สกุลเงิน/เวลา) · `shop_items` = รายการและราคาในร้าน |
| `user_characters` / `character_defs` | ดาวของตัวละครแต่ละคน / ดาวสูงสุด ราคาอัพดาว โบนัสเหรียญ |
| `login_days`, `login_rewards`, `login_milestones` | ประวัติล็อกอิน+การรับรางวัล / รางวัลรอบ 7 วัน / โบนัสล็อกอินติดต่อกัน (3,7,14,30,60,100 วัน) |
| `quest_defs`, `user_quests`, `quest_bonus` | เควสทั้งหมด / ที่รับรางวัลแล้ว / โบนัสครบทุกเควส |
| `wallet_ledger` | สมุดบัญชีเหรียญและ MCash ทุกการเปลี่ยนแปลง |

## ระบบล็อกอินรายวัน
`record_login()` ทุกครั้งที่เปิดเกม: ถ้าเป็นวันใหม่ — เมื่อวานล็อกอิน `streak+1`, ขาดวัน `streak=1` · แล้วผู้เล่นกด `claim_login_reward()` รับรางวัลของวันที่ N ในรอบ 7 วัน (`login_rewards`) + โบนัสเมื่อ streak ถึงหลักที่ตั้งใน `login_milestones` · แก้รางวัลได้ที่ตารางเหล่านี้ใน Table Editor

## แก้ราคา/เพิ่มของ/แก้ค่าตัวละคร
1. แก้ `client/public/skin/skins.json` (ร้านค้า — ใส่ `"mcash": 50` ถ้าจะขายด้วย MCash) และ/หรือ `skills.json` ผ่าน `client/public/skin/skill-studio.html`
2. `node scripts/gen-catalog-sql.js` → รัน `supabase/seed_catalog.sql` ใหม่ใน SQL Editor (หรือกด "คัดลอก SQL" ใน Skill Studio สำหรับเฉพาะค่าตัวละคร)

## เติม MCash
ยังไม่มีหน้าชำระเงิน — เมื่อต่อระบบจ่ายเงิน ให้ webhook ฝั่งเซิร์ฟเวอร์เรียก `grant_mcash(user_id, amount, payment_ref)` ด้วย secret key (เรียกซ้ำด้วย `payment_ref` เดิมไม่เพิ่มซ้ำ) · ทดสอบมือ: `select public.grant_mcash('<uuid ผู้เล่น>', 100, 'test-1');`

## ทดสอบ
- ฐานข้อมูล (ต้องมี PostgreSQL ในเครื่อง): `PGHOST=... PGUSER=... sh supabase/test/run.sh` — สร้าง DB ชั่วคราวจำลอง Supabase แล้วรัน `test.sql`
- เซิร์ฟเวอร์: `cd server && node test-supabase.js` · หน้าเว็บ: `node client/test/e2e.js` (Playwright + Supabase จำลอง)
