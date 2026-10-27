# โครงสร้างแอสเซ็ตของเกม (client/public/)

```
Character/<id>/            ตัวละครแต่ละตัว (1 โฟลเดอร์ = 1 ตัว, ชื่อโฟลเดอร์ = id)
    Character.png|webp       รูปตัวละคร
    Character.config         ตั้งค่า (JSON)
    Effect/  Sounds/  Background/   ไฟล์เอฟเฟกต์ เสียง และพื้นหลังห้องเฉพาะตัวละคร
Item/<ชนิด>/               ไอเทมที่ไม่ใช่ตัวละคร  ชนิด = CardBack Table Background Card Dock Theme
    Item.config              รายการไอเทมทั้งหมดของชนิดนั้น  + ไฟล์รูป
Shop/
    Shopsetting.config       ตั้งค่าหน้าร้าน (ชื่อหน้าต่าง ลำดับ/ชื่อ/ซ่อนแท็บ รูปแบบหน้ากาชา)
    Gasha/gasha.config       ตั้งค่ากลางของกาชา (ระดับความหายาก เรทพื้นฐาน ราคาขายคืน การแปลงราคา→ระดับ)
    Gasha/<id>/Config.config + banner.webp|png|jpg    ตู้กาชา 1 ตู้ = 1 โฟลเดอร์
Sounds/sounds.config + ไฟล์เสียง      เสียงหลักของเกม
UI/ui.config + UI/Assets/            ปุ่ม กรอบหน้าต่าง กรอบอวตาร ไอคอน
```
ไฟล์ `.config` คือ JSON ธรรมดา (เปิดแก้ด้วยโปรแกรมแก้ข้อความได้)

## เพิ่มตัวละคร
1. สร้าง `Character/<id>/` ใส่ `Character.webp` และ `Character.config`:
```json
{ "id": "mina-01", "name": "มินะ", "price": 1500, "order": 6, "image": "Character.webp",
  "rarity": "legendary", "effects": {"win": "Effect/win.webp"}, "sounds": {"win": "Sounds/win.mp3"}, "background": "Background/room.webp" }
```
(`rarity` ไม่ใส่ก็ได้ — ระบบเดาจากราคา · `effects/sounds/background` เว้นว่างได้)
2. รัน `node scripts/build-assets.js`

## เพิ่มไอเทม
ใส่ไฟล์ใน `Item/<ชนิด>/` แล้วเพิ่มรายการใน `Item.config` ของชนิดนั้น เช่น `{ "id": "wood2", "file": "wood2.webp", "name": "โต๊ะไม้ 2", "price": 400, "order": 7, "bg": "#8a5a2e", "bg2": "#5a3718" }` แล้วรัน build

## เพิ่มตู้กาชา + แบนเนอร์
สร้าง `Shop/Gasha/<id>/` ใส่ `banner.webp` และ `Config.config`:
```json
{ "id": "sakura-ace", "name": "SAKURA ACE", "description": "...", "order": 2, "enabled": true, "image": "banner.webp",
  "singleCoins": 300, "tenCoins": 2700, "singleMcash": 30, "tenMcash": 270, "pity": 50,
  "rarityWeights": {"legendary": 500},
  "rateUp": {"multiplier": 3, "items": ["rina-01", "arya-01"]},
  "pool": ["rina-01", "arya-01", "boy"] }
```
- มี `image` = หน้ากาชาโชว์แบนเนอร์แทนรายการ (ยังมีปุ่ม "รายการและอัตราการออก" · ปิดได้ใน `Shopsetting.config` → `gacha.showListButton`)
- `rarityWeights` เรทต่อระดับเฉพาะตู้ (0 = ไม่ออก) · `rateUp` คูณเรทไอเทมที่เลือก · `pool` จำกัดไอเทมในตู้ (ไม่ใส่ = ทุกชิ้น)
- ความหายากต่อชิ้น = ใส่ `"rarity"` ใน config ของไอเทมนั้น · เรทพื้นฐาน/ราคาขายคืน แก้ใน `gasha.config`
- `"enabled": false` = ซ่อนตู้ชั่วคราว

## ขั้นตอนหลังแก้ไฟล์ (ทุกครั้ง)
```
node scripts/build-assets.js        # รวมเป็น skin/skins.json และ skin/gacha.json (ตรวจความถูกต้องให้ด้วย)
node scripts/gen-catalog-sql.js     # ถ้าแก้ราคา/เรท/ไอเทม/ตู้กาชา → สร้าง supabase/seed_catalog.sql
```
แล้วนำเนื้อหา `supabase/seed_catalog.sql` ไปรันใน Supabase SQL Editor (เฉพาะเมื่อแก้กาชาหรือรายการไอเทม) จากนั้นอัปโหลดขึ้น GitHub
ตรวจอย่างเดียวไม่เขียนไฟล์: `node scripts/build-assets.js --check`

