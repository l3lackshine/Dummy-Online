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
console.log(`\nผ่านทั้งหมด ${passed} จุดตรวจ`);
