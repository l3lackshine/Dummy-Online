# ฐานข้อมูลผู้เล่น (Supabase) — Dummy Online

เก็บต่อบัญชีผู้เล่น: เหรียญเดิมพัน · **MCash** (เหรียญเติมเงิน) · ผลแพ้/ชนะ/จำนวนครั้งที่เล่น **แยกตามเกม** · วันเวลาล็อกอินล่าสุด · จำนวนวันล็อกอินติดต่อกัน · ของที่สุ่มได้จากกาชา · เควสรายวัน/สัปดาห์ · เกมที่เล่นล่าสุด · ดาวของตัวละคร

## ตั้งค่าครั้งแรก (ทำครั้งเดียว)
1. **Supabase → Authentication → Providers → Email** : ปิด **Confirm email** (ผู้เล่นสมัครด้วย "ชื่อผู้ใช้" ระบบสร้างอีเมลภายในให้ `<ชื่อ>@example.com` — เปลี่ยนโดเมนได้ที่ `AUTH_EMAIL_DOMAIN` ใน `client/public/config.js`)
2. **SQL Editor** : วางและรัน `supabase/name_filter.sql` (ตัวตรวจชื่อ) ตามด้วย `supabase/schema.sql` ทั้งไฟล์ แล้วตามด้วย `supabase/seed_catalog.sql` (รันซ้ำได้ ปลอดภัย)
   แล้วรันต่อตามลำดับนี้ (Beta 0.6 ขึ้นไป): `supabase/v6_progression.sql` → `supabase/v7_stamina.sql` → `supabase/v7_config.sql` → `supabase/bp_seed.sql`
   - v6 = รางวัลตามอันดับ/เลเวลผู้เล่น/แบทเทิลพาส · v7 = สตามิน่า/ชา/ฟาร์มกับบอท/เลเวลตัวละคร · v7_config = ตัวเลขจาก economy.js · bp_seed = ข้อมูลฤดูแบทเทิลพาส
   - **รัน v6 ซ้ำเมื่อไหร่ ต้องรัน v7 ตามทุกครั้ง** (v7 แทนที่ฟังก์ชันบันทึกผลเกมของ v6) · แก้ตัวเลขใน economy.js แล้ว `node scripts/gen-economy-sql.js` · แก้ฤดูแล้ว `node scripts/gen-bp-sql.js`
   - รัน SQL ให้เสร็จก่อนอัปโค้ดเซิร์ฟเวอร์ใหม่ (เซิร์ฟเวอร์ใหม่ส่งค่าที่ฐานข้อมูลเก่าไม่รู้จัก)