## หมายเหตุ
- รายการที่ **ไม่ได้มาจากโฟลเดอร์ใหม่** (เช่นที่เพิ่มจากแอป Skin Studio ในไฟล์ skins.json) จะถูกเก็บไว้ไม่ถูกลบ · รายการจากโฟลเดอร์มีป้าย `"src":"folder"`
- ช่อง `effects / sounds / background` ของตัวละครและ `Sounds/sounds.config` เตรียมไว้แล้ว: ใช้ผ่าน `Assets.char(id)` และ `Assets.play("win", id)` (ยังไม่ได้ผูกกับเหตุการณ์ในเกม)
- `UI/ui.config`: ใส่ไฟล์ในช่องไหน ระบบจะสร้างตัวแปร CSS `--ui-<กลุ่ม>-<ชื่อ>` ให้ใช้ (ช่องว่าง = ดีไซน์เดิม)

## แพ็กแอสเซ็ต (ก้อนที่ 2: เข้ารหัส + ส่งกุญแจตามสิทธิ์ผู้เล่น)
```
client/public/pack/base.pak          ตัวละครฟรี + ภาพตัวอย่างลายน้ำของตัวละครที่ต้องซื้อ  (ทุกคนขอกุญแจได้)
client/public/pack/char-<id>.pak     ภาพเต็ม/เอฟเฟกต์/เสียงของตัวละครที่ต้องซื้อ 1 ตัว     (ได้กุญแจเมื่อมีตัวละครในคลัง)
client/public/pack/manifest.json     รายการแพ็ก + เวอร์ชัน
```
- **ต้นฉบับ** (รูปจริง) อยู่ใน `assets-src/Character/<id>/...` (ไฟล์ `.config` อยู่ที่ `client/public/Character/<id>/` เหมือนเดิม) · ตัวที่ `price` > 0 ในไฟล์ `Character.config` = ต้องซื้อ
- **กุญแจไม่ได้อยู่ใน repo หรือในเกม:** คำนวณจากความลับ `PACK_MASTER` (HKDF + ชื่อแพ็ก) — GitHub Actions ใช้ตอนแพ็ก, เซิร์ฟเวอร์บน Render ใช้ตอนส่งกุญแจที่ `/pack-key`
- **GitHub Actions** (`.github/workflows/pack-assets.yml`) แพ็กให้อัตโนมัติเมื่อแก้ `assets-src/` หรือ config ตัวละคร แล้ว commit ผลกลับ · สร้างภาพตัวอย่างลายน้ำ (`Preview.webp`) ให้เองถ้ายังไม่มี
- **เพิ่มตัวละครที่ต้องซื้อ:** วางรูปใน `assets-src/Character/<id>/Character.webp` + ตั้ง `price` ใน config → push → รอ Actions แพ็กให้ (ลำดับ: `build-assets.js` → push)
- **ตอนผู้เล่นเข้าเกม:** หน้าโหลดขอกุญแจ → โหลดแพ็กเก็บในเครื่อง → ถอดรหัสในหน่วยความจำ · ซื้อ/สุ่มได้ตัวละครใหม่ = ปลดล็อกภาพเต็มอัตโนมัติ · ไม่มีสิทธิ์ = เห็นภาพตัวอย่างลายน้ำ
- ไม่มีโฟลเดอร์ `pack/` = เกมใช้ไฟล์ตรงตามเดิม (โหมดพัฒนา)
- ทดสอบในเครื่อง: `node scripts/pack-assets.js --dev` (ใช้ master ทดสอบ ห้ามนำไปใช้จริง)
- **ข้อจำกัดที่ต้องรู้:** ภาพที่แสดงบนจอผู้เล่นแคปหน้าจอได้เสมอ · ผู้เล่นที่ยังไม่ล็อกอินเห็นเฉพาะตัวละครฟรีและภาพตัวอย่าง (ตัวละครที่ซื้อด้วยเหรียญแบบ local ไม่ใช่บัญชี จะไม่ปลดล็อกภาพเต็ม) · ถ้าเปลี่ยน `PACK_MASTER` ต้องให้ Actions แพ็กใหม่
- **ความเป็นส่วนตัวของ `assets-src/`:** ถ้า repo เป็น public คนจะเห็นรูปต้นฉบับบน GitHub ได้ — ใช้ repo แบบ private ถึงจะกันได้จริง
