// ทดสอบกฎตีเต็ม + บทสอนดัมมี่ (สำรับจัดไว้ + บอทตามสคริปต์) — node test-tutorial.js
const E = require('./src/rules/dummy/engine'), T = require('./src/rules/dummy/tutorial');
let n = 0; const ok = (c, m) => { if (!c) { console.error('✗ ล้มเหลว: ' + m); process.exit(1); } n++; console.log('  ✓ ' + m); };
const h = T.id;
// ---- บทสอนเดินครบตามบท ----
const d = T.deck(); ok(d.length === 52 && new Set(d).size === 52, 'สำรับสอนครบ 52 ใบไม่ซ้ำ');
const G = E.newGame([{ id: 'me', n: 'คุณ' }], { deck: d, first: 0, script: T.script() });
ok(G.cur === 0 && G.tutorial && E.view(G, 0).tutorial, 'ห้องสอน: ผู้เล่นเริ่มก่อน · view บอกว่าเป็นโหมดสอน');
ok(!E.act(G, 0, { t: 'draw' }) && !E.act(G, 0, { t: 'meld', ids: [h(9, 0), h(9, 1), h(9, 2)] }) && !E.act(G, 0, { t: 'dis', id: h(3, 0) }), 'ตาแรก: จั่ว · เกิดตอง 9 · ทิ้ง 3♠');
for (let k = 0; k < 3; k++) E.botTurn(G);
ok(G.cur === 0 && G.disc.slice(-4).map(c => c.id).join() === [h(3, 0), h(3, 1), h(9, 3), h(3, 2)].join(), 'บอททิ้งตามสคริปต์ 3♥ 9♣ 3♦');
const p3 = G.P[3].pts;
ok(!E.act(G, 0, { t: 'take', i: G.disc.findIndex(c => c.id === h(3, 0)) }) && !E.act(G, 0, { t: 'meld', ids: [h(3, 0), h(3, 1), h(3, 2)] }), 'เก็บตั้งแต่ 3♠ แล้วเกิดตอง 3');
ok(G.P[3].pts === p3 - 50 && G.logs.some(l => l.includes('ตีเต็ม 3♦')), 'ตีเต็ม: ป้าน็อก (ทิ้ง 3♦ ครบชุด) เสีย 50 แต้ม');
ok(!E.act(G, 0, { t: 'dep', k: 0, ids: [h(9, 3)] }) && !E.act(G, 0, { t: 'dis', id: h(11, 3) }), 'ฝาก 9♣ · ทิ้ง J♣');
for (let k = 0; k < 3; k++) E.botTurn(G);
ok(!E.act(G, 0, { t: 'take', i: G.disc.length - 1 }) && !E.act(G, 0, { t: 'meld', ids: [h(5, 1), h(6, 1), h(7, 1)] }) && !E.act(G, 0, { t: 'knock' }), 'เก็บ 7♥ · เกิดเรียง · น็อก');
ok(G.over && G.res.k === 0 && E.winner(G) === 0, 'จบตา ผู้เล่นน็อกชนะ');
// ---- ตีเต็มในเกมจริง: ไม่ครบชุดใหม่ = ไม่โดน · ใบที่ครบชุดเป็นของตัวเอง = ไม่โดน ----
const G2 = E.newGame([{ id: 'a', n: 'A' }], { deck: d, first: 0 });
ok(!G2.tutorial && !G2.script, 'เกมปกติไม่มีสคริปต์บอท');
const G3 = E.newGame([{ id: 'me', n: 'คุณ' }], { deck: d, first: 0, script: T.script() });
E.act(G3, 0, { t: 'draw' }); E.act(G3, 0, { t: 'meld', ids: [h(9, 0), h(9, 1), h(9, 2)] }); E.act(G3, 0, { t: 'dis', id: h(3, 0) });
for (let k = 0; k < 3; k++) E.botTurn(G3);
const p1 = G3.P[1].pts, p2 = G3.P[2].pts;
E.act(G3, 0, { t: 'take', i: G3.disc.findIndex(c => c.id === h(3, 0)) }); E.act(G3, 0, { t: 'meld', ids: [h(3, 0), h(3, 1), h(3, 2)] });
ok(G3.P[1].pts === p1 && G3.P[2].pts === p2, 'คนทิ้งใบก่อนหน้า (ยังไม่ครบชุด) ไม่โดนตีเต็ม');
// ---- ฝากโต: หักจากคนเกิดมาจ่ายคนฝาก ----
const { card } = require('./src/rules/dummy/cards');
function depSpe(meld, spe, own) {
  const g = E.newGame([{ id: 'a', n: 'A' }], { first: 0 }), A = g.P[0], B = g.P[1];
  g.melds = [{ o: own ? 0 : 1, cs: meld.map(card) }]; A.melded = B.melded = true; A.pts = 0; B.pts = 15;
  A.h = [card(spe), card(h(5, 0)), card(h(9, 1))]; g.cur = 0; g.phase = 'play'; g.must = null;
  const total0 = A.pts + B.pts, err = E.act(g, 0, { t: 'dep', k: 0, ids: [spe] });
  return { err, a: A.pts, b: B.pts, moved: A.pts + B.pts === total0, logs: g.logs };
}
let r = depSpe([h(2, 0), h(2, 1), h(2, 2)], h(2, 3));
ok(!r.err && r.a === 50 && r.b === -35 && r.moved && r.logs.some(l => l.includes('ถูกฝากสเปโต 2♣ เสีย 50 ให้ A')), 'ฝาก 2♣ ลงตอง 2 ของคนอื่น: คนฝาก +50 หักจากคนเกิด (แต้มรวมไม่เพิ่ม)');
r = depSpe([h(9, 0), h(10, 0), h(11, 0)], h(12, 0));
ok(!r.err && r.a === 50 && r.b === -35 && r.moved, 'ฝาก Q♠ ลงเรียง 9♠10♠J♠ ของคนอื่น: หักจากคนเกิดเหมือนกัน');
r = depSpe([h(12, 1), h(12, 2), h(12, 3)], h(12, 0), true);
ok(!r.err && r.a === 50 && r.b === 15, 'ฝากสเปโตลงชุดตัวเอง: ได้ 50 ตามปกติ ไม่มีใครเสีย');
console.log('ผ่านทั้งหมด ' + n + ' จุดตรวจ');
