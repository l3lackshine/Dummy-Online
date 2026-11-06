# WORKLOG — สมุดส่งต่องาน Dummy Online
> เรียงใหม่สุดไว้บน · ห้ามลบรายการเก่า · ทุกแชท/AI ต้องอ่านก่อนเริ่มและเขียนก่อนจบ (ดู CLAUDE.md หมวด 13)

## สถานะปัจจุบัน
- งานที่กำลังทำ: ไม่มี · **Beta 0.18.4 ขึ้นแล้ว** (ปุ่มหน้าแรกใหญ่ขึ้น · ช่องเก็บของตามเรท + ปุ่มขายตัวซ้ำ · อัปดาวดาวละ 1 ตัวซ้ำ · branch `ai/ui-inventory-hud-polish` merge เข้า main แบบ fast-forward · ฐานข้อมูลจริงอัป character_defs แล้ว · ดูรายการ 2026-11-06 21:40) · **Beta 0.18.3 ขึ้นแล้ว** (ล็อกอิน Google ไม่ขึ้นหมดอายุผิด · กลับเข้าเต็มจอด้วยแตะ 1 ครั้ง · หน้าต่าง "ออกจากห้อง?" ในเกม · หน้าโหลดตรวจเวอร์ชัน · ดูรายการ 2026-11-06 17:55) · **Beta 0.18.2 ขึ้นแล้ว** (หน้าต่างให้โหลดเกมใหม่เมื่อมีเวอร์ชันใหม่ + ด่านเวอร์ชันฝั่งเซิร์ฟเวอร์ `MIN_CLIENT_VERSION` ยังไม่ได้ตั้ง = ปิด · ดูรายการ 2026-11-06 17:30) · **Beta 0.18.1 ขึ้นแล้ว** (หน้าล็อกอิน 2 คอลัมน์ไม่ต้องเลื่อน · ดูรายการ 2026-11-06 16:55) · ก่อนหน้า **Beta 0.18.0** (ล็อกอินด้วย Google บนเว็บ + ตั้งชื่อครั้งแรก + ผูกบัญชีเดิม + หน้าล็อกอินกรอบซากุระ · branch `ai/account-google-login` merge เข้า main แบบ fast-forward · ดูรายการ 2026-11-06 16:50) · **ใช้จริงได้เมื่อเจ้าของตั้งค่า Google provider + Allow manual linking + Redirect URLs ที่ Supabase ครบ** · ก่อนหน้า: **Beta 0.17.2 ขึ้นแล้ว** (ป้ายชื่อ/ป้ายสถานะห้องรอแบบรูปใหม่ · branch `ai/lobby-plates` merge เข้า main แบบ fast-forward) · ก่อนหน้า **Beta 0.17.1** (กรอบ 4★) (กรอบประจำตัวละคร 4★ วาดจริง + ตัวละคร/ฉาก 5★ อยู่ในกรอบ · merge เข้า main แบบ fast-forward `43a7a11..9069c29`) · ก่อนหน้า: **Beta 0.17.0** (โรดแมพข้อ 11 ก–ง + ข้อ 12 · merge เข้า main แบบ fast-forward `b7a2245..7cf98fd`) · ฐานข้อมูลจริงรันถึง v18 แล้ว (2026-11-06 ~12:20) · แอดมินคนแรก = Blackshine02
- **เริ่มแชทใหม่ ทำตามลำดับนี้ได้เลย** (โรดแมพเต็มอยู่ที่ docs/ROADMAP.md)
- งานค้าง:
  1. ให้เจ้าของตรวจ 0.17.0 บนเว็บจริง (รอ Render/Cloudflare deploy เสร็จ): หน้าแอดมิน 7 แท็บ (ตู้กาชา · จดหมาย · ผู้เล่น · รายงาน) · ส่งจดหมายหาตัวเองแล้วกดรับ · ลองแตะป้ายชื่อผู้เล่นบนโต๊ะ (ต้องเป็นคนจริงที่ล็อกอิน 2 บัญชี)
- งานต่อไปตามโรดแมพ (เรียงลำดับ):
  1. ~~ข้อ 13 อัป Skill Studio~~ ยกเลิก — เจ้าของสั่งลบ Skill Studio ออกจากโปรเจค (แก้สกิลที่ `skills.json` ตรง)
  2. ก้อน 2 ที่รออยู่: ข้อ 3 ระบบเสียง (branch `sound` รอเสียงพากย์) · ข้อ 5 ของปลดดาวที่เหลือ: พื้นหลังใหม่ขายในตู้ · เสียงพากย์ 3★ (กรอบ 4★ เสร็จแล้วใน 0.17.1)
  3. ให้เจ้าของตรวจ 0.17.1 บนเว็บจริง: ห้องรอที่ใส่กรอบ 4★ + ปลด 5★ (มือถือแนวนอน)
  3. พักไว้: เตรียมลง Play Store (ยังไม่จ่ายค่าบัญชีนักพัฒนา)
- คำถามที่รอเจ้าของโปรเจคตอบ: (ว่าง)
- ข้อห้ามชั่วคราว: ไม่มี
- ของที่พักไว้: ระบบเสียงอยู่ใน branch `sound` (ยังไม่ merge · เลขเวอร์ชันในนั้นต้องเปลี่ยนตอนรวม) — รอเสียงพากย์ตัวละครแล้วอัปพร้อมกัน
- กับดักที่ควรรู้ก่อนเริ่ม: gacha_pull/_quest_progress ฉบับล่าสุดอยู่ใน `supabase/v17_events_admin.sql` · **get_gacha / _uid / delete_my_account ฉบับล่าสุดอยู่ใน `supabase/v18_admin_tools.sql`** (แก้ต่อจากไฟล์นี้) · ผู้ใช้ทดสอบใน supabase/test ใช้รหัสช่วง a–f · 170x · 180x ไปแล้ว · `npm install` จะแก้หัว `server/package-lock.json` เอง — อย่า commit ถ้าไม่ได้ตั้งใจ · ทุกครั้งที่อัปเกมต้องขึ้นเลขเวอร์ชัน + แพตช์โน้ต (patchnotes.json + docs/PATCHNOTES.md)

## รายการงาน (ใหม่สุดบน)

### 2026-11-06 21:40 · Claude (claude-opus-5-5) · ปุ่มหน้าแรก · ช่องเก็บของตามเรท · อัปดาว 1 ตัวซ้ำ · เอาปุ่ม HUD/แท็บคลังของออก
- คำสั่งที่ได้รับ (แนบภาพ 5 รูป): 1) ปุ่มร้านค้า/ช่องเก็บของหน้าแรกใหญ่ขึ้น 2) ช่องเก็บของ: ตัวละครอยู่กลาง · พื้นตามเรท Rare ม่วง / SR ทอง / SSR รุ้ง · ดาวที่ปลดเป็นสีเหลือง · อัปดาวทุกตัวดาวละ 1 ตัวซ้ำ 3) เอาปุ่ม 📜 🎁 บน HUD ออกทุกหน้า 4) หน้าบัตรโปรไฟล์ขยายตัวละคร หัวห้ามล้น 5) ลบปุ่มคลังของในหน้าร้านค้า
- branch: `ai/ui-inventory-hud-polish` (แตกจาก main `5efd829`) · commit `6456652` → `618594b` → `589da0e` → `9d1ef82` → `2f622f0` → `3dfd1c1` → commit WORKLOG นี้ · **ยังไม่ push**
- แก้:
  - `Code/Theme/sakura-kit.css` — `.rv-nav` ปุ่มกลม 7vh → 11vh · ปุ่มกว้าง 17vh · ป้าย 2.8vh · ระยะห่าง 1.6vh
  - `Code/Account/hud.css` — ต่อท้าย `.hud > .hud-q, .hud > .hud-dl { display: none }` (**ซ่อน ไม่ลบ** เพราะ home-rov.js อ่านตัวเลขเควสจาก `.hud-q i` ไปแสดงที่การ์ดเควสหน้าแรก)
  - `Code/Gacha/gacha.js` — ลบแถว `['inv', ...]` จากแถบแท็บ (invPanel/gcSell ยังอยู่ในไฟล์ แต่ไม่มีทางเข้าแล้ว)
  - `Code/Profile/profile-card.css` — `.pc-art` inset 1.5vh บน · `center top / auto 122%` (หัวอยู่ในกรอบ ปลายเท้าล้นล่างใต้แถบปุ่ม)
  - `Code/Inventory/inventory.js` — `RARITY_CLASS` · `loadPriceToRarity()` (fetch skin/gacha.json ครั้งเดียว) · `rarityFromCatalog()` (DB.G ตู้จริง) · `rarityFromPrice()` · `rarityClassOf()` · cell() ใส่คลาส r-rare/r-sr/r-ssr เฉพาะแท็บตัวละคร
  - `Code/Inventory/inventory.theme.css` — ต่อท้าย: `.iv-grid` เป็น flex wrap จัดกลาง (ช่อง 19vh · `align-content: safe center`) · พื้น `.pv-ch` ตามเรท (SSR รุ้งเลื่อน 6 วิ เคารพ reduced-motion) · ดาว `.iv-sk .ck-stars i.on` #f5b301
  - `client/public/skin/skills.json` — starCosts ทุกตัวละคร `[1]` → `[1,1,1,1]` · `supabase/seed_catalog.sql` สร้างใหม่ด้วย `node scripts/gen-catalog-sql.js` (เปลี่ยนเฉพาะแถว character_defs)
- สาเหตุเรื่องดาว: เดิม star_costs `{1}` ยาวแค่ 1 → ฐานข้อมูลใช้ 1 ตัวเฉพาะ 1→2 แล้วตกไปใช้ `game_config.star_copies` [1,2,3,4] (ต้อง 2/3/4 ตัว) แต่หน้าเว็บโชว์ "ตัวซ้ำ 1" ตลอด (ตัวเลขไม่ตรงกัน)
- ไม่ได้แตะ: `skills.json` defaults.starCosts [1,2,3,4] (ไม่มีตัวละครไหนใช้แล้ว) · game_config.star_copies · upgrade_star · เหรียญอัปดาว (star_coin_cost 500/1000/2000/4000 คงเดิม) · hud-buttons.js · quests-local.js · home-rov.js · Common ยังเป็นพื้นพีชเดิม
- ตรวจแล้ว: `node --check` inventory.js + gacha.js · check-handlers · build-assets --check · test-client-files · test-skills · test-skills-account · test-skin-ids · test-client (ผ่านทั้งหมด) · `supabase/test/run.sh` บน PostgreSQL จำลอง exit 0 · ลอง upgrade_star('arya-01') ในฐานจำลองด้วยตัวซ้ำ 4 ตัว → 1★→5★ ใช้ครั้งละ 1 (rollback) · Playwright 915×412 โหมดไม่ล็อกอิน (ข้าม pack ใช้รูปจาก assets-src เฉพาะในเครื่อง): หน้าแรก · ช่องเก็บของ (เรท/ดาว/จัดกลาง) · บัตรโปรไฟล์จำลองเทียบก่อน/หลัง
- ยังไม่ได้ทดสอบ: โหมดบัญชีจริง (หน้ากาชาไม่มีแท็บคลังของ · HUD ไม่มี 📜🎁 · เรทจาก DB.G) · มือถือจริง · บัตรโปรไฟล์กับข้อมูลจริง/ตัวละครอื่น
- สถานะ: เสร็จ (รอ push/merge)
- งานค้าง/ขั้นต่อไป: เจ้าของรัน `supabase/seed_catalog.sql` ใน SQL Editor · ขึ้นเวอร์ชัน + แพตช์โน้ตถ้าสั่งอัป
- คำถามที่รอตอบ: ตอบแล้ว 21:18 — "รัน sql ได้เลย · ย้ายปุ่มไปเลย · เสร็จแล้วอัปได้เลย"
- เพิ่มเติม 21:18–21:35:
  - ย้ายปุ่มขายตัวซ้ำ: commit `35ce63e` · `inventory.js` เพิ่ม `sellPriceOf()` (ราคาจาก DB.G: sell_coins ของตู้ ไม่งั้นตามเรท) · `ensureCatalog()` (เรียก DB.gacha() ครั้งเดียวถ้ายังไม่มี DB.G) · `sellSection()` (โหมดบัญชี + มีตัวซ้ำ + รู้ราคา) · `window.invSell(id, qty)` → `DB.sell` (ฐานข้อมูล sell_dupes ตัดสินจริง) · `inventory.theme.css` ต่อท้าย `.iv-sell` · ตรวจ: node --check · check-handlers · test-client-files · test-client · Playwright จำลองโหมดบัญชี (DB ปลอม): ปุ่มขึ้นที่ยูนะ ×58 · กด "ขาย 1" เรียก DB.sell 1 ครั้ง ตัวซ้ำ 57→56 · ยังไม่ได้ทดสอบ: ขายกับฐานข้อมูลจริง · หน้ากาชาโหมดบัญชีจริง (จำลองไม่ขึ้นเพราะ gacha.js ผูกตอนโหลด)
  - ฐานข้อมูลจริง (Supabase `apoayzrqkpouhbyexuwn`): รันเฉพาะคำสั่ง `insert into public.character_defs ... on conflict` จาก seed_catalog.sql (ส่วนเดียวที่ต่างจาก main · ค่าเดิมทั้ง 12 ตัวคือ `{1}` ตรงกับ seed เก่า) → ตรวจแล้วทุกตัวเป็น `{1,1,1,1}`
  - ขึ้น Beta 0.18.4: version.js + package.json 3 ตัว + patchnotes.json + PATCHNOTES.md · push branch + fast-forward main
  - ย้อนฐานข้อมูล: รันคำสั่งเดียวกันด้วย `'{1}'` (ค่าเดิม)
- วิธีย้อนกลับ: `git revert <commit>` ทีละเรื่องตามรายการ commit ด้านบน · หรือทิ้ง branch ถ้ายังไม่ merge · ฐานข้อมูล: รัน seed_catalog.sql ฉบับก่อนหน้า (`git show 5efd829:supabase/seed_catalog.sql`)
- ข้อควรระวัง: ปุ่ม 📜🎁 แค่ถูกซ่อน — ถ้าลบสคริปต์ hud-buttons.js/quests-local paintHud ต้องแก้ home-rov.js ให้นับเควสจาก `dummyQuests.claimable()` ก่อน · ตัวละครใหม่ต้องใส่ starCosts `[1,1,1,1]` เอง ไม่งั้นได้ค่า defaults [1,2,3,4]

### 2026-11-06 17:55 · Claude (claude-opus-5-5) · ล็อกอิน Google ขึ้น "ลิงก์หมดอายุ" · หลุดเต็มจอ · หน้าโหลดตรวจเวอร์ชัน
- คำสั่งที่ได้รับ: "หน้าโหลดทำเลย" (ข้อเสนอจากงาน 17:30) · "login ด้วย Google ขึ้นแจ้งเตือนว่าลิงก์หมดอายุ แต่ล็อกอินได้แล้ว" (แนบภาพมือถือ) · "ล็อกอินแล้วเด้งออกจากโหมดเต็มจอ ต้องตั้งมือถือแล้วกดเต็มหน้าจอใหม่ เป็นตอนออกจากห้องเล่นด้วย"
- branch: `ai/core-load-login-fullscreen` (แตกจาก main `42eea7b`) · commit `5390153` (ล็อกอิน) → `9184ebe` (เต็มจอ) → `9d4e8bd` (หน้าโหลด) → commit WORKLOG นี้
- สาเหตุ:
  - ลิงก์หมดอายุ: supabase-js 2.45.4 (auth-js 2.65) แลก `?code=` เองตอนสร้าง client **แม้ตั้ง detectSessionInUrl: false** (เงื่อนไข `_isPKCEFlow` = มี ?code + code verifier) แล้วลบ code ออกจาก URL · มือถือเน็ตช้า 'load' มาก่อนไลบรารีแลกเสร็จ → finishOAuthRedirect เห็น ?code แลกซ้ำ (verifier ถูกลบแล้ว) → error → "ลิงก์ล็อกอินหมดอายุ" ทั้งที่ได้เซสชันแล้ว
  - เต็มจอ: landscape.js ขอเต็มจอจาก `pointerdown` ครั้งเดียวต่อการเปิดหน้า — Chrome มือถือไม่นับ pointerdown จากนิ้วเป็นการกดของผู้เล่น (ถูกปฏิเสธเงียบ ๆ แล้วไม่ฟังอีก) · ออกจากห้องใช้ `confirm()` ซึ่ง Chrome Android ออกจากเต็มจอทุกครั้ง · ไปหน้า Google = เปลี่ยนหน้า หลุดเต็มจอเสมอ
- แก้:
  - `client/public/Code/Core/db.js` — จำ `launchSearch` + `libraryWillExchange` (มี ?code และคีย์ `*-code-verifier` ใน localStorage) ก่อน createClient · finishOAuthRedirect อ่าน ?query จาก launchSearch · `await sb.auth.initialize()` ก่อน cleanOAuthUrl แล้วใช้ error ของไลบรารี · `exchangeIfLibraryDidNot()` แลกเองเฉพาะไม่มี verifier (เปิดลิงก์คนละเบราว์เซอร์ → ยังเตือนถูก) · แก้คอมเมนต์ที่ createClient
  - `client/public/Code/Core/landscape.js` — แทน listener pointerdown ครั้งเดียว ด้วย `click` (capture) ทุกครั้ง: ไม่ใช่แอป Capacitor และไม่ได้เต็มจออยู่ → goFull() · คงสไตล์ var ของไฟล์
  - `client/public/Code/AssetPack/pack-loader.js` — ขั้น "ตรวจเวอร์ชันไฟล์" เรียก `reloadIfStale()`: ดึง `./version.js?t=` (no-store · หมดเวลา 4 วิ = ข้าม) เลขต่างจาก window.DUMMY_VERSION → ข้อความ "พบเวอร์ชันใหม่ กำลังโหลดใหม่" + location.reload() ครั้งเดียว · sessionStorage `dummyStaleReload` กันวน (ลองแล้ว/อ่านไม่ได้ = เล่นต่อ ให้ version-check.js เตือนแทน)
- ไม่ได้แตะ: confirm('ออกจากห้อง?') ทั้ง 6 จุด (room-actions · lobby-room · dummy-table · gamegx · games · native) · login.js · settings.js · version-check.js · SQL/เซิร์ฟเวอร์
- ตรวจแล้ว: `node --check` 3 ไฟล์ · check-handlers · test-client-files · test-client (27) · test-client-version (16) · Playwright กับ index.html จริง + supabase-js 2.45.4 ตัวเดียวกับเกม (ดักคำขอ Supabase ทั้งหมด ไม่แตะฐานข้อมูลจริง): กลับจาก Google เน็ตช้า 1.5 วิ → **ก่อนแก้ แลก 2 ครั้ง + ขึ้นหมดอายุ** · หลังแก้ แลก 1 ครั้ง ไม่ขึ้น · เน็ตเร็ว ทั้งสองแบบแลก 1 ครั้ง · ไม่มี verifier → ยังขึ้นเตือนและไม่ล็อกอิน · จำลองมือถือ (has_touch) นับคำขอเต็มจอ: ก่อนแก้หลุดแล้วไม่ขอใหม่ · หลังแก้ขอใหม่ตอนแตะ · หน้าโหลด: เลขตรง = เปิด 1 ครั้ง · เว็บใหม่กว่า = โหลดใหม่ 1 ครั้งไม่วน หน้าโหลดปิดปกติ
- ยังไม่ได้ทดสอบ: Google จริงบนมือถือจริง · กฎ "การกดของผู้เล่น" ของ Chrome จริง (ตัวจำลองไม่บังคับกฎนี้) · iPhone (Safari บน iPhone ไม่มีโหมดเต็มจอให้หน้าเว็บอยู่แล้ว) · ผูกบัญชี Google จริง
- สถานะ: เสร็จ · อัปเป็น Beta 0.18.3 แล้ว (คำสั่ง "อัปเลย" + "ทำเลยแล้วอัปพร้อมกัน" 17:32) — version.js + package.json 3 ตัว + patchnotes.json + PATCHNOTES.md · push branch + fast-forward main
- เพิ่มเติม 17:40 (เจ้าของสั่งเปลี่ยน confirm เป็นหน้าต่างในเกม): commit `c604921` · สร้าง `Code/Lobby/leave-confirm.js` + `.css` (`askLeaveRoom()` · `closeLeaveConfirm()` → true ถ้ามีหน้าต่าง · `leaveConfirmed()` · st-modal/st-box กรอบซากุระ z 8500 · ยกเลิก/Esc/แตะนอกกล่อง = ปิด) · ปุ่มออก 6 จุดเรียก askLeaveRoom: room-actions.js · lobby-room.js · dummy-table.js · gamegx.js · games.js (gxLeave) · native.js (ปุ่ม Back: ปิดหน้าต่างก่อน · ถ้าไม่มีไฟล์ใหม่ใช้ confirm เดิม) · index.html ต่อท้าย css/js · ตรวจ: node --check 7 ไฟล์ · check-handlers · test-client-files · test-client · Playwright: ยกเลิก/Esc/แตะนอก ปิดโดยไม่ออก · กด "ออก" เรียก leave 1 ครั้ง · ภาพ 915×412 + 1280×640 · ยังไม่ได้ทดสอบ: กดออกจากโต๊ะจริงกับเซิร์ฟเวอร์ · ปุ่ม Back ในแอป Android จริง · ย้อนกลับ: `git revert c604921`
- คำถามที่รอตอบ: (ว่าง)
- วิธีย้อนกลับ: `git revert 9d4e8bd` (หน้าโหลด) · `git revert 9184ebe` (เต็มจอ) · `git revert 5390153` (ล็อกอิน) — หรือทิ้ง branch ถ้ายังไม่ merge
- ข้อควรระวัง: ห้ามกลับไปเรียก exchangeCodeForSession ทุกครั้ง (แลกซ้ำ = หมดอายุ) · อัป supabase-js ต้องเช็กพฤติกรรม `_isPKCEFlow`/`initialize()` ใหม่ · หลุดเต็มจอแล้วต้องแตะ 1 ครั้งถึงกลับ (เบราว์เซอร์ไม่ยอมให้เข้าเต็มจอเองโดยไม่มีการกด) · เลข 2 ที่ (pack-loader.js + version-check.js) อ่านรูปแบบบรรทัด `window.DUMMY_VERSION = '…';` ด้วย regex

