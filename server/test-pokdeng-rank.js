// เทสอันดับหน้าสรุปผลป๊อกเด้ง: ได้ชิปเท่ากัน → คนที่ไพ่ดีกว่า (ประเภทไพ่ แล้วแต้ม) อยู่อันดับดีกว่า
// ตัวอย่างจากรายงานปัญหา v0.12.0: ทุกคนชนะเจ้ามือ +20 เท่ากัน แต่คนได้ 2 แต้มเคยอยู่อันดับ 1
const assert = require('assert');
const engine = require('./src/rules/pokdeng/engine');
const S = require('./src/rules/shared');

const humans = [0, 1, 2, 3].map(i => ({ id: 'p' + i, name: 'P' + i }));
const G = engine.newGame(humans, { dealer: 'host', stake: 20 });
const hands = {
  0: [13, 22, 49], // เจ้ามือ 1 แต้ม
  1: [1, 20, 27], // 2 แต้ม
  2: [3, 32, 43], // 6 แต้ม
  3: [9, 17, 28], // 8 แต้ม (3 ใบ ไม่ใช่ป๊อก)
};
// ตั้งสถานะเองทั้งหมด (ไพ่ที่แจกแบบสุ่มอาจจบตาทันทีถ้ามีคนได้ป๊อก)
G.dealer = 0;
G.over = false;
G.res = null;
G.P.forEach(p => (p.h = hands[p.i].map(S.card)));
G.phase = 'dealer';
G.cur = 0;
G.queue = [];
assert.strictEqual(engine.act(G, 0, { t: 'stay' }), null);

const place = seat => G.res.rows.find(row => row.i === seat).place;
const delta = G.res.coin.delta;
assert.ok(delta[1] === delta[2] && delta[2] === delta[3] && delta[1] > 0, 'ทุกคนชนะเจ้ามือเท่ากัน: ' + delta);
assert.deepStrictEqual([place(3), place(2), place(1), place(0)], [1, 2, 3, 4], '8 แต้ม > 6 แต้ม > 2 แต้ม > เจ้ามือที่เสีย');
assert.strictEqual(engine.winner(G), 3, 'ผู้ชนะ (ได้สิทธิ์สับ) = อันดับ 1');
console.log('  ✓ ชิปเท่ากัน: เรียงตามไพ่ในมือ 8 > 6 > 2 แต้ม · เจ้ามือที่เสียอยู่ท้าย');
console.log('pokdeng rank tests passed');
