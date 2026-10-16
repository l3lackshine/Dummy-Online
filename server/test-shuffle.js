// ทดสอบเอนจิ้นสับไพ่ (src/shuffle.js) + การแจกไพ่จากสำรับที่สับแล้ว
const assert = require('assert'), S = require('./src/shuffle'), E = require('./src/engine');
let passed = 0; const ok = (c, m) => { assert(c, m); passed++; console.log('  ✓', m); };
// ตัวสุ่มแบบกำหนดผลล่วงหน้า (mulberry32) ไว้ทดสอบทางสถิติเร็ว ๆ และทำซ้ำได้
const prng = seed => { let a = seed >>> 0; return n => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return Math.floor((((t ^ (t >>> 14)) >>> 0) / 4294967296) * n); }; };
const rising = ids => { const pos = []; ids.forEach((v, i) => { pos[v] = i; }); let r = 1; for (let v = 0; v < 51; v++) if (pos[v + 1] < pos[v]) r++; return r; }; // จำนวนลำดับขึ้น (rising sequences)

console.log('\n[1] สำรับตัวอักษร 52 ตัว');
ok(S.ALPHABET.length === 52 && new Set(S.ALPHABET).size === 52, 'ตัวอักษร A-Z a-z ครบ 52 ตัวไม่ซ้ำ แทนไพ่ได้ครบ 52 ใบ');
ok(Array.from({ length: 52 }, (_, i) => i).every(i => S.letterToId(S.idToLetter(i)) === i), 'แปลง id ↔ ตัวอักษร ย้อนกลับได้ครบทุกใบ');
ok(S.toLetters(S.toIds(S.FRESH)) === S.FRESH && S.isValidLetters(S.FRESH), 'สำรับใหม่ถูกต้อง');
ok(!S.isValidLetters('ABC') && !S.isValidLetters(S.FRESH.slice(1) + 'B') && !S.isValidLetters(null) && !S.isValidIds([1, 2]) && !S.isValidIds(Array(52).fill(3)), 'ตรวจจับสำรับที่ไม่ครบ/ซ้ำ/ผิดรูปแบบ');
assert.throws(() => S.shuffle({ deck: 'ABC' })); assert.throws(() => S.shuffle({ plan: ['nope'] })); ok(true, 'ข้อมูลเข้าไม่ถูกต้อง → โยน error');

console.log('\n[2] ท่าสับแต่ละท่าทำงานเหมือนของจริง');
const sorted = s => [...s].sort().join();
for (let t = 0; t < 300; t++) { const r = prng(t + 1);
  for (const op of [S.cut, S.riffle, S.overhand]) { const o = op(S.FRESH, r); assert.strictEqual(sorted(o.deck), sorted(S.FRESH)); } }
ok(true, 'ทุกท่าไม่ทำให้ไพ่ซ้ำ/หาย (300 รอบ × 3 ท่า)');
{ const c = S.cut(S.FRESH, prng(5)), k = c.step.at; ok(k >= 10 && k <= 42 && c.deck === S.FRESH.slice(k) + S.FRESH.slice(0, k), `ตัดไพ่ = ยกก้อนบน ${k} ใบไปไว้ล่าง ลำดับวนเดิม`); }
{ let maxR = 0, id = 0; for (let t = 0; t < 500; t++) { const r = S.riffle(S.FRESH, prng(t + 9)); maxR = Math.max(maxR, rising(S.toIds(r.deck))); if (r.deck === S.FRESH) id++; }
  ok(maxR <= 2, `รีฟเฟิล 1 ครั้ง ได้ลำดับขึ้นไม่เกิน 2 ชุด (สมบัติของ GSR/สับจริง) สูงสุด ${maxR}`); ok(id < 25, 'รีฟเฟิลไม่ใช่การคืนสำรับเดิม'); }
{ let allSub = true; for (let t = 0; t < 200; t++) { const r = S.riffle(S.FRESH, prng(t + 77)), k = r.step.split, L = S.FRESH.slice(0, k), R = S.FRESH.slice(k), sub = (a, b) => { let i = 0; for (const ch of b) if (ch === a[i]) i++; return i === a.length; }; if (!(sub(L, r.deck) && sub(R, r.deck))) allSub = false; }
  ok(allSub, 'รีฟเฟิล: ไพ่ในแต่ละกองยังเรียงลำดับเดิมหลังสลับเข้าด้วยกัน'); }
{ const o = S.overhand(S.FRESH, prng(3)); let adj = 0; for (let i = 1; i < 52; i++) if (S.letterToId(o.deck[i]) === S.letterToId(o.deck[i - 1]) + 1) adj++; ok(adj >= 52 - o.step.chunks, `โอเวอร์แฮนด์: ภายในก้อนลำดับเดิมคงอยู่ (${o.step.chunks} ก้อน)`); }