### 2026-11-06 17:30 · Claude (claude-opus-5-5) · บังคับโหลดเกมใหม่เมื่อมีเวอร์ชันใหม่ (แท็บเก่าที่ไม่รีเฟรช)
- คำสั่งที่ได้รับ: "แก้หน้าโหลด — ผู้เล่นที่เปิดเกมเวอร์ชันเก่าค้างไว้ไม่รีเฟรช ยังเข้าเกมเวอร์ชันเก่าได้" · เจ้าของเลือก: กำลังเล่นบนโต๊ะ = **รอจบตาก่อนค่อยบังคับ** · **เพิ่มฝั่งเซิร์ฟเวอร์ด้วย**
- สาเหตุ: เลขเวอร์ชันอ่านครั้งเดียวตอนเปิดหน้า (`APP_VER`) · `SRV_VER` แค่โชว์มุมจอ · เซิร์ฟเวอร์ไม่ตรวจเวอร์ชัน
- branch: `ai/core-version-check` (แตกจาก main `e8d55af`) · commit `ab18bd5` (เซิร์ฟเวอร์) → `ee570b2` (หน้าเว็บ) → commit WORKLOG นี้
- สร้างใหม่:
  - `server/src/net/client-version.js` — `parseVersion` · `isOutdated` (เทียบตัวเลขทีละส่วน · ไม่ส่งเลข = เก่า) · `versionGate(min)` middleware ของ io.use → error `outdated` + `data.min`
  - `server/test-client-version.js` — 16 จุด (เทียบเลข + เซิร์ฟเวอร์จริงผ่านตัวจำลอง) · เพิ่มต่อท้าย `npm test` ใน `server/package.json`
  - `client/public/Code/Core/version-check.js` + `.css` — ดึง `./version.js?t=…` แบบ no-store (10 วิหลังเปิด · ทุก 3 นาที · กลับมาที่แท็บ · เน็ตกลับมา) เลขต่างจาก APP_VER → หน้าต่างบังจอ `st-modal vc-modal` (z 9500 · ไม่มีปุ่มปิด · ปุ่ม "โหลดเกมใหม่" = location.reload) · อยู่บนโต๊ะและ `S && !S.over` = รอทุก 2 วิจนจบตา · `VersionCheck.onServerRejected(data)` ขึ้นทันที · แอป Android ขึ้นบรรทัด "ติดตั้งแอปเวอร์ชันใหม่"
- แก้:
  - `server/src/config.js` — `MIN_CLIENT_VERSION` จาก env (ว่าง = ปิด)
  - `server/src/index.js` — require versionGate + `io.use(versionGate(config.MIN_CLIENT_VERSION))` ก่อน middleware ตรวจตัวตน
  - `client/public/Code/Core/connection.js` — ioOpt.auth ส่ง `{ version: APP_VER }` เสมอ (+ token เมื่อเปิดบัญชี) · connect_error `outdated` → VersionCheck.onServerRejected
  - `client/public/index.html` — `<link version-check.css>` ต่อท้ายหลัง sakura-kit.css · `<script version-check.js>` ต่อท้ายหลัง coin-icons.js (ไม่สลับลำดับไฟล์อื่น)
- ไม่ได้แตะ: `AssetPack/pack-loader.js` (หน้าโหลด "กำลังเตรียมเกม" — ขั้น "ตรวจเวอร์ชันไฟล์" ในนั้นแค่อ่าน manifest) · version.js · package.json เลขเวอร์ชัน · patchnotes · home.js (ป้ายเวอร์ชันมุมจอ) · mobile/
- ตรวจแล้ว: `node --check` ทุกไฟล์ JS ที่แก้/สร้าง · check-handlers · test-client-files · test-client (27) · test-supabase · test-online · test-moderation · test-client-version (16) · `npm test` ทั้งชุด exit 0 · เปิด index.html จริง (บล็อกเน็ตภายนอก ไม่แตะฐานข้อมูล/เซิร์ฟเวอร์จริง) จำลอง version.js เลขเดียวกัน → ไม่ขึ้น · เลขใหม่ระหว่าง `screen='game'`+`S.over=false` → ไม่ขึ้น · `S.over=true` → ขึ้น · onServerRejected → ข้อความเวอร์ชันเก่าเกินไป · ดูภาพ 915×412 + 1280×640
- ยังไม่ได้ทดสอบ: บน Cloudflare/Render จริง · socket.io จริง (เทสใช้ตัวจำลอง) ว่า `err.data` มาถึง client · มือถือจริง/แอป Android · เบราว์เซอร์แคช JS เก่าหลังกดโหลดใหม่ (Cloudflare Pages ปกติ revalidate ทุกครั้ง)
- สถานะ: เสร็จ · อัปเป็น Beta 0.18.2 แล้ว (คำสั่ง "อัปเลย" 17:05) — version.js + package.json 3 ตัว + patchnotes.json + PATCHNOTES.md · push branch + fast-forward main
- คำถามที่รอตอบ: จะตั้ง `MIN_CLIENT_VERSION` บน Render เมื่อไหร่ (ไม่ตั้ง = ด่านเซิร์ฟเวอร์ปิด ใช้แค่ตัวเตือนหน้าเว็บ)
- วิธีย้อนกลับ: `git revert ee570b2` (หน้าเว็บ) · `git revert ab18bd5` (เซิร์ฟเวอร์) — หรือทิ้ง branch ถ้ายังไม่ merge · ปิดด่านเซิร์ฟเวอร์ทันทีโดยไม่ deploy = ลบ `MIN_CLIENT_VERSION` บน Render
- ข้อควรระวัง: ตั้ง `MIN_CLIENT_VERSION` ให้ตั้ง **หลัง** หน้าเว็บบน Cloudflare deploy เลขนั้นเสร็จแล้ว (ไม่งั้นโหลดใหม่ก็ยังได้เกมเก่า เข้าไม่ได้จนกว่า deploy เสร็จ) · client ก่อน 0.18.2 ไม่ส่งเลขมา = ถูกปฏิเสธเมื่อเปิดด่าน และไม่มีหน้าต่างอธิบาย (ขึ้นแค่ "เชื่อมต่อเซิร์ฟเวอร์ไม่ได้") · แอป Android แบบไฟล์ในตัว (ไม่ได้ตั้ง CLIENT_URL) ถูกปฏิเสธจนกว่าจะติดตั้ง APK ใหม่ · ตัวตรวจหน้าเว็บเทียบ "ต่างกัน" ไม่ใช่ "ใหม่กว่า" (ย้อนเวอร์ชันก็เตือนด้วย) · ห้ามเปลี่ยนรูปแบบบรรทัดใน version.js (`window.DUMMY_VERSION = '…';`) — version-check.js อ่านด้วย regex

### 2026-11-06 16:55 · Claude (claude-opus-5-5) · หน้าล็อกอิน 2 คอลัมน์ (จอแนวนอน)
- คำสั่งที่ได้รับ: "หน้าต่างยาวเกินไป · หน้า login ให้ปุ่มย้ายมาอยู่ทางขวา ดีไซน์ใหม่ให้เห็นภายในหน้าเดียวไม่ต้องเลื่อน" (แนบภาพมือถือแนวนอน)
- branch: `ai/account-google-login` (ต่อจาก `e60b8a1` ที่ merge เข้า main แล้ว) · commit นี้
- แก้:
  - `Code/Account/login.js` formHtml() — แท็บย้ายเข้าไปในฟอร์ม · แบ่ง `<div class=au-main>` (แท็บ + ช่องกรอก + แสดงรหัสผ่าน) กับ `<div class=au-side>` (ปุ่มเข้าสู่ระบบ/สมัคร + error + ปุ่ม Google + คำแนะนำ) · id/handler/ข้อความเดิมทั้งหมด
  - `Code/Account/login.css` — `.au-main/.au-side` flex column ระยะ inherit จากฟอร์ม · `@media (min-aspect-ratio:4/3) and (min-width:600px)`: การ์ดกว้าง min(94vw,780px) เป็นกริด 'main logo' / 'main side' · `.au-form { display: contents }` · แนวนอน+เตี้ย (≤520px) ลดขอบนอก/ปุ่มแท็บ/ช่องกรอก
- ไม่ได้แตะ: db.js · first-nickname.* · sakura-kit.css · ข้อความผู้เล่น
- ตรวจแล้ว: `node --check` · check-handlers · test-client-files · test-client · วัดจริงจาก index.html ทั้งแท็บเข้าสู่ระบบ/สมัคร/สมัคร+error ที่ 915×412 · 844×390 · 740×360 · 667×375 · 1280×640 · 1920×900 → การ์ดอยู่ในจอทั้งหมด เลื่อนได้ 0px · ดูภาพ 915×412 + 1280×640
- ยังไม่ได้ทดสอบ: มือถือจริง · คีย์บอร์ดมือถือเด้งขึ้นตอนพิมพ์ (จอเหลือเตี้ยลง จะเลื่อนได้ตามปกติ) · จอแนวตั้งใช้แบบคอลัมน์เดียวเดิม (เกมบังคับหมุนจออยู่แล้ว)
- สถานะ: เสร็จ · อัปเป็น Beta 0.18.1 แล้ว (คำสั่ง "อัปเลย" 16:45) — version.js + package.json 3 ตัว + patchnotes.json + PATCHNOTES.md · push branch + fast-forward main
- วิธีย้อนกลับ: `git revert <commit นี้>`
- ข้อควรระวัง: `.au-form` เป็น display: contents ในจอแนวนอน — สไตล์ที่ตั้งบน .au-form (พื้น/ขอบ/padding) จะไม่แสดงในโหมดนี้ · ข้อความ "ด้านบน" ในคำแนะนำยังถูก (แท็บอยู่บนซ้าย)

### 2026-11-06 16:50 · Claude (claude-opus-5-5) · ล็อกอินด้วย Google (เว็บ) + ตั้งชื่อครั้งแรก + ผูกบัญชีเดิม
- คำสั่งที่ได้รับ: "ทำหน้า login ให้มีด้วย Google" · เจ้าของเลือก 1ก (ทำบนเว็บ ซ่อนในแอป Android) · 2ข (เด้งหน้าตั้งชื่อเล่นทันทีหลังเข้าด้วย Google ครั้งแรก) · 3 ได้ (บัญชีเดิมผูก Google ได้)
- branch: `ai/account-google-login` (แตกจาก main `75c399e`) · commit `349d99d` (ล็อกอิน) → `19e5003` (ตั้งชื่อครั้งแรก) → `1e95698` (ผูกบัญชีในหน้าตั้งค่า) → commit WORKLOG นี้
- สร้างใหม่: `Code/Account/first-nickname.js` + `.css` — หน้าต่างตั้งชื่อในเกม (ปิดเองไม่ได้จนตั้งชื่อสำเร็จ มีปุ่มออกจากระบบ) · บันทึกผ่าน `DB.saveName` → `update_profile` (ครั้งแรกฟรี ฐานข้อมูลตัดสิน)
- แก้:
  - `Code/Core/db.js` — createClient เพิ่ม `flowType: 'pkce'` (คง `detectSessionInUrl: false`) · th() เพิ่มคำแปล error ของ OAuth · บล็อกใหม่ก่อน `// ---- บัญชี ----`: `DB.oauthAvailable()` (false ในแอป Capacitor) · `DB.hasGoogle()` · `DB.needsNickname()` (ชื่อยังเป็น `u`+10 ตัวและ name_changes = 0) · `DB.signInGoogle()` · `DB.linkGoogle()` · `finishOAuthRedirect()` (แลก `?code=` เป็นเซสชัน ลบพารามิเตอร์ OAuth ออกจาก URL และคืน `?room=` เดิมจาก sessionStorage `dummyOauthReturn`) · `start()` เรียก finishOAuthRedirect ก่อน getSession และ `announceOAuthResult()` หลังวาด · `afterLogin()` เรียก `openFirstNickname()` ถ้า needsNickname
  - `Code/Account/login.js` — ปุ่ม "เข้าสู่ระบบด้วย Google" (โลโก้ SVG สี่สี) ใต้ข้อความ error ในฟอร์ม · `auGoogle()` · แสดง `DB.oauthError` ครั้งเดียว
  - `Code/Account/login.css` — `.au-or` `.au-google` · `#app.auth { align-items: flex-start }` (การ์ดสูงเกินจอแนวนอนแล้วหัวการ์ดถูกตัดเลื่อนไม่ถึง) · จอเตี้ยซ่อนเส้น "หรือ"
  - `Code/Settings/settings.js` — แถว "บัญชี Google" (ปุ่มผูกบัญชี / ผูกแล้ว ✓) แสดงเฉพาะบนเว็บ · `pvLinkGoogle()`
  - `index.html` — `first-nickname.css` ต่อหลัง `login.css` · `first-nickname.js` ต่อหลัง `login.js` (ไม่สลับลำดับไฟล์อื่น)
- ไม่ได้แตะ: SQL ทุกไฟล์ (`handle_new_user` ใน schema.sql รองรับผู้ใช้ Google อยู่แล้ว: ชื่อผู้ใช้ `u`+10 ตัว + เหรียญเริ่มต้น) · เซิร์ฟเวอร์ · `mobile/` · `nickname.js` · router.js · daily-login.js (onDbLogin เดิม)
- ตรวจแล้ว: `node --check` 4 ไฟล์ · check-handlers · test-client-files · test-client (27 จุด) ผ่าน · ยืนยันว่า supabase-js 2.45.4 มี linkIdentity/exchangeCodeForSession · ภาพหน้าจอจาก index.html จริง 915×412 + 1280×640 (บล็อกเน็ตภายนอกทั้งหมด ไม่แตะฐานข้อมูลจริง): หน้าล็อกอิน · หน้าต่างตั้งชื่อ · แถวผูกบัญชีในตั้งค่า · กลับจาก Google แบบกดยกเลิก → ขึ้น "ยกเลิกการเข้าสู่ระบบด้วย Google" และ `?room=ABCD` อยู่ครบ
- ยังไม่ได้ทดสอบ: ล็อกอิน Google จริงตั้งแต่ต้นจนจบ (ต้องตั้งค่า Google Cloud + Supabase ก่อน) · ผูกบัญชีจริง · บันทึกชื่อครั้งแรกกับฐานข้อมูลจริง · แอป Android จริง (ปุ่มต้องไม่ขึ้น) · Safari/iPhone
- ต้องตั้งค่าก่อนใช้ได้ (เจ้าของทำเอง มี client secret): Google Cloud OAuth client แบบ Web → Authorized redirect URI `https://apoayzrqkpouhbyexuwn.supabase.co/auth/v1/callback` · Supabase › Authentication › Providers › Google เปิด + ใส่ Client ID/secret · URL Configuration: Site URL `https://dummy-online.pages.dev` + Redirect URLs `https://dummy-online.pages.dev/**` · ผูกบัญชีต้องเปิด **Allow manual linking** (Authentication › Sign In / Providers) · consent screen ถ้ายัง Testing ต้องเพิ่ม test users
- สถานะ: เสร็จบน branch · รออนุญาต push/merge
- คำถามที่รอตอบ: push/merge · เลขเวอร์ชัน + แพตช์โน้ต
- วิธีย้อนกลับ: `git revert 1e95698` (ปุ่มผูกบัญชี) · `git revert 19e5003` (หน้าต่างตั้งชื่อ) · `git revert 349d99d` (ล็อกอิน Google ทั้งหมด) — หรือทิ้ง branch ถ้ายังไม่ merge
- เพิ่มเติม 16:35 (คำสั่ง "เปลี่ยนหน้าต่างให้เป็นธีมเดียวกับในเกม"): หน้าต่างตั้งชื่อเปลี่ยนมาใช้กล่องกลางของเกม `st-modal`/`st-box` + `pv-h` + `pv-btn` (ได้กรอบซากุระจาก sakura-kit.css เหมือนหน้าตั้งค่า) · first-nickname.css เหลือแค่ z-index/ความกว้าง/ช่องกรอก/แถวปุ่ม · ตัวเลือก `.st-modal.fn-modal .fn-box` กันกฎจอแนวนอนของหน้าต่างสตามิน่าที่แผ่ 2 คอลัมน์ · ตรวจภาพ 915×412 + 1280×640
- เพิ่มเติม 16:45 (คำสั่ง "เปลี่ยนด้วย" = การ์ดหน้าล็อกอินเป็นกรอบซากุระ): `Theme/sakura-kit.css` เพิ่ม `.au-card` ในรายการกรอบหน้าต่าง (จุด Extend ของไฟล์) · `login.css` เปลี่ยนเฉพาะค่าสีให้เข้ากับพื้นครีม (โลโก้/ป้าย `#8a6d3b` · ตัวอักษร `#3b4255`/`#7d8394` · ช่องกรอกพื้นขาวขอบ `#d9cfc0` · กล่อง error พื้นชมพูอ่อนตัวแดง) ไม่แตะขนาด/ระยะ · ตรวจภาพ 915×412 + 1280×640 + แท็บสมัครสมาชิก · ถ้าถอด sakura-kit.css การ์ดจะกลับเป็นพื้นน้ำตาลแต่ตัวอักษรเข้ม (ต้องคืนสีใน login.css ด้วย)
- อัป Beta 0.18.0 (คำสั่ง "อัปเลย" 16:33): version.js + package.json 3 ตัว + patchnotes.json + PATCHNOTES.md · push branch + fast-forward main · ยังไม่ได้ทดสอบบนเว็บจริงหลัง deploy
- ข้อควรระวัง: เข้าด้วย Google = บัญชีใหม่แยกจากบัญชีชื่อผู้ใช้/รหัสผ่าน ถ้าไม่ได้ผูกไว้ก่อน · ห้ามลบ `?code=` handling ใน start() (ไม่งั้นกลับจาก Google แล้วไม่ล็อกอิน) · redirectTo = origin+pathname ต้องอยู่ใน Redirect URLs ของ Supabase (รัน vite ในเครื่องต้องเพิ่ม `http://localhost:<พอร์ต>/**` เอง) · ผู้เล่นที่ชื่อชนกันตอนสมัครเดิม (ได้ `u…` อัตโนมัติ) ก็จะเห็นหน้าต่างตั้งชื่อด้วย ซึ่งตั้งใจไว้

