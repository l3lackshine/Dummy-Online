#!/usr/bin/env node
// สร้าง supabase/v7_config.sql จาก server/src/economy.js (สตามิน่า · ไอเทม · ฟาร์มกับบอท · เลเวลตัวละคร) ให้ฐานข้อมูลใช้ตัวเลขชุดเดียวกับเกม
//   node scripts/gen-economy-sql.js → วางไฟล์ที่ได้ใน Supabase SQL Editor (หลัง v7_stamina.sql) · รันซ้ำได้
const fs = require('fs'), path = require('path');
const E = require('../server/src/economy');
function build() {
  const items = Object.fromEntries(Object.entries(E.ITEMS).map(([id, x]) => [id, { stamina: x.stamina || 0, charExp: x.charExp || 0 }]));
  const cfg = { stamina: E.STAMINA, items, farm: E.FARM, char: E.CHAR };
  const json = JSON.stringify(cfg).replace(/'/g, "''");
  return ['-- สร้างอัตโนมัติโดย scripts/gen-economy-sql.js — อย่าแก้มือ (แก้ server/src/economy.js แล้วรันใหม่)',
    `insert into public.game_config(key, value) values ('economy', '${json}'::jsonb)`,
    'on conflict (key) do update set value = excluded.value;', ''].join('\n');
}
module.exports = { build };
if (require.main === module) { const f = path.join(__dirname, '../supabase/v7_config.sql'); fs.writeFileSync(f, build()); console.log('✓ เขียน supabase/v7_config.sql'); }
