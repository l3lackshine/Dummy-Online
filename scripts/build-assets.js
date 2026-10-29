#!/usr/bin/env node
/* build-assets.js — รวมไฟล์ตั้งค่าในโฟลเดอร์ Character / Item / Shop เป็น skin/skins.json และ skin/gacha.json
   (เว็บ static อ่านรายชื่อโฟลเดอร์เองไม่ได้ จึงต้องรวมเป็นไฟล์รายการก่อนอัป)
   ใช้:   node scripts/build-assets.js            สร้าง/อัปเดตไฟล์
          node scripts/build-assets.js --check    ตรวจความถูกต้องอย่างเดียว (ไม่เขียนไฟล์)
   ต่อด้วย: node scripts/gen-catalog-sql.js   แล้วรัน supabase/seed_catalog.sql ใน Supabase SQL Editor (เมื่อแก้ราคา/เรท/ไอเทมในกาชา)

   โครงสร้าง (client/public/):
     Character/<id>/Character.<png|webp> + Character.config + Effect/ Sounds/ Background/
     Item/<Theme|Table|Background|Card|Dock|CardBack>/Item.config + ไฟล์รูป
     Shop/Shopsetting.config · Shop/Gasha/gasha.config · Shop/Gasha/<id>/(banner.*, Config.config)
     Sounds/sounds.config · UI/ui.config + UI/Assets/
   รายการที่มาจากโฟลเดอร์จะถูกติดป้าย "src":"folder" · รายการเก่าที่ไม่มีป้าย (เช่นที่เพิ่มจาก Skin Studio) จะถูกเก็บไว้ไม่ลบ */
const fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '..'), PUB = path.join(ROOT, 'client/public'), SKIN = path.join(PUB, 'skin');
const CHECK = process.argv.includes('--check');
const KIND_DIR = { themes: 'Theme', characters: null, tables: 'Table', backgrounds: 'Background', cards: 'Card', docks: 'Dock', backs: 'CardBack', frames: 'Frame' };
const problems = [], warns = [];
const rel = p => path.relative(ROOT, p);
const exists = p => fs.existsSync(p);
const dirs = p => (exists(p) ? fs.readdirSync(p, { withFileTypes: true }).filter(d => d.isDirectory()).map(d => d.name) : []);
function readJson(p, fallback) {
  if (!exists(p)) return fallback;
  try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch (e) { problems.push(`อ่านไฟล์ไม่ได้ (JSON ผิดรูปแบบ): ${rel(p)} — ${e.message}`); return fallback; }
}
const byOrder = (a, b) => (Number(a.order) || 1e6) - (Number(b.order) || 1e6) || String(a.id).localeCompare(String(b.id));
const url = (...parts) => './' + parts.join('/');
const resolveMap = (m, base) => Object.fromEntries(Object.entries(m || {}).filter(([, v]) => v).map(([k, v]) => [k, url(base, v)]));
function needFile(p, what) { // ไฟล์ต้องอยู่ในโฟลเดอร์ที่เว็บเสิร์ฟ หรือในต้นฉบับ assets-src/ (หลังแพ็กด้วย pack-assets.js --strip)
  const alt = path.join(ROOT, 'assets-src', path.relative(PUB, p)); if (!exists(p) && !exists(alt)) warns.push(`ไม่พบไฟล์ ${what}: ${rel(p)}`); }

