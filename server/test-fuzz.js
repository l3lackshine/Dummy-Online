// ทดสอบ engine แบบ "ผู้เล่นสุ่ม" ผ่าน act() เหมือนที่คนจริงเล่น + คำสั่งขยะ
// ตรวจ: ไม่ค้าง (ทุกตาไปต่อได้), ไพ่ครบ 52 ไม่ซ้ำ, ไม่ throw
const E = require('./src/engine'), assert = require('assert');
const R = n => Math.floor(Math.random() * n), pickOne = a => a[R(a.length)];
const by = (G, p) => id => p.h.find(c => c.id === id);
function conserve(G) {
  const all = [...G.stock, ...G.disc, ...G.P.flatMap(p => p.h), ...G.melds.flatMap(m => m.cs)], extra = G.down ? 1 : 0;
  assert.strictEqual(all.length + extra, 52, 'จำนวนไพ่ผิด'); assert.strictEqual(new Set(all.map(c => c.id)).size, all.length, 'ไพ่ซ้ำ');
}
function humanTurn(G, seat) {
  const p = G.P[seat], ok = (r, what) => assert.strictEqual(r, null, what + ' ล้มเหลว: ' + r);
  if (G.phase === 'draw') {
    const takes = G.disc.map((_, i) => i).filter(i => E.canTake(G, p, i));
    if (takes.length && Math.random() < 0.6) ok(E.act(G, seat, { t: 'take', i: pickOne(takes) }), 'take'); else if (G.stock.length) ok(E.act(G, seat, { t: 'draw' }), 'draw'); else return;
  }
  if (G.over) return;
  if (G.must) { // ต้องมีทางเกิดเสมอ (ถ้าไม่มี = ค้าง)
    const ms = E.cands(p.h).filter(m => m.includes(G.must)).map(m => { const f = (h => { if (h.length - m.length >= 1) return m; for (const c of m) { if (c === G.must) continue; const r = m.filter(x => x !== c); if (E.ord(r) && h.length - r.length >= 1) return r; } return null; })(p.h); return f; }).filter(Boolean);
    assert(ms.length, 'ค้าง: ต้องเกิดแต่ไม่มีชุดที่เกิดได้');
    ok(E.act(G, seat, { t: 'meld', ids: pickOne(ms).map(c => c.id) }), 'meld(must)');
  }
  for (let k = 0; k < 3 && !G.over; k++) { const ms = E.cands(p.h).filter(m => p.h.length - m.length >= 1); if (!ms.length || Math.random() < 0.4) break; E.act(G, seat, { t: 'meld', ids: pickOne(ms).map(c => c.id) }); }
  if (p.melded && Math.random() < 0.6) E.act(G, seat, { t: 'autodep' });
  if (p.melded && G.melds.length && p.h.length > 1 && Math.random() < 0.5) E.act(G, seat, { t: 'dep', k: R(G.melds.length), ids: [pickOne(p.h).id] });
  if (p.h.length === 1) ok(E.act(G, seat, { t: 'knock' }), 'knock'); else ok(E.act(G, seat, { t: 'dis', id: pickOne(p.h).id }), 'dis');
}
let games = 0, knocks = 0, outs = 0, takes = 0, turns = 0;
for (let g = 0; g < 3000; g++) {
  const G = E.newGame([{ id: 'h0', n: 'H0' }, { id: 'h1', n: 'H1' }]); // 2 คนจริงสุ่ม + 2 บอท
  let t = 0;
  while (!G.over) {
    if (++t > 600) throw new Error('เกมไม่จบ');
    const cur = G.cur, p = G.P[cur];
    if (p.bot) E.botTurn(G); else humanTurn(G, cur);
    if (!G.over && G.cur === cur) throw new Error('ตาไม่เปลี่ยน (ค้าง)'); conserve(G);
    // ขยะ: ส่งคำสั่งแปลก ๆ เข้าไปต้องไม่ throw/ไม่ทำไพ่เสีย
    for (const bad of [{}, { t: 'x' }, { t: 'meld', ids: 'abc' }, { t: 'meld', ids: [1, 1, 1] }, { t: 'take', i: -5 }, { t: 'take', i: 1e9 }, { t: 'dep', k: 99, ids: [0] }, { t: 'dis', id: 'zz' }]) { const sm = G.cur; try { E.act(G, R(4), bad); } catch (e) { throw new Error('act พังกับคำสั่งขยะ ' + JSON.stringify(bad) + ': ' + e.message); } }
    conserve(G); turns++;
  }
  games++; G.res.k == null ? outs++ : knocks++;
}
console.log(`engine fuzz: ${games} เกม ${turns} ตา — น็อก ${knocks}, ไพ่หมดกอง ${outs} — ไม่ค้าง ไพ่ครบทุกตา คำสั่งขยะไม่ทำพัง`);
