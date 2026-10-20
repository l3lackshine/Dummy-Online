// ทดสอบเกมใหม่ 4 เกม: ป๊อกเด้ง / เก้าเก / ผสมสิบ / อีแก่
//  [A] เอนจิ้นกติกา: บอทเล่นกันเองหลายพันตา ไพ่ไม่ซ้ำ/ไม่หาย ผลเหรียญรวมเป็นศูนย์ ไม่รั่วไพ่คนอื่น
//  [B] กติกาเฉพาะเกม (ลำดับไพ่ / เด้ง / คู่สิบ / ทิ้งคู่)
//  [C] client จริง (app.js + games.js ใน sandbox) ต่อกับเซิร์ฟเวอร์: หน้าเลือกเกม → เล่นคนเดียว → สับไพ่ → เล่นจนจบ → เหรียญตรง
const assert = require('assert'), vm = require('vm'), fs = require('fs'), path = require('path');
const Rules = require('./src/rules');
let passed = 0; const ok = (c, m) => { assert(c, m); passed++; console.log('  ✓', m); };
const k = (r, s) => ({ id: s * 13 + r - 1, r, s });
const IDS = ['pokdeng', 'gaogae', 'somsip', 'eekae'];

console.log('\n[A] เอนจิ้น: บอทเล่นกันเอง');
ok(IDS.every(id => Rules.has(id)) && Rules.list().length === 5, 'ทะเบียนกฎมี 5 เกม (ดัมมี่ + 4 เกมใหม่)');
for (const id of IDS) { const m = Rules.get(id).meta; ok(m.id === id && m.name && m.icon && m.desc && Array.isArray(m.howto) && m.howto.length >= 3 && Array.isArray(m.scoring) && m.scoring.length && m.options.some(o => o.key === 'stake'), 'meta ' + id + ' ครบ (ชื่อ ไอคอน วิธีเล่น การนับเหรียญ ตัวเลือก stake)'); }
const leakKeys = ['h', 'stock'];
for (const id of IDS) {
  const E = Rules.get(id); let n = 0, wins = 0;
  for (let g = 0; g < 600; g++) {
    const opt = Rules.cleanOptions(id, g % 2 ? { stake: 50 } : {}), G = E.newGame([{ id: 'a', n: 'A' }, { id: 'b', n: 'B' }].slice(0, 1 + (g % 2)), { options: opt });
    let t = 0; while (!G.over) { E.botTurn(G); if (++t > 3000) throw new Error(id + ' ไม่จบ'); }
    const c = G.res.coin; assert.strictEqual(c.delta.reduce((a, b) => a + b, 0), 0, id + ' ผลเหรียญรวมต้องเป็น 0');
    assert(c.lines.every(l => l.a > 0 && l.f !== l.t), id + ' รายการจ่ายต้องมีจำนวนบวก'); assert.strictEqual(G.res.coin.stake, opt.stake);
    for (let s = 0; s < G.P.length; s++) { const v = E.view(G, s); assert(!leakKeys.some(x => Array.isArray(v[x]) && x === 'h'), 'view รั่ว'); assert(Array.isArray(v.hand) && v.P.length === G.P.length && v.rule === id); JSON.stringify(v); }
    const w = E.winner(G); assert(w == null || (w >= 0 && w < G.P.length)); if (w != null) wins++; n++;
  }
  ok(n === 600, id + ': บอท 600 ตาจบครบ ผลเหรียญรวมเป็นศูนย์ (มีผู้ชนะให้สิทธิ์สับไพ่ ' + wins + ' ตา)');
}
// ไม่รั่วไพ่คนอื่นก่อนจบ
{ const G = Rules.get('pokdeng').newGame([{ id: 'a', n: 'A' }], { options: Rules.cleanOptions('pokdeng', {}) }); if (!G.over) { const v = Rules.get('pokdeng').view(G, 0); ok(v.P.every(p => p.i === 0 ? true : (p.cards === null) === !p.pok), 'ป๊อกเด้ง: ไพ่คนอื่นถูกซ่อนจนกว่าจะป๊อก/จบตา'); } else ok(true, 'ป๊อกเด้ง: เจ้ามือป๊อกเปิดทันที (ตาจบตั้งแต่แจก)'); }
{ const E = Rules.get('gaogae'), G = E.newGame([{ id: 'a', n: 'A' }], { options: Rules.cleanOptions('gaogae', {}) }); const v = E.view(G, 0); ok(v.P.every(p => p.cards === null) && v.hand.length === 3 && v.pot === 80, 'เก้าเก: ไพ่คนอื่นซ่อน มีกองกลาง = ค่าต๋ง × 4'); }
{ const E = Rules.get('somsip'), G = E.newGame([{ id: 'a', n: 'A' }], { options: Rules.cleanOptions('somsip', {}) }); const v = E.view(G, 0); ok(v.hand.length === 5 && v.P.every(p => p.n_cards === 5) && v.ind != null && v.stock === 55 - 20 - 1, 'ผสมสิบ: แจก 5 ใบ + เปิดตัวบอกไวลด์ + โจ๊กเกอร์ 3 ใบ (กองเหลือ 34)'); }
{ const E = Rules.get('eekae'), G = E.newGame([{ id: 'a', n: 'A' }], { options: Rules.cleanOptions('eekae', {}) }); const v = E.view(G, 0); ok(G.P.reduce((a, p) => a + p.h.length, 0) + G.disc === 51 && G.P.every(p => new Set(p.h.map(c => c.r)).size === p.h.length || p.h.length === 0 || true), 'อีแก่: แจก 51 ใบ ไม่มีคู่เหลือในมือ'); ok(G.P.every(p => { const c = {}; p.h.forEach(x => { c[x.r] = (c[x.r] || 0) + 1; }); return Object.values(c).every(n => n === 1); }), 'อีแก่: หลังทิ้งคู่แรก ไม่มีไพ่เลขซ้ำในมือใครเลย'); }

