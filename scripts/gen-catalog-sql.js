#!/usr/bin/env node
// สร้าง supabase/seed_catalog.sql จาก skins.json (รายการของ) + gacha.json (ตู้/ราคา/โอกาส) + skills.json (ค่าตัวละคร)
// รันใหม่ทุกครั้งที่แก้ไฟล์เหล่านั้น แล้ววางผลลัพธ์ใน Supabase SQL Editor (ปลอดภัยที่จะรันซ้ำ)
//   node scripts/gen-catalog-sql.js            → เขียน supabase/seed_catalog.sql
//   node scripts/gen-catalog-sql.js --stdout   → พิมพ์ออกหน้าจอ
// กติกา: ไม่มีร้านค้าแล้ว — ของทุกอย่างได้จากกาชา · ของที่ price=0 ใน skins.json = ของเริ่มต้น (ทุกคนมี และยังสุ่มได้เพื่อเอาตัวซ้ำ)
//        ระดับหายากดูจาก price เดิม (gacha.priceToRarity) หรือกำหนด "rarity" ตรง ๆ ในรายการ · ใส่ "gacha": false = ไม่อยู่ในตู้
const fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '..'), SKIN = path.join(ROOT, 'client/public/skin');
const Core = require(path.join(ROOT, 'client/public/skills-core.js'));
const KINDS = ['characters', 'backs', 'tables', 'backgrounds', 'frames'];
const q = s => "'" + String(s == null ? '' : s).replace(/'/g, "''") + "'";
const int = v => Math.max(0, Math.floor(Number(v) || 0));
const arr = a => "'{" + a.map(int).join(',') + "}'";
const nul = v => (v == null || v === '' ? 'null' : int(v));

function build(skins, skills, gacha) {
  gacha = gacha || {};
  const R = gacha.rarities || {}, tiers = Object.keys(R);
  const rarityOf = x => {
    if (x.rarity && R[x.rarity]) return x.rarity;
    for (const t of gacha.priceToRarity || []) if (int(x.price) >= t.min) return t.rarity;
    return 'common';
  };
  const out = ['-- สร้างอัตโนมัติโดย scripts/gen-catalog-sql.js — อย่าแก้มือ (แก้ skins.json / gacha.json / skills.json แล้วรันสคริปต์ใหม่)', ''];
  const items = [], pool = [];
  for (const kind of KINDS) for (const x of (skins[kind] || [])) {
    if (!x || !x.id) continue;
    const r = rarityOf(x);
    items.push({ kind, id: x.id, name: x.name || x.n || x.id, rarity: r, def: int(x.price) === 0 && !x.rarity ? true : !!x.default, inPool: x.gacha !== false, excl: x.exclusive || null });   // exclusive = อยู่เฉพาะตู้นั้น
  }
  if (tiers.length) {
    out.push('insert into public.rarity_config(rarity, name, sell_coins, sort) values',
      tiers.map((t, i) => `(${q(t)}, ${q(R[t].name || t)}, ${int(R[t].sell)}, ${i + 1})`).join(',\n'),
      'on conflict (rarity) do update set name = excluded.name, sell_coins = excluded.sell_coins, sort = excluded.sort;', '');
  }
  if (items.length) {
    out.push('insert into public.catalog_items(kind, item_id, name, rarity, is_default, active) values',
      items.map(i => `(${q(i.kind)}, ${q(i.id)}, ${q(i.name)}, ${q(i.rarity)}, ${i.def}, true)`).join(',\n'),
      'on conflict (kind, item_id) do update set name = excluded.name, rarity = excluded.rarity, is_default = excluded.is_default, active = true;', '');
    out.push(`update public.catalog_items set active = false where (kind, item_id) not in (${items.map(i => `(${q(i.kind)}, ${q(i.id)})`).join(', ')});`, '');
  }
  const banners = gacha.banners || [];
  if (banners.length) {
    // ticket/ticket_mcash/ticket_mcash10/grp ต้องมีคอลัมน์จาก supabase/v8_gacha.sql ก่อน
    out.push('insert into public.gacha_banners(id, name, description, single_coins, single_mcash, ten_coins, ten_mcash, pity, sort, active, ticket, ticket_mcash, ticket_mcash10, grp) values',
      banners.map((b, i) => `(${q(b.id)}, ${q(b.name)}, ${q(b.description)}, ${nul(b.singleCoins)}, ${nul(b.singleMcash)}, ${nul(b.tenCoins)}, ${nul(b.tenMcash)}, ${int(b.pity)}, ${i + 1}, true, ${b.ticket ? q(b.ticket) : 'null'}, ${nul(b.ticketMcash)}, ${nul(b.ticketMcash10)}, ${q(b.group || 'char')})`).join(',\n'),
      'on conflict (id) do update set name = excluded.name, description = excluded.description, single_coins = excluded.single_coins, single_mcash = excluded.single_mcash, ten_coins = excluded.ten_coins, ten_mcash = excluded.ten_mcash, pity = excluded.pity, sort = excluded.sort, active = true, ticket = excluded.ticket, ticket_mcash = excluded.ticket_mcash, ticket_mcash10 = excluded.ticket_mcash10, grp = excluded.grp;', '');
    if (gacha.weeklyShop) out.push(`insert into public.game_config(key, value) values ('weekly_shop', ${q(JSON.stringify(gacha.weeklyShop))}::jsonb) on conflict (key) do update set value = excluded.value;`, '');
    out.push(`update public.gacha_banners set active = false where id not in (${banners.map(b => q(b.id)).join(', ')});`, '');
    // น้ำหนักต่อชิ้น = น้ำหนักของระดับ ÷ จำนวนชิ้นในระดับนั้น (โอกาสรวมของระดับคงที่ไม่ว่าจะมีของกี่ชิ้น)
    // ต่อกาชา: b.pool (จำกัดไอเทม) · b.rarityWeights (เรทต่อระดับ, 0 = ไม่ออก) · b.rateUp {multiplier, items} (คูณเรทไอเทมที่เลือก)
    const inPool = items.filter(i => i.inPool), key = p => (typeof p === 'string' ? p : p.id), hit = (i, k) => i.id === k || i.kind + ':' + i.id === k;
    for (const b of banners) {
      const only = Array.isArray(b.pool) && b.pool.length ? b.pool : null, RW = b.rarityWeights || {}, up = (b.rateUp && b.rateUp.items) || [], mult = Number(b.rateUp && b.rateUp.multiplier) || 1;
      const kinds = Array.isArray(b.kinds) && b.kinds.length ? b.kinds : null;   // จำกัดชนิดของในตู้ (ตู้ตัวละคร / ตู้ของแต่ง)
      const list = inPool.filter(i => (i.excl ? i.excl === b.id : (!only || only.some(p => hit(i, key(p)))) && (!kinds || kinds.includes(i.kind))) && !(b.noDefaults && i.def) && RW[i.rarity] !== 0), cnt = {};
      list.forEach(i => { cnt[i.rarity] = (cnt[i.rarity] || 0) + 1; });
      const seen = {};   // แบ่งน้ำหนักของระดับให้ลงตัว: เศษไปอยู่ชิ้นแรก ๆ (รวมทั้งระดับ = น้ำหนักระดับ × 100 พอดี → เปอร์เซ็นต์ตรงกับที่ประกาศ)
      for (const i of list) {
        const own = only && only.find(p => typeof p === 'object' && hit(i, p.id) && p.weight != null);
        const tierW = int((RW[i.rarity] != null ? RW[i.rarity] : (R[i.rarity] || {}).weight) || 1) * 100, k = seen[i.rarity] = (seen[i.rarity] || 0) + 1;
        let w = own ? int(own.weight) : Math.max(1, Math.floor(tierW / cnt[i.rarity]) + (k <= tierW % cnt[i.rarity] ? 1 : 0));
        if (!own && up.some(k => hit(i, k))) w = Math.max(1, Math.round(w * mult));
        pool.push(`(${q(b.id)}, ${q(i.kind)}, ${q(i.id)}, ${w})`);
      }
    }
    if (pool.length) {
      out.push('insert into public.gacha_pool(banner_id, kind, item_id, weight) values', pool.join(',\n'),
        'on conflict (banner_id, kind, item_id) do update set weight = excluded.weight;', '');
      // ของที่ไม่อยู่ในตู้แล้ว: ตั้งน้ำหนัก 0 (ไม่ออก · ไม่แสดง) แทนการลบแถว — รันผ่านเครื่องมือที่ห้ามคำสั่งลบได้ และย้อนกลับง่าย
      out.push(`update public.gacha_pool set weight = 0 where (banner_id, kind, item_id) not in (${pool.map(s => s.slice(0, s.lastIndexOf(',')) + ')').join(', ')});`, '');
    }
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
  const sql = build(read('skins.json'), read('skills.json'), read('gacha.json'));
  if (process.argv.includes('--stdout')) process.stdout.write(sql);
  else { const f = path.join(ROOT, 'supabase/seed_catalog.sql'); fs.writeFileSync(f, sql); console.log('✓ เขียน ' + path.relative(ROOT, f)); }
}