### 2026-11-06 14:25 · Claude (claude-opus-5-5) · ห้องรอ: ป้ายชื่อ + ป้ายสถานะแบบรูป
- คำสั่งที่ได้รับ: เจ้าของส่งรูปป้าย 2 แบบ — "ใช้อันนี้แทนป้ายชื่อ" (ป้ายน้ำเงินช่อซากุระ) และ "สถานะ พร้อม/ไม่พร้อม ให้ใช้อันที่สอง" (ป้ายม่วงดาว)
- branch: `ai/lobby-plates` (แตกจาก main `0b929cd`) · commit `c8bcf6a` → commit WORKLOG นี้
- สร้างใหม่: `client/public/Assets/UI/Assets/lobby/name-plate.webp` (900×265) · `status-plate.webp` (1000×272) — รูปที่เจ้าของแนบ (โปร่งใสอยู่แล้ว) ตัดฝ้าความทึบ < 12 + ตัดขอบว่าง + ย่อ
- แก้: `Code/Lobby/lobby.theme-4.css` ต่อท้าย — `.rmv .rm-slot > .rm-plate` border-image ตัด ซ้าย 70 / ขวา 320 px (ช่อดอกไม่บิด) สูง max(46px,10vh) · `.rmv .rm-slot > .rm-chip` border-image ตัด 150/150 สูง max(24px,4.6vh) กว้างอย่างน้อยตามสัดส่วนรูป · ตัวอักษรป้ายสถานะสีม่วงเข้ม (ป้ายสีอ่อน)
- ใช้กับป้ายสถานะทุกแบบบนการ์ด (👑 เจ้าของห้อง · ✅ พร้อม · ⏳ รอ · 🤖 บอท) และป้ายชื่อทุกการ์ด (รวมบอท)
- ไม่ได้แตะ: lobby-room.js (ข้อความ/โครงเดิม) · กฎเก่าใน lobby.theme.css / theme-2 / theme-3 (กฎใหม่ทับด้วยตัวเลือกที่เจาะจงกว่า + ลำดับไฟล์)
- ตรวจแล้ว: test-client-files · check-handlers · ภาพหน้าจอจาก index.html จริง 915×412 + 1280×640 (การ์ดมีกรอบ 4★ + ฉาก 5★)
- ยังไม่ได้ทดสอบ: เว็บจริง/มือถือจริง · ชื่อผู้เล่นยาวมาก (พื้นที่ข้อความกลางป้ายแคบลงเพราะช่อดอกด้านขวา)
- สถานะ: เสร็จ · อัปเป็น Beta 0.17.2 แล้ว (คำสั่ง "อัปเลย" 14:06) — version.js + package.json 3 ตัว + patchnotes.json + PATCHNOTES.md · push branch + fast-forward main
- คำถามที่รอตอบ: (ไม่มี)
- วิธีย้อนกลับ: `git revert c8bcf6a`
- เพิ่มเติม 14:35 (คำสั่ง "จัดตัวหนังสือตรงชื่อให้อยู่ตรงกลาง"): ป้ายชื่อ border-width 0 แต่คง border-image-width ซ้าย/ขวาไม่เท่ากัน → พื้นที่ข้อความเต็มกว้าง ชื่ออยู่กลางป้าย · ตรวจภาพ 915×412 + 1280×640 · commit ถัดจาก WORKLOG เดิม
- ข้อควรระวัง: เปลี่ยนรูปป้าย → ตัวเลขตัดขอบใน CSS (70/320 · 150/150) และตัวคูณความกว้าง (×0.27 ×1.2 ×0.55 = ช่วงตัด ÷ ความสูงรูป) ต้องคำนวณใหม่


### 2026-11-06 14:10 · Claude (claude-opus-5-5) · อัป Beta 0.17.1 (กรอบ 4★)
- คำสั่งที่ได้รับ: "อัปได้เลย"
- แก้: `version.js` + package.json 3 ตัว → 0.17.1 · `patchnotes.json` + `docs/PATCHNOTES.md` (กรอบใหม่ 12 ตัว · ตัวละครอยู่ในช่องกลางกรอบ · ฉาก 5★ เต็มด้านในกรอบ) · `docs/ROADMAP.md` ข้อ 5 ติ๊กกรอบ 4★ (commit `9069c29`)
- git: push `ai/items-char-frames` + fast-forward `main` `43a7a11..9069c29` · remote เปลี่ยนเป็น https://github.com/l3lackshine/dummy-online (ชื่อตัวเล็ก — ที่เดียวกัน)
- ตรวจแล้ว: test-client · test-economy · test-games · test-client-files ผ่าน · ยังไม่ได้ทดสอบบนเว็บจริงหลัง deploy
- ไม่ต้องรัน SQL (seed_catalog.sql ไม่เปลี่ยน)
- สถานะ: เสร็จ
- วิธีย้อนกลับ: `git revert` ทีละ commit จาก `9069c29` ย้อนไป `de32b84`


### 2026-11-06 14:00 · Claude (claude-opus-5-5) · ห้องรอ: ฉาก 5★ เต็มด้านในกรอบ 4★
- คำสั่งที่ได้รับ: "แก้พื้นหลัง อย่าให้เห็นช่องว่าง ให้เต็มกรอบด้านใน ตัดมุมภาพพื้นหลังทั้งสี่มุมก็ได้ เพื่อไม่ให้โผล่ออกมาด้านนอก"
- branch: `ai/items-char-frames` · commit `1268dee` (หน้ากาก) → `d787c2c` (ห้องรอ) → commit WORKLOG นี้
- สร้างใหม่: `client/public/Assets/Item/Frame/ch-<id>-in.webp` 12 ไฟล์ (หน้ากากขาว-โปร่ง ~5–8KB · ช่องกลางกรอบถมเกาะกลีบดอก ขยาย 48px เข้าใต้แท่งกรอบ ∩ เงากรอบหดเข้า 8px)
- แก้:
  - `scripts/compose-char-frames.py` — make_inner_mask() + บันทึก ch-<id>-in.webp ทุกครั้งที่สร้างกรอบ
  - `Code/Lobby/lobby-room.js` — s5bg() คืนค่าว่างเมื่อใส่กรอบประจำตัวที่มีช่อง (frame4) · ฟังก์ชันใหม่ framedScene(p) วาง `<i class=rm-fbg>` (ครึ่งบน/ล่าง) ก่อน .rm-art
  - `Code/Lobby/lobby.theme-4.css` ต่อท้าย: .rm-fbg ใช้ mask-image + -webkit-mask-image แบ่งครึ่งบน/ล่างเหมือน .rm-deco · ฉากใน ::before สูง 200% ภาพต่อกันตรงกลาง
- ไม่ได้แตะ: การ์ดไม่ใส่กรอบ/กรอบทั่วไป/บอท (ฉาก 5★ ยังอยู่บน .rm-art เหมือนเดิม) · ใส่กรอบ 4★ แต่ยังไม่ปลด 5★ = ด้านในเป็นพื้นการ์ดเดิม
- ตรวจแล้ว: `node --check lobby-room.js` · check-handlers · build-assets --check · test-client-files · test-client · ดูหน้ากากซ้อนกรอบ 6 แบบ (ไม่เกินกรอบ) · ภาพหน้าจอจาก index.html จริงครบ 12 ตัว 915×412 + 4 ตัว 1280×640 — ฉากเต็มด้านใน ไม่มีช่องว่าง ไม่โผล่นอกกรอบ
- ยังไม่ได้ทดสอบ: เว็บจริง/มือถือจริง · WebView Android รุ่นเก่า (ใช้ CSS mask-image มี -webkit- สำรอง)
- สถานะ: เสร็จบน branch · รออนุญาต push/merge
- คำถามที่รอตอบ: แพตช์โน้ต + เวอร์ชัน 0.17.1 · push/merge
- วิธีย้อนกลับ: `git revert d787c2c` (ฉากกลับไปอยู่หลังตัวละครแบบเดิม) · `git revert 1268dee`
- ข้อควรระวัง: เปลี่ยนรูปกรอบ → รัน compose-char-frames.py ใหม่เสมอ (หน้ากากต้องสร้างคู่กับกรอบ ไม่งั้นฉากไม่ตรงกรอบ) แล้วรัน build-assets


### 2026-11-06 13:45 · Claude (claude-opus-5-5) · ห้องรอ: ตัวละครอยู่ในช่องกลางกรอบ 4★ ไม่โดนบัง
- คำสั่งที่ได้รับ: "ปรับให้ตัวละครอยู่ในกรอบพอดี ไม่ให้กรอบบัง" (ต่อจากงานกรอบ 4★ ด้านล่าง)
- branch: `ai/items-char-frames` · commit `c8287c8` (ข้อมูล) → `442dbcc` (ห้องรอ) → commit WORKLOG นี้
- แก้:
  - `scripts/compose-char-frames.py` — เพิ่ม measure_window() วัดช่องว่างกลางกรอบ (แถบกลาง 35–65% ของความกว้าง · ระยะเป็นสัดส่วนความกว้าง) + write_window_to_config() เขียน `"lobby"."frame4": {top,bottom,left,right}` ลง Character.config
  - `client/public/Assets/Character/*/Character.config` 12 ไฟล์ — เพิ่ม lobby.frame4 (สคริปต์เขียน) · `client/public/skin/skins.json` สร้างใหม่ด้วย build-assets (seed_catalog.sql ไม่เปลี่ยน — ไม่ต้องรัน SQL)
  - `Code/Lobby/lobby-room.js` — place(ch, fr) + ฟังก์ชันใหม่ frameWindow(fr): ใส่กรอบประจำตัวที่มีค่า frame4 → การ์ดได้ `data-fw` + ตัวแปร --fw-t/-b/-l/-r · human() ส่ง p.fr ให้ place · บอท/กรอบทั่วไปเหมือนเดิม
  - `Code/Lobby/lobby.theme-4.css` ต่อท้าย: `.rm-slot[data-fw] .rm-art` ใช้ margin % (อิงความกว้าง ตรงกับกรอบที่ยืดตามความกว้าง) · max() ไม่ให้ชิดป้ายบน/ป้ายชื่อมากกว่าเดิม
- ไม่ได้แตะ: deco() · .rm-deco · index.html · ฝั่งเซิร์ฟเวอร์ · ฉาก 5★ (ตอนใส่กรอบ 4★ ฉากจะอยู่ในช่องกลางกรอบด้วย)
- ตรวจแล้ว: `node --check lobby-room.js` · check-handlers · build-assets --check · test-client-files · test-skin-ids · test-client (exit 0) · ภาพหน้าจอจาก index.html จริง (puppeteer + ข้อมูลห้องจำลอง · ปิด render อัตโนมัติ · รูปตัวละครจาก assets-src) ครบ 12 ตัว ที่ 915×412 และ 4 ตัวที่ 1280×640 — หน้าไม่โดนลายกรอบบัง
- ยังไม่ได้ทดสอบ: เว็บจริง/มือถือจริง (รูปตัวละครผ่านระบบ pack) · เครื่อง Android รุ่นเก่า (ใช้ CSS max())
- สถานะ: เสร็จบน branch · รออนุญาต push/merge
- คำถามที่รอตอบ: แพตช์โน้ต + เวอร์ชัน 0.17.1 · push/merge
- วิธีย้อนกลับ: `git revert 442dbcc` (การ์ดกลับเป็นแบบเดิม — ค่า frame4 ที่เหลือใน config ไม่มีผล) · `git revert c8287c8`
- ข้อควรระวัง: แก้แบบกรอบ/ชิ้นแต่ง → รัน compose-char-frames.py แล้วต้องรัน `node scripts/build-assets.js` ต่อ (ไม่งั้น skins.json ยังเป็นค่าช่องเก่า)


### 2026-11-06 13:20 · Claude (claude-opus-5-5) · กรอบประจำตัวละคร 4★ แบบวาดจริง (โรดแมพข้อ 5)
- คำสั่งที่ได้รับ: "ทำงานที่ค้าง ของปลดดาว เจนผ่าน canvas แล้วใส่เกม" → เจ้าของส่งกรอบวาด 6 รูป (ซ้ำ 1) + ชิ้นแต่งซากุระ 10 ชิ้น ให้ "ผสมกันจนได้ 12 กรอบ"
- พบ: ฉาก 5★ ครบ 12 ตัวเป็นภาพวาดแล้ว — ที่ค้างจริงคือกรอบ 4★ (รูปชั่วคราวจาก make-char-frames.py) · เครื่องทำงานดาวน์โหลดจาก Canva ไม่ได้ (403) จึงใช้รูปที่เจ้าของแนบมา
- branch: `ai/items-char-frames` · commit `de32b84` (ต้นฉบับ+สคริปต์) → `44ce271` (รูป 12 ตัว) → commit WORKLOG นี้
- สร้างใหม่:
  - `assets-src/Assets/Item/Frame-src/frame-{crown,ribbon,arch,cloud,tassel}.png` กรอบต้นฉบับ (พื้นดำ) · `deco/` ชิ้นแต่ง (ตัดพื้นขาวด้วย ui-cutout.py แล้ว + กิ่งยาว) — ไม่อยู่ในแพ็ก (pack-assets อ่านแค่ Assets/Character)
  - `scripts/compose-char-frames.py` — ลบพื้นดำ (ก้อนมืดใหญ่ = พื้น/ช่องกลาง · ขอบนุ่มถอดสีดำ · ทิ้งเศษภาพข้างเคียง) → กลับซ้ายขวา → ย้อมส่วนชมพู/ม่วงเป็นสีประจำตัว (ทองคงเดิม) → วางชิ้นแต่ง · ตาราง CHARACTER_FRAMES = แบบกรอบ/สี/ชิ้นแต่งต่อตัว · `--only <id>` `--sheet <png>`
- แก้: `client/public/Assets/Item/Frame/ch-*.webp` 12 ไฟล์ (ชื่อเดิม · กว้าง 640 สูง 1427–1619 ตามแบบกรอบ · รวม ~1.9MB) · `scripts/make-char-frames.py` บรรทัดแรก: หมายเหตุว่าเลิกใช้ อย่ารันทับ
- ไม่ได้แตะ (แต่เกี่ยวข้อง): `lobby-room.js` deco() · `lobby.theme-3.css` .rm-deco (ครึ่งบน/ล่าง ยืดตามความกว้าง — รูปสูงกว่าเดิมใช้ได้เลย) · `server/src/skills.js` / `net/guards.js` (ตรวจสิทธิ์ 4★ เหมือนเดิม) · `Item.config` ของ Frame (ch-* ไม่ได้ลงทะเบียนเป็นไอเทม)
- สีประจำตัวใช้ชุดเดิมของรูปชั่วคราว · girl = สีชมพูต้นฉบับ · แบบกรอบ: crown (sakuya/miyu/boy) · ribbon (girl/haru) · arch (rina/leo/rei) · cloud (rena/ken) · tassel (arya/yuna)
- ตรวจแล้ว: `build-assets.js --check` ผ่าน · `test-client-files.js` ผ่าน · py_compile สคริปต์ · ดูแผ่นรวม 12 กรอบ · ซูมขอบบนพื้นขาว (ไม่มีฝ้าดำ) · หน้าจำลองการ์ดห้องรอใช้กฎ .rm-deco จริง ถ่ายภาพ 915×412 + 1280×640 (sakuya/girl/ken/rei)
- ยังไม่ได้ทดสอบ: ห้องรอจริงบนเว็บ/มือถือ (กับป้าย rm-chip ด้านบน)
- สถานะ: เสร็จบน branch · รออนุญาต push/merge
- คำถามที่รอตอบ: ลงแพตช์โน้ต + ขึ้นเวอร์ชัน 0.17.1 ไหม · ลายหนักมุมบนของบางแบบ (arch/cloud) ทับหน้าตัวละครบางตัว (เช่น rei, ken) — ยอมรับ หรือให้สลับแบบ/กลับด้าน
- วิธีย้อนกลับ: `git revert 44ce271` (คืนรูปชั่วคราว) · `git revert de32b84` (ลบต้นฉบับ+สคริปต์)
- ข้อควรระวัง: อย่ารัน make-char-frames.py (เขียนทับรูปจริง) · แก้กรอบ → แก้ CHARACTER_FRAMES แล้วรัน compose-char-frames.py · ตัวละครใหม่ต้องเพิ่มแถวในตาราง ไม่งั้นไม่มีไฟล์ ch-<id>.webp


### 2026-11-06 12:45 · Claude (claude-opus-5-5) · ลบ Skill Studio ออกจากโปรเจค
- คำสั่งที่ได้รับ: "ลบ skill studio ออกจากโปรเจค เลย" (แทนโรดแมพข้อ 13 ที่จะอัป Skill Studio)
- branch: `ai/skills-remove-studio`
- ลบ: `client/public/skin/skill-studio.html` · `client/public/skin/skill-editor.html` (หน้าเด้งไป Skill Studio)
- แก้ (เอกสาร/คอมเมนต์อย่างเดียว): `README.md` · `supabase/README.md` · `client/public/skin/README.md` · `mobile/README.md` · คอมเมนต์ใน `mobile/prepare.js` · `docs/ROADMAP.md` ข้อ 13 ขีดฆ่า
- ไม่ได้แตะ (แต่เกี่ยวข้อง): `skills.json` (ยังเป็นที่เก็บสกิล แก้ตรงได้) · `tools/skin-studio/` (Skin Studio แอป Android — คนละตัว) · คอมเมนต์ใน `supabase/schema.sql` บรรทัด 175, 476 (ไฟล์ SQL ที่รันจริงแล้ว — ไม่แก้โดยไม่ถาม) · `CLAUDE.md` บรรทัด 53, 249 (ห้ามแก้เอง — เสนอให้เจ้าของแล้ว)
- ตรวจแล้ว: ไม่มีโค้ด/เทส/workflow ไหนอ้าง 2 ไฟล์ที่ลบ (grep ทั้ง repo) · `node --check mobile/prepare.js` · `test-client-files.js` · `check-handlers.js` ผ่าน · `skills.json` อ่านได้
- สถานะ: เสร็จบน branch · รออนุญาต push/merge + แก้ CLAUDE.md
- วิธีย้อนกลับ: `git revert <commit>` (ไฟล์ที่ลบกลับมาครบ)
- ข้อควรระวัง: ไม่มีเครื่องมือแก้สกิลแบบหน้าเว็บแล้ว — แก้ `skills.json` ด้วยมือ แล้วรัน `node scripts/gen-catalog-sql.js` ถ้าค่าที่แก้ต้องเข้าฐานข้อมูล

### 2026-11-06 12:25 · Claude (claude-opus-5-5) · อัป Beta 0.17.0 (รัน v18 + merge)
- คำสั่งที่ได้รับ: "อัปเลย" + "ลงแพทโน๊ตด้วย"
- แก้: `client/public/version.js` + `package.json` 3 ตัว → 0.17.0 · `patchnotes.json` + `docs/PATCHNOTES.md` (กล่องจดหมาย + รายงานผู้เล่น + หน้าแอดมิน) · `docs/ROADMAP.md` ติ๊กข้อ 11–12 (commit `7cf98fd`)
- ฐานข้อมูลจริง: รัน v18 ผ่าน Supabase MCP (migration `v18_admin_tools` · เนื้อหาเหมือนไฟล์ ตัดเฉพาะบรรทัดคอมเมนต์บางส่วน) · ตรวจแล้ว: anon เรียก admin_*/get_mail ไม่ได้ · authenticated เรียก record_report/get_sanction ไม่ได้ · service_role เรียกได้ · RLS เปิดที่ mails/reports · ผู้เล่นยังเห็นตู้ครบ 3 ตู้ (โอกาสรวม 100% ทุกตู้) · ฟังก์ชันแอดมินทำงาน (ทดสอบใน transaction แล้ว rollback) · ไม่มีบัญชีโดนโทษ
- git: push `ai/admin-gacha` + fast-forward `main` `b7a2245..7cf98fd`
- ตรวจแล้ว: เทสที่อ่านแพตช์โน้ต/เวอร์ชัน (test-client · test-economy · test-games) ผ่าน · ยังไม่ได้ทดสอบบนเว็บจริงหลัง deploy
- สถานะ: เสร็จ
- วิธีย้อนกลับ: ดูรายการก่อนหน้า (git revert ทีละ commit · ฐานข้อมูลคืน _uid/delete_my_account/get_gacha ฉบับเดิม)

### 2026-11-06 12:00 · Claude (claude-opus-5-5) · หน้าแอดมินส่วนที่เหลือ (โรดแมพข้อ 11 ก–ง) + ปุ่มรายงานผู้เล่น (ข้อ 12)
- คำสั่งที่ได้รับ: "ทำตามโรดแมพ ข้อ 11 ตามลำดับ ก ข ค ง ได้เลย" (เจ้าของแจ้งว่าตรวจงานค้าง 0.15–0.16 บนเว็บจริงผ่านหมดแล้ว)
- เจ้าของเลือก: ก. ตู้มีเจ้าของแยก (ตู้จากไฟล์ / ตู้แอดมิน — seed ไม่แก้ทับตู้แอดมิน) · ใส่โอกาสเป็น % ต่อระดับ + เลือกของเรทอัป · ตรวจแค่ค่าที่พัง (ไม่ตั้งเพดานเศรษฐกิจ) · ข. แจกของเป็นจดหมายให้กดรับ · ง. ทำข้อ 12 คู่กัน: ปุ่มรายงานที่โต๊ะ (แตะป้ายชื่อ/ช่องที่นั่ง) + หน้าสรุปผลจบตา · เหตุผล 4 แบบ (ชื่อ/ข้อความ · ก่อกวน/สแปมอีโมต · สงสัยโกง · ออกกลางเกม/ถ่วงเวลา) · แอดมินจัดการได้ทั้ง ปิดเรื่อง/ทางลัด และ แบน/ปิดอีโมต
- branch: `ai/admin-gacha` · commit แรก `414ca3c` → `ed0a23d` (ก) · `ed03a98` → `1b30534` (ข) · `be0a3a9` (ค) · `619f690` → `3f9b185` → `f657061` (ง+12) · ท้ายสุด = commit WORKLOG นี้
- สร้างใหม่:
  - `supabase/v18_admin_tools.sql` — ก. คอลัมน์ gacha_banners.admin_owned/admin_cfg/image_url · _gacha_admin_rebuild (แบ่งน้ำหนักตาม % ต่อระดับ เศษแจกชิ้นแรก รวมพอดี 100%) · _gacha_rebuild_admin_pools (seed เรียกตอนท้าย) · admin_gacha_data/admin_save_banner/admin_delete_banner · get_gacha (คัดลอกจาก v17 + image_url) · ข. ตาราง mails/user_mails · get_mail/claim_mail/claim_all_mail · admin_send_mail/admin_list_mail/admin_delete_mail · ค. admin_find_player/admin_rename_player · ง. profiles.banned_until/ban_reason/muted_until · ตาราง reports · record_report + get_sanction (service_role เท่านั้น) · admin_list_reports/admin_resolve_report/admin_set_sanction · _uid() ปฏิเสธบัญชีที่ถูกแบน · delete_my_account ใช้ auth.uid() ตรง
  - `supabase/test/test_v18.sql` (118 ข้อ) · `server/test-moderation.js` (11 ข้อ · อยู่ใน npm test)
  - `client/public/Code/Mail/mail.js` + `.css` (กล่องจดหมาย) · `client/public/Code/Report/report.js` + `.css` (หน้าต่างรายงาน)
  - `server/src/moderation.js` (isBanned/isMuted · ตรวจไม่ได้ = ไม่มีโทษ) · `server/src/events/report-events.js` (event `player:report` → `report:done`)
