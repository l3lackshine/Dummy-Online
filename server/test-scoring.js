// ทดสอบทะเบียนกฎ + การนับเหรียญของดัมมี่ (rules/dummy/scoring.js)
const assert = require('assert'), Rules = require('./src/rules'), E = require('./src/rules/dummy'), Sc = require('./src/rules/dummy/scoring'), { card } = require('./src/rules/dummy/cards');
let n = 0; const ok = (c, m) => { assert(c, m); n++; console.log('  ✓', m); };
const P = (i, pts, h = [], melded = true) => ({ i, pts, h, melded, n: 'P' + i });
const G0 = (extra = {}) => Object.assign({ stake: 20, spetoMode: 'all', ledger: [] }, extra);

console.log('\n[1] ทะเบียนกฎ');
ok(Rules.list().some(m => m.id === 'dummy') && Rules.get('dummy') === Rules.get('ไม่มีกฎนี้'), 'มีกฎ dummy และ id ที่ไม่รู้จักใช้กฎเริ่มต้น');
ok(JSON.stringify(Rules.cleanOptions('dummy', { stake: 'abc', spetoMode: 'x' })) === '{"stake":20,"spetoMode":"all"}', 'ตัวเลือกที่ผิดใช้ค่าเริ่มต้น');
ok(Rules.cleanOptions('dummy', { stake: 99999 }).stake === 10000 && Rules.cleanOptions('dummy', { stake: -5 }).stake === 1 && Rules.cleanOptions('dummy', { stake: 35.6 }).stake === 36, 'เดิมพันถูกบีบให้อยู่ในช่วง 1–10000 และปัดเป็นจำนวนเต็ม');
ok(Rules.cleanOptions('dummy', null).stake === 20 && Rules.cleanOptions('dummy', [1]).stake === 20, 'options เป็น null/array ไม่ทำพัง');
assert.throws(() => Rules.register({ meta: { id: 'x' } }), /ฟังก์ชัน/); ok(true, 'กฎที่ไม่ครบสัญญาลงทะเบียนไม่ได้');

console.log('\n[2] น็อก: ผู้ไม่น็อกจ่ายคนน็อกตามอันดับ (เดิมพัน 20 → 20/15/10)');
let G = G0({ P: [P(0, 100), P(1, -10), P(2, 30), P(3, 0)] }), r = Sc.settle(G, 0);
ok(r.delta[1] === -20 && r.delta[3] === -15 && r.delta[2] === -10 && r.delta[0] === 45, 'อันดับสุดท้ายจ่าย 20 · อันดับ 3 จ่าย 15 · อันดับ 2 จ่าย 10 · คนน็อกได้ 45');
G = G0({ stake: 100, P: [P(0, 100), P(1, -10), P(2, 30), P(3, 0)] }); r = Sc.settle(G, 0);
ok(r.delta[1] === -100 && r.delta[3] === -75 && r.delta[2] === -50, 'เดิมพัน 100 → 100/75/50 (สัดส่วนตามที่ตั้ง)');
G = G0({ P: [P(0, 10), P(1, 5), P(2, 5), P(3, 5)] }); r = Sc.settle(G, 0); ok(r.delta[1] === r.delta[2] && r.delta[2] === r.delta[3] && r.delta[1] === -20, 'แต้มเท่ากันนับเป็นอันดับเดียวกัน');
G = G0({ P: [P(0, 10), P(1, 5), P(2, 5), P(3, 5)] }); r = Sc.settle(G, null); ok(r.lines.length === 0 && r.delta.every(d => d === 0), 'ไพ่หมดกอง (ไม่มีคนน็อก) ไม่มีเหรียญน็อก');

console.log('\n[3] อมสเปโต');
const Q = card(11), T2 = card(2 * 13 + 1 + 0 - 0); // Q♠ = id 11 ; 2♣ = id 3*13+1 = 40
const C2 = card(40); assert(C2.r === 2 && C2.s === 3);
G = G0({ P: [P(0, 50), P(1, 0, [Q], true), P(2, 0), P(3, 0)] }); r = Sc.settle(G, null);
ok(r.delta[1] === -60 && r.delta[0] === 20 && r.delta[2] === 20 && r.delta[3] === 20, 'อมสเปโตแต่เคยเกิด: จ่ายทุกคนรอบวงคนละ 20 (เสียรวม 60)');
G = G0({ P: [P(0, 50), P(1, 0, [Q], false), P(2, 0), P(3, 0)] }); r = Sc.settle(G, null);
ok(r.delta[1] === -120 && r.delta[0] === 40, 'อมสเปโตและไม่เคยเกิดเลย: จ่ายคูณ 2 (คนละ 40)');
G = G0({ P: [P(0, 50), P(1, 0, [Q, C2], true), P(2, 0), P(3, 0)] }); r = Sc.settle(G, null);
ok(r.delta[1] === -120, 'ถือสเปโต 2 ใบ นับต่อใบ (2×3×20)');
G = G0({ spetoMode: 'knocker', P: [P(0, 50), P(1, 0, [Q], false), P(2, 0), P(3, 0)] }); r = Sc.settle(G, 0);
ok(r.lines.filter(l => l.w.startsWith('อมสเปโต')).length === 1 && r.lines.find(l => l.w.startsWith('อมสเปโต')).t === 0, 'โหมด "เฉพาะคนน็อก": จ่ายให้คนน็อกคนเดียว');
r = Sc.settle(G, null); ok(r.lines.filter(l => l.w.startsWith('อมสเปโต')).length === 3, 'โหมดเฉพาะคนน็อก แต่ไม่มีคนน็อก → จ่ายรอบวง');
G = G0({ P: [P(0, 100), P(1, -10, [Q], false), P(2, 30), P(3, 0)] }); r = Sc.settle(G, 0);
ok(r.delta[1] === -20 - 40 - 40 - 40, 'น็อก + อมสเปโตไม่เคยเกิด: รวมทั้งสองรายการ (แพ้น็อก 20 + สเปโตคูณ 2 ให้ 3 คน)');