3. **เซิร์ฟเวอร์เกม (Render)** : ตั้ง Environment ตาม `server/.env.example` (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SECRET_KEY`) แล้ว deploy ใหม่ — รันในเครื่องใช้ `server/.env` (ตั้งไว้ให้แล้ว)
4. **client** : ค่า URL/publishable key อยู่ใน `client/public/config.js` แล้ว (สร้างจาก `client/.env` ด้วย `node scripts/apply-env.js`)

> ⚠️ `SUPABASE_SECRET_KEY` (`sb_secret_...`) ใช้ได้ที่เซิร์ฟเวอร์เท่านั้น — ห้ามใส่ใน client/GitHub. เพราะเคยแปะในแชท แนะนำให้ **Rotate** คีย์ใน Supabase (Settings → API Keys) แล้วใส่คีย์ใหม่ที่ `server/.env` และ Render

## หลักการทำงาน (กันโกง)
- ผู้เล่น **อ่านข้อมูลตัวเองได้** แต่ **เขียนตรง ๆ ไม่ได้** (RLS) — ทุกการเปลี่ยนค่าผ่านฟังก์ชันที่ตรวจในฐานข้อมูล: `gacha_pull`, `sell_dupes`, `upgrade_star`, `claim_login_reward`, `claim_quest` ฯลฯ
- **ผลเกม/เหรียญ** บันทึกโดยเซิร์ฟเวอร์เกมด้วย secret key (`record_game_result`) หลังตาจบ — client ส่งยอดเหรียญเองไม่ได้ · กันบันทึกซ้ำด้วย `gid`
- เซิร์ฟเวอร์เกมตรวจ access token ทุกการเชื่อมต่อ และใช้ชื่อจากฐานข้อมูล
- "วัน" นับตามเวลาไทย · เควสรายวันรีเซ็ตเที่ยงคืน, รายสัปดาห์ทุกวันจันทร์ — **ไม่ต้องใช้ cron**: เควสผูกกับคีย์วัน/สัปดาห์ ช่วงใหม่เริ่มนับ 0 เอง และความคืบหน้าคำนวณจาก `game_log`

## ตาราง
| ตาราง | เก็บอะไร |
|---|---|
| `profiles` | ชื่อ/ฉายา · `coins` · `mcash` · `last_login_at` · `login_streak` · `best_streak` · `last_game` · ของที่ใส่อยู่ |
| `game_stats` | ต่อเกม: `plays` `wins` `losses` `draws` `coins_won` `coins_lost` |
| `game_log` | ทุกตาที่เล่นจบ (ใช้นับเควส + กันซ้ำ) |
| `inventory` | ของที่มี: `qty` = จำนวน (ตัวแรก 1 + **ตัวซ้ำ** = qty−1) |
| `catalog_items`, `rarity_config` | รายการของทั้งหมด + ระดับความหายาก (common/rare/epic/legendary) + ราคารับซื้อตัวซ้ำ · `is_default` = ของเริ่มต้น ทุกคนมี |
| `gacha_banners`, `gacha_pool`, `gacha_pity`, `gacha_log` | ตู้กาชา+ราคา+การันตี / ของในตู้และน้ำหนักโอกาส / ตัวนับการันตีต่อผู้เล่น / ประวัติการสุ่ม |
| `user_characters` / `character_defs` | ดาวของตัวละครแต่ละคน / ดาวสูงสุด **จำนวนตัวซ้ำที่ใช้อัพดาว** โบนัสเหรียญ |
| `login_days`, `login_rewards`, `login_milestones` | ประวัติล็อกอิน+การรับรางวัล / รางวัลรอบ 7 วัน / โบนัสล็อกอินติดต่อกัน (3,7,14,30,60,100 วัน) |
| `quest_defs`, `user_quests`, `quest_bonus` | เควสทั้งหมด / ที่รับรางวัลแล้ว / โบนัสครบทุกเควส |
| `wallet_ledger` | สมุดบัญชีเหรียญและ MCash ทุกการเปลี่ยนแปลง |

## ระบบล็อกอินรายวัน
`record_login()` ทุกครั้งที่เปิดเกม: ถ้าเป็นวันใหม่ — เมื่อวานล็อกอิน `streak+1`, ขาดวัน `streak=1` · แล้วผู้เล่นกด `claim_login_reward()` รับรางวัลของวันที่ N ในรอบ 7 วัน (`login_rewards`) + โบนัสเมื่อ streak ถึงหลักที่ตั้งใน `login_milestones` · แก้รางวัลได้ที่ตารางเหล่านี้ใน Table Editor

## ระบบกาชา (แทนร้านค้า)
- **ไม่มีร้านค้าแล้ว** — ของทุกอย่าง (ตัวละคร/หลังไพ่/โต๊ะ/พื้นหลัง) ได้จากการสุ่ม · ตาราง `shop_items` และฟังก์ชัน `buy_item` ถูกลบเมื่อรัน schema.sql
- สุ่ม 1 หรือ 10 ครั้ง ด้วยเหรียญหรือ MCash (`gacha_pull`) · สุ่ม 10 ครั้งการันตี rare ขึ้นไป ≥1 ชิ้น · **pity**: สุ่มไม่ได้ legendary ครบ N ครั้ง (ค่าเริ่มต้น 50) ครั้งถัดไปได้ legendary แน่นอน · หน้ากาชาแสดงอัตราการออกของทุกชิ้น
- **ได้ของซ้ำ**: ตัวละคร → ใช้ตัวซ้ำอัพดาว (`upgrade_star` ใช้ตัวซ้ำตาม `star_costs`/`game_config.star_copies` = 1,2,3,4 ตัว สำหรับดาว 1→2→3→4→5 ไม่เสียเหรียญ) · ของทุกชนิดขายตัวซ้ำเป็นเหรียญได้ (`sell_dupes`, เก็บไว้ 1 ชิ้นเสมอ ราคาตามระดับหายากใน `rarity_config`)
- ระดับความหายากกำหนดจากราคาเดิมใน `skins.json` (≥1500 legendary, ≥700 epic, ≥250 rare) หรือใส่ `"rarity": "epic"` / `"gacha": false` ในรายการ · ของ `price: 0` = ของเริ่มต้น (ทุกคนมี และยังสุ่มได้เพื่อเอาตัวซ้ำ)
- ปรับราคาสุ่ม/โอกาส/pity/ราคารับซื้อ/ตู้ใหม่ ที่ `client/public/skin/gacha.json` แล้วรัน `node scripts/gen-catalog-sql.js`

## แก้ราคา/เพิ่มของ/แก้ค่าตัวละคร
1. แก้ `client/public/skin/skins.json` (รายการของ) · `gacha.json` (ตู้/ราคา/โอกาส) และ/หรือ `skills.json` ผ่าน `client/public/skin/skill-studio.html`
2. `node scripts/gen-catalog-sql.js` → รัน `supabase/seed_catalog.sql` ใหม่ใน SQL Editor (หรือกด "คัดลอก SQL" ใน Skill Studio สำหรับเฉพาะค่าตัวละคร)

> ถ้ารัน schema.sql แล้วเจอ error จากตารางเก่าที่ชื่อชนกัน (คอลัมน์ไม่ตรง) และไม่มีข้อมูลผู้เล่นที่ต้องเก็บ ให้ลบตารางเกมเดิมทิ้งแล้วรันใหม่ (ระวัง: ลบข้อมูลผู้เล่น)

## เติม MCash
ยังไม่มีหน้าชำระเงิน — เมื่อต่อระบบจ่ายเงิน ให้ webhook ฝั่งเซิร์ฟเวอร์เรียก `grant_mcash(user_id, amount, payment_ref)` ด้วย secret key (เรียกซ้ำด้วย `payment_ref` เดิมไม่เพิ่มซ้ำ) · ทดสอบมือ: `select public.grant_mcash('<uuid ผู้เล่น>', 100, 'test-1');`

## ทดสอบ
- ฐานข้อมูล (ต้องมี PostgreSQL ในเครื่อง): `PGHOST=... PGUSER=... sh supabase/test/run.sh` — สร้าง DB ชั่วคราวจำลอง Supabase แล้วรัน `test.sql`
- เซิร์ฟเวอร์: `cd server && node test-supabase.js` · หน้าเว็บ: `node client/test/e2e.js` (Playwright + Supabase จำลอง)
