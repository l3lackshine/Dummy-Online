// ทดสอบกติกา: A เป็นไพ่สูงอย่างเดียว (A-2-3 เกิดไม่ได้) + ตัวละคร/พื้นหลังรายผู้เล่น
const E = require('./src/engine'), assert = require('assert'); const k = (r, s) => ({ id: s * 13 + r - 1, r, s });
assert(!E.ord([k(1, 0), k(2, 0), k(3, 0)]), 'A-2-3 ต้องเกิดไม่ได้'); assert(!E.ord([k(1, 0), k(2, 0), k(3, 0), k(4, 0)]), 'A-2-3-4 ต้องเกิดไม่ได้');
assert(E.ord([k(2, 0), k(3, 0), k(4, 0)]), '2-3-4 เกิดได้'); assert(E.ord([k(12, 0), k(13, 0), k(1, 0)]), 'Q-K-A เกิดได้'); assert(!E.ord([k(13, 0), k(1, 0), k(2, 0)]), 'K-A-2 เกิดไม่ได้');
assert(E.ord([k(1, 0), k(1, 1), k(1, 2)]), 'ตอง A เกิดได้'); assert(E.ord([k(2, 3), k(2, 1), k(2, 2)]), 'ตอง 2 (รวม 2♣) เกิดได้');
assert(!E.cands([k(1, 0), k(2, 0), k(3, 0), k(9, 1)]).length, 'cands ต้องไม่เสนอ A-2-3'); assert(E.cands([k(1, 0), k(13, 0), k(12, 0)]).length === 1, 'cands เสนอ Q-K-A');
// บอทเล่นกันเอง 500 เกม ต้องจบทุกเกม (กติกาใหม่ไม่ทำให้เกมค้าง) และไพ่ไม่ซ้ำ/ไม่หาย
let ends = 0, stockOut = 0;
for (let g = 0; g < 500; g++) { const G = E.newGame([{ id: 'a', n: 'A' }]); G.P[0].bot = true; let t = 0; while (!G.over) { E.botTurn(G); if (++t > 400) throw new Error('เกมไม่จบ'); }
  const all = [...G.stock, ...G.disc, ...G.P.flatMap(p => p.h), ...G.melds.flatMap(m => m.cs)]; const extra = G.down ? 1 : 0;
  assert(all.length + extra === 52 && new Set(all.map(x => x.id)).size === all.length, 'ไพ่ซ้ำ/หาย'); G.res.k == null ? stockOut++ : ends++; }
console.log('บอท 500 เกมจบครบ — น็อก', ends, 'ไพ่หมดกอง', stockOut);
let bgs = new Set(); for (let i = 0; i < 300; i++) { const G = E.newGame([{ id: 'a', n: 'A', ch: 'girl', bg: 'gold' }, { id: 'b', n: 'B', bg: 'hack' }]);
  assert.strictEqual(G.P[0].ch, 'girl'); assert.strictEqual(G.P[0].bg, 'gold'); assert(E.BGS.includes(G.P[1].bg)); G.P.filter(p => p.bot).forEach(p => bgs.add(p.bg)); }
assert(bgs.size >= 4, 'บอทต้องสุ่มพื้นหลังหลายแบบ'); const v = E.view(E.newGame([{ id: 'a', n: 'A', ch: 'boy', bg: 'sakura' }]), 0); assert.strictEqual(v.P[0].bg, 'sakura');
console.log('ทดสอบกติกา A สูงอย่างเดียว / ตัวละคร / พื้นหลังรายผู้เล่น ผ่านทั้งหมด');