- แก้:
  - `scripts/gen-catalog-sql.js` → สร้าง `supabase/seed_catalog.sql` ใหม่: เพิ่มคอลัมน์ admin_owned ถ้ายังไม่มี · upsert ตู้ `where not admin_owned` · ปิดตู้ที่ไม่มีในไฟล์ยกเว้นตู้แอดมิน · ท้ายไฟล์เรียก _gacha_rebuild_admin_pools ถ้ามี
  - `supabase/test/run.sh` (v18 สองรอบ + test_v18) · `supabase/README.md` (ลำดับ v16→v17→v18)
  - `Code/Admin/admin.js` + `.css` — แท็บใหม่ 🎰 ตู้กาชา · 📮 จดหมาย · 👤 ผู้เล่น · 🚩 รายงาน (FORM_BUILDERS/SAVE_FUNCTIONS/AFTER_CHANGE/saveArgs)
  - `Code/Gacha/gacha.js` บรรทัดเดียว: ใช้ image_url จากแอดมินก่อนรูปในไฟล์ (ยังเคารพ Shopsetting display=image)
  - `Code/Home/home-rov.js` — ไอคอน mail + ปุ่ม "จดหมาย" แถบข้าง + จุดแดง + badgeKey
  - `Code/Table/result.js` — ปุ่ม 🚩 ข้างชื่อ (`Report.button(p.i)` · ตัวเอง/บอท = ไม่ขึ้น)
  - `index.html` — `<link>` mail.css + report.css หลัง admin.css · `<script>` mail.js + report.js หลัง admin.js
  - `server/src/index.js` (แกนกลาง — เจ้าของเลือกระบบแบนที่ต้องแตะเซิร์ฟเวอร์): เพิ่มแค่ require + `registerReportEvents(socket, ctx)` · `server/src/supabase.js` verifyToken: บัญชีถูกแบน → null (unauthorized) · `server/src/events/emote-events.js`: ถูกปิดอีโมต → ไม่ส่งต่อ + แจ้ง system:error · `server/package.json` เพิ่ม test-moderation
- ไม่ได้แตะ (แต่เกี่ยวข้อง): gacha_pull (v17) · ตัวเลขเศรษฐกิจ · ไฟล์ Config.config ของตู้ทั้ง 3 · gamegx.js / games.js (ปุ่มรายงานบนโต๊ะใช้ฟัง click ที่ document ใน report.js) · connection.js (report.js ใช้ `sock` เดิม) · room/*
- ตรวจแล้ว: `sh supabase/test/run.sh` ผ่านทั้งชุด 563 ข้อ (Postgres 16 จำลอง · รวม test_v18: สิทธิ์ทุกฟังก์ชัน · ค่าที่พัง · น้ำหนัก/เรทอัป/ปัดเศษ · ผู้เล่นสุ่มตู้แอดมินได้ · รัน seed ซ้ำไม่ทับตู้แอดมิน · จดหมายรายคน/ทุกคน/คนสมัครใหม่/หมดอายุ/ถอน · เปลี่ยนชื่อ · รายงานซ้ำ/รัว · แบน/ปิดอีโมต/ยกเลิก · คนถูกแบนยังลบบัญชีได้) · `npm test` เซิร์ฟเวอร์ทั้งชุด exit 0 · `node --check` ทุกไฟล์ JS ที่แก้ · check-handlers · test-client-files · build-assets --check · screenshot จำลอง (DB.call ปลอมด้วยข้อมูลจริงจากฐานข้อมูลทดสอบ) 1280×640 + 915×412: แท็บตู้กาชา/ฟอร์มตู้/สลับวิธีจ่าย/ผลรวม % · กล่องจดหมาย · ปุ่มจดหมายหน้าแรก (ไม่ทับเมนูล่าง) · แท็บจดหมาย/ฟอร์มส่ง · แท็บผู้เล่น/ฟอร์มเปลี่ยนชื่อ · แท็บรายงาน · ฟอร์มลงโทษ · หน้าต่างรายงาน
- ยังไม่ได้ทดสอบ: ฐานข้อมูลจริง (ยังไม่รัน v18) · เว็บจริง/มือถือจริง · แตะป้ายชื่อบนโต๊ะจริงกับคนจริง 2 บัญชี (ทดสอบแค่ฝั่งเซิร์ฟเวอร์ด้วย mock + หน้าต่างแบบจำลอง) · ปุ่ม 🚩 ในหน้าสรุปผลจริง (ทดสอบแค่ว่า Report.button คืนปุ่ม/ว่างถูก) · ผู้เล่นที่ถูกแบนเห็นข้อความตอนล็อกอินบนเว็บจริง
- สถานะ: เสร็จบน branch
- งานค้าง/ขั้นต่อไป: 1) เจ้าของตอบเรื่องเวอร์ชัน/แพตช์โน้ต 2) รัน v18 บนฐานข้อมูลจริง (Supabase MCP apply_migration) แล้วตรวจ: anon เรียก admin_* ไม่ได้ · authenticated เรียก record_report/get_sanction ไม่ได้ · get_gacha ยังเห็นตู้ครบ 3 ตู้ 3) push + merge 4) ครั้งต่อไปที่รัน seed_catalog.sql ต้องเป็นฉบับใหม่นี้ (ฉบับเก่าจะเขียนทับตู้ที่แอดมินแก้)
- คำถามที่รอตอบ: อนุญาตอัปไหม · เวอร์ชัน Beta 0.17.0 + แพตช์โน้ต
- วิธีย้อนกลับ: ยังไม่ merge = ทิ้ง branch · merge แล้ว = `git revert` ทีละ commit (ใหม่→เก่า) · ฐานข้อมูล: รัน `_uid` จาก schema.sql · `delete_my_account` จาก account_delete.sql · `get_gacha` จาก v17 ใหม่ แล้ว drop ตาราง mails/user_mails/reports + ฟังก์ชันใหม่ (คอลัมน์ใหม่ใน gacha_banners/profiles ไม่ต้องลบ — ค่าเริ่มไม่มีผล)
- ข้อควรระวัง: แก้ตู้จากไฟล์ในหน้าแอดมิน = ตู้นั้นเป็นของแอดมินถาวร (Config.config ของตู้นั้นไม่มีผลอีก · คืนให้ไฟล์ต้องแก้ admin_owned = false ในฐานข้อมูล) · ลบตู้ = การันตีสะสมของผู้เล่นในตู้นั้นหาย · ตัวคูณเรทอัปของตู้แอดมินแบ่งส่วนในระดับเดียวกัน (รวมระดับคงที่) ต่างจากตู้ในไฟล์ที่คูณแล้วเปอร์เซ็นต์เพี้ยน · ตัวคูณเรทอัปตั้งต้นของฟอร์ม = 2 (RATE_UP_DEFAULT ต้น admin.js) · แบนแล้วคนที่ต่อเกมอยู่ยังเล่นตาเดิมจนกว่าจะหลุด/เชื่อมต่อใหม่ · ปิดอีโมตมีผลภายใน 1 นาที (MUTE_CACHE_MS) · ไม่มีระบบแชทพิมพ์ จึงปิดแค่อีโมต · บัญชีที่ถูกแบนลบตัวเองผ่านฐานข้อมูลได้ แต่หน้าเว็บเข้าไม่ถึงปุ่มลบ (ต้องล็อกอินผ่าน) — ถ้าต้องการให้ลบจากหน้าเว็บได้ ต้องทำเพิ่ม

### 2026-11-06 10:20 · Claude (claude-opus-5-5) · แก้ปุ่มหน้าแรกซ้อนกัน · Beta 0.16.1 (อัปแล้ว 10:15 · merge fast-forward เข้า main = e2e5009)
- คำสั่งที่ได้รับ: แก้ 0.16 ปุ่มด้านล่างซ้อนกัน (ภาพจากมือถือ: ปุ่มแถบข้างทับปุ่มร้านค้า/ช่องเก็บของ)
- สาเหตุ: 0.16.0 เพิ่มปุ่มอีเวนต์ + แอดมิน แถบข้าง `.rv-side` เริ่มที่ top 40vh และเรียงลงล่างไม่มีขอบเขต จึงยาวลงไปทับ `.rv-nav`
- branch: `ai/home-side-fix` · `965211f` (CSS) · `7ffbd6d` (เวอร์ชัน 0.16.1 + แพตช์โน้ต)
- แก้: `Code/Home/home.theme-5.css` ต่อท้ายไฟล์: `.rv-side` top 24vh · bottom 20vh · flex-wrap + align-content flex-start (ปุ่มที่ล้นขึ้นคอลัมน์ที่สองทางขวา) · gap 1.6vh · เวอร์ชัน 0.16.1 (version.js + package.json 3 ตัว) · patchnotes.json + PATCHNOTES.md
- ไม่ได้แตะ: home-rov.js · sakura-kit.css (ขนาดปุ่ม 9.6vh คงเดิม)
- ตรวจแล้ว: screenshot จำลองหน้าแรกตอนล็อกอิน (ปุ่มครบ 6 ปุ่ม) ที่ 800×360 · 915×412 · 1280×640 — ไม่ทับเมนูล่าง · check-handlers · test-client-files · test-client ผ่าน
- ยังไม่ได้ทดสอบ: มือถือจริง · จอที่สูงน้อยกว่า 360px
- วิธีย้อนกลับ: `git revert 7ffbd6d 965211f`
- ข้อควรระวัง: ถ้าเพิ่มปุ่มแถบข้างอีก ปุ่มจะขึ้นคอลัมน์ใหม่เอง (คอลัมน์ละ ~4–5 ปุ่ม) · ถ้าเปลี่ยนขนาดป้ายโปรไฟล์/เมนูล่าง ต้องปรับ top/bottom ของ .rv-side ตาม

### 2026-11-06 11:10 · Claude (claude-opus-5-5) · อัป Beta 0.16.0 ขึ้นจริง
- คำสั่งที่ได้รับ: "อัปเลย"
- ทำ: เทียบ md5 ของ gacha_pull · get_gacha · _quest_progress บนฐานข้อมูลจริงกับที่สร้างจาก repo (ถึง v16) — ตรงกันทั้ง 3 ตัว จึงแทนด้วยฉบับ v17 ได้ปลอดภัย → Supabase MCP `apply_migration` v17_events_admin → ตั้งแอดมิน: `insert into public.admins(user_id) select id from public.profiles where lower(username) = 'blackshine02'` → ตรวจ: แอดมิน 1 คน (เจ้าของ) · anon เรียก admin_* ไม่ได้ · ตัวช่วยภายในเรียกจาก client ไม่ได้ · ตาราง admins/events อ่าน-เขียนตรงไม่ได้ · เควสปกติ 16 อันเท่าเดิม · get_gacha ยังเห็นตู้ครบ 3 ตู้ (ยังไม่มีอีเวนต์ผูกตู้) → push `ai/events-admin` + merge fast-forward เข้า `main` (`abe7167..2a426ff`)
- ยังไม่ได้ทดสอบ: หน้าเว็บจริง (ปุ่มแอดมิน/อีเวนต์ · สร้างอีเวนต์ · รับรางวัล) · มือถือจริง
- วิธีย้อนกลับ: `git revert 2a426ff a41abac 7773652 1355dca` · ฐานข้อมูล: ดูรายการก่อนหน้า
- ข้อควรระวัง: ปุ่ม "แอดมิน" ขึ้นหลังหน้าแรกถาม is_admin เสร็จ (อาจช้ากว่าปุ่มอื่นเสี้ยววินาที) · ปุ่ม "อีเวนต์" ขึ้นเฉพาะตอนมีอีเวนต์กำลังจัด

### 2026-11-06 10:40 · Claude (claude-opus-5-5) · อีเวนต์ + เควสเพิ่ม + หน้าแอดมิน (โรดแมพข้อ 10 + ส่วนแรกข้อ 11) · Beta 0.16.0
- คำสั่งที่ได้รับ: ทำโรดแมพข้อ 10 · รายละเอียดอีเวนต์ทำพร้อมระบบแอดมิน ให้เพิ่ม/ลบ/แก้ทุกอย่างของอีเวนต์จากในเกม · เจ้าของเลือก: ตารางแอดมิน (คนแรก = Blackshine02) · เควสอีเวนต์ได้ 2 แบบ (ทั้งช่วง/รายวัน) · รูปแบนเนอร์ = ใส่ลิงก์ · เควสปกติแก้จากหน้าแอดมินได้ · ตู้อีเวนต์ = ผูกตู้ที่มีอยู่ · รางวัล = เหรียญ/เพชร/EXP พาส/ไอเทม
- branch: `ai/events-admin` · `1355dca` (SQL v17 + เทส) → `7773652` (หน้าอีเวนต์/แอดมิน) → commit เวอร์ชัน 0.16.0 → commit WORKLOG นี้
- สร้างใหม่: `supabase/v17_events_admin.sql` (ตาราง admins · admin_log · events · event_quests · user_event_quests · ฟังก์ชันผู้เล่น get_events/claim_event_quest/is_admin · ฟังก์ชันแอดมิน admin_overview/admin_save_*/admin_delete_*/admin_add_admin/admin_remove_admin · _window_progress ตัวนับกลาง · เควสชนิด feat + คอลัมน์ quest_defs.feat · gacha_pull/get_gacha คัดลอกจาก v8 + ตรวจ _banner_open) · `supabase/test/test_v17.sql` · `client/public/Code/Events/events.js` + `.css` · `client/public/Code/Admin/admin.js` + `.css`
- แก้: `supabase/test/run.sh` (v17 สองรอบ + test_v17) · `Code/Home/home-rov.js` (ไอคอน party/shield ใน I · badgeKey เพิ่ม Events/Admin · ปุ่ม "อีเวนต์" ขึ้นเมื่อมีอีเวนต์กำลังจัด · ปุ่ม "แอดมิน" ขึ้นเฉพาะแอดมิน) · `index.html` (`<link>` events.css + admin.css หลัง history.css · `<script>` events.js + admin.js หลัง history.js) · เวอร์ชัน 0.16.0 (version.js + package.json 3 ตัว) · patchnotes.json + PATCHNOTES.md · ROADMAP ข้อ 9/10/11
- ไม่ได้แตะ (แต่เกี่ยวข้อง): record_game_result · ตัวเลขเศรษฐกิจ (economy.js) · เควสเดิม 16 รายการ (ค่าเดิมทั้งหมด) · gacha.js (ตู้อีเวนต์ซ่อนเองเพราะ get_gacha ไม่ส่งมา)
- ตรวจแล้ว: `sh supabase/test/run.sh` ผ่านทั้งชุด รวม test_v17 (สิทธิ์แอดมิน · ตรวจข้อมูลที่กรอก · นับเควสเฉพาะช่วง/ไม่นับตาซ้อม · รับรางวัลครบทุกชนิด · รับซ้ำไม่ได้ · ตู้อีเวนต์ซ่อน/สุ่มไม่ได้นอกช่วง · เควสปกติชนิดท่าพิเศษ · ถอดตัวเองไม่ได้ · ลบอีเวนต์แล้วเควสหายตาม) · `node --check` 3 ไฟล์ JS · check-handlers · test-client-files · test-client · test-economy · test-games ผ่าน · screenshot จำลอง 1280×640: หน้าอีเวนต์ · แอดมิน 3 แท็บ · ฟอร์มอีเวนต์ · ฟอร์มเควส (DB.call ปลอม)
- ยังไม่ได้ทดสอบ: ปุ่มบนหน้าแรกจริง · ฐานข้อมูลจริง · มือถือจริง · ไปตู้จากหน้าอีเวนต์ (evGoBanner → gcBanner) · เทสเควสเดิม test_v6/v7 รันก่อน v17 (v17 แทน _quest_progress — test_v17 ตรวจเควสล็อกอินเดิมแทน)
- สถานะ: เสร็จบน branch
- งานค้าง/ขั้นต่อไป: 1) รัน v17 บนฐานข้อมูลจริง 2) `insert into public.admins(user_id) select id from public.profiles where lower(username) = 'blackshine02';` 3) push + merge 4) เปิดเว็บจริง: ปุ่มแอดมินขึ้น → สร้างอีเวนต์ทดสอบ → ปุ่มอีเวนต์ขึ้น
- คำถามที่รอตอบ: อนุญาตอัปขึ้นจริงไหม
- วิธีย้อนกลับ: ยังไม่ merge = ทิ้ง branch · merge แล้ว = `git revert` ทีละ commit · ฐานข้อมูล: รัน gacha_pull/get_gacha จาก v8 และ _quest_progress จาก v7 ใหม่ แล้ว drop ตาราง/ฟังก์ชันของ v17 (ตาราง events ฯลฯ ใหม่ทั้งหมด ไม่กระทบข้อมูลเดิม · quest_defs มีคอลัมน์ feat เพิ่ม ไม่ต้องลบ)
- ข้อควรระวัง: gacha_pull/get_gacha อยู่ใน v17 แล้ว — แก้ในอนาคตเริ่มจาก v17 ไม่ใช่ v8 · ตู้ที่ผูกอีเวนต์ใดก็ตาม (แม้อีเวนต์ปิด/จบ) จะซ่อน → อยากเปิดตู้ถาวรให้ถอดออกจากอีเวนต์ · ลบอีเวนต์ = ประวัติรับรางวัลหายด้วย (ปิดใช้แทนได้) · test user ใน test_v17 ใช้รหัส 0000…170x (ช่วง a–f ใช้หมดแล้ว)

### 2026-11-06 08:50 · Claude (claude-opus-5-5) · อัป Beta 0.15.0 ขึ้นจริง
- คำสั่งที่ได้รับ: "อัปเลย ทำแพทโน๊ตด้วย"
- แก้: `client/public/version.js` + `client/package.json` · `server/package.json` · `mobile/package.json` = 0.15.0 · `patchnotes.json` + `docs/PATCHNOTES.md` รายการ Beta 0.15.0 (commit `5ddf8f6`)
- ทำ: Supabase MCP `apply_migration` v16_history บนโปรเจกต์ที่ config.js ใช้ → ตรวจ: anon เรียกไม่ได้ · authenticated เรียกได้ · ลองเรียกแบบอ่านอย่างเดียวในนามผู้เล่นที่เล่นมากสุด ได้ประวัติ 30 แถว · 4 เกม · ยอดเล่นรวมตรงกับนับจาก game_log (78 = 78) → push `ai/history-stats` + merge fast-forward เข้า `main` (`5a05e64..5ddf8f6`)
- ตรวจแล้ว: test-client · test-economy · test-games ผ่าน (เทสที่อ่านเลขเวอร์ชัน/แพตช์โน้ต)
- ยังไม่ได้ทดสอบ: หน้าเว็บจริงขึ้น Beta 0.15.0 แล้วหรือยัง (session นี้เปิดเว็บเกมไม่ได้) · กดปุ่ม "📜 ประวัติ" บนเว็บจริง · มือถือจริง
- วิธีย้อนกลับ: `git revert 5ddf8f6 e62621a dbb872b 5429ba6` · ฐานข้อมูล: `drop function public.get_game_history(int); drop function public.get_game_stats();`

