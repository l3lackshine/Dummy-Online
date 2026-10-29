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
    items.push({ kind, id: x.id, name: x.name || x.n || x.id, rarity: r, def: int(x.price) === 0 && !x.rarity ? true : !!x.default, inPool: x.gacha !== false });
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
    out.push('insert into public.gacha_banners(id, name, description, single_coins, single_mcash, ten_coins, ten_mcash, pity, sort, active) values',
      banners.map((b, i) => `(${q(b.id)}, ${q(b.name)}, ${q(b.description)}, ${nul(b.singleCoins)}, ${nul(b.singleMcash)}, ${nul(b.tenCoins)}, ${nul(b.tenMcash)}, ${int(b.pity)}, ${i + 1}, true)`).join(',\n'),
      'on conflict (id) do update set name = excluded.name, description = excluded.description, single_coins = excluded.single_coins, single_mcash = excluded.single_mcash, ten_coins = excluded.ten_coins, ten_mcash = excluded.ten_mcash, pity = excluded.pity, sort = excluded.sort, active = true;', '');
    out.push(`update public.gacha_banners set active = false where id not in (${banners.map(b => q(b.id)).join(', ')});`, '');
    // น้ำหนักต่อชิ้น = น้ำหนักของระดับ ÷ จำนวนชิ้นในระดับนั้น (โอกาสรวมของระดับคงที่ไม่ว่าจะมีของกี่ชิ้น)
    // ต่อกาชา: b.pool (จำกัดไอเทม) · b.rarityWeights (เรทต่อระดับ, 0 = ไม่ออก) · b.rateUp {multiplier, items} (คูณเรทไอเทมที่เลือก)
    const inPool = items.filter(i => i.inPool), key = p => (typeof p === 'string' ? p : p.id), hit = (i, k) => i.id === k || i.kind + ':' + i.id === k;
    for (const b of banners) {
      const only = Array.isArray(b.pool) && b.pool.length ? b.pool : null, RW = b.rarityWeights || {}, up = (b.rateUp && b.rateUp.items) || [], mult = Number(b.rateUp && b.rateUp.multiplier) || 1;
      const list = inPool.filter(i => (!only || only.some(p => hit(i, key(p)))) && RW[i.rarity] !== 0), cnt = {};
      list.forEach(i => { cnt[i.rarity] = (cnt[i.rarity] || 0) + 1; });
      for (const i of list) {
        const own = only && only.find(p => typeof p === 'object' && hit(i, p.id) && p.weight != null);
        let w = own ? int(own.weight) : Math.max(1, Math.round(int((RW[i.rarity] != null ? RW[i.rarity] : (R[i.rarity] || {}).weight) || 1) * 100 / cnt[i.rarity]));
        if (!own && up.some(k => hit(i, k))) w = Math.max(1, Math.round(w * mult));
        pool.push(`(${q(b.id)}, ${q(i.kind)}, ${q(i.id)}, ${w})`);
      }
    }
    if (pool.length) {
      out.push('insert into public.gacha_pool(banner_id, kind, item_id, weight) values', pool.join(',\n'),
        'on conflict (banner_id, kind, item_id) do update set weight = excluded.weight;', '');
      out.push(`delete from public.gacha_pool where banner_id in (${banners.map(b => q(b.id)).join(', ')}) and (banner_id, kind, item_id) not in (${pool.map(s => s.slice(0, s.lastIndexOf(',')) + ')').join(', ')});`, '');
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
