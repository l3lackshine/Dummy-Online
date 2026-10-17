# โฟลเดอร์กฎเกม (`server/src/rules/`)

กติกาของแต่ละเกมไพ่แยกอยู่ที่นี่ ตัวเซิร์ฟเวอร์ (`../index.js`) ไม่รู้จักกติกาของเกมใดโดยตรง — มันถามทะเบียนกฎ (`rules/index.js`) ตาม `rule` ที่ผู้สร้างห้องเลือก
หน้าสร้างห้องของ client สร้างจาก `meta` ที่กฎประกาศไว้ล้วน ๆ จึง **เพิ่มกฎใหม่ได้โดยไม่ต้องแก้ client**

```
rules/
├─ index.js          ทะเบียนกฎและการตรวจ options
├─ common.js         ตัวละคร/พื้นหลัง
├─ simple-cards.js   ไพ่และตัวช่วยร่วมสำหรับเกมไพ่แบบง่าย
├─ dummy/            ดัมมี่เดิม (engine + scoring)
├─ pokdeng/          ป๊อกเด้ง Basic
├─ gaogae/           เก้าเก Standard
├─ oldmaid/          อีแก่
└─ korat/            สมสิบโคราช (ปิดไว้จนยืนยันกติกา)
```

การสับไพ่ใช้ `../shuffle.js` ร่วมกัน ส่วน wallet/ledger อยู่ที่ `server/src/wallet.js` และผลเหรียญที่ engine ส่งคืนจะถูกชำระโดยเซิร์ฟเวอร์เท่านั้น.

(การสับไพ่ `../shuffle.js` เป็นบริการกลางที่ทุกกฎใช้ร่วมกัน)

## สัญญาของโมดูลกฎ

โมดูลต้อง export:

| ชื่อ | หน้าที่ |
|---|---|
| `meta` | `{ id, name, icon, desc, minPlayers, maxPlayers, options[], scoring[] }` |
| `newGame(humans, { deck, options })` | สร้างเกม — `humans = [{id,n,ch,bg}]`, `deck` = ลำดับไพ่ที่สับแล้ว (id 0..51), `options` ผ่าน `cleanOptions` แล้ว |
| `act(G, seat, action)` | คำสั่งผู้เล่น คืน `null` เมื่อสำเร็จ หรือข้อความผิดพลาด |
| `botTurn(G)` | บอทเล่นหนึ่งตา (ใช้แทนผู้เล่นที่หลุดด้วย) |
| `view(G, seat)` | มุมมองเฉพาะผู้เล่น (ห้ามมีไพ่ในมือคนอื่น) |
| `winner(G)` | ที่นั่งผู้ชนะตา (ใช้ให้สิทธิ์สับไพ่ตาถัดไป) หรือ `null` |

`meta.options` ใช้ได้ 2 ชนิด (client สร้างช่องกรอกให้เอง):
- `{ key, label, type:'number', default, min, max, step, presets:[…] }`
- `{ key, label, type:'select', default, choices:[{v,label}] }`

`meta.scoring` คือข้อความสรุปการนับเหรียญที่แสดงในหน้าสร้างห้อง ใช้ `{stake}` หรือ `{stake*0.75}` แทนค่าตามเดิมพันได้

## เพิ่มกฎใหม่ (เช่น `hearts`)

1. สร้าง `rules/hearts/` มี `meta.js`, `engine.js`, `scoring.js` (ถ้าต้องนับเหรียญ) และ `index.js` ที่ `module.exports = { meta, ...engine }`
2. เปิด `rules/index.js` เพิ่มบรรทัด `register(require('./hearts'));`
3. เสร็จ — รีสตาร์ตเซิร์ฟเวอร์ กฎใหม่จะโผล่ในหน้า "เลือกไพ่ที่จะเล่น" ทันที ตัวเลือกของกฎก็ขึ้นเองตาม `meta.options`

ผลเหรียญของเกม: ให้ใส่ใน `G.res.coin = { stake, delta:[…ต่อที่นั่ง], lines:[{f,t,a,w}] }` ตอนจบตา
(`f` = ผู้จ่าย, `t` = ผู้รับ, `a` = จำนวน, `w` = เหตุผล) client แสดงรายการเท่านั้น การสำรอง/ชำระ/ปรับยอดเหรียญทำโดย `src/wallet.js` ฝั่งเซิร์ฟเวอร์

> หมายเหตุ: client มีตัวแสดงผลแบบง่ายสำหรับ `pokdeng`, `gaogae` และ `oldmaid`; ดัมมี่ยังคงใช้โต๊ะเดิม ส่วน `korat` ถูกปิดไว้จนกว่าจะยืนยันกติกาท้องถิ่น