### 2026-11-06 08:10 · Claude (claude-opus-5-5) · ประวัติการเล่น + สถิติแยกเกม (โรดแมพข้อ 9)
- คำสั่งที่ได้รับ: ทำโรดแมพข้อ 9 · เจ้าของเลือก: สถิติคำนวณด้วย SQL ใหม่ v16 จาก game_log · ไม่นับตาโหมดซ้อม (โต๊ะที่มีบอทยังนับ ติดป้าย "มีบอท") · ประวัติ 30 ตาล่าสุด
- branch: `ai/history-stats` · `5429ba6` (SQL v16 + เทส) → `dbb872b` (หน้าต่าง + ปุ่ม)
- สร้างใหม่: `supabase/v16_history.sql` (get_game_history(p_limit) · get_game_stats() — อ่านอย่างเดียว เฉพาะผู้ล็อกอิน) · `supabase/test/test_v16.sql` · `client/public/Code/History/history.js` + `history.css` (หน้าต่าง 2 แท็บ: ประวัติล่าสุด · สถิติแยกเกม — historyOpen(tab) / historyTab(tab))
- แก้: `supabase/test/run.sh` (รัน v16 สองรอบ + test_v16 ท้ายสุด) · `Code/Profile/profile-card.js` เพิ่ม historyButton() + ใส่ใน myButtons() ต่อจากปุ่มความสำเร็จ · `index.html` `<link>` history.css หลัง avatar-frame.css (ก่อน sakura-kit.css) · `<script>` history.js หลัง achievements.js
- ไม่ได้แตะ (แต่เกี่ยวข้อง): record_game_result (v7) · ตาราง game_stats (หน้าโปรไฟล์เดิม/บัตรโปรไฟล์ยังอ่านจากตารางนี้) · เซิร์ฟเวอร์ทั้งหมด · patchnotes.json / version.js (รอเจ้าของตัดสิน)
- ตรวจแล้ว: `sh supabase/test/run.sh` ผ่านทั้งชุดรวม test_v16 (Postgres 16 จำลอง) · `node --check` history.js · profile-card.js · `check-handlers` ผ่าน · `test-client-files` ผ่าน · screenshot จำลอง 1280×640 และ 915×412 (มีข้อมูล / ไม่มีข้อมูล ทั้ง 2 แท็บ) ใช้ DB.call ปลอม
- ยังไม่ได้ทดสอบ: ปุ่ม "📜 ประวัติ" บนบัตรโปรไฟล์จริง (หน้าจำลองเปิดบัตรไม่ได้เพราะไม่มีฐานข้อมูล) · ฐานข้อมูลจริง (ยังไม่ได้รัน v16) · มือถือจริง
- สถานะ: เสร็จบน branch · รอ push/merge + รัน v16
- งานค้าง/ขั้นต่อไป: 1) รัน `supabase/v16_history.sql` บนฐานข้อมูลจริงก่อน (ถ้ายังไม่รัน หน้าต่างขึ้นว่า "รอการอัปเดตฐานข้อมูล" ไม่พัง) 2) push + merge 3) เปิดบัตรโปรไฟล์บนเว็บจริงกดปุ่มประวัติ
- คำถามที่รอตอบ: ลงแพตช์โน้ต + เลขเวอร์ชันไหม (เสนอ Beta 0.15.0 เพราะเป็นฟีเจอร์ใหม่)
- วิธีย้อนกลับ: ยังไม่ merge = ทิ้ง branch · merge แล้ว = `git revert dbb872b 5429ba6` · ฐานข้อมูล: `drop function public.get_game_history(int); drop function public.get_game_stats();` (ไม่มีตาราง/ข้อมูลใหม่)
- ข้อควรระวัง: ตั้งแต่ v6 ผลมีแค่ win/loss (ไม่มีเสมอ · ไม่มีเสียเหรียญ) — ช่อง draws/coins_lost ใน game_stats เป็นค่าค้างจากยุคก่อน v6 ไม่ใช่บั๊ก · "ฟาร์ม" ในฐานข้อมูล = ทุกโต๊ะที่มีบอท (เซิร์ฟเวอร์ส่ง p_bots) ไม่ใช่เฉพาะห้องฟาร์ม · `_uid()` ยิงข้อความ "กรุณาเข้าสู่ระบบ" เองเมื่อไม่ล็อกอิน

### 2026-11-05 23:20 · Claude (claude-opus-5-5) · รูป UI ซากุระชุดใหม่ที่เจ้าของตัดพื้นให้ · Beta 0.14.2
- คำสั่งที่ได้รับ: เอารูปที่เจ้าของตัดพื้นเอง (ป้ายโปรไฟล์ · แถบเหรียญ/เพชร/สตามิน่า · ปุ่มกลม · กรอบรูปโปรไฟล์แยก) แทนของเดิมที่ Claude ตัด แล้วอัปเลย
- branch: `ai/ui-kit-recut` (`d717030` รูป + CSS · `11f2e99` เวอร์ชัน) · `ai/avatar-frame-art` (`83b3501` กรอบรูปโปรไฟล์จากไฟล์แยกของเจ้าของ)
- แก้: `Assets/UI/Assets/kit3/` profile-frame (1412×532 = สัดส่วนเดิม 706×266 ×2 · บีบแนวนอน ~3% ให้ตำแหน่ง % เดิมใช้ได้) · bar-coin 697×156 · bar-gem 672×144 · bar-stamina 677×180 (สูง ×2 · ความกว้างตามรูปใหม่) · btn-round 256×257 · av-frame 640×555
- แก้ `Code/Theme/sakura-kit.css`: ค่าตัด 9-slice ใหม่ (เหรียญ 0 118 0 168 · เพชร 0 118 0 153 · สตามิน่า 0 110 0 135) + --bar-l/--bar-r · ตำแหน่งวงรูปป้ายโปรไฟล์ .rv-av2 (วงในรูปใหม่โปร่งใส x58–268 y30–246) · `skin/avatar-frames.json` + fallback ใน avatar-frame.js: circle cx 349 cy 289 r 228 w 640 h 555
- กับดักที่เจอ: เจ้าของอัป bar-coin.webp (รูปดิบ) ขึ้น `main` ผ่านหน้าเว็บ GitHub ระหว่างทำงาน → push ถูกปฏิเสธ → rebase งานบน origin/main แล้วใช้ไฟล์ที่ปรับขนาด/ค่าตัดแล้ว (รูปเดียวกัน) · push ครั้งแรก GitHub ตอบ 500 ลองใหม่ผ่าน
- ตรวจแล้ว: check-handlers · test-client-files · screenshot จำลอง (หน้าแรก 1280 ×2 · หน้าแก้ชื่อ · บัตรโปรไฟล์) · หน้าเว็บจริง version.js = Beta 0.14.2 และไฟล์รูปบนเว็บตรงกับใน repo (md5)
- ยังไม่ได้ทดสอบ: แถบสตามิน่าบนหน้าจอจริง (หน้าจำลองไม่ได้ล็อกอินจึงไม่ขึ้น) · มือถือจริง
- วิธีย้อนกลับ: `git revert 83b3501 11f2e99 d717030`
- ข้อควรระวัง: ถ้าเปลี่ยนรูปแถบอีก ต้องวัดค่าตัดใหม่ (ซ้าย = จบไอคอน · ขวา = เริ่มปุ่มบวก) และแก้ --bar-l/--bar-r = ค่าตัด ÷ ความสูงรูป

### 2026-11-05 22:10 · Claude (claude-opus-5-5) · แก้ไข Beta 0.14.1 (ห้องแรงก์ · ป้ายแจ้ง · หน้าแก้ชื่อ/ฉายา · กรอบรูปโปรไฟล์)
- คำสั่งที่ได้รับ: 1) ห้องแรงก์การ์ดผู้เล่นใหญ่เต็มจอ → ให้เล็กเท่าห้อง 4 คน 2) ป้าย "ได้ฉายา" ขยับขึ้นเหนือหน้าต่าง 3) หน้าแก้ชื่อ/ฉายาปรับธีมหน้าต่าง + เปลี่ยนกรอบรูปโปรไฟล์และแยกเป็นระบบ (อนาคตให้เลือกกรอบ) + ช่องฉายาเลือกจากที่ปลดล็อกแทนพิมพ์เอง · เจ้าของอนุญาตให้ตรวจผ่านแล้วอัปทั้งหมดได้เลย
- branch: `ai/fix-0.14.1` · commit `2db4ee4` → `89cf6a0`
- สร้างใหม่: `Code/AvatarFrame/avatar-frame.js` + `.css` (AvatarFrame.wrap/current/list) · `skin/avatar-frames.json` (กรอบ + ตำแหน่งวงด้านใน) · `Assets/UI/Assets/kit3/av-frame.webp` (ตัดจาก profile-frame.webp: เจาะวงใน + ตัดแผ่นชื่อออก) · `supabase/v15_title_select.sql` (set_title · update_profile รับเฉพาะชื่อฉายาที่ปลดล็อก) · `supabase/test/test_v15.sql`
- แก้: `Code/Lobby/lobby-room.js` gxRoom: `seats` = อย่างน้อย 4 ที่นั่ง (ห้องแรงก์/หาแมตช์/ไม่มีบอท) · `Code/Quests/quests.css` + `quests-local.js` (สไตล์ที่ฉีดเอง) ป้ายแจ้ง top 22% → 12% · `Code/Account/profile-page.js` avatarHtml ใช้ AvatarFrame + titleField (select) + pvSetTitle · `account.theme-3.css` สไตล์ select + ซ่อนวงทองเดิมเมื่อมีกรอบใหม่ · `Theme/sakura-kit.css` แผง .pv-card ใช้กรอบหน้าต่าง + padding · `index.html` `<script>` avatar-frame.js ก่อน profile-page.js · `<link>` avatar-frame.css หลัง achievements.css · `supabase/test/run.sh` v15 รันหลังเทสเดิม (test_v6 ทดสอบพฤติกรรมพิมพ์ฉายาเดิม) · เวอร์ชัน 0.14.1 + แพตช์โน้ต
- ตรวจแล้ว: `sh supabase/test/run.sh` ผ่าน (รวม test_v15) · `npm test` 2 รอบ: รอบแรก test-ranked ล้ม 1 จุด (รอ 80ms ตอนเครื่องหนัก) รันเดี่ยว 5/5 ผ่าน รอบสองผ่านทั้งชุด · check-handlers · test-client-files · build-assets --check · screenshot จำลอง 915/1280 · เว็บจริง (บัญชีทดสอบ ลบแล้ว): หน้าแก้ชื่อมี select + กรอบรูปใหม่ · พิมพ์ฉายาเองผ่าน API ถูกปฏิเสธ · ถอดฉายาได้ · ในฐานข้อมูลมีบันทึกท่าพิเศษจากเกมจริงแล้ว 2 แถว (ระบบ feats ทำงาน)
- ยังไม่ได้ทดสอบ: ห้องแรงก์บนเว็บจริงแบบหลายคน · เลือกฉายาที่มีจริงบนเว็บจริง (บัญชีทดสอบไม่มีฉายา)
- ข้อสังเกต (ยังไม่แก้): ฉายาจากความสำเร็จขึ้นขั้นแล้วชื่อเปลี่ยน แต่ฉายาใต้ชื่อที่ติดไว้ยังเป็นชื่อขั้นเดิมจนกว่าจะเลือกใหม่ · ผู้เล่นที่พิมพ์ฉายาเองไว้ก่อน 0.14.1 ยังแสดงอยู่จนกว่าจะเปลี่ยน · test-ranked ใช้ sleep 80ms อาจล้มตอนเครื่องหนัก
- วิธีย้อนกลับ: `git revert` ทีละ commit · v15 ย้อนได้ด้วยการรัน update_profile ของ v6 ใหม่

### 2026-11-05 21:20 · Claude (claude-opus-5-5) · อัป Beta 0.14.0 ขึ้นจริง
- คำสั่งที่ได้รับ: "เลือกเพชรแบบ ก (ขั้นทอง 20 เพชร รวม 880) · อัปเลย"
- ทำ: Supabase MCP `apply_migration` v14_achievements → seed (ส่วน insert ล้วน เพราะตารางยังว่าง · ครั้งแรกที่ส่งทั้งไฟล์ถูกยกเลิกเองที่หน้ายืนยัน ไม่มีอะไรรัน) → ตรวจ: 44 ความสำเร็จ · 128 ขั้น · เพชรรวม 880 · เหรียญรวม 73,400 · get/claim เรียกได้เฉพาะผู้ล็อกอิน · record_game_feats เฉพาะ service_role · น็อกย้อนหลัง 6 แถว → push `ai/achievements` + merge fast-forward เข้า `main`
- ตรวจบนเว็บจริง (บัญชีทดสอบ ลบแล้ว · ตรวจในฐานข้อมูลว่าไม่ค้าง): ปุ่ม "สำเร็จ" หน้าแรกขึ้น · หน้าต่างโหลด 128 ขั้น · กดรับขั้นที่ยังไม่ครบ → "ยังทำไม่ครบ" ✓ · ไม่มี error ในหน้า
- ยังไม่ได้ทดสอบ: ท่าพิเศษถูกบันทึกจากเกมจริง (ต้องเล่นจบตา) → ดูได้ด้วย `select gid, feats from game_log where feats <> '{}' order by played_at desc limit 10`
- ข้อควรระวัง: ไฟล์ seed มี begin/commit — รันผ่าน SQL Editor ได้ตรง ๆ · ผ่าน apply_migration ให้ตัด begin/commit ออก

### 2026-11-05 21:00 · Claude (claude-opus-5-5) · ความสำเร็จ + ฉายาพิเศษ (โรดแมพข้อ 8) · Beta 0.14.0
- คำสั่งที่ได้รับ: เริ่มข้อ 1 (ความสำเร็จ) · เจ้าของเลือก: รางวัล = ฉายา + เหรียญ + เพชรขั้นทอง · ทางเข้า = บัตรโปรไฟล์ + หน้าแรก · "เพิ่มให้เยอะกว่านี้ แยกเป็นเกม เกมละ 20" (นับรวมขั้น) · เพิ่มการบันทึกท่าพิเศษที่เซิร์ฟเวอร์
- branch: `ai/achievements` (แตกจาก `ai/profile-avatar-fix`) · commit `add88ef` → `f9359fd` + WORKLOG
- สร้างใหม่:
  - `server/src/rules/<เกม>/feats.js` ×5 — ท่าพิเศษของที่นั่งตอนจบตา (ดัมมี่: knock knock_dark knock_suit head speto · ป๊อกเด้ง: pok pok9 tong sflush straight sam dealer_win · เก้าเก: tong seq sean colour allfold · ผสมสิบ: special sp_aces sp_suit nojoker · อีแก่: first safe close oldmaid — ek-first เปลี่ยนเป็น ek-close "รอดหวุดหวิด" เพราะหมดไพ่คนแรก = ชนะอันดับ 1 ซ้ำกับ ek-wins) · v14 นับน็อกย้อนหลังจากคอลัมน์ knock · head/speto นับเป็นจำนวนตา — อ่านสถานะอย่างเดียว ไม่แตะกติกา
  - `server/test-feats.js` (เพิ่มใน npm test) — บอทเล่น 1,500 ตาต่อเกม ตรวจรูปแบบ + ท่าที่ความสำเร็จใช้เกิดได้จริง
  - `client/public/skin/achievements.json` — รายการ 44 ความสำเร็จ 128 ขั้น (ทั่วไป 24 · ดัมมี่ 21 · ป๊อกเด้ง 21 · เก้าเก 21 · ผสมสิบ 20 · อีแก่ 21) + รางวัลตามระดับ (ทองแดง 200 · เงิน 500 · ทอง 1,000 + 💎20) · รวมทั้งหมด 73,400 เหรียญ · 880 เพชร
  - `scripts/gen-achievements-sql.js` → `supabase/achievements_seed.sql` (สร้างอัตโนมัติ ห้ามแก้มือ · `--check` ตรวจอย่างเดียว)
  - `supabase/v14_achievements.sql` — game_log.feats · achievement_defs · achievement_tiers · user_achievements · _ach_streak · _ach_progress · get_achievements · claim_achievement (รับเรียงขั้น · ฉายา user_titles `ach:<id>` times = ระดับ 1-3) · record_game_feats (service_role เท่านั้น)
  - `supabase/test/test_v14.sql`
  - `client/public/Code/Achievements/achievements.js` + `.css` — หน้าต่าง (st-modal ซากุระ) แท็บ 6 หมวด · `Achievements.count()` (โหลดใหม่อย่างมากนาทีละครั้ง)
- แก้:
  - `server/src/rules/<เกม>/index.js` ×5 — export `feats` · `somsip/engine.js` export `wildFn` เพิ่ม
  - `server/src/results/record-results.js` — `featsOf` + `recordFeats` เรียก record_game_feats หลัง record_game_result สำเร็จ (พัง = log เฉย ๆ ไม่กระทบการบันทึกผล)
  - `server/test-supabase.js` — mock record_game_feats + ตรวจลำดับการเรียก · `server/package.json` เพิ่ม test-feats
  - `client/public/index.html` — `<script>` achievements.js หลัง profile-card.js · `<link>` achievements.css หลัง profile-card.css
  - `Code/Home/home-rov.js` — ปุ่มข้าง "สำเร็จ" + จุดแดง + badgeKey · `Code/Theme/sakura-kit.css` ป้ายปุ่มข้าง nowrap
  - `Code/Profile/profile-card.js/.css` — ปุ่ม "🏅 ความสำเร็จ" + ลิงก์ที่หัวข้อเส้นทางแห่งเกียรติยศ · medalTier ของฉายา ach: ใช้ระดับ
  - เอกสาร: `server/src/rules/README.md` (สัญญา feats) · `supabase/README.md` (ลำดับ v13 → v14 → seed)
  - เลขเวอร์ชัน 0.14.0 + patchnotes.json + docs/PATCHNOTES.md
