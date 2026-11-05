# WORKLOG — สมุดส่งต่องาน Dummy Online
> เรียงใหม่สุดไว้บน · ห้ามลบรายการเก่า · ทุกแชท/AI ต้องอ่านก่อนเริ่มและเขียนก่อนจบ (ดู CLAUDE.md หมวด 13)

## สถานะปัจจุบัน
- งานที่กำลังทำ: ไม่มี · Beta 0.14.1 ขึ้นจริงแล้ว (SQL v15 + merge `ai/fix-0.14.1` → `main` `89cf6a0` · เซิร์ฟเวอร์/หน้าเว็บ 0.14.1)
- งานค้างเรียงลำดับ:
  1. โรดแมพก้อน 3 ที่เหลือ: ข้อ 8 ความสำเร็จ + ฉายาพิเศษ · ข้อ 9 ประวัติการเล่น + สถิติแยกเกม · ข้อ 10 เควสเพิ่ม + อีเวนต์ (ดู docs/ROADMAP.md)
  2. (เสร็จ 0.13.3) หน้ารางวัลล็อกอินรายวันเปลี่ยนเป็นพื้นครีม + กรอบซากุระแล้ว
  3. ชุด UI ซากุระ: หน้าที่ยังไม่ได้ตรวจด้วยตา (ต้องต่อเซิร์ฟเวอร์จริง/มีห้อง) — ห้องล็อบบี้ · โต๊ะเล่น · หน้าสรุปผลจบตา/เล่นต่อ · หน้าต่างกติกา · หน้าแบทเทิลพาส/อันดับ/เพื่อนแบบมีข้อมูลจริง → เปิดดูบนเว็บจริงแล้วแจ้งจุดที่ยังเป็นแบบเดิม
- คำถามที่รอเจ้าของโปรเจคตอบ: ไม่มี (ตอบครบแล้ว 2026-11-05: เพื่อน 100/50/5 วินาที ✓ · PATCHNOTES.md เขียนมือ ✓ · package.json = 0.13.0 ✓ · แยก CSS ธีม ✓ · ลำดับ ui-kit.js ✓ · แก้ CLAUDE.md ✓)
- ข้อห้ามชั่วคราว: ไม่มี
- ของที่พักไว้: ระบบเสียงอยู่ใน branch `sound` (ยังไม่ merge · เลขเวอร์ชันในนั้นต้องเปลี่ยนตอนรวม) — รอเสียงพากย์ตัวละครแล้วอัปพร้อมกัน

## รายการงาน (ใหม่สุดบน)

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