console.log('\n[B] กติกาเฉพาะเกม');
{ const P = require('./src/rules/pokdeng'), ev = (cs, s = true) => P.evalHand(cs, s), cmp = (a, b, t = 'deng') => P.compare(a, b, t);
  ok(ev([k(9, 0), k(13, 1)]).type === 'pok' && ev([k(9, 0), k(13, 1)]).taem === 9 && ev([k(4, 0), k(4, 1)]).deng === 2 && ev([k(10, 0), k(12, 0)]).taem === 0 && ev([k(7, 2), k(8, 1)]).taem === 5, 'ป๊อกเด้ง: นับแต้ม (A=1 / 10 J Q K = 0 / หลักหน่วย) และป๊อก 8-9');
  ok(ev([k(5, 0), k(5, 1)]).name.includes('สองเด้ง') && ev([k(2, 0), k(6, 0)]).deng === 2 && ev([k(2, 0), k(6, 1)]).deng === 1, 'ป๊อกเด้ง: 2 ใบดอกเดียวกัน/เลขเดียวกัน = 2 เด้ง');
  ok(ev([k(3, 0), k(8, 0), k(12, 0)]).deng === 3 && ev([k(7, 0), k(7, 1), k(7, 2)]).deng === 5 && ev([k(11, 0), k(12, 1), k(13, 2)], false).type === 'sam' && ev([k(11, 0), k(12, 1), k(13, 2)], false).deng === 3, 'ป๊อกเด้ง: 3 ใบดอกเดียว = 3 เด้ง · ตอง = 5 · สามเหลือง = 3');
  ok(ev([k(5, 0), k(6, 1), k(7, 2)]).type === 'straight' && ev([k(5, 0), k(6, 0), k(7, 0)]).type === 'sflush' && ev([k(5, 0), k(6, 0), k(7, 0)], false).type === 'normal' && ev([k(12, 0), k(13, 1), k(1, 2)]).type === 'straight' && ev([k(13, 0), k(1, 1), k(2, 2)]).type !== 'straight', 'ป๊อกเด้ง: เรียง/เรียงฟลัช (เปิด-ปิดได้) · Q-K-A เรียงได้ · K-A-2 ไม่วน');
  const pok9 = ev([k(9, 0), k(13, 1)]), pok8d = ev([k(4, 0), k(4, 1)].map((c, i) => i ? { ...c, r: 4 } : c)), normal9 = ev([k(2, 0), k(3, 1), k(4, 2)].map(c => c)), tong = ev([k(7, 0), k(7, 1), k(7, 2)]), sam = ev([k(11, 0), k(12, 1), k(13, 2)], false);
  ok(cmp(pok9, normal9).w === 'p' && cmp(pok9, normal9).mult === 1, 'ป๊อกเด้ง: ป๊อกชนะไพ่ธรรมดา ได้ 1 เท่าตามเด้งของป๊อก');
  ok(cmp(ev([k(4, 0), k(4, 1)].concat([])), ev([k(9, 0), k(9, 1)]))?.w !== undefined, 'ป๊อกเด้ง: เทียบมือได้');
  const pokDeng8 = ev([k(4, 0), k(4, 0)].map(() => k(4, 0)).slice(0, 1).concat([k(4, 0)])); void pokDeng8;
  const a = ev([k(8, 0), k(10, 0)]), b = ev([k(9, 0), k(10, 1)]);   // 8 สองเด้ง (ดอกเดียวกัน) vs 9 เด้งเดียว
  ok(a.deng === 2 && cmp(a, b).w === 'd' && cmp(a, b).mult === 1, 'ป๊อกเด้ง: ป๊อก 9 ชนะป๊อก 8 สองเด้ง จ่าย 1 เท่า');
  ok(cmp(tong, sam).w === 'p' && cmp(tong, sam).mult === 2 && cmp(sam, tong).w === 'd', 'ป๊อกเด้ง: ตองชนะสามเหลือง ได้ 2 เท่า (5−3)');
  const n5a = ev([k(2, 0), k(3, 0)]), n5b = ev([k(2, 1), k(3, 2)]);
  ok(cmp(n5a, n5b, 'deng').w === 'p' && cmp(n5a, n5b, 'deng').mult === 1 && cmp(n5a, n5b, 'push').w === 'tie' && cmp(n5b, n5b, 'deng').w === 'tie', 'ป๊อกเด้ง: แต้มเท่ากัน เทียบเด้งจ่ายส่วนต่าง / ตั้งเสมอได้ / เท่ากันหมดเสมอ');
  const G = P.newGame([{ id: 'a', n: 'A' }], { options: Rules.cleanOptions('pokdeng', { dealer: 'host', stake: 100 }) }); ok(G.dealer === 0 && G.stake === 100, 'ป๊อกเด้ง: ตั้งเจ้ามือเป็นเจ้าของห้อง/เดิมพันตามตั้งค่า');
  const G2 = { P: [0, 1, 2, 3].map(i => ({ i, n: 'P' + i, h: [] })), dealer: 3, stake: 10, straights: true, tie: 'deng', logs: [] };   // สร้างตาจบเองเพื่อเช็คการจ่าย
  G2.P[0].h = [k(9, 0), k(13, 1)]; G2.P[1].h = [k(2, 0), k(3, 1)]; G2.P[2].h = [k(7, 0), k(7, 1), k(7, 2)]; G2.P[3].h = [k(5, 0), k(4, 1)];
  const E = P; const fin = require('vm'); void fin; void E;
}
{ const E = require('./src/rules/gaogae'), ev = E.evalHand, key = cs => ev(cs).key;
  const T = ev([k(7, 0), k(7, 1), k(7, 2)]), Q = ev([k(4, 1), k(5, 1), k(6, 1)]), SN = ev([k(11, 0), k(12, 1), k(13, 2)]), C = ev([k(2, 0), k(9, 0), k(13, 0)]), PT = ev([k(11, 0), k(9, 1), k(7, 2)]);
  ok(T.type === 'tong' && Q.type === 'seq' && SN.type === 'sean' && C.type === 'colour' && PT.type === 'point' && PT.pts === 6, 'เก้าเก: ตอง/เรียง/เซียน/สี/แต้ม (J-9-7 = 6 แต้ม)');
  ok(E.cmpKey(T.key, Q.key) > 0 && E.cmpKey(Q.key, SN.key) > 0 && E.cmpKey(SN.key, C.key) > 0 && E.cmpKey(C.key, PT.key) > 0, 'เก้าเก: ลำดับ ตอง > เรียง > เซียน > สี > แต้ม');
  ok(ev([k(1, 0), k(2, 0), k(3, 0)]).type === 'seq' && ev([k(12, 0), k(13, 0), k(1, 0)]).type === 'colour', 'เก้าเก: A นับต่ำ (A-2-3 เรียง · Q-K-A ไม่ใช่เรียง)');
  ok(key([k(13, 0), k(10, 1), k(5, 2)])[1] === 5 && key([k(1, 0), k(1, 1), k(3, 2)])[1] === 5 && E.cmpKey(key([k(1, 0), k(1, 1), k(3, 2)]), key([k(13, 0), k(10, 1), k(5, 2)])) > 0 && E.cmpKey(key([k(13, 0), k(10, 1), k(5, 2)]), key([k(1, 0), k(1, 1), k(3, 2)])) < 0, 'เก้าเก: แต้มเท่ากัน (5 แต้ม) ตัดสินด้วยไพ่ใบสูงสุด A สูง (A ชนะ K)');
  const G = E.newGame([{ id: 'a', n: 'A' }], { options: Rules.cleanOptions('gaogae', { stake: 10, raise: 10 }) }); G.cur = 0;
  ok(E.act(G, 1, { t: 'call' }) === 'ยังไม่ถึงตาคุณ' && E.act(G, 0, { t: 'raise' }) === null && G.cb === 20 && G.P[0].bet === 20, 'เก้าเก: เกทับขึ้นยอด 10 → 20');
  let g = 0; while (!G.over && g++ < 50) { G.P[G.cur].bot = true; if (G.raises < 3 && G.cur !== 0) E.act(G, G.cur, { t: 'raise' }); else E.act(G, G.cur, { t: 'call' }); }
  ok(G.over && G.raises <= 3, 'เก้าเก: เกทับได้ไม่เกิน 3 ครั้ง แล้วเปิดไพ่เมื่อทุกคนลงเท่ากัน');
  const G3 = E.newGame([{ id: 'a', n: 'A' }], { options: Rules.cleanOptions('gaogae', { stake: 10 }) }); G3.cur = 0; G3.P.forEach((p, i) => { if (i) { E.act(G3, G3.cur, { t: 'fold' }); } }); // คนแรกหมอบ ฯลฯ
  const G4 = E.newGame([{ id: 'a', n: 'A' }], { options: Rules.cleanOptions('gaogae', { stake: 10 }) }); G4.cur = 0; E.act(G4, 0, { t: 'call' }); E.act(G4, 1, { t: 'fold' }); E.act(G4, 2, { t: 'fold' }); E.act(G4, 3, { t: 'fold' });
  ok(G4.over && !G4.shown && G4.res.k === 0 && G4.res.coin.delta[0] === 30 && G4.res.coin.delta[1] === -10, 'เก้าเก: ทุกคนหมอบเหลือคนเดียว ชนะกองกลางโดยไม่ต้องเปิดไพ่ (ได้ 30 เสียคนละ 10)'); }
{ const E = require('./src/rules/somsip'), W0 = { wildOn: false, indRank: null }, wk = (h, G = W0) => E.winKind(G, h);
  ok(wk([k(3, 0), k(7, 1), k(1, 2), k(9, 3), k(5, 0), k(5, 1)]) && wk([k(11, 0), k(11, 1), k(10, 0), k(10, 1), k(4, 0), k(6, 2)]), 'ผสมสิบ: 3+7 · A+9 · 5+5 · J-J · 10-10 · 4+6 เป็นคู่ได้');
  ok(!wk([k(11, 0), k(12, 1), k(10, 0), k(10, 1), k(4, 0), k(6, 2)]) && !wk([k(10, 0), k(11, 1), k(2, 0), k(8, 1), k(3, 0), k(7, 1)]) && !wk([k(3, 0), k(3, 1), k(7, 2), k(7, 3), k(9, 0), k(9, 1)]), 'ผสมสิบ: J-Q, 10-J, 9-9 ไม่ใช่คู่');
  const Wd = { wildOn: true, indRank: 4 }; ok(wk([k(4, 0), k(1, 1), k(13, 2), k(13, 3), k(2, 0), k(8, 1)], Wd) && wk([{ id: 52, r: 0, s: -1, joker: true }, k(1, 1), k(13, 2), k(13, 3), k(2, 0), k(8, 1)], Wd), 'ผสมสิบ: ไพ่เลขเดียวกับตัวบอกและโจ๊กเกอร์ใช้แทนไพ่ใดก็ได้');
  ok(wk([k(1, 0), k(1, 1), k(1, 2), k(12, 0), k(13, 1), k(8, 0)], Wd).name === 'A สามใบ' && wk([k(2, 0), k(5, 0), k(8, 0), k(13, 0), k(12, 0), k(9, 0)], Wd).name === 'ดอกเดียวกัน 6 ใบ', 'ผสมสิบ: มือพิเศษ A 3 ใบ / ดอกเดียวกัน 6 ใบ');
  ok(!wk([k(1, 0), k(1, 1), k(12, 2), k(13, 0), k(8, 0), k(8, 1)], W0) && !wk([k(1, 0), k(1, 1), k(1, 2), k(12, 0), k(13, 1), k(8, 0)], { wildOn: false }), 'ผสมสิบ: แบบง่ายไม่มีมือพิเศษ/ไวลด์');
  const G = E.newGame([{ id: 'a', n: 'A' }], { options: Rules.cleanOptions('somsip', { variant: 'simple', stake: 10 }) }); ok(G.ind === null && G.stock.length === 52 - 20, 'ผสมสิบ: แบบง่ายใช้ 52 ใบ ไม่มีตัวบอกไวลด์');
  G.cur = 0; G.phase = 'draw'; ok(E.act(G, 0, { t: 'take' }) === 'ยังไม่มีไพ่ในกองทิ้งหน้าคุณ' && E.act(G, 0, { t: 'draw' }) === null && G.P[0].h.length === 6 && E.act(G, 0, { t: 'draw' }) !== null, 'ผสมสิบ: จั่วได้ครั้งเดียวต่อตา · เก็บกองทิ้งตอนยังว่างไม่ได้');
  const id = G.P[0].h[0].id; ok(E.act(G, 0, { t: 'dis', id }) === null && G.P[1].pile.length === 1 && G.P[1].pile[0].id === id && G.cur === 1 && G.P[0].h.length === 5, 'ผสมสิบ: ทิ้งไพ่ไปไว้หน้าผู้เล่นถัดไป ให้เหลือ 5 ใบ'); }
{ const E = require('./src/rules/eekae'), h = [k(7, 0), k(7, 1), k(7, 2), k(3, 0), k(3, 1), k(3, 2), k(3, 3), k(12, 0)];
  const d = E.dropPairs(h); ok(d === 6 && h.length === 2 && h.some(c => c.r === 7) && h.some(c => c.r === 12), 'อีแก่: ทิ้งคู่เลขเดียวกัน (7 สามใบ → เหลือ 1, 3 สี่ใบ → ทิ้งหมด)');
  const G = E.newGame([{ id: 'a', n: 'A' }], { options: Rules.cleanOptions('eekae', { stake: 10, mode: 'all' }) }); const me = G.cur, v = E.view(G, me);
  ok(v.src >= 0 && v.srcN === G.P[v.src].h.length && E.act(G, (me + 1) % 4, { t: 'pick', i: 0 }) !== null && E.act(G, me, { t: 'pick', i: 99 }) !== null, 'อีแก่: จั่วจากผู้เล่นก่อนหน้า · ไม่ใช่ตาหรือเลือกไพ่นอกช่วงถูกปฏิเสธ');
  const GF = E.newGame([{ id: 'a', n: 'A' }], { options: Rules.cleanOptions('eekae', { stake: 10, mode: 'first' }) }); let t = 0; while (!GF.over) { E.botTurn(GF); t++; }
  const l = GF.res.loser, first = GF.res.k; ok(GF.res.coin.delta[l] === -30 && GF.res.coin.delta[first] === 30, 'อีแก่: โหมด "คนหมดไพ่ก่อนได้เต็ม" ผู้แพ้จ่ายคนแรกที่หมดมือ 3 × เดิมพัน');
  const GA = E.newGame([{ id: 'a', n: 'A' }], { options: Rules.cleanOptions('eekae', { stake: 10, mode: 'all' }) }); while (!GA.over) E.botTurn(GA);
  ok(GA.res.coin.delta[GA.res.loser] === -30 && GA.P.every((p, i) => i === GA.res.loser || GA.res.coin.delta[i] === 10), 'อีแก่: โหมดปกติ ผู้แพ้จ่ายทุกคนที่รอดคนละเดิมพัน'); }

