#!/usr/bin/env node
// สร้าง supabase/bp_seed.sql จาก client/public/BattlePass/season*.json (ฤดูแบทเทิลพาส + รางวัลทุกเลเวล) · รันซ้ำได้ ปลอดภัย
//   node scripts/gen-bp-sql.js → วางไฟล์ที่ได้ใน Supabase SQL Editor
const fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '..'), DIR = path.join(ROOT, 'client/public/BattlePass');
const q = s => (s == null ? 'null' : "'" + String(s).replace(/'/g, "''") + "'");
const int = v => Math.max(0, Math.floor(Number(v) || 0));
// รางวัลของเลเวลหนึ่งในสายหนึ่ง: default → every (หารลงตัว ตัวที่ใหญ่สุดชนะ) → levels (ทับ)
function rewardAt(track, lv) {
  let r = Object.assign({}, track.default || {});
  const ev = Object.keys(track.every || {}).map(Number).sort((a, b) => a - b);
  for (const n of ev) if (lv % n === 0) r = Object.assign({}, track.default || {}, track.every[n]);
  if (track.levels && track.levels[lv]) r = Object.assign({}, r, track.levels[lv]);
  return r;
}
function build(seasons) {
  const out = ['-- สร้างอัตโนมัติโดย scripts/gen-bp-sql.js — อย่าแก้มือ (แก้ client/public/BattlePass/season*.json แล้วรันใหม่)', ''];
  for (const s of seasons) {
    const start = `('${s.starts}'::date)::timestamp at time zone 'Asia/Bangkok'`;
    out.push(`insert into public.bp_seasons(id, name, starts_at, ends_at, level_exp, max_level, gem_cost, premium_open, cycle_coins, exp_cfg) values`,
      `(${q(s.id)}, ${q(s.name)}, ${start}, (${start}) + interval '${int(s.days)} days', ${int(s.levelExp)}, ${int(s.maxLevel)}, ${int(s.gemCost)}, ${!!s.premiumOpen}, ${int(s.cycleCoins)}, ${q(JSON.stringify(s.exp || {}))}::jsonb)`,
      `on conflict (id) do update set name = excluded.name, starts_at = excluded.starts_at, ends_at = excluded.ends_at, level_exp = excluded.level_exp, max_level = excluded.max_level, gem_cost = excluded.gem_cost, premium_open = excluded.premium_open, cycle_coins = excluded.cycle_coins, exp_cfg = excluded.exp_cfg;`, '');
    const rows = [];
    for (const t of ['free', 'gem', 'premium']) for (let lv = 1; lv <= s.maxLevel; lv++) {
      const r = rewardAt(s.tracks[t] || {}, lv), [ik, ii] = r.item ? String(r.item).split(':') : [null, null];
      rows.push(`(${q(s.id)}, ${lv}, ${q(t)}, ${int(r.coins)}, ${int(r.mcash)}, ${q(ik)}, ${q(ii)}, ${q(r.preview || null)})`);
    }
    out.push('insert into public.bp_rewards(season_id, level, track, coins, mcash, item_kind, item_id, preview) values', rows.join(',\n'),
      'on conflict (season_id, level, track) do update set coins = excluded.coins, mcash = excluded.mcash, item_kind = excluded.item_kind, item_id = excluded.item_id, preview = excluded.preview;', '');
  }
  return out.join('\n');
}
module.exports = { build, rewardAt };
if (require.main === module) {
  const seasons = fs.readdirSync(DIR).filter(f => /^season.*\.json$/.test(f)).sort().map(f => JSON.parse(fs.readFileSync(path.join(DIR, f), 'utf8')));
  const f = path.join(ROOT, 'supabase/bp_seed.sql'); fs.writeFileSync(f, build(seasons)); console.log('✓ เขียน ' + path.relative(ROOT, f) + ' · ' + seasons.length + ' ฤดู');
}