console.log('\n[3] shuffle() ทั้งแผน');
const a1 = S.shuffle({ rnd: prng(42) }), a2 = S.shuffle({ rnd: prng(42) }), a3 = S.shuffle({ rnd: prng(43) });
ok(a1.letters === a2.letters && a1.letters !== a3.letters, 'seed เดียวกันได้ผลเดียวกัน / seed ต่างกันได้ผลต่างกัน');
ok(S.isValidIds(a1.ids) && S.toLetters(a1.ids) === a1.letters && a1.steps.length === S.PLAN.length, 'ผลลัพธ์เป็นสำรับครบ 52 ใบ + ids ตรงกับตัวอักษร + บันทึกทุกท่าสับ');
ok(S.PLAN.filter(x => x === 'riffle').length >= 12, 'แผนมาตรฐานมีรีฟเฟิลอย่างน้อย 12 ครั้ง (เกินเกณฑ์ 7 ครั้งของ Bayer–Diaconis)');
{ const c = S.shuffle(); ok(S.isValidIds(c.ids) && c.letters !== S.FRESH, 'ตัวสุ่มจริง (crypto) สับได้สำรับถูกต้อง'); const d = S.shuffle({ deck: c.letters, plan: ['cut'] }); ok(S.isValidLetters(d.letters), 'สับต่อจากสำรับตัวอักษรที่กำหนดเองได้'); }

console.log('\n[4] ความสุ่มทางสถิติ (30,000 ครั้ง)');
{ const N = 30000, r = prng(20260101), top = Array(52).fill(0), where0 = Array(52).fill(0); let adj = 0, risingSum = 0;
  for (let t = 0; t < N; t++) { const ids = S.shuffle({ rnd: r }).ids; top[ids[0]]++; where0[ids.indexOf(0)]++; for (let i = 1; i < 52; i++) if (ids[i] === ids[i - 1] + 1) adj++; risingSum += rising(ids); }
  const chi = arr => arr.reduce((s, o) => s + (o - N / 52) ** 2 / (N / 52), 0); // df = 51, ค่าวิกฤต p=0.001 ≈ 87.97
  ok(chi(top) < 88, `ไพ่ใบบนสุดกระจายสม่ำเสมอ (χ²=${chi(top).toFixed(1)} < 88)`); ok(chi(where0) < 88, `ตำแหน่งของไพ่ A♠ กระจายสม่ำเสมอ (χ²=${chi(where0).toFixed(1)} < 88)`);
  const adjAvg = adj / N; ok(Math.abs(adjAvg - 51 / 52) < 0.03, `คู่ไพ่ติดกันเดิมเฉลี่ย ${adjAvg.toFixed(3)} ≈ ${(51 / 52).toFixed(3)} ของการสุ่มสมบูรณ์`);
  const rs = risingSum / N; ok(Math.abs(rs - 26.5) < 0.2, `จำนวนลำดับขึ้นเฉลี่ย ${rs.toFixed(2)} ≈ 26.5 ของการสุ่มสมบูรณ์`); }
{ let c = 0; const seen = new Set(); for (let t = 0; t < 2000; t++) { seen.add(S.shuffle().letters); c++; } ok(seen.size === c, 'ตัวสุ่มจริง 2,000 ครั้ง ไม่ได้สำรับซ้ำเลย'); }

console.log('\n[5] ต่อกับเอนจิ้นเกม');
{ const sh = S.shuffle(), G = E.newGame([{ id: 'a', n: 'A' }, { id: 'b', n: 'B' }], { deck: sh.ids });
  ok(G.P[0].h.map(c => c.id).join() === sh.ids.slice(0, 7).join() && G.P[1].h.map(c => c.id).join() === sh.ids.slice(7, 14).join() && G.P[3].h.map(c => c.id).join() === sh.ids.slice(21, 28).join(), 'แจกไพ่ 7 ใบต่อที่นั่งตามลำดับสำรับที่สับ');
  ok(G.disc[0].id === sh.ids[51] && G.stock.map(c => c.id).join() === sh.ids.slice(28, 51).join(), 'หัว = ใบล่างสุดของสำรับ, กองจั่ว = ที่เหลือ');
  const bad = E.newGame([{ id: 'a', n: 'A' }], { deck: [1, 2, 3] }); ok(bad.stock.length + bad.disc.length + bad.P.reduce((n, p) => n + p.h.length, 0) === 52, 'สำรับที่ส่งมาผิด → engine สับเองด้วยเอนจิ้นเดียวกัน ไพ่ยังครบ 52'); }
{ const mk = (k, pts) => ({ over: true, res: { k, pts } }); ok(E.winner(mk(2, [0, 0, 0, 0])) === 2 && E.winner(mk(null, [10, 40, 40, -5])) === 1 && E.winner({ over: false }) === null, 'Engine.winner: คนน็อก / ไพ่หมดกอง = แต้มสูงสุด / เกมยังไม่จบ = null'); }
console.log(`\nผ่านทั้งหมด ${passed} จุดตรวจ`);