function loadCharacters() {
  const out = [];
  for (const d of dirs(path.join(PUB, 'Character'))) {
    const base = path.join(PUB, 'Character', d), cfg = readJson(path.join(base, 'Character.config'), null);
    if (!cfg) { warns.push(`โฟลเดอร์ตัวละคร ${d} ไม่มี Character.config — ข้าม`); continue; }
    if (!cfg.id) cfg.id = d;
    if (cfg.id !== d) problems.push(`Character/${d}: id "${cfg.id}" ต้องตรงกับชื่อโฟลเดอร์`);
    const { image, effects, sounds, background, ...rest } = cfg, e = { ...rest };
    if (image) { needFile(path.join(base, image), `รูปตัวละคร ${d}`); e.asset = url('Character', d, image); }
    const fx = resolveMap(effects, `Character/${d}`), sd = resolveMap(sounds, `Character/${d}`);
    if (Object.keys(fx).length) e.effects = fx; if (Object.keys(sd).length) e.sounds = sd;
    if (background) e.background = url('Character', d, background);
    e.src = 'folder'; out.push(e);
  }
  return out.sort(byOrder);
}
function loadItems(kind) {
  const dn = KIND_DIR[kind], base = path.join(PUB, 'Item', dn), cfg = readJson(path.join(base, 'Item.config'), null);
  if (!cfg) return [];
  return (cfg.items || []).map(x => { const { file, ...rest } = x; const e = { ...rest }; if (file) { needFile(path.join(base, file), `ไอเทม ${kind}/${x.id}`); e.asset = url('Item', dn, file); } e.src = 'folder'; return e; }).sort(byOrder);
}
function mergeLegacy(fresh, old) { // เก็บรายการเก่าที่ไม่ได้มาจากโฟลเดอร์
  const ids = new Set(fresh.map(x => x.id));
  return [...fresh.map(x => { const { order, ...r } = x; return r; }), ...(old || []).filter(x => x && x.src !== 'folder' && !ids.has(x.id))];
}
function buildSkins() {
  const old = readJson(path.join(SKIN, 'skins.json'), {}), out = {};
  for (const kind of Object.keys(KIND_DIR)) out[kind] = mergeLegacy(kind === 'characters' ? loadCharacters() : loadItems(kind), old[kind]);
  for (const k of Object.keys(old)) if (!(k in out)) out[k] = old[k];
  for (const kind of Object.keys(KIND_DIR)) { const seen = new Set(); for (const x of out[kind]) { if (!x.id) problems.push(`${kind}: มีรายการที่ไม่มี id`); else if (seen.has(x.id)) problems.push(`${kind}: id ซ้ำ "${x.id}"`); seen.add(x.id); } }
  return out;
}
function buildGacha(skins) {
  const base = readJson(path.join(PUB, 'Shop/Gasha/gasha.config'), {}), out = { ...base, banners: [] };
  const R = base.rarities || {}, all = new Set(); for (const k of ['characters', 'backs', 'tables', 'backgrounds']) (skins[k] || []).forEach(x => all.add(k + ':' + x.id));
  const idsOf = list => (list || []).map(i => (typeof i === 'string' ? i : i.id));
  const banners = [];
  for (const d of dirs(path.join(PUB, 'Shop/Gasha'))) {
    const b = path.join(PUB, 'Shop/Gasha', d), cfg = readJson(path.join(b, 'Config.config'), null);
    if (!cfg) { warns.push(`Shop/Gasha/${d} ไม่มี Config.config — ข้าม`); continue; }
    if (!cfg.id) cfg.id = d; if (cfg.id !== d) problems.push(`Shop/Gasha/${d}: id "${cfg.id}" ต้องตรงกับชื่อโฟลเดอร์`);
    if (cfg.enabled === false) continue;
    const { image, ...rest } = cfg, e = { ...rest }; if (image) { needFile(path.join(b, image), `แบนเนอร์ ${d}`); e.image = url('Shop/Gasha', d, image); }
    for (const [k, v] of Object.entries(e.rarityWeights || {})) if (!R[k] || !(Number(v) >= 0)) problems.push(`กาชา ${d}: rarityWeights.${k} ไม่ถูกต้อง`);
    for (const f of ['singleCoins', 'tenCoins', 'singleMcash', 'tenMcash', 'pity']) if (e[f] != null && !(Number(e[f]) >= 0)) problems.push(`กาชา ${d}: ${f} ต้องเป็นตัวเลข ≥ 0`);
    for (const list of [e.pool, e.rateUp && e.rateUp.items]) for (const it of list || []) { const id = typeof it === 'string' ? it : it.id; if (![...all].some(a => a.endsWith(':' + id))) problems.push(`กาชา ${d}: ไม่พบไอเทม "${id}" ในแคตตาล็อก`); }
    banners.push(e);
  }
  out.banners = banners.sort(byOrder).map(b => { const { order, enabled, ...r } = b; return r; });
  if (!Object.keys(R).length) problems.push('Shop/Gasha/gasha.config ไม่มี rarities');
  return out;
}
const skins = buildSkins(), gacha = buildGacha(skins);
warns.forEach(w => console.warn('⚠ ' + w));
if (problems.length) { problems.forEach(p => console.error('✗ ' + p)); console.error(`\nพบปัญหา ${problems.length} รายการ — ไม่เขียนไฟล์`); process.exit(1); }
const w = (f, o) => { if (CHECK) return; fs.writeFileSync(f, JSON.stringify(o, null, 1) + '\n'); console.log('✓ เขียน ' + rel(f)); };
w(path.join(SKIN, 'skins.json'), skins); w(path.join(SKIN, 'gacha.json'), gacha);
console.log(`${CHECK ? '✓ ตรวจผ่าน' : '✓ เสร็จ'} — ตัวละคร ${skins.characters.length} · หลังไพ่ ${skins.backs.length} · โต๊ะ ${skins.tables.length} · พื้นหลัง ${skins.backgrounds.length} · ตู้กาชา ${gacha.banners.length}`);
