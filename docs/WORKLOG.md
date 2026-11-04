# WORKLOG — สมุดส่งต่องาน Dummy Online
> เรียงใหม่สุดไว้บน · ห้ามลบรายการเก่า · ทุกแชท/AI ต้องอ่านก่อนเริ่มและเขียนก่อนจบ (ดู CLAUDE.md หมวด 13)

## สถานะปัจจุบัน
- งานที่กำลังทำ: ระบบเพื่อน (Beta 0.13.0) บน branch `ai/friends-system` — เสร็จแล้ว รอเจ้าของโปรเจคตรวจ ยังไม่ได้ push / ยังไม่ได้รัน SQL บนฐานข้อมูลจริง
- งานค้างเรียงลำดับ:
  1. รอคำตอบเรื่องงาน 0.13.0 ที่ทำก่อนได้รับ CLAUDE.md (ดู "คำถามที่รอตอบ" ในรายการล่าสุด)
  2. ถ้าอนุมัติ: รัน `supabase/v12_friends.sql` บนฐานข้อมูลจริงก่อน → แล้วค่อย push/merge (CLAUDE.md หมวด 11: SQL ก่อนเซิร์ฟเวอร์)
  3. โรดแมพก้อน 3 ที่เหลือ: ข้อ 8 ความสำเร็จ + ฉายาพิเศษ · ข้อ 9 ประวัติการเล่น + สถิติแยกเกม · ข้อ 10 เควสเพิ่ม + อีเวนต์ (ดู docs/ROADMAP.md)
- คำถามที่รอเจ้าของโปรเจคตอบ: ดูรายการ 2026-11-05 ด้านล่าง
- ข้อห้ามชั่วคราว: ไม่มี
- ของที่พักไว้: ระบบเสียงอยู่ใน branch `sound` (ยังไม่ merge · เลขเวอร์ชันในนั้นต้องเปลี่ยนตอนรวม) — รอเสียงพากย์ตัวละครแล้วอัปพร้อมกัน

## รายการงาน (ใหม่สุดบน)

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
