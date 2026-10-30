// economy.js: สูตรรางวัลตามอันดับ/เลเวล · ไฟล์ฝั่งเซิร์ฟเวอร์กับตัวเกมต้องเหมือนกัน · สูตรเลเวลต้องตรงกับ SQL _level_of
const fs = require('fs'), path = require('path');
const E = require('./src/economy');
let passed = 0; const ok = (c, m) => { if (!c) { console.error('✗', m); process.exit(1); } passed++; console.log('✓', m); };
const a = fs.readFileSync(path.join(__dirname, 'src/economy.js'), 'utf8'), b = fs.readFileSync(path.join(__dirname, '../client/public/economy.js'), 'utf8');
ok(a === b, 'economy.js ฝั่งเซิร์ฟเวอร์กับตัวเกมเหมือนกันทุกตัวอักษร');
ok(JSON.stringify(E.ranks([30, 10, 30, -5])) === '[1,3,1,4]', 'จัดอันดับแบบแข่งขัน (เสมอได้อันดับเดียวกัน)');
ok(E.reward(1, 4, 1) === 60 && E.reward(4, 4, 1) === 15, '4 ที่นั่ง: ที่ 1 = 60 · ที่สุดท้าย = 15');
ok(E.reward(1, 2, 1) === 50 && E.reward(2, 2, 1) === 20, '2 ที่นั่ง: 50 / 20');
const r3 = [1, 2, 3].map(r => E.reward(r, 3, 1)); ok(r3[0] > r3[1] && r3[1] > r3[2] && r3[2] >= 15, '3 ที่นั่ง: ไล่ลดหลั่น ไม่ต่ำกว่า 15 (' + r3 + ')');
ok(E.reward(1, 4, 2) === Math.round(60 * 1.5), 'ห้องที่มีคนจริง ≥ 2 ได้ ×1.5');
ok([1, 2, 3, 4].every(r => E.reward(r, 4, 1) > 0), 'แพ้ก็ได้เหรียญ ไม่มีติดลบ');
ok(E.expFor(1) === 30 && E.expFor(3) === 20, 'EXP: ชนะ 30 · อื่นๆ 20');
// สูตรเลเวลเดียวกับ supabase/v6_progression.sql _level_of (test_v6 ตรวจ 0→1, 100→2, 5000→17)
ok(E.levelOf(0).level === 1 && E.levelOf(99).level === 1 && E.levelOf(100).level === 2 && E.levelOf(5000).level === 17, 'เลเวล: 0→1 · 100→2 · 5000→17 (ตรงกับ SQL)');
const L = E.levelOf(130); ok(L.into === 30 && L.need === E.needFor(2), 'EXP ในเลเวลและ EXP ที่ต้องใช้ถูกต้อง');
ok(E.levelReward(2).mcash === 5 && E.levelReward(10).mcash === 30 && E.levelReward(10).coins === 1000, 'รางวัลเลเวล: ทั่วไป 5 เพชร · ทุก 10 เลเวล 30 เพชร + 1000 เหรียญ');
// สตามิน่า · ฟาร์ม · เลเวลตัวละคร (ต้องตรงกับ supabase/v7_stamina.sql + v7_config.sql)
ok([1, 5, 6, 56, 99].map(E.staminaMax).join() === '80,80,100,300,300', 'สตามิน่าสูงสุด 80 → +20 ทุก 5 เลเวล → ตัน 300 ที่เลเวล 56');
ok(E.farmReward('coins', 1, 4).coins === 120 && E.farmReward('exp', 1, 4).items['exp-m'] === 1 && E.farmReward('exp', 4, 4).items['exp-s'] === 3, 'ฟาร์ม: เหรียญ ×2 · คัมภีร์ตามอันดับ (ตรงกับ test_v7)');
ok(E.farmReward('hack', 1, 4).farm === 'coins', 'โหมดฟาร์มแปลกๆ → ใช้เหรียญ');
ok(E.farmReward('pexp', 2, 4).exp === 120 && E.farmReward('pexp', 2, 4).coins === 0, 'ฟาร์ม EXP ผู้เล่น: ที่ 2 ได้โบนัส 120 EXP (ตรงกับ test_v7)');
ok(E.charLevelOf(0).level === 1 && E.charLevelOf(100).level === 2 && E.charLevelOf(250).level === 3 && E.charLevelOf(2200).level === 9 && E.charLevelOf(1e9).level === 30, 'เลเวลตัวละคร 0→1 · 100→2 · 250→3 · 2200→9 · ตัน 30 (ตรงกับ SQL)');
ok(E.charCost(200) === 40, 'อัปเลเวลตัวละคร 200 EXP = 40 เหรียญ');
ok(Object.values(E.ITEMS).every(x => x.name && (x.stamina || x.charExp || x.ticket)), 'ไอเทมทุกชิ้นมีชื่อและผล');
const cfgSql = fs.readFileSync(path.join(__dirname, '../supabase/v7_config.sql'), 'utf8');
ok(cfgSql === require('../scripts/gen-economy-sql').build(), 'supabase/v7_config.sql ตรงกับ economy.js (ถ้าไม่ตรง: node scripts/gen-economy-sql.js)');
const bp = fs.readFileSync(path.join(__dirname, '../supabase/bp_seed.sql'), 'utf8'), seasons = fs.readdirSync(path.join(__dirname, '../client/public/BattlePass')).filter(f => /^season.*\.json$/.test(f)).sort().map(f => require('../client/public/BattlePass/' + f));
ok(bp === require('../scripts/gen-bp-sql').build(seasons), 'supabase/bp_seed.sql ตรงกับ season*.json (ถ้าไม่ตรง: node scripts/gen-bp-sql.js)');
ok(seasons.every(s => ['free', 'gem'].every(t => JSON.stringify(s.tracks[t]).match(/items:([a-z0-9-]+)/g).every(m => E.ITEMS[m.slice(6)]))), 'ไอเทมในแบทเทิลพาสมีอยู่จริงใน economy.js');
const pn = JSON.parse(fs.readFileSync(path.join(__dirname, '../client/public/patchnotes.json'), 'utf8')), ver = /DUMMY_VERSION = '([^']+)'/.exec(fs.readFileSync(path.join(__dirname, '../client/public/version.js'), 'utf8'))[1];
ok(pn.notes[0].version === ver, 'แพตช์โน้ตล่าสุดตรงกับเวอร์ชันเกม (' + ver + ')');
console.log(`\nผ่านทั้งหมด ${passed} จุดตรวจ`);
