# ระบบสกิน

เพิ่ม/แก้สกินในอนาคตโดยไม่ต้องแก้ `app.js` หรือ `style.css`:

1. นำไฟล์รูปไปไว้ในหมวดที่ตรงกัน: `characters/`, `tables/`, `backgrounds/`, `cards/` (ไฟล์ภาพที่ใช้ควรเป็น PNG, JPG หรือ WebP)
2. เปิด `skins.json` แล้วเพิ่มรายการในหมวด `characters`, `tables`, `backgrounds`, `cards` หรือ `themes` โดยตั้ง `id` ไม่ซ้ำกัน
3. ใส่ path ของรูปแบบ relative เช่น `./skin/tables/wood.webp` ในช่อง `asset`
4. ตาราง/พื้นหลังรองรับ `bg`, `bg2`, `css`; สกินไพ่รองรับ `card`, `blk`, `red`, `edge`; ธีมร้านค้ารองรับ `price` และค่าสีต่าง ๆ

ตัวอย่างรายการโต๊ะ: `{"id":"wood","name":"โต๊ะไม้","asset":"./skin/tables/wood.webp","bg":"#52351f","bg2":"#26180f"}`

โฟลเดอร์หมวดที่ยังไม่มีรูปมีไฟล์ README ไว้เพื่อให้คงอยู่ใน GitHub

รายการ `themes` คือธีมสีเดิมที่แสดงในร้านค้า ส่วน `characters`, `tables`, `backgrounds`, `cards` จะแสดงเป็นตัวเลือกในส่วนของตกแต่งเพิ่มเติมในร้านค้าโดยอัตโนมัติเมื่อเพิ่มรายการลง `skins.json`.