- ไม่ได้แตะ: กติกาเกม (engine.js ทุกเกม ยกเว้น export wildFn) · server/src/index.js · room/* · record_game_result (SQL เดิม)
- ตรวจแล้ว: `npm test` เต็มชุด 1 ใน 3 รอบ exit 1 (หาสาเหตุไม่เจอ รันซ้ำไม่เกิด) · รันทีละไฟล์ผ่านทุกไฟล์ · `sh supabase/test/run.sh` ผ่าน (รวม test_v14) · check-handlers · test-client-files · build-assets --check · gen-achievements-sql --check · screenshot จำลอง 915×412 + 1280×720: หน้าต่างความสำเร็จ (แท็บดัมมี่/ป๊อกเด้ง) · กดรับ · ปุ่มหน้าแรก · บัตรโปรไฟล์
- ยังไม่ได้ทดสอบ: ฐานข้อมูลจริง (ยังไม่รัน v14) · เซิร์ฟเวอร์จริงส่งท่าพิเศษ · มือถือจริง
- สถานะ: เสร็จ — รออนุมัติ
- ขั้นต่อไป: 1) รัน `v14_achievements.sql` แล้ว `achievements_seed.sql` บน Supabase **ก่อน** อัปเซิร์ฟเวอร์ 2) push + merge `ai/achievements` (Render deploy เซิร์ฟเวอร์ · Cloudflare deploy หน้าเว็บ) 3) ทดสอบบนเว็บจริงด้วยบัญชีทดสอบ
- คำถามที่รอตอบ: อนุมัติรัน SQL + push/merge · ยอดรวมเพชร 880 โอเคไหม (ปรับใน achievements.json → rewards)
- วิธีย้อนกลับ: ยังไม่ merge = ทิ้ง branch · merge แล้ว = `git revert` ทีละ commit · SQL v14 แค่เพิ่มตาราง/คอลัมน์/ฟังก์ชัน (เซิร์ฟเวอร์เก่าไม่เรียก record_game_feats ก็ทำงานปกติ)
- ข้อควรระวัง: แก้ achievements.json แล้วต้องรัน gen-achievements-sql.js + รัน seed บนฐานข้อมูล (ไฟล์สร้างอัตโนมัติใหม่ — เสนอเพิ่มในตาราง CLAUDE.md หมวด 7) · ท่าพิเศษนับเฉพาะตาหลังอัปเดต · ห้ามเปลี่ยน id ความสำเร็จ/ชื่อท่า (ฉายาที่ได้ผูกกับ id)

### 2026-11-05 19:45 · Claude (claude-opus-5-5) · ทดสอบเว็บจริง 0.13.4 + แก้รูปบัตรโปรไฟล์บัญชีใหม่
- คำสั่งที่ได้รับ: ตรวจหน้าที่ค้างบนเว็บจริง (เจ้าของให้ทดสอบเองได้เลย แบบแชทก่อน)
- วิธีทดสอบ: Playwright เปิด https://dummy-online.pages.dev (ปลุกเซิร์ฟเวอร์ Render ก่อน · /health = 0.13.4, db true) → สมัครบัญชีทดสอบ `qa…` (รหัสสุ่ม ไม่ได้บันทึก) → ตรวจ → **ลบบัญชีทดสอบทุกบัญชีด้วย delete_my_account แล้ว** (ทำหลายรอบ ทุกรอบลบสำเร็จ)
- ผลบนเว็บจริง: บัตรโปรไฟล์โหลดจากฐานข้อมูล v13 ได้ · แก้ไขบัตร (ข้อความ + ตู้โชว์) บันทึกได้ · เปลี่ยนธีมได้ · ปุ่ม "ชื่อ / ฉายา" เปิดหน้าเดิมได้ · หน้าเพื่อนปกติ · เล่นกับบอท: กรอบคำพูดตอนเริ่มตาขึ้นที่รูปตัวละคร (ตำแหน่งใหม่) ✓
- บั๊กที่เจอ + แก้: บัญชีใหม่ที่ยังไม่ตั้งตัวละครเด่น/ตู้โชว์ รูปบนบัตรเป็น "?" → ใช้อีโมจิแบบแถบด้านบน (`profile-card.js: avatarHtml`) · branch `ai/profile-avatar-fix`
- ข้อสังเกต (ยังไม่แก้): ช่อง "ตัวละคร" บนบัตรนับเฉพาะตัวที่มีแถวดาว (user_characters) ตัวฟรีเริ่มต้นไม่ถูกนับ — บัญชีใหม่จึงขึ้น 0 · กับดักตอนทดสอบ: บทสอนเด้งเองหลังสมัครและสร้างห้องบนเซิร์ฟเวอร์ ต้องออกห้องก่อนเริ่มเล่นคนเดียว
- ยังไม่ได้ทดสอบ: ล็อบบี้หลายคนจริง · หน้าสรุปผลจบตา/เล่นต่อ (ต้องเล่นจบตา) · บทพูดเกมอื่น · แบทเทิลพาส/อันดับ
- วิธีย้อนกลับ: `git revert <commit>`

### 2026-11-05 18:20 · Claude (claude-opus-5-5) · ย้ายกรอบคำพูดบนโต๊ะไปที่รูปตัวละคร
- คำสั่งที่ได้รับ: "แก้ข้อความบนโต๊ะ ให้มาอยู่ตรงตัวละคร" (ภาพจากเจ้าของ: กรอบคำพูดของเราทับบันทึกเกม/ป้ายแต้มมุมล่างซ้าย)
- branch: `ai/table-talk-pos` · commit `79d3381`
- แก้: `client/public/Code/Table/table-talk.js` — เพิ่ม `characterImage` · `visibleRect` · `placeOnCharacter` (วางที่ `.gx-art-<ตำแหน่ง>` · ตัวบนวางระดับอกชี้ขึ้น · ตัวอื่นวางเหนือหัวชี้ลง · ค่าสัดส่วน HEAD_TOP_SEAT / HEAD_OTHER_SEAT ต้นไฟล์) · `placeBubble` ลองวางที่ตัวละครก่อน ไม่มีรูปค่อยใช้ป้ายที่นั่งเหมือนเดิม · `keepInsideScreen` ดันไม่ให้ล้นจอแนวตั้งด้วย
- ไม่ได้แตะ: gamegx.js · games.js · seatfx.js · table-talk.css
- ตรวจแล้ว: `node --check` · screenshot จำลองโต๊ะดัมมี่ 915×412 และ 1280×720 ให้ทั้ง 4 ที่นั่งพูดพร้อมกัน — กรอบอยู่ที่ตัวละครทุกตัว ไม่ล้นจอ
- ยังไม่ได้ทดสอบ: โต๊ะเกมอื่น (games.js ใช้ `.gx-art-*` แบบเดียวกัน คาดว่าได้) · มือถือจริง
- สถานะ: เสร็จ — รออนุมัติ push/merge
- วิธีย้อนกลับ: `git revert 79d3381`

### 2026-11-05 15:30 · Claude (claude-opus-5-5) · ตัวละครพูดบนโต๊ะ + หน้าโปรไฟล์แบบ Endfield · Beta 0.13.4
- คำสั่งที่ได้รับ: "ทำเลย พร้อมกับ ระบบ โปรไฟล์ แบบ Enfield" (ต่อจากระดมสมอง: กรอบคำพูดตัวละครบนโต๊ะ + หน้าโปรไฟล์แบบ Arknights: Endfield)
- branch: `ai/profile-voice` · commit แรก `f9aab98` (บทพูด) → ล่าสุด = commit เลขเวอร์ชัน 0.13.4
- สร้างใหม่:
  - `client/public/skin/table-talk.json` — บทพูด 12 ตัวละคร (start/meld/head/deposit/knock/win/lose) + โอกาสพูด (`chance`) + บทกลาง (`defaults`) · ข้อมูลล้วน
  - `client/public/Code/Table/table-talk.js` + `.css` — อ่าน `S.ev` (ดัมมี่) / `S.over`+`S.res` (ทุกเกม) ทุก 0.3 วิ แบบ seatfx.js ไม่ห่อ render() · ไม่มีผลกับเกม · ไม่พูดในบทสอน
  - `supabase/v13_profile_card.sql` — คอลัมน์ profiles: bio · showcase · pinned_titles · card_theme · featured_char + `_has_char` · `_profile_card` · `get_profile_card(p_username)` · `set_profile_card(...)` (ตรวจทุกช่อง: bio ≤60 + ตัวกรองคำ · ตู้โชว์ ≤4 ต้องมีตัวจริง · เหรียญ ≤6 ต้องมีฉายาจริง · ธีม 3 แบบ) · ดูของคนอื่นไม่ส่งเหรียญ/เพชร/คลัง
  - `supabase/test/test_v13.sql` — เทสครบทุกช่อง + สิทธิ์
  - `client/public/Code/Profile/profile-card.js` + `.css` — หน้าโปรไฟล์ใหม่ (เขียนทับ `profileView()` ของ Account/profile-page.js · หน้าเดิมเปิดจากปุ่ม "ชื่อ / ฉายา") · หน้าต่างแก้ไขบัตร · `profileCardOpen(username)` ดูบัตรคนอื่น · ฐานข้อมูลยังไม่มี v13 = แสดงจาก DB.P แบบอ่านอย่างเดียว + ปิดปุ่มแก้ไข · "ระดับนักไพ่"/ความชำนาญรายเกม = แสดงผลอย่างเดียว (แต้ม = เล่น + ชนะ×2 · 10 แต้ม/เลเวล · สูงสุด 50) ไม่มีรางวัล
- แก้:
  - `client/public/index.html` — เพิ่ม `<script>` table-talk.js (defer หลัง seatfx.js) · profile-card.js (หลัง profile-page.js) · `<link>` table-talk.css + profile-card.css (ก่อน sakura-kit.css)
  - `Code/Settings/settings.js` — เพิ่มแถวสวิตช์ `pvTalk` (บทพูดตัวละคร)
  - `Code/Friends/friends.js` — ฟังก์ชัน `row` : รูปเพื่อนกดแล้วเปิดบัตร · `friends.css` เพิ่ม cursor
  - `supabase/test/run.sh` — รัน v13 สองรอบ + test_v13
  - เลขเวอร์ชัน 0.13.4: version.js · package.json 3 ไฟล์ · patchnotes.json · docs/PATCHNOTES.md
- ไม่ได้แตะ (แต่เกี่ยวข้อง): `Code/Account/profile.js` · `profile-page.js` · `profile-equip.js` · `Core/router.js` · `Core/skins.js` · กติกาเกมฝั่งเซิร์ฟเวอร์
- ตรวจแล้ว: `sh supabase/test/run.sh` ผ่านทุกไฟล์ (รวม test_v13) · `node scripts/check-handlers.js` ผ่าน · `node server/test-client-files.js` ผ่าน · `node server/test-client.js` ผ่าน 27 จุด · `node --check` ทุกไฟล์ JS ที่แก้ · screenshot จำลอง (mock DB.call) 915×412 + 1280×720: บัตร 3 ธีม · หน้าต่างแก้ไข · บัตรเพื่อน · โหมดไม่มี v13 · บทพูดบนโต๊ะดัมมี่ (เกิดหัว/เกิด/น็อก/แพ้)
- ยังไม่ได้ทดสอบ: ฐานข้อมูลจริง (ยังไม่ได้รัน v13 บน Supabase) · โต๊ะเกมอื่นนอกจากดัมมี่ (หาคนชนะจาก res.rows/coin/pts — ต้องดูบนเว็บจริง) · บนมือถือจริง
- สถานะ: เสร็จ — รอเจ้าของอนุมัติ push/merge
- งานค้าง/ขั้นต่อไป: 1) (เสร็จ) รัน v13 บนฐานข้อมูลจริงแล้ว — ตรวจ: ฟังก์ชันครบ 4 ตัว · authenticated เรียก get/set ได้ · anon เรียกไม่ได้ · ฟังก์ชันภายในเรียกตรงไม่ได้ · `_profile_card` คืนค่าครบทุกช่อง 2) push + merge `ai/profile-voice` 3) เปิดเว็บจริงตรวจหน้าโปรไฟล์ + บทพูดเกมอื่น
- คำถามที่รอตอบ: อนุมัติ push/merge
- วิธีย้อนกลับ: ยังไม่ merge = ทิ้ง branch `ai/profile-voice` · merge แล้ว = `git revert` ทีละ commit · SQL v13 แค่เพิ่มคอลัมน์/ฟังก์ชัน ไม่ต้องย้อน (ถ้าจะย้อนจริง: drop ฟังก์ชัน get/set_profile_card, _profile_card, _has_char)
- ข้อควรระวัง: profile-card.js ต้องโหลดหลัง profile-page.js (เขียนทับ profileView) · หน้าเดิม (ชื่อ/ฉายา) ยังใช้ร่วม — ถ้าแก้ profile-page.js ให้ดูว่าปุ่มย้อนกลับถูกเปลี่ยนเป็น `pcBack()` · ธีมใหม่ต้องเพิ่มทั้ง THEMES (js) + CSS + รายชื่อใน set_profile_card (SQL)

### 2026-11-05 13:10 · Claude (claude-opus-5-5) · CLAUDE.md เพิ่มคำสั่งสคริปต์ตัดพื้น ui-cutout.py
- คำสั่งที่ได้รับ: เจ้าของอนุมัติให้ใส่ `scripts/ui-cutout.py` ใน CLAUDE.md
- แก้: `CLAUDE.md` หมวด 10 (คำสั่งที่ใช้บ่อย) เพิ่มคำสั่ง + ตัวเลือก + วิธีติดตั้ง · หมวด 11 (ข้อควรระวัง) เพิ่มข้อรูป UI ชุดซากุระ (ใช้สคริปต์นี้ตัด · ตัดใหม่ต้องขนาดเท่าเดิมเพราะค่าตัด 9-slice อ้างพิกเซล)
- นอก repo: อัปเดต CLAUDE.md ใน claude.ai Project ให้ตรง
- ตรวจแล้ว: ดู diff (เอกสารล้วน)
- สถานะ: เสร็จ — push + merge เข้า `main` ตามข้อยกเว้นงานเอกสาร (หมวด 13.7)
- วิธีย้อนกลับ: `git revert <commit>`

### 2026-11-05 13:40 · Claude (claude-opus-5-5) · ชุด UI ซากุระทั้งเกม + สคริปต์ตัดพื้นแบบ alpha matting · Beta 0.13.3
- คำสั่งที่ได้รับ: 1) รับ `<link>` sakura-kit.css ท้าย index.html + push/merge 0.13.2 (ทำแล้ว `79a16a1`) 2) "ทำให้เป็นแบบใหม่ทั้งหมดเลย" 3) "หาสคริปต์ที่ตัดพื้นหลังให้เทพ ๆ และเนียนกว่านี้"
- สร้างใหม่:
  - `scripts/ui-cutout.py` — ตัดพื้นสีเรียบ: flood fill จากขอบ → trimap → closed-form alpha matting (pymatting) → foreground estimation ถอดสีพื้นที่ปนขอบ → ตัดเงา/ฝ้าจาง (`--shadow drop` ค่าเริ่มต้น, `keep` เก็บแสงเรือง) · `--ai` ใช้โมเดล ISNet (rembg) ช่วยหารูปทรง · `--no-trim` · `--webp` · ต้องติดตั้ง `pip install numpy pillow scipy pymatting` (rembg ไม่บังคับ) — **ไม่ได้เพิ่มลง package.json เพราะเป็น Python** · เทียบแล้ว: แบบเดิมมีขอบเทาด้านในกลีบดอก แบบ matting ล้วนมีฝ้า แบบ matting+ตัดเงาสะอาดสุด
  - `client/public/Assets/UI/Assets/kit3/` เพิ่ม `bar-title.webp` (ชิ้น 08) · `btn-cream.webp` (14) · `btn-pink.webp` (20) · `btn-blue.webp` (30)
- แก้:
  - kit3 ทั้ง 10 ไฟล์เดิม ตัดใหม่ด้วยสคริปต์นี้ โดยครอปกรอบเดียวกับไฟล์เดิม (ขนาดเท่าเดิมทุกไฟล์) ค่าตัด 9-slice ใน CSS จึงใช้ได้เหมือนเดิม
  - `client/public/Code/Theme/sakura-kit.css` — กรอบซากุระขยายเป็น `.sk-modal .sk-box` (ทุกบาน: สกิล · เควส · รางวัลล็อกอิน) · `.st-modal .st-box` (ทุกบาน: ตั้งค่า · แพตช์โน้ต · สตามิน่า ฯลฯ) · `.cr-box` · `.mm-box` · `.panel` (padding 1.6vh แทน border เดิม) · ปรับสีข้างในหน้าต่างที่เคยมืด (dl-* · cr-* · mm-*) · แถบหน้าย่อย `.hud-back` `.hud-sk` = ปุ่มกลมครีม · `.pg-title` = bar-title 3 ช่วง · `.chip` `.catbtn` ครีมขอบทอง แท็บที่เลือกชมพู · หน้าเล่นเกม `.plank` ปุ่มลูกศรดอกซากุระ (ลูกที่ 2 ทอง · 3 ครีม · 4 ชมพู · 5 ฟ้า · 6 ครีม) ทับ `:nth-child` ของ shared-ui.theme-3.css ด้วย `:nth-child(n)`
  - เวอร์ชัน Beta 0.13.3 (version.js · package.json 3 ไฟล์ · patchnotes.json + PATCHNOTES.md)
- ไม่ได้แตะ: โค้ด JS ทุกไฟล์ (งานนี้ CSS + รูปล้วน) · โต๊ะเล่นเกม (`.gx-hud` ฯลฯ) · ปุ่ม `.wbtn` ทั่วไป · การ์ด/แผงเนื้อหาในหน้าย่อยที่เป็นครีมอยู่แล้ว
- ตรวจแล้ว: ภาพจำลอง 18 หน้า/หน้าต่าง (หน้าแรก เควส ตั้งค่า รางวัลล็อกอิน แพตช์โน้ต สตามิน่า ร้าน โปรไฟล์ เล่นเกม สร้างห้อง ช่องเก็บของ 2 แท็บ แบทเทิลพาส เพื่อน อันดับ สกิล หีบ หาแมตช์) ที่ 915×412 และ 1280×720 · `check-handlers` · `test-client-files` · `test-client` 27/27 · `test-games` 78/78 · `py_compile scripts/ui-cutout.py`
- **ยังไม่ได้ทดสอบ:** เว็บจริง · แอป Android · ห้องล็อบบี้/โต๊ะ/หน้าสรุปผล/กติกา (ต้องมีเซิร์ฟเวอร์) · หน้าที่ต้องโหลดข้อมูลจริง (แบทเทิลพาส อันดับ เพื่อน ร้าน) เห็นแค่โครง
- สถานะ: เสร็จ — branch `ai/ui-sakura-all` commit `0ab16fc` → `bcfaa90` + WORKLOG นี้ · ยังไม่ได้ push
- คำถามที่รอตอบ: push/merge ไหม · ใส่ `scripts/ui-cutout.py` ในตาราง CLAUDE.md หมวด 7/10 ไหม (ต้องให้เจ้าของอนุมัติก่อนแก้ CLAUDE.md)
- วิธีย้อนกลับ: `git revert` ทีละ commit · ทั้งชุด UI: ลบ `<link>` sakura-kit.css
- ข้อควรระวัง: ถ้าเพิ่มหน้าต่างใหม่ที่ใช้ `.sk-box` / `.st-box` จะได้กรอบซากุระอัตโนมัติ — พื้นต้องสว่าง ตัวอักษรเข้ม · ตัด asset ชิ้นใหม่ให้ใช้ `scripts/ui-cutout.py` แบบเดียวกันเพื่อให้ขอบเหมือนกันทั้งชุด

### 2026-11-05 13:05 · Claude (claude-opus-5-5) · ชุด UI ซากุระ หน้าแรก 5 จุด (ต่อจากรอบทดลอง)
- คำสั่งที่ได้รับ: เจ้าของส่งภาพหน้าแรกวงไว้ 5 จุด "เปลี่ยนตรงที่วงไว้ด้วย" — ป้ายโปรไฟล์ · ปุ่มด้านข้าง · เมนูล่าง · การ์ดกิจกรรม · ปุ่มเริ่มเล่น
- สร้างใหม่ (`client/public/Assets/UI/Assets/kit3/`): `profile-frame.webp` (ชิ้น 01) · `card-panel.webp` (07) · `btn-gold.webp` (15) · `btn-round.webp` (19 ลบจุดสามจุดออกเป็นปุ่มเปล่า ใส่ไอคอนเส้นเดิมทับ)
- แก้: `client/public/Code/Theme/sakura-kit.css` ต่อท้ายหมวด "หน้าแรก" — `.rv-me2` ใช้รูปเดียว วาง `.rv-av2` / `.rv-plate` / `.rv-lvbar` เป็น % ของรูป (ตัวเลข EXP เลื่อนเข้าส่วนสีเข้ม เพราะปลายแถบในรูปเป็นชมพูอ่อน) · `.rv-sb` `.rv-nav svg` `.rv-card i` ใช้ปุ่มกลมครีม ไอคอนสีเข้ม · `.rv-card` 9-slice ค่าตัด 40/150/100/60 (`--cp-u`) · `.rv-start` 3 ช่วง ซ้าย 62 ขวา 72 ซ่อนวงกลม ::before ตัวอักษรน้ำตาล · `.rv-swap` ครีมขอบทอง · แพตช์โน้ต 0.13.2 ข้อหน้าแรก
- ไม่ได้แตะ: `home-rov.js` (ไม่แก้ JS) · ไฟล์ CSS หมวด Home เดิม
- ตรวจแล้ว: ภาพหน้าแรก 915×412 (1x/2x) และ 1280×720 · `check-handlers` · `test-client-files` · `test-client` 27/27
- **ยังไม่ได้ทดสอบ:** เว็บจริง · แอป Android · จอแนวตั้ง · ชื่อผู้เล่นยาวมากบนป้ายโปรไฟล์ (มี ellipsis เดิมอยู่)
- สถานะ: เสร็จ — อยู่ใน branch `ai/ui-sakura-kit` เดียวกับรอบทดลอง ยังไม่ได้ push
- วิธีย้อนกลับ: เหมือนรอบทดลอง (ลบ `<link>` sakura-kit.css) หรือ `git revert` commit นี้

### 2026-11-05 12:45 · Claude (claude-opus-5-5) · ชุด UI ซากุระ (ทดลอง) + ตารางหน้าต่างรายการอัตรา · Beta 0.13.2
- คำสั่งที่ได้รับ: เจ้าของส่ง asset UI ใหม่ 2 ชุด (`sakura_nine_slice_pack.zip` กรอบหน้าต่าง 9-slice · `minimal_sakura_ui_assets.zip` 50 ชิ้น) → ตอบ: เริ่มชุดทดลองตามที่แนะนำ (กรอบหน้าต่าง + ตัวนับบน HUD) · ตัดพื้นขาวให้ดูในเกมจริง · "เปลี่ยนด้วยเลย" (ของเดิมหน้าแรก) · บวกงานค้างข้อ 3 (ตารางหน้าต่างรายการอัตรา ที่ให้ทำพร้อมงานรอบนี้)
- หมายเหตุ: ผมบอกเจ้าของผิดว่าหน้าแรกมีป้ายไม้แขวน "เล่น/ร้าน/โปรไฟล์" — จริง ๆ ซ่อนอยู่ (หน้าแรกเป็นแบบ RoV ใน home-rov.js) แจ้งแก้แล้ว และตีความข้อ "เปลี่ยนด้วย" เป็นปุ่มกลมม่วงเข้ม (ของขวัญ/ตั้งค่า) ข้างตัวนับ
- asset: ไฟล์ต้นฉบับทุกชิ้นเป็น PNG พื้นขาว ไม่มีพื้นโปร่งใส → ตัดพื้นด้วยสคริปต์ (flood fill จากขอบ + color-to-alpha ที่แถบขอบ ลบขอบขาว/เงาจาง) **สคริปต์อยู่ในพื้นที่ชั่วคราวของแชทนี้เท่านั้น ไม่ได้อยู่ใน repo** (ใช้ numpy/scipy/Pillow)
- สร้างใหม่:
  - `client/public/Assets/UI/Assets/kit3/` — `window-frame.webp` (กรอบ 9-slice 1493×755) · `bar-coin.webp` · `bar-gem.webp` · `bar-stamina.webp` · `btn-settings.webp` · `btn-gift.webp` (รวม ~96KB)
  - `client/public/Code/Theme/sakura-kit.css` — กรอบหน้าต่าง (เควส `.q-modal .sk-box` · ตั้งค่า `.set-modal .st-box` · แพตช์โน้ต `.pn-box` · กาชา `.gc-box`) ด้วย border-image ค่าตัด 235/401/375/546 · `--wf-u` ย่อตามความสูงจอ · outset ให้เส้นทองตรงขอบกล่อง (เนื้อหาเดิมไม่ขยับ) · ตัวนับ `.rv-cur` / `.st-pill` / `.hud .coin-pill` ใช้แถบรูป 3 ช่วง (ไอคอน · กลางยืด · ปุ่มบวก) ซ่อนไอคอนเดิม ปุ่มบวกเดิมยังกดได้ · ปุ่ม `.rv-rb` ของขวัญ/ตั้งค่า · แสงรอบหน้าต่างผลสุ่ม SR/SSR เป็น drop-shadow
- แก้:
  - `client/public/index.html` — เพิ่ม `<link>` `Code/Theme/sakura-kit.css` ท้ายสุด (หลัง friends.css) ไม่สลับลำดับเดิม
  - `client/public/Code/Theme/coin-icons.js` — ฟังก์ชันใหม่ `swapGemInHud()` เปลี่ยน 💎 ใน `.hud .mc-pill` เป็นรูปเพชร (ที่อื่นคงอีโมจิ)
  - `client/public/Code/Gacha/gacha.theme-2.css` — หน้าต่างรายการอัตราเป็นตาราง `auto-fill minmax(104px)` กว้าง min(94vw,760px) ย่อรูปตัวอย่าง · `--gc-cw` คิดจาก 92vh (เพราะหน้าต่างมีกรอบสูงสุด 92vh)
  - เวอร์ชัน Beta 0.13.2 (version.js · package.json 3 ไฟล์ · patchnotes.json + PATCHNOTES.md)
- ไม่ได้แตะ: โค้ด JS หน้าแรก (home-rov.js) · ไฟล์ kit2 เดิม · หน้าต่างอื่นที่ยังไม่ใส่กรอบ (รางวัลล็อกอิน · สตามิน่า · สร้างห้อง · หาแมตช์ ฯลฯ) · `ui.config` (ไม่ได้ใช้ช่อง windowFrame — CSS อ้างไฟล์ตรง)
- ตรวจแล้ว: ภาพจำลองล็อกอิน (Playwright ฐานข้อมูลจำลอง) 915×412 ทั้ง 1x/2x: หน้าแรก · เควส · ตั้งค่า · แพตช์โน้ต · ร้าน · โปรไฟล์ · เล่นเกม · กาชา (Rare/SR/SSR/ของแต่ง/สุ่ม 1/ใช้ตั๋ว) ที่ 915×412 + 1280×720 → การ์ดกว้างเท่ากัน 2 แถว ไม่ล้นจอ ไม่มีแถบเลื่อน · หน้าต่างรายการอัตราเป็นตาราง · `check-handlers` · `test-client-files` · `test-client` 27/27 · `test-games` 78/78 · `node --check coin-icons.js`
- **ยังไม่ได้ทดสอบ:** เว็บจริง · แอป Android (WebView) · จอแนวตั้ง
- สถานะ: เสร็จ (ช่วงทดลอง) — branch `ai/ui-sakura-kit` commit `9b03cbd` → `3c6ea20` + WORKLOG นี้ · ยังไม่ได้ push
- คำถามที่รอตอบ: push/merge ไหม · ขยายชุดซากุระไปปุ่มเริ่มเล่น/ป้ายชื่อ/ปุ่มด้านข้าง/เมนูล่างไหม · เก็บสคริปต์ตัดพื้นไว้ใน `scripts/` ไหม (ต้องใช้ scipy)
- วิธีย้อนกลับ: ลบ `<link ... sakura-kit.css>` ใน index.html = หน้าตาเดิมทั้งหมด (ยกเว้นตารางหน้าต่างรายการอัตรา + 💎 บน HUD เป็นรูป) · หรือ `git revert` ทีละ commit
- ข้อควรระวัง: กรอบใช้ `filter: drop-shadow` บนกล่องหน้าต่าง → ลูกที่เป็น `position: fixed` ในกล่องจะยึดกล่องแทนจอ (ตรวจแล้วตอนนี้ไม่มี) · ถ้าเพิ่มหน้าต่างใหม่ในรายการกรอบ พื้นต้องสว่าง ตัวอักษรเข้ม

### 2026-11-05 12:05 · Claude (claude-opus-5-5) · กาชา: ธีมหน้าต่างรายการอัตรา + ป้ายซ้ำบนสุด + push/merge 0.13.1
- คำสั่งที่ได้รับ: "หน้าต่าง แก้เลย · ป้ายซ้ำ ปรับให้เป็นเลเยอร์บนสุด กรอบจะได้ไม่ทับ · เสร็จแล้ว push และ merge"
- แก้: `client/public/Code/Gacha/gacha.theme-2.css` ต่อท้าย — `.gc-box:has(.gc-grid)` (หน้าต่าง gcList) พื้นครีม กรอบทอง หัวข้อทอง · `.gc-res .gc-new/.gc-dup` ย้ายเข้ามุมการ์ด `top/right: 3px` + `z-index: 6` (เหนือกรอบ SR/SSR ที่เป็น ::before z4 / ::after z3 และไม่โดน overflow ของการ์ดตัด) · แพตช์โน้ต 0.13.1 เพิ่ม 2 ข้อ (patchnotes.json + PATCHNOTES.md)
- ไม่ได้แตะ: `gacha.js` · การจัดวางในหน้าต่างรายการ (ยังเป็นแถวละ 1 ชิ้นแบบเดิม)
- ตรวจแล้ว: ภาพจำลอง 915×412 — หน้าต่างรายการ (ธีมครีม) · ผลสุ่ม SSR/SR/Rare (ป้ายเห็นครบ ไม่ถูกกรอบทับ) · ตู้ของแต่ง · ขนาดการ์ด/2 แถว/ไม่ล้นจอเหมือนเดิม
- **ยังไม่ได้ทดสอบ:** เว็บจริง · แอป Android
- สถานะ: เสร็จ — push + merge `ai/gacha-result-modal` เข้า `main` (เจ้าของสั่ง)
- คำถามที่รอตอบ: ไม่มี (หน้าต่างรายการอัตรา → เจ้าของให้จดไว้ทำพร้อมงานรอบหน้า ดูงานค้างข้อ 3)
- วิธีย้อนกลับ: `git revert` commit ของงานนี้ (หรือทั้งชุด `fa8f84d`..commit นี้)
- ข้อควรระวัง: ป้ายอยู่ใน `.gc-res` เท่านั้น ไม่กระทบป้ายที่อื่น

### 2026-11-05 11:55 · Claude (claude-opus-5-5) · หน้าต่างผลสุ่มกาชา: ธีม · รูปการ์ด · แถวละ 5 · SR เต็มตัว
- คำสั่งที่ได้รับ: แก้หน้าต่างผลการสุ่ม (มีภาพหน้าจอแนบ) — ธีมเดียวกับหน้าต่างอื่น · การ์ดบางครั้งไม่โชว์รูป · แถวละ 5 ใบ · การ์ด SR เห็นไม่เต็มตัว
- สาเหตุ "รูปไม่ขึ้น": รูปโหลดได้ปกติ แต่ `.gc-box` กว้างตามเนื้อหา และรูปการ์ดสำเร็จ (`card`) วางแบบ absolute ไม่ดันความกว้าง → สุ่มได้แต่การ์ด Rare (มี `card`) หน้าต่างหดเหลือเท่าชื่อ การ์ดกว้าง ~26px · ถ้ามี SR ที่ไม่มี `card` ปนมา รูปของมันดันหน้าต่างให้กว้าง จึงเป็น "บางครั้ง"
- สาเหตุ "SR ไม่เต็มตัว": อายะ (และซากุยะ SSR) ไม่มี `card` จึงใช้ `prevBox()` → `.pv-ch` ขนาด 72×72 `object-fit: cover` พื้นพีช (ทำไว้สำหรับช่องเล็กในร้าน)
- แก้:
  - `client/public/Code/Gacha/gacha.css` ใน `@media (max-height: 500px) and (orientation: landscape)`: `.gc-res.n10` ตัด 10 คอลัมน์ (เหลือ gap) · `.gc-box:has(.gc-res.n10)` ตัด `max-width: 96vw` (ย้ายไปธีม) padding 8px 12px
  - `client/public/Code/Gacha/gacha.theme-2.css` ต่อท้าย: หน้าต่างผลสุ่ม `.gc-box:has(.gc-res)` พื้นครีม `#fffaf2` กรอบทอง `#e8c77a` หัวข้อ `#8a6d3b` (สีชุดเดียวกับหน้าต่างเควส) + คงแสงม่วง/ทองของ `gc-top3`/`gc-top4` · ตัวอักษรบนการ์ดเป็นสีขาวเอง · `.gc-res` แถวละ 5 ใบ กว้าง `--gc-cw` = min(17vw, 132px, คิดจากความสูงจอ) (`--gc-chrome: 170px` = หัวข้อ+สรุป+ปุ่ม) · `.gc-res.n1` การ์ดใบเดียวใหญ่ขึ้น · `.pv-ch` ในการ์ดผลสุ่มเต็มพื้นที่ `contain` ชิดล่าง
  - ผลสุ่มตู้ของแต่ง (commit `70ba360`, gacha.theme-2.css): รูปตัวอย่างหลังไพ่/โต๊ะ/พื้นหลัง/กรอบย่อให้พอดีการ์ด (เดิมโต๊ะล้นทับการ์ดข้าง ๆ) · พื้น `#241a4a` ใต้การ์ด Common/Rare ที่ไม่มีรูปการ์ด · ป้าย NEW/ซ้ำ บรรทัดเดียว
  - เลขเวอร์ชัน Beta 0.13.1: `version.js` · `server/client/mobile package.json` · `patchnotes.json` + `docs/PATCHNOTES.md` (หัวข้อ "แก้ไข" 3 ข้อ)
- ไม่ได้แตะ (แต่เกี่ยวข้อง): `Code/Gacha/gacha.js` (ไม่ต้องแก้ JS) · หน้าต่าง "รายการและอัตราการออก" (`gcList`) ยังเป็นธีมม่วงเดิม — ตั้งใจไม่แตะ (ไม่อยู่ในคำสั่ง) · `Shop/shop.ui.css` `.pv-ch` (ใช้ในร้าน/ช่องเก็บของ) · ป้าย "ซ้ำ ×N" ที่มุมการ์ดถูกตัดขอบบนเล็กน้อย (เป็นมาก่อน)
- ตรวจแล้ว: ภาพหน้าจอ Playwright แบบฐานข้อมูลจำลอง (สคริปต์ชั่วคราว ไม่อยู่ใน repo) ชุด Rare ล้วน / มี SR / มี SSR / สุ่ม 1 ครั้ง / ตู้ของแต่ง (สรุปแบบใช้ตั๋ว+เพชร+แปลงเหรียญ) ที่ 915×412 และ 1280×720 → การ์ดกว้างเท่ากันทุกใบ (63px / 132px) · สุ่ม 10 = 2 แถว · หน้าต่างไม่ล้นจอ ไม่มีแถบเลื่อน · รูปโหลดครบ · `check-handlers` ผ่าน · `test-client-files` ผ่าน · `test-client` 27/27 · `test-economy` 22/22 · `test-games` 78/78
- **ยังไม่ได้ทดสอบ:** เว็บจริงด้วยบัญชีจริง · แอป Android · จอแนวตั้ง
- สถานะ: เสร็จ — branch `ai/gacha-result-modal` commit `fa8f84d` (CSS) → `3271d14` (เวอร์ชัน) → `410e00e` (WORKLOG) → `70ba360` (ของแต่ง) → commit WORKLOG นี้ · ยังไม่ได้ push
- งานค้าง/ขั้นต่อไป: เจ้าของสั่ง push/merge → เปิดกาชาบนเว็บจริงดูหน้าต่างผลสุ่ม
- คำถามที่รอตอบ: เปลี่ยนหน้าต่าง "รายการและอัตราการออก" ให้เป็นธีมครีมด้วยไหม · แก้ป้าย "ซ้ำ ×N" ไม่ให้โดนตัดขอบไหม
- วิธีย้อนกลับ: ยังไม่ merge → ทิ้ง branch · merge แล้ว → `git revert` เรียงจาก commit ล่าสุดของงานนี้
- ข้อควรระวัง: ถ้าเพิ่มบรรทัดในหน้าต่างผลสุ่ม (สรุป/ปุ่ม) ให้ปรับ `--gc-chrome` ไม่งั้นการ์ด 2 แถวจะล้นจอแนวนอน

### 2026-11-05 11:30 · Claude (claude-opus-5-5) · CLAUDE.md หมวด 13.7 ข้อยกเว้นการ push
- คำสั่งที่ได้รับ: "งานเล็ก ๆ ไม่ต้องถาม ถามตอนที่แก้ไฟล์ในเกมหรือทำงานที่เกี่ยวกับตัวเกมเสร็จพอ" → เจ้าของอนุมัติข้อความให้เพิ่มใน CLAUDE.md
- แก้: `CLAUDE.md` หมวด 13.7 ใต้ "สิ่งที่ห้ามทำเองโดยไม่ได้รับอนุญาต" เพิ่มข้อ **ข้อยกเว้น** — งานเอกสาร (เอกสาร · WORKLOG · CLAUDE.md) push + merge แบบ fast-forward เข้า `main` ได้เอง · งานที่แก้ไฟล์ในเกม ถามครั้งเดียวตอนเสร็จ
- นอก repo: อัปเดต `CLAUDE.md` ใน claude.ai Project ให้ตรง
- ตรวจแล้ว: ดู diff (เอกสารล้วน)
- สถานะ: เสร็จ — push + merge เข้า `main` ตามข้อยกเว้นใหม่
- วิธีย้อนกลับ: `git revert <commit>`
- ข้อควรระวัง: ข้อยกเว้นนี้ไม่รวม force push / reset / ลบ branch — ยังต้องถามเหมือนเดิม

### 2026-11-05 11:27 · Claude (claude-opus-5-5) · ลบการลองชื่อแพ็กเก่าใน packUrl()
- คำสั่งที่ได้รับ: "เริ่มงานต่อไป" → งานค้างข้อ 1 (GitHub Actions สร้างแพ็กใหม่แล้วที่ `a40c50a`)
- สร้างใหม่: ไม่มี
- แก้: `client/public/Code/AssetPack/pack-loader.js` ฟังก์ชัน `packUrl()` — เหลือหาเฉพาะชื่อ `Assets/...` (ตัด `urls.get(name.replace(/^Assets\//, ''))`) + แก้คอมเมนต์ 2 บรรทัดด้านบน (ลบ `EXTEND:` ที่ทำแล้ว)
- ไม่ได้แตะ (แต่เกี่ยวข้อง): `CHAR_PATH` บรรทัด ~212 ยังรับพาธ `Character/` แบบเก่า — เป็นพาธรูปในหน้าเว็บ ไม่ใช่ชื่อในแพ็ก ไม่ได้อยู่ในงานนี้ · `scripts/pack-assets.js` · `client/public/pack/*` (บอทสร้าง)
- ตรวจแล้ว: `node --check` ผ่าน · `test-client-files.js` ผ่าน · `test-packkeys.js` ผ่าน · `test-client.js` ผ่าน 27 จุด · ยืนยันจากโค้ดว่า `pack-assets.js` ตั้งชื่อไฟล์ในแพ็กเป็น `Assets/Character/...` และแพ็กใน `main` สร้างหลังเปลี่ยนสคริปต์ · แคชผูกกับ `?v=<version>` ผู้เล่นจึงโหลดแพ็กใหม่เอง
- **ยังไม่ได้ทดสอบ:** เปิดเว็บจริงด้วยบัญชีที่มีตัวละครเพื่อดูว่ารูปเต็มขึ้น (ถอดรหัสแพ็กจริงในเครื่องไม่ได้ เพราะไม่มี `PACK_MASTER`)
- สถานะ: เสร็จ — commit ใน `ai/assetpack-remove-old-names` ยังไม่ได้ push
- งานค้าง/ขั้นต่อไป: เจ้าของสั่ง push/merge → เปิดเว็บจริงดูรูปตัวละครที่มีสิทธิ์ · ต่อด้วยโรดแมพก้อน 3 ข้อ 8
- คำถามที่รอตอบ: ไม่มี
- วิธีย้อนกลับ: ยังไม่ merge → ทิ้ง branch · merge แล้ว → `git revert <commit>` (คืนบรรทัดที่ลองชื่อเก่า)
- ข้อควรระวัง: ถ้าหลัง merge รูปตัวละครเต็มไม่ขึ้นแต่ภาพตัวอย่างขึ้น แปลว่าแพ็กยังเป็นชื่อเก่า → revert แล้วสั่ง Actions สร้างแพ็กใหม่

### 2026-11-05 11:25 · Claude (claude-opus-5-5) · CLAUDE.md หมวด 13.9 เลิกอ้าง AGENTS.md
- คำสั่งที่ได้รับ: ไม่เพิ่ม `AGENTS.md` เข้า repo → แก้หมวด 13.9 ใน `CLAUDE.md` ไม่ให้อ้างไฟล์นี้ (เจ้าของอนุมัติข้อความแล้ว) · `AGENTS.md` ใน claude.ai Project เก็บไว้เหมือนเดิม
- สร้างใหม่: ไม่มี
- แก้: `CLAUDE.md` หมวด 13.9 — ตัดบรรทัดที่พูดถึง `AGENTS.md` เหลือ 3 ข้อ (CLAUDE.md คือแหล่งกฎที่เดียว · AI ที่อ่านไฟล์ได้ให้อ่าน CLAUDE.md · AI ที่อ่านไฟล์ไม่ได้ให้เจ้าของแปะ CLAUDE.md + WORKLOG) · `docs/WORKLOG.md` บรรทัด "งานที่กำลังทำ" ให้ตรงสถานะจริง + รายการนี้
- ไม่ได้แตะ (แต่เกี่ยวข้อง): หมวดอื่นทั้งหมดของ `CLAUDE.md` · ไม่มีโค้ดเกมเปลี่ยน
- นอก repo: อัปเดต `CLAUDE.md` ใน claude.ai Project ให้ตรงกับ repo (ก่อนแก้เป็นฉบับเก่าที่ยังใช้พาธ `client/public/app.js`)
- ตรวจแล้ว: `git diff` ดูด้วยตา (เอกสารล้วน ไม่มีโค้ดให้รันเทส)
- สถานะ: เสร็จ — commit ไว้ใน branch `ai/docs-claude-md` ยังไม่ได้ push
- งานค้าง/ขั้นต่อไป: เจ้าของสั่ง push/merge · งานค้างเดิมด้านบนยังเหมือนเดิม (ข้อ 1 ทำได้แล้ว เพราะแพ็กใหม่สร้างเสร็จ)
- คำถามที่รอตอบ: ไม่มี
- วิธีย้อนกลับ: ยังไม่ merge → ทิ้ง branch `ai/docs-claude-md` · ถ้า merge แล้ว → `git revert <commit>`
- ข้อควรระวัง: ถ้าแก้ `CLAUDE.md` ใน repo อีก ต้องอัปเดตฉบับใน claude.ai Project ให้ตรงด้วย (แชทใน Project อ่านฉบับนั้น)

### 2026-11-05 (รอบ 2) · Claude (claude-opus-5-5) · แก้ตามรายงาน v0.12.0 + แยก CSS ชั้นธีม + แก้ปัญหาที่พบ
- เจ้าของสั่ง: แยก CSS ธีม "ให้เป็นระเบียบที่สุด" · ลำดับ ui-kit.js รับได้ · แก้ CLAUDE.md · package.json ให้ตรง · แก้ปัญหาที่เจอ + ไฟล์รายงานปัญหา v0.12.0 · เสร็จแล้วอัปได้เลย
- แก้ตามรายงาน v0.12.0 (commit `6575313`):
  - แจ้งเตือนเควสค้าง: `Home/home-rov.js` (เดิม theme2.js) วาดหน้าแรกใหม่เมื่อตัวเลขแจ้งเตือนเปลี่ยน (`badgeKey`)
  - รูปการ์ดกาชาไม่ขึ้น: `AssetPack/pack-loader.js` แทนที่ `card`/`star5` ด้วยไฟล์จากแพ็ก (เดิมแทนแค่รูปตัวละคร — การ์ดชี้ไฟล์ที่ไม่มีบนเว็บ) + รู้จักพาธ `Assets/Character/` · `Gacha/gacha.js` ขอกุญแจแพ็กตัวละครใหม่ก่อนเปิดผลสุ่ม (รอไม่เกิน 5 วิ)
  - หน้าเควส: `Quests/quests.css` เป็นธีมครีม/ทอง
  - อันดับป๊อกเด้ง: `rules/pokdeng/engine.js` ใส่ `place` ทุกแถว (ชิปเท่ากันดู ประเภทไพ่×10+แต้ม) · `results/record-results.js` ใช้ place ถ้ากติกาส่งมา · `Table/games.js` เรียงตาม place · ผู้ชนะ (สิทธิ์สับ) = อันดับ 1 · เทส `test-pokdeng-rank.js`
- แยก CSS ชั้นธีม: `style.css` `ui.css` `layout.css` `polish.css` `theme2.css` → 63 ไฟล์ `<หมวด>/<หมวด>.<ชั้น>[-N].css` (ชั้น base → ui → layout → polish → theme)
  - วิธี: แยกเป็นกฎทีละข้อ → หาหมวดจากไฟล์ JS ที่สร้างคลาสนั้น → ย้ายข้ามกันได้เฉพาะกฎที่ "ไม่ชนกัน" (โดนองค์ประกอบเดียวกัน + specificity เท่ากัน + พร็อพเพอร์ตี้กลุ่มเดียวกัน) ที่ชนกันแบ่งเป็นส่วน -2, -3 ตามลำดับเดิม
  - `theme2.js` → `Home/home-rov.js` (หน้าแรก RoV) + `Theme/coin-icons.js` (🪙 → รูป)
  - ตรวจ: ภาพหน้าจอก่อน/หลังทีละพิกเซล 25 หน้า × แนวนอน/แนวตั้ง = เหมือนเดิมทุกหน้า (ต่างเฉพาะไอคอนหมุนจอที่ขยับอยู่)
- แก้ปัญหาที่พบ: โหลด `Core/native.js` แล้ว (ปุ่ม Back แอป) · ลบ `client/index.html` (สำเนา vite เก่า) + `client/package.json` build → `vite build public` · ช่องรหัสห้องไม่ตกบรรทัด (`Lobby/lobby-room.css`) · `test-simple-online.js` เขียนใหม่ให้ตรงระบบปัจจุบัน + ใส่ใน npm test · `test-online.js` จุดล้มสุ่ม (เทียบไพ่กับเซิร์ฟเวอร์แทน > 0) · package.json server/client/mobile = 0.13.0 · หน้าแรกไม่โชว์ "เซิร์ฟเวอร์ v0.13.0" ซ้ำเมื่อเลขตรงกัน · `Gacha/gacha.js` ฐานข้อมูลตอบกาชาว่าง → หยุด (เดิมโหลดซ้ำไม่จบ หน้าค้าง)
- `CLAUDE.md` อัปเดตพาธ/แผนที่ไฟล์ตามที่เจ้าของสั่ง
- ตรวจแล้ว: npm test ผ่าน (รวมเทสใหม่) · test-online 10/10 · test-simple-online 8/8 · check-handlers · build-assets --check · SQL test · ภาพหน้าจอ: หน้าแรก เล่นเกม สร้างห้อง ร้าน/กาชา (3 แท็บ + ผลสุ่ม) แบทเทิลพาส อันดับ เพื่อน ช่องเก็บของ 4 แท็บ โปรไฟล์ ตั้งค่า แพตช์โน้ต เควส รางวัลล็อกอิน สตามิน่า กติกา ห้องรอ โต๊ะ บทสอน
- **ยังไม่ได้ทดสอบ:** เว็บจริงหลังอัป · ปลดล็อกการ์ดหลังสุ่มด้วยบัญชีจริง (ทดสอบแบบล็อกด้วยแพ็กทดสอบแล้ว) · แอป Android จริง
- วิธีย้อนกลับ: `git revert -m 1 <merge commit>` บน main · ฐานข้อมูล: v12_friends.sql เพิ่มตาราง/ฟังก์ชันใหม่ ไม่แตะของเดิม

### 2026-11-05 · Claude (claude-opus-5-5) · จัดระเบียบโฟลเดอร์ ไฟล์ และโค้ดทั้งโปรเจค
- เจ้าของสั่ง: "ทำทุกข้อ แยกโค้ดแต่ละหมวดเป็นคนละไฟล์ ห้ามเอาโค้ดที่ไม่ใช่หมวดนั้นไปปนกัน เอาไฟล์รูปทั้งหมดไว้ในโฟลเดอร์ Assets แยกตามหมวด" · ตอบคำถาม: ย้ายทั้งโฟลเดอร์ (รวม config) · ไฟล์เก่าลบทิ้ง · อัปรวมทีเดียวกับ 0.13.0
- branch: `ai/refactor-structure` (แตกจาก `ai/friends-system`) · commit ตามลำดับ:
  1. `30f89c4` ลบ `repomix-output.xml`, `server/legacy/`, `server/src/rules/korat/`
  2. `95e2537` ย้ายรูป/เสียง/config → `client/public/Assets/<Character|Item|Shop|UI|Sounds|Concept>/` · ต้นฉบับ → `assets-src/Assets/...` · แก้พาธใน scripts (build-assets, pack-assets, make-previews, make-shards), workflow pack-assets.yml, JS/CSS ทั้งหมด · สร้าง skins.json/gacha.json ใหม่ด้วยสคริปต์
  3. `0d26455` ย้าย JS/CSS หน้าเว็บ → `client/public/Code/<หมวด>/` · เพิ่ม `Code/Core/asset-url.js` (url ใน CSS variable ต้องเป็นพาธเต็ม) · เพิ่มเทส `server/test-client-files.js`
  4. `2820fce` แยก `server/src/index.js` → config.js · room/ · match/ · results/ · net/ · friends/ · events/ (export เดิมครบ)
  5. `e6505eb` แยก `app.js` → 16 ไฟล์ใน Core/Table/Account/Home/Lobby/Shop (ลำดับโหลดตรงตำแหน่ง app.js เดิม) · จัดรูปโค้ดด้วย Prettier
  6. `64ff5dd` แยก pages2.js / account.js / stamina.js → Settings · Account · Inventory · Quests · Items · Stamina · Farm · Characters · เพิ่ม `Code/Core/ui-kit.js` (ตัวช่วยที่ทุกไฟล์เคยเขียนซ้ำ)
  7. `8f192d7` แยก lobby-ui.js → Lobby/lobby-ui.js · Table/emote-socket.js · Table/shuffle-animation.js
  8. `fa11a62` อัปเดตเอกสาร README · ASSETS.md · supabase/README.md (ลำดับ v8–v12) · RULES-SPEC.md · mobile/README.md · rules/README.md · แพตช์โน้ต 0.13.0 · WORKLOG
  9. (commit ถัดไป) แยก CSS ที่ปนหมวด: `Account/account.css` → Account/hud.css · Quests/quests.css · Account/login.css · Account/daily-login.css · Skills/skill-card.css · Account/profile.css · Gacha/gacha.css · `Table/gamegx.css` → เหลือโต๊ะ + Core/landscape.css · Skills/skills-table.css · Table/emote-socket.css · Table/shuffle-animation.css · Lobby/lobby-room.css · Lobby/playon.css · Lobby/match.css · `Table/gamegx.js` → ห้องล็อบบี้ไป Lobby/lobby-room.js (gxRoom) · หน้าต่างกดพร้อมไป Lobby/match-ready.js (gxReadyBox)
     - CSS ใหม่โหลดตรงตำแหน่งไฟล์เดิม เรียงตามลำดับเดิม (gamegx.css ตัดเป็นช่วงต่อกัน ลำดับกฎเหมือนเดิมทุกบรรทัด · account.css รวมกฎ HUD/เควส/โปรไฟล์ที่กระจายอยู่ไว้ไฟล์เดียวกัน — ตัวเลือกไม่ชนกับหมวดอื่น)
     - เทียบภาพหน้าจอก่อน/หลังทีละพิกเซล 24 หน้า: เหมือนเดิม ยกเว้นตัวเลขนับเวลา · ไพ่/บอทที่สุ่ม
- ลำดับ `<script>` ใน index.html: ไฟล์ที่แยกออกโหลดตรงตำแหน่งไฟล์เดิม · ยกเว้น `ui-kit.js` วางต่อจาก `asset-url.js` (ไม่พึ่งไฟล์อื่น และ stamina/farm ที่โหลดก่อน state.js ต้องใช้)
- ยังไม่แยก (รอถามเจ้าของ): `Theme/theme2.css` (5,871 บรรทัด · 86 ส่วน ปนทุกหน้า) · `Core/style.css` · `Core/ui.css` · `Theme/polish.css` · `Theme/theme2.js` — เป็นชั้นธีม/แกนที่ทับกันตามลำดับ ถ้าย้ายกฎข้ามไฟล์ลำดับการทับเปลี่ยน หน้าตาอาจเพี้ยน · ถ้าแยกต้องตัดเป็นช่วงต่อกันหลายไฟล์ (หมวดเดียวอาจได้หลายไฟล์)
- เดิมบันทึกว่าไม่แยก: `Theme/theme2.js` (หน้าแรกธีมใหม่ + เปลี่ยน 🪙 เป็นรูป ใช้ MutationObserver ตัวเดียวกัน ทั้งคู่เป็นงานธีม — แยกแล้วเสี่ยงวนลูป)
- ไม่ได้แตะ: ตัวเลข economy · กติกาเกม · SQL ทุกไฟล์ · `CLAUDE.md` · ข้อมูลใน skin/ และ BattlePass/ (เป็น JSON ไม่ใช่รูป)
- ตรวจแล้ว: `npm test` ผ่านทั้งหมด · `sh supabase/test/run.sh` ผ่าน · `check-handlers` · `build-assets --check` · `node --check` ทุกไฟล์ใน Code/ · ภาพหน้าจอ Playwright: หน้าแรก · สตามิน่า · ตั้งค่าห้อง/ฟาร์ม · ช่องเก็บของ · เลเวลตัวละคร · โปรไฟล์ · ตั้งค่า · รางวัลล็อกอิน · เควส · ห้องรอ+อีโมจิ · โต๊ะ · หาแมตช์ · แรงก์ · เพื่อน · บทสอน — ไม่มี error ไม่มีไฟล์หาย
- **ยังไม่ได้ทดสอบ:** เว็บจริงบน Cloudflare · แพ็กที่ GitHub Actions สร้างใหม่ · แอป Android
- พบระหว่างทำ (ยังไม่แก้ — รอสั่ง):
  1. `Code/Core/native.js` (ปุ่ม Back ของแอป Android) ไม่ได้ถูกโหลดใน index.html มาตั้งแต่ก่อนงานนี้
  2. `client/index.html` เป็นสำเนาเก่าของ vite ไม่ได้ใช้ (ไม่ได้ลบเพราะไม่ได้สั่ง)
  4. ช่อง "รหัสห้อง" ในห้องล็อบบี้: รหัสที่ตัวกว้าง (เช่น 8F5CBD) ดันคำว่า "รหัสห้อง" / "คัดลอก" ตกเป็น 2 บรรทัด — เป็นมาก่อนงานนี้
  3. `server/test-simple-online.js` ล้มทั้งก่อนและหลังงานนี้ (ไม่ได้อยู่ใน npm test) · `test-online.js` มีจุดจับเวลาที่ล้มสุ่มบางครั้ง รันซ้ำผ่าน
- เสนอแก้ CLAUDE.md (ไม่ได้แก้เอง): หมวด 2–3 พาธ `Character/` → `client/public/Assets/Character/` · ตารางไฟล์ → `client/public/Code/<หมวด>/` · `app.js` / `server index.js` ในรายการไฟล์แกน → `Code/Core/*` และ `server/src/index.js` + `server/src/room/*` · economy.js/namefilter.js ฝั่ง client → `client/public/Code/Shared/`
- วิธีย้อนกลับ: ยังไม่ได้ push → ทิ้ง branch `ai/refactor-structure` แล้วใช้ `ai/friends-system` ตามเดิม · หรือ `git revert` ทีละ commit จากล่างขึ้นบน
- ข้อควรระวังตอนอัป: GitHub Actions `pack-assets` ต้องสร้างแพ็กใหม่หลัง push (ชื่อไฟล์ในแพ็กเปลี่ยนเป็น `Assets/...`) — ระหว่างรอ pack-loader ลองชื่อเก่าให้ จึงไม่พัง · ผู้เล่นโหลดแพ็กใหม่ 1 ครั้ง

### 2026-11-05 05:50 · Claude (claude-opus-5-5) · ระบบเพื่อน + แก้หน้าโต๊ะ/บทสอน + เพิ่ม CLAUDE.md
- คำสั่งที่ได้รับ:
  - (ก่อนหน้า) แก้หน้าห้องเล่น: ย้ายปุ่มอีโมตมาข้างปุ่มเรียงไพ่ · ชุดไพ่ฝั่งซ้ายให้ชิดโต๊ะเหมือนฝั่งขวา (กล้องหน้าจอบัง) · กรอบไฮไลต์ไพ่ในบทสอนซ้อนกัน
  - "ทำต่อ" → ทำโรดแมพก้อน 3 ข้อ 7 ระบบเพื่อน
  - ใส่ CLAUDE.md ไว้ในโปรเจค และยึดตามทุกครั้ง
- หมายเหตุสำคัญ: งานแก้หน้าจอและระบบเพื่อน **ทำเสร็จก่อนได้รับ CLAUDE.md** จึงยังไม่ได้ถามก่อนตามหมวด 0 ในหลายเรื่อง (ดูคำถามที่รอตอบ) และเดิมแก้บน `main` โดยยังไม่ commit — ย้ายมาไว้ใน branch `ai/friends-system` แล้ว (ยังไม่ได้ push)
- สร้างใหม่:
  - `CLAUDE.md` — กติกาการทำงาน (คัดลอกจากไฟล์ที่เจ้าของโปรเจคแนบมา ตรงทุกตัวอักษร)
  - `docs/WORKLOG.md` — ไฟล์นี้ (ตามแม่แบบหมวด 13.4)
  - `supabase/v12_friends.sql` — ตาราง `friendships` (1 แถวต่อคู่ เปลี่ยนสถานะแทนการลบ) + `friend_request` / `friend_respond` / `friend_remove` / `get_friends` (ผู้เล่น) + `friend_ids` (เฉพาะเซิร์ฟเวอร์) + ค่าใน `game_config.friends` (เพื่อนสูงสุด 100 · คำขอค้างสูงสุด 50)
  - `supabase/test/test_v12.sql` — เทส SQL ระบบเพื่อน
  - `server/test-friends.js` — เทสสถานะออนไลน์/ชวนเข้าห้อง
  - `client/public/friends.js` + `friends.css` — หน้าเพื่อน, หน้าต่างชวนเพื่อนในห้อง, ป้ายคำชวน (ห่อ `render()` แบบเดียวกับ battlepass.js)
- แก้:
  - `client/public/emote.css` — ตำแหน่ง `.em-btn` / `.em-pal`
  - `client/public/gamegx.css` — `#app.gxl .zone-left` เพิ่ม `flex-wrap:wrap-reverse`
  - `client/public/tutorial.js` — `rectOf()` ตัดกรอบไพ่ในมือให้เหลือส่วนที่มองเห็น + ฟังก์ชันใหม่ `merge()` รวมกรอบที่ชิดกัน (เรียกใน `paint()`)
  - `server/src/index.js` — บล็อกใหม่ก่อน `io.on('connection')`: `online`, `friendCache`, `friendsOf()`, `joinable()`, `presenceOf()` + event ใหม่ `friends:presence`, `friend:invite` (ส่งกลับ `friend:invite-result`) + export `online`, `friendCache`
  - `server/package.json` — เพิ่ม `test-friends.js` ท้าย `npm test`
  - `supabase/test/run.sh` — รัน `v12_friends.sql` (2 รอบ) + `test_v12.sql`
  - `client/public/index.html` — เพิ่ม `friends.css` หลัง `ranked.css` และ `friends.js` หลัง `ranked.js` (ไม่สลับลำดับเดิม)
  - `client/public/theme2.js` — ไอคอน `users` + ปุ่ม "เพื่อน" ใน `.rv-side` + ตัวนับ `nf`
  - `client/public/gamegx.js` — `gxRoom()` ปุ่ม "👥 ชวนเพื่อนออนไลน์" แทน "🔗 ชวนเพื่อน" เมื่อล็อกอิน (เพราะปุ่มล้นจอ และมีปุ่มคัดลอกรหัสห้องอยู่แล้ว)
  - `client/public/version.js` → `Beta 0.13.0` · `patchnotes.json` + `docs/PATCHNOTES.md` (เขียนมือทั้งสองไฟล์) · `docs/ROADMAP.md` (ข้อ 7 ✅)
- ไม่ได้แตะ (แต่เกี่ยวข้อง): `client/public/app.js`, `lobby-ui.js` (`copyInvite`), `match-ui.js`, `ranked.js`, `server/src/supabase.js`, ไฟล์ SQL เดิมทุกไฟล์
- ตรวจแล้ว:
  - `sh supabase/test/run.sh` (PostgreSQL จำลองในเครื่อง) — ผ่านทั้งหมด รวม test_v12
  - `npm test` ใน server — ผ่านทั้งหมด รวม test-friends.js (9 จุด)
  - `node --check` friends.js, gamegx.js, theme2.js, tutorial.js — ผ่าน
  - `node scripts/check-handlers.js` — ผ่าน · `node scripts/build-assets.js --check` — ผ่าน
  - ภาพหน้าจอแนวนอน (Playwright, ข้อมูลจำลอง): หน้าเพื่อน, ปุ่มหน้าแรก, หน้าต่างชวน, ป้ายคำชวน, โต๊ะดัมมี่ (ชุดไพ่ฝั่งซ้าย/ปุ่มอีโมต), บทสอน 4 จังหวะ
  - **ยังไม่ได้ทดสอบ:** กับบัญชีจริง 2 เครื่องบนเซิร์ฟเวอร์จริง · รัน SQL บนฐานข้อมูลจริง · โทรศัพท์จริงที่มีกล้องบนจอ
- สถานะ: เสร็จ (รอตรวจ/อนุมัติ)
- งานค้าง/ขั้นต่อไป:
  1. เจ้าของโปรเจคตอบคำถามด้านล่าง
  2. ถ้าอนุมัติ: รัน `v12_friends.sql` บน Supabase → push branch / merge เข้า `main` (ตามที่สั่ง) → ตรวจหน้าเว็บขึ้น Beta 0.13.0
- คำถามที่รอตอบ:
  1. งานนี้ทำก่อนได้รับ CLAUDE.md จึงไม่ได้ถามก่อนในเรื่องเหล่านี้: สร้าง SQL ใหม่ (`v12_friends.sql`) · แก้ `server/src/index.js` · เพิ่ม `<script>`/`<link>` ใน `index.html` · ตัวเลขเพดานเพื่อน 100 / คำขอค้าง 50 / ชวนซ้ำทุก 5 วินาที — จะเก็บไว้ตามนี้ หรือให้แก้ส่วนไหน
  2. โค้ดใหม่ใน `friends.js`, `tutorial.js` (`merge`) และบล็อกใน `index.js` ยังเขียนแบบบรรทัดแน่นตามไฟล์เดิม ไม่ตรงหมวด 4.1 — ให้จัดใหม่ให้อ่านง่ายก่อนอัปไหม
  3. `docs/PATCHNOTES.md` เขียนมือคู่กับ `patchnotes.json` (หมวด 7 บอกให้ถามว่าสร้างยังไง) — ใช้วิธีนี้ต่อได้ไหม
  4. เลขเวอร์ชัน: `version.js` = Beta 0.13.0 แต่ `package.json` = 7.1.0 (หมวด 9) — ยังไม่ได้แตะ package.json
- วิธีย้อนกลับ: ยังไม่ได้ push/merge → ทิ้งทั้ง branch `ai/friends-system` ได้ (main ยังเป็น `63ee933`) · หรือย้อนทีละ commit ด้วย `git revert <commit>` — commit แรก `a9a20df` (CLAUDE.md) · commit สุดท้ายของงานนี้ดูด้วย `git log --oneline main..ai/friends-system` · ฐานข้อมูลจริงยังไม่ถูกแก้
- ข้อควรระวัง:
  - ต้องรัน `v12_friends.sql` บนฐานข้อมูลจริง **ก่อน** อัปเซิร์ฟเวอร์ ไม่งั้น `friend_ids` ไม่มี → เซิร์ฟเวอร์ log error ตอนขอสถานะเพื่อน
  - `friends.js` เรียก `conn()` เองหลังล็อกอิน (เพื่อนจะเห็นว่าออนไลน์) → client เชื่อมต่อเซิร์ฟเวอร์ตั้งแต่หน้าแรก ไม่ต้องรอเข้าหน้าเล่น
  - ฟังก์ชันใน `get_friends` เป็น `stable` — ในเทส SQL ห้ามเรียกคู่กับฟังก์ชันที่แก้ข้อมูลในคำสั่งเดียว (จะเห็นข้อมูลก่อนแก้)
  - ลำดับ `<script>`: `friends.js` ต้องโหลดหลัง `ranked.js` (ใช้ `Ranked.emblem`) และก่อน `theme2.js`
