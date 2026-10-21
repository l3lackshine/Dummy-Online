#!/usr/bin/env node
// สร้าง supabase/seed_shop.sql จาก client/public/skin/skins.json (ราคาในร้านมาจากไฟล์เดียวกับที่ client ใช้)
//   node scripts/gen-shop-sql.js            เขียนไฟล์ supabase/seed_shop.sql
// รันซ้ำได้ทุกครั้งที่แก้ราคา/เพิ่มสกิน แล้วเอาไฟล์ไปรันใน SQL Editor (upsert — ไม่ลบของเดิมที่ผู้เล่นซื้อไปแล้ว)
const fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '..');
const skins = JSON.parse(fs.readFileSync(path.join(ROOT, 'client/public/skin/skins.json'), 'utf8'));
const q = s => "'" + String(s).replace(/'/g, "''") + "'";
const rows = [];
for (const [kind, list] of Object.entries(skins)) {
  if (!Array.isArray(list)) continue;
  for (const x of list) {
    if (!x || !x.id) continue;
    if (!/^[a-z]{1,20}$/.test(kind) || !/^[A-Za-z0-9_-]{1,40}$/.test(x.id)) { console.error('ข้าม (รูปแบบ id ไม่รองรับ):', kind, x.id); continue; }
    rows.push(`  (${q(kind)}, ${q(x.id)}, ${q(x.name || x.n || x.id)}, ${Math.max(0, Math.floor(Number(x.price) || 0))})`);
  }
}
const sql = `-- สร้างอัตโนมัติโดย scripts/gen-shop-sql.js — อย่าแก้มือ\ninsert into public.shop_items (kind, id, name, price) values\n${rows.join(',\n')}\non conflict (kind, id) do update set name = excluded.name, price = excluded.price;\n`;
const out = path.join(ROOT, 'supabase/seed_shop.sql');
fs.writeFileSync(out, sql);
console.log('เขียน', path.relative(ROOT, out), '—', rows.length, 'รายการ');
