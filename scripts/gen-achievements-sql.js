#!/usr/bin/env node
/* gen-achievements-sql.js — สร้าง supabase/achievements_seed.sql จาก client/public/skin/achievements.json (รายการความสำเร็จ + ขั้น + รางวัล)
   รัน: node scripts/gen-achievements-sql.js → วางไฟล์ที่ได้ใน Supabase SQL Editor (ต้องรัน v14_achievements.sql ก่อน) · รันซ้ำได้ ปลอดภัย
   ความสำเร็จที่ลบออกจากไฟล์ → ปิด (active = false) ไม่ลบ เพื่อให้ฉายาที่ผู้เล่นได้ไปแล้วยังอยู่
   Public: build(data) → ข้อความ SQL · validate(data) → รายการข้อผิดพลาด
   EXTEND: metric ใหม่ = เพิ่มใน METRICS ที่นี่ + ใน check ของ achievement_defs และ _ach_progress (SQL) */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const SOURCE = path.join(ROOT, 'client/public/skin/achievements.json');
const TARGET = path.join(ROOT, 'supabase/achievements_seed.sql');
const METRICS = ['plays', 'wins', 'streak', 'chars_used', 'melds', 'feat', 'rules', 'login_days', 'chars_owned', 'stars5', 'rank_tier', 'level'];
const ID_PATTERN = /^[a-z0-9-]{1,40}$/;
const FEAT_PATTERN = /^[a-z0-9_]{1,24}$/;
const MAX_TIERS = 9;

const quote = value => (value == null ? 'null' : "'" + String(value).replace(/'/g, "''") + "'");
const toInt = value => Math.max(0, Math.floor(Number(value) || 0));

// ระดับเหรียญของขั้น: ใส่ level เองได้ ไม่ใส่ = ลำดับขั้น (เกิน 3 ใช้ 3)
const levelOf = (tier, index) => Math.min(3, Math.max(1, toInt(tier.level) || index + 1));

function validateOne(item, groupIds) {
  const errors = [];
  const where = 'ความสำเร็จ ' + (item.id || '(ไม่มี id)');
  if (!ID_PATTERN.test(item.id || '')) errors.push(where + ': id ต้องเป็น a-z 0-9 -');
  if (!groupIds.has(item.group)) errors.push(where + ': ไม่มีหมวด ' + item.group);
  if (!METRICS.includes(item.metric)) errors.push(where + ': ไม่รู้จัก metric ' + item.metric);
  if (item.metric === 'feat' && !FEAT_PATTERN.test(item.feat || '')) errors.push(where + ': metric feat ต้องมี feat (a-z 0-9 _)');
  if (!item.name) errors.push(where + ': ต้องมี name');
  const tiers = item.tiers || [];
  if (!tiers.length || tiers.length > MAX_TIERS) errors.push(where + ': ต้องมี 1-' + MAX_TIERS + ' ขั้น');
  tiers.forEach((tier, index) => {
    if (!(toInt(tier.n) > 0)) errors.push(where + ' ขั้น ' + (index + 1) + ': n ต้องมากกว่า 0');
    if (!tier.title) errors.push(where + ' ขั้น ' + (index + 1) + ': ต้องมี title (ฉายา)');
    if (index > 0 && toInt(tier.n) <= toInt(tiers[index - 1].n)) errors.push(where + ': n ของแต่ละขั้นต้องเพิ่มขึ้น');
  });
  return errors;
}

function validate(data) {
  const groupIds = new Set((data.groups || []).map(group => group.id));
  const errors = [];
  const seen = new Set();
  for (const item of data.list || []) {
    if (seen.has(item.id)) errors.push('id ซ้ำ: ' + item.id);
    seen.add(item.id);
    errors.push(...validateOne(item, groupIds));
  }
  return errors;
}

function defRow(item, sort) {
  return `(${quote(item.id)}, ${quote(item.group)}, ${quote(item.game || null)}, ${quote(item.metric)}, ${quote(item.feat || null)}, ${quote(item.icon || '🏅')}, ${quote(item.name)}, ${quote(item.desc || '')}, ${sort})`;
}

function tierRows(item, rewards) {
  return (item.tiers || []).map((tier, index) => {
    const level = levelOf(tier, index);
    const reward = Object.assign({}, rewards[level] || {}, tier.reward || {});
    return `(${quote(item.id)}, ${index + 1}, ${toInt(tier.n)}, ${quote(tier.title)}, ${level}, ${toInt(reward.coins)}, ${toInt(reward.mcash)})`;
  });
}

function build(data) {
  const list = data.list || [];
  const ids = list.map(item => quote(item.id)).join(', ');
  const rewards = data.rewards || {};
  return [
    '-- สร้างอัตโนมัติโดย scripts/gen-achievements-sql.js — อย่าแก้มือ (แก้ client/public/skin/achievements.json แล้วรันใหม่)',
    '-- ต้องรัน v14_achievements.sql ก่อน · รันซ้ำได้',
    'begin;',
    'insert into public.achievement_defs(id, grp, game_id, metric, feat, icon, name, descr, sort) values',
    list.map((item, index) => defRow(item, (index + 1) * 10)).join(',\n'),
    'on conflict (id) do update set grp = excluded.grp, game_id = excluded.game_id, metric = excluded.metric, feat = excluded.feat,',
    '  icon = excluded.icon, name = excluded.name, descr = excluded.descr, sort = excluded.sort, active = true;',
    `update public.achievement_defs set active = false where id not in (${ids});`,
    `delete from public.achievement_tiers where ach_id in (${ids});`,
    'insert into public.achievement_tiers(ach_id, tier, target, title, level, reward_coins, reward_mcash) values',
    list.flatMap(item => tierRows(item, rewards)).join(',\n') + ';',
    'commit;',
    '',
  ].join('\n');
}

module.exports = { build, validate };

if (require.main === module) {
  const data = JSON.parse(fs.readFileSync(SOURCE, 'utf8'));
  const errors = validate(data);
  if (errors.length) {
    console.error('achievements.json ไม่ถูกต้อง:\n  ' + errors.join('\n  '));
    process.exit(1);
  }
  const check = process.argv.includes('--check');
  if (!check) fs.writeFileSync(TARGET, build(data));
  const tiers = data.list.reduce((sum, item) => sum + item.tiers.length, 0);
  console.log((check ? 'ตรวจแล้ว: ' : 'เขียน ' + path.relative(ROOT, TARGET) + ': ') + data.list.length + ' ความสำเร็จ · ' + tiers + ' ขั้น');
}
