'use strict';
// ตรวจทุกเกมที่เปิดให้เล่น: เล่นด้วยบอทจนจบได้ · ยอดเหรียญรวมเป็นศูนย์ · ไม่ส่งไพ่ในมือคนอื่น · คำสั่งพื้นฐานของแต่ละเกมใช้ได้
const assert = require('assert');
const Rules = require('./src/rules');
const P = n => ({ id: 'id-' + n, n: 'P' + n });
let passed = 0; const ok = (v, m) => { assert(v, m); passed++; console.log('  ✓ ' + m); };
const sum = a => a.reduce((x, y) => x + y, 0);
const playOut = (R, G) => { let t = 0; while (!G.over && t++ < 5000) { R.botTurn(G); G.v = (G.v || 0) + 1; } return t; };

console.log('\n[ทุกเกม] เล่นจนจบ · เหรียญรวมศูนย์ · ไม่เปิดมือคู่แข่ง');
for (const m of Rules.list()) {
  const R = Rules.get(m.id);
  for (const n of [2, 4]) {
    for (let k = 0; k < 20; k++) {
      const G = R.newGame(Array.from({ length: n }, (_, i) => P(i)), { options: { stake: 20 } });
      for (let s = 0; s < G.P.length; s++) { const v = R.view(G, s); assert(v.P.every((p, i) => i === s || !Object.prototype.hasOwnProperty.call(p, 'h')), m.id + ' ส่งไพ่ในมือคนอื่น'); }
      const t = playOut(R, G);
      assert(G.over && t < 5000, m.id + ' ไม่จบ'); assert(R.winner(G) == null || G.P[R.winner(G)], m.id + ' ผู้ชนะไม่ถูกต้อง');
      if (G.res && G.res.coin) assert.strictEqual(sum(G.res.coin.delta), 0, m.id + ' เหรียญรวมไม่เป็นศูนย์');
    }
  }
  ok(true, m.id + ': 40 เกม (2 และ 4 คน) จบได้ ไม่เปิดมือ เหรียญรวมศูนย์');
}

console.log('\n[ป๊อกเด้ง] ไม่จั่วทุกคน → จบและคิดผลครบทุกที่นั่ง');
{
  const R = Rules.get('pokdeng'), G = R.newGame([P(0), P(1), P(2)], { options: { stake: 10 } }); let t = 0;
  while (!G.over && t++ < 20) { assert.strictEqual(R.act(G, G.cur, { t: 'stay' }), null); G.v++; }
  ok(G.over && G.res.coin.delta.length === G.P.length && sum(G.res.coin.delta) === 0, 'ป๊อกเด้งจบได้และคิดเหรียญครบทุกที่นั่ง (รวมเจ้ามือ)');
  ok(R.act(G, 0, { t: 'stay' }) != null, 'จบแล้วสั่งต่อไม่ได้');
}
console.log('\n[เก้าเก] หมอบ/ตาม และสั่งนอกตาไม่ได้');
{
  const R = Rules.get('gaogae'), G = R.newGame([P(0), P(1), P(2), P(3)], { options: { stake: 25 } });
  const other = (G.cur + 1) % G.P.length;
  ok(R.act(G, other, { t: 'call' }) != null, 'สั่งตอนที่ไม่ใช่ตาตัวเองไม่ได้');
  let t = 0; while (!G.over && t++ < 50) { assert.strictEqual(R.act(G, G.cur, { t: 'call' }), null); G.v++; }
  ok(G.over && sum(G.res.coin.delta) === 0, 'ทุกคนตาม → เปิดผลและเหรียญรวมศูนย์');
}
console.log('\n[อีแก่] สำรับและการจบ');
{
  const R = Rules.get('eekae'), G = R.newGame([P(0), P(1), P(2)], { options: { stake: 10 } });
  ok(G.P.reduce((n, p) => n + p.h.length, 0) <= 51, 'อีแก่ใช้ไพ่ไม่เกิน 51 ใบ (ตัดควีนออก 1 ใบ)');
  playOut(R, G); ok(G.over && sum(G.res.coin.delta) === 0, 'อีแก่จบได้และกองกลางแจกครบ');
}
console.log(`\nผ่านทั้งหมด ${passed} จุดตรวจ`);