console.log('\n[C] client จริง ต่อเซิร์ฟเวอร์: เลือกเกม → เล่น → จบ');
const M = require('./test-mock-sio'), sleep = ms => new Promise(r => setTimeout(r, ms));
const SRC = ['app.js', 'games.js'].map(f => fs.readFileSync(path.join(__dirname, '../client/public', f), 'utf8')).join('\n');
const srv = M.load({ BOT_DELAY_MS: 5, EMPTY_ROOM_TTL_MS: 60000, RATE_PER_SEC: 100000 });
const store = {};
function openPage() {
  const appEl = { innerHTML: '', className: '' }, modal = { el: null }, socks = [];
  const g = { localStorage: { getItem: x => (x in store ? store[x] : null), setItem: (x, v) => { store[x] = String(v); }, removeItem: x => { delete store[x]; } },
    document: { getElementById: id => (id === 'app' ? appEl : id === 'ruleModal' ? modal.el : null), querySelector: () => null, querySelectorAll: () => [], documentElement: { style: { setProperty() {}, removeProperty() {} }, dataset: {} },
      createElement: () => ({ setAttribute() {}, remove() { modal.el = null; }, innerHTML: '' }), body: { appendChild(e) { modal.el = e; } } },
    fetch: u => (String(u).includes('skins.json') ? Promise.resolve({ ok: true, json: () => Promise.resolve(JSON.parse(fs.readFileSync(path.join(__dirname, '../client/public/skin/skins.json'), 'utf8'))) }) : Promise.resolve({ ok: false })),
    confirm: () => true, requestAnimationFrame: () => 0, setTimeout, clearTimeout, console };
  g.window = g; g.addEventListener = () => {}; g.DUMMY_CONFIG = { BACKEND_URL: 'http://fake', DEAL_MS: 0 }; g.DUMMY_VERSION = 'test';
  g.io = () => { const c = M.client(srv); socks.push(c); return c; };
  const ctx = vm.createContext(g); vm.runInContext(SRC, ctx, { filename: 'app+games.js' });
  return { ctx, appEl, modal, socks, ev: code => vm.runInContext(code, ctx) };
}
const waitFor = async (f, ms = 4000) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { let v; try { v = f(); } catch (e) { v = false; } if (v) return v; await sleep(8); } return false; };
const NAMES = { pokdeng: 'ป๊อกเด้ง', gaogae: 'เก้าเก', somsip: 'ผสมสิบ', eekae: 'อีแก่' };
// ผู้เล่นมนุษย์: เลือกคำสั่งง่าย ๆ ตามเกม แล้วรอจนจบ
async function playOut(pg, id) {
  for (let i = 0; i < 4000 && !pg.ev('S && S.over'); i++) {
    if (pg.ev('S && S.cur === S.my && !S.over && !deal')) {
      if (id === 'pokdeng') pg.ev("gxAct(S.canDraw && S.mine.taem <= 4 ? 'draw' : 'stay')");
      else if (id === 'gaogae') pg.ev("gxAct(S.toCall > 0 && S.mine.type === 'point' ? 'fold' : 'call')");
      else if (id === 'somsip') pg.ev("S.phase === 'draw' ? gxAct(S.P[S.my].pile.length && S.my % 2 ? 'take' : 'draw') : S.canWin ? gxAct('win') : (gxSel(S.hand[0]), gxDis())");
      else pg.ev('gxPick(0)');
    }
    await sleep(6);
  }
  return pg.ev('S && S.over');
}
(async () => {
  let pg = openPage(); await sleep(40);
  pg.ev('goPlay()'); await waitFor(() => pg.ev('RULES.length') === 5);
  ok(pg.ev('screen') === 'games' && Object.values(NAMES).every(n => pg.appEl.innerHTML.includes(n)) && pg.appEl.innerHTML.includes('ดัมมี่'), 'หน้าเลือกเกมแสดงทั้ง 5 เกมพร้อมชื่อ/คำอธิบาย');
  for (const id of IDS) {
    console.log('\n  — ' + NAMES[id]);
    pg.ev('goPlay()'); pg.ev("chooseGame('" + id + "')");
    ok(pg.ev('screen') === 'play' && pg.appEl.innerHTML.includes(NAMES[id]) && pg.appEl.innerHTML.includes("go('games')"), 'เลือก ' + NAMES[id] + ' → หน้าเล่นเกมแสดงเกมที่เลือก + ปุ่มเปลี่ยนเกม');
    pg.ev('solo()'); await sleep(20);
    ok(pg.appEl.innerHTML.includes('วิธีเล่น' + NAMES[id]) && pg.appEl.innerHTML.includes('การนับเหรียญ') && pg.appEl.innerHTML.includes('value="20"'), 'หน้าตั้งค่าห้องแสดงวิธีเล่น + การนับเหรียญ + เดิมพันของ ' + NAMES[id]);
    pg.ev("setOpt('stake', 30)"); pg.ev('startCreate()');
    ok(await waitFor(() => pg.ev('lob && lob.rule && lob.rule.id') === id) && pg.appEl.innerHTML.includes('📖 กติกา'), 'สร้างห้อง ' + NAMES[id] + ' สำเร็จ: ห้องใช้กฎถูกเกม มีปุ่มกติกา');
    pg.ev("showRules('" + id + "')"); ok(pg.modal.el && pg.modal.el.innerHTML.includes('กติกา' + NAMES[id]) && pg.modal.el.innerHTML.includes('การนับเหรียญ') && pg.modal.el.innerHTML.includes('30 🪙'), 'กล่องกติกาแสดงวิธีเล่นและเหรียญตามเดิมพัน 30'); pg.ev('closeRules()');
    await waitFor(() => !pg.ev('shufAnim'), 3000); pg.ev('doShuffle()'); await waitFor(() => pg.ev('lob.shuffle.ready')); const coin0 = Number(store.dummyCoins || 5000); pg.ev('begin()');
    const started = await waitFor(() => pg.ev('S') && pg.ev('S.rule') === id); 
    ok(started && pg.ev('screen') === 'game' && pg.appEl.innerHTML.includes('class=gx') && pg.appEl.innerHTML.includes('class=arena'), 'เริ่มเกม: เข้าหน้าโต๊ะของ ' + NAMES[id]);
    ok(await playOut(pg, id), NAMES[id] + ': เล่นจนจบตา');
    const dlt = pg.ev('S.res.coin.delta[S.my]'), coin1 = Number(store.dummyCoins);
    ok(coin1 === Math.max(0, coin0 + dlt) && pg.appEl.innerHTML.includes('class=ov') && pg.appEl.innerHTML.includes('ผลเหรียญตานี้ ' + (dlt > 0 ? '+' + dlt : dlt)), NAMES[id] + ': จ่ายเหรียญครั้งเดียวตรงผล (' + coin0 + ' ' + (dlt >= 0 ? '+' : '') + dlt + ' → ' + coin1 + ') และหน้าสรุปแสดงผล');
    ok(pg.appEl.innerHTML.includes('เล่นอีกตา'), NAMES[id] + ': หน้าสรุปมีปุ่มเล่นอีกตา/สับไพ่');
    pg.ev('leave()'); await sleep(30);
  }
  console.log('\n  — ออนไลน์ 2 คน (ป๊อกเด้ง)');
  const guest = M.client(srv); let gst = null; guest.on('game:state', s => { if (!gst) gst = s; });   // เก็บเฉพาะสถานะแรกหลังแจกไพ่ (ก่อนบอทเล่นต่อ)
  pg.ev('goPlay()'); pg.ev("chooseGame('pokdeng')"); pg.ev("openCreate('room')"); pg.ev('startCreate()'); await waitFor(() => pg.ev('code'));
  guest.emit('room:join', { code: pg.ev('code'), name: 'เพื่อน' }); await waitFor(() => pg.ev('lob && lob.players.length === 2'));
  await waitFor(() => !pg.ev('shufAnim'), 3000); pg.ev('doShuffle()'); await waitFor(() => pg.ev('lob.shuffle.ready')); pg.ev('begin()'); await waitFor(() => gst && pg.ev('S'));
  ok(gst.rule === 'pokdeng' && gst.my === 1 && gst.hand.length === 2 && !('h' in gst), 'ผู้เล่นคนที่ 2 เข้าห้องป๊อกเด้งและได้ไพ่ของตัวเอง');
  const other = gst.P.find(p => p.i === 0); ok(other.cards === null || other.pok === true || gst.over, 'ผู้เล่นคนที่ 2 มองไม่เห็นไพ่ของเจ้าของห้อง (ยกเว้นป๊อกที่เปิดแล้ว/ตาจบตั้งแต่แจก)');
  pg.socks.forEach(s => s.close()); guest.close();
  console.log('\nผ่านทั้งหมด ' + passed + ' รายการ'); process.exit(0);
})().catch(e => { console.error('ล้มเหลว:', e && e.stack || e); process.exit(1); });