console.log('\n[4] ตีปี้ (ตอนเก็บไพ่กองทิ้งไปเกิด)');
function scene(first, pair, by) {
  const g = E.newGame([{ id: 'a', n: 'A' }, { id: 'b', n: 'B' }], { options: { stake: 20 } });
  g.cur = 0; g.phase = 'draw'; g.must = null; g.pack = []; g.ledger = [];
  const X = card(first); X.by = by; X.head = false;
  g.P[0].h = [...pair.map(card), card(21)]; g.disc = [X];
  return { g, X };
}
let s = scene(4, [5, 6], 1); // 5♠ ที่คน 1 ทิ้ง + 6♠ 7♠ ในมือ
assert.strictEqual(E.act(s.g, 0, { t: 'take', i: 0 }), null); assert.strictEqual(E.act(s.g, 0, { t: 'meld', ids: [4, 5, 6] }), null);
ok(s.g.ledger.length === 1 && s.g.ledger[0].f === 1 && s.g.ledger[0].t === 0 && s.g.ledger[0].a === 20, 'ตีปี้ไพ่ธรรมดา: คนที่ทิ้งจ่ายคนเกิด 20');
s = scene(11, [9, 10], 1); // Q♠ สเปโต
E.act(s.g, 0, { t: 'take', i: 0 }); E.act(s.g, 0, { t: 'meld', ids: [9, 10, 11] });
ok(s.g.ledger.length === 1 && s.g.ledger[0].a === 20 && s.g.ledger[0].w.includes('Q♠'), 'ตีปี้สเปโต: คนทิ้งจ่ายคนเกิด 20 (ใช้ตัวเลขเดิมพันเดียวกัน)');
s = scene(4, [5, 6], 0); s.g.disc[0].by = null; // หัว (ไม่มีคนทิ้ง)
E.act(s.g, 0, { t: 'take', i: 0 }); E.act(s.g, 0, { t: 'meld', ids: [4, 5, 6] });
ok(s.g.ledger.length === 0, 'ไพ่หัว/ไพ่ที่ไม่มีผู้ทิ้ง ไม่เกิดการตีปี้');
s = scene(4, [5, 6], 0); // ทิ้งเอง เก็บเอง
E.act(s.g, 0, { t: 'take', i: 0 }); E.act(s.g, 0, { t: 'meld', ids: [4, 5, 6] }); ok(s.g.ledger.length === 0, 'เก็บไพ่ที่ตัวเองทิ้งเองไม่นับเป็นตีปี้');
s = scene(4, [5, 6], 1); const extra = card(30); extra.by = 1; s.g.disc.push(extra); // ไพ่ที่เก็บพ่วงมา แต่ไม่ได้ใช้เกิด
E.act(s.g, 0, { t: 'take', i: 0 }); E.act(s.g, 0, { t: 'meld', ids: [4, 5, 6] }); ok(s.g.ledger.length === 1, 'ไพ่ที่เก็บพ่วงมาแต่ไม่ได้ใช้เกิด ไม่ถูกนับเป็นตีปี้');

console.log('\n[5] เล่นบอท 600 เกม: เหรียญรวมทุกคนต้องเป็น 0 และเดิมพันถูกใช้ตามที่ตั้ง');
let tot = 0, lines = 0;
for (let i = 0; i < 600; i++) {
  const stake = [5, 20, 50][i % 3], g = E.newGame([{ id: 'a', n: 'A' }], { options: { stake } }); g.P[0].bot = true; let t = 0;
  while (!g.over) { E.botTurn(g); if (++t > 400) throw new Error('เกมไม่จบ'); }
  const c = g.res.coin; assert(c && c.stake === stake && c.delta.length === g.P.length, 'มี res.coin');
  assert.strictEqual(c.delta.reduce((a, b) => a + b, 0), 0, 'เหรียญรวมไม่เป็นศูนย์'); assert(c.lines.every(l => Number.isInteger(l.a) && l.a > 0 && l.f !== l.t), 'บรรทัดเหรียญผิดรูป'); lines += c.lines.length; tot++;
  assert.strictEqual(E.view(g, 0).res.coin.stake, stake);
}
ok(tot === 600, `ผลรวมเหรียญ = 0 ทุกเกม (${lines} รายการ)`);
console.log(`\nผ่านทั้งหมด ${n} จุดตรวจ`);
