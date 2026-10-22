#!/usr/bin/env node
// สร้าง supabase/seed_catalog.sql จาก client/public/skin/skins.json (ร้านค้า) และ skills.json (ค่าตัวละคร)
// รันใหม่ทุกครั้งที่แก้ราคา/เพิ่มสกิน/แก้ค่าตัวละคร แล้ววางไฟล์ผลลัพธ์ใน Supabase SQL Editor (ปลอดภัยที่จะรันซ้ำ)
//   node scripts/gen-catalog-sql.js            → เขียน supabase/seed_catalog.sql
//   node scripts/gen-catalog-sql.js --stdout   → พิมพ์ออกหน้าจอ
const fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '..'), SKIN = path.join(ROOT, 'client/public/skin');
const Core = require(path.join(ROOT, 'client/public/skills-core.js'));
const KINDS = ['characters', 'backs', 'tables', 'backgrounds'];
const q = s => "'" + String(s == null ? '' : s).replace(/'/g, "''") + "'";
const int = v => Math.max(0, Math.floor(Number(v) || 0));
const arr = a => "'{" + a.map(int).join(',') + "}'";

function build(skins, skills) {
  const out = ['-- สร้างอัตโนมัติโดย scripts/gen-catalog-sql.js — อย่าแก้มือ (แก้ skins.json / skills.json แล้วรันสคริปต์ใหม่)', ''];
  const items = [];
  for (const kind of KINDS) for (const x of (skins[kind] || [])) {
    if (!x || !x.id) continue;
    items.push(`(${q(kind)}, ${q(x.id)}, ${q(x.name || x.n || x.id)}, ${int(x.price)}, ${int(x.mcash)}, true)`);
  }
  if (items.length) {
    out.push('insert into public.shop_items(kind, item_id, name, price_coins, price_mcash, active) values', items.join(',\n'),
      'on conflict (kind, item_id) do update set name = excluded.name, price_coins = excluded.price_coins, price_mcash = excluded.price_mcash, active = true;', '');
    // ของที่ถูกลบออกจากแคตตาล็อก: ปิดการขาย (ไม่ลบ เพราะผู้เล่นอาจซื้อไปแล้ว)
    out.push(`update public.shop_items set active = false where not ((kind, item_id) in (${(skins ? KINDS.flatMap(k => (skins[k] || []).filter(x => x && x.id).map(x => `(${q(k)}, ${q(x.id)})`)) : []).join(', ') || "('', '')"}));`, '');
  }
  const ids = (skins.characters || []).map(c => c.id);
  const defs = ids.map(id => {
    const c = Core.charCfg(skills, id), sc = (skills.characters || {})[id], own = sc && !Array.isArray(sc) && sc.starCosts ? sc.starCosts : null;
    const bonus = Core.bonusPct(skills, id), hasBonus = bonus.some(Boolean);
    return `(${q(id)}, ${c.maxStars}, ${own ? arr(own) : 'null'}, ${hasBonus ? arr(bonus) : 'null'})`;
  });
  if (defs.length) out.push('insert into public.character_defs(id, max_stars, star_costs, bonus_pct) values', defs.join(',\n'),
    'on conflict (id) do update set max_stars = excluded.max_stars, star_costs = excluded.star_costs, bonus_pct = excluded.bonus_pct;', '');
  return out.join('\n');
}
module.exports = { build };
if (require.main === module) {
  const read = f => JSON.parse(fs.readFileSync(path.join(SKIN, f), 'utf8'));
  const sql = build(read('skins.json'), read('skills.json'));
  if (process.argv.includes('--stdout')) process.stdout.write(sql);
  else { const f = path.join(ROOT, 'supabase/seed_catalog.sql'); fs.writeFileSync(f, sql); console.log('✓ เขียน ' + path.relative(ROOT, f)); }
}
