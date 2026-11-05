# WORKLOG — สมุดส่งต่องาน Dummy Online
> เรียงใหม่สุดไว้บน · ห้ามลบรายการเก่า · ทุกแชท/AI ต้องอ่านก่อนเริ่มและเขียนก่อนจบ (ดู CLAUDE.md หมวด 13)

## สถานะปัจจุบัน
- งานที่กำลังทำ: ระบบเพื่อน (Beta 0.13.0) บน `ai/friends-system` + จัดระเบียบไฟล์ทั้งโปรเจคบน `ai/refactor-structure` (แตกจาก ai/friends-system) — เสร็จทั้งคู่ รอเจ้าของโปรเจคตรวจ · อัปรวมทีเดียว (เจ้าของสั่ง) · ยังไม่ได้ push / ยังไม่ได้รัน SQL บนฐานข้อมูลจริง
- งานค้างเรียงลำดับ:
  1. รอคำตอบเรื่องงาน 0.13.0 ที่ทำก่อนได้รับ CLAUDE.md (ดู "คำถามที่รอตอบ" ในรายการล่าสุด)
  2. ถ้าอนุมัติ: รัน `supabase/v12_friends.sql` บนฐานข้อมูลจริงก่อน → แล้วค่อย push/merge `ai/refactor-structure` (มีงานเพื่อนอยู่ในนั้นแล้ว) (CLAUDE.md หมวด 11: SQL ก่อนเซิร์ฟเวอร์)
  3. หลัง GitHub Actions สร้างแพ็กใหม่ (ชื่อ `Assets/...`): ลบการลองชื่อเก่าใน `packUrl()` ของ `Code/AssetPack/pack-loader.js`
  4. เสนอแก้ CLAUDE.md หมวด 2–3 ให้ตรงพาธใหม่ (รอเจ้าของแก้เอง — ดูรายการล่าสุด)
  5. โรดแมพก้อน 3 ที่เหลือ: ข้อ 8 ความสำเร็จ + ฉายาพิเศษ · ข้อ 9 ประวัติการเล่น + สถิติแยกเกม · ข้อ 10 เควสเพิ่ม + อีเวนต์ (ดู docs/ROADMAP.md)
- คำถามที่รอเจ้าของโปรเจคตอบ: ดูรายการ 2026-11-05 ด้านล่าง
- ข้อห้ามชั่วคราว: ไม่มี
- ของที่พักไว้: ระบบเสียงอยู่ใน branch `sound` (ยังไม่ merge · เลขเวอร์ชันในนั้นต้องเปลี่ยนตอนรวม) — รอเสียงพากย์ตัวละครแล้วอัปพร้อมกัน

## รายการงาน (ใหม่สุดบน)

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
