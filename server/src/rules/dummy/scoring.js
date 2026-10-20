// การนับ "เหรียญ" ของดัมมี่ (แยกจากแต้มในเกมที่ใช้จัดอันดับ) — เหรียญคิดเป็นจำนวนเต็มตามเดิมพันที่ผู้สร้างห้องตั้ง
//   • ตีปี้      : ตอนมีคนเก็บไพ่กองทิ้งไปเกิด — ผู้ที่ทิ้งไพ่ใบที่ถูกใช้เกิด (ทั้งสเปโตและไพ่ธรรมดา) จ่ายให้คนเกิด 1 เดิมพันต่อใบ
//   • น็อก       : ผู้ที่ไม่ได้น็อกจ่ายให้คนน็อกตามอันดับ (นับจากท้าย): สุดท้าย ×1 · รองท้าย ×0.75 · ถัดมา ×0.5 (เดิมพัน 20 → 20/15/10)
//   • อมสเปโต    : จบเกมแล้วยังถือสเปโตอยู่ จ่ายต่อใบ 1 เดิมพัน ให้ทุกคนรอบวง (หรือเฉพาะคนน็อก ตามตัวเลือก) ถ้าไม่เคยเกิดเลย ×2
const { cn, sp } = require('./cards');

const KNOCK_RATE = [1, 0.75, 0.5, 0.25]; // อัตราจ่ายคนน็อก นับจากอันดับสุดท้ายขึ้นมา

function pay(G, from, to, amt, why) {
  if (!(amt > 0) || from === to) return;
  G.ledger.push({ f: from, t: to, a: amt, w: why });
}

// ตีปี้: from = คนที่ทิ้งไพ่ c, to = คนที่เก็บไปเกิด (เรียกตอนเกิด)
function pee(G, from, to, c) {
  pay(G, from, to, G.stake, 'ตีปี้ ' + cn(c));
  return G.stake;
}

// สรุปเหรียญตอนจบเกม (เรียกหลังคิดแต้มเสร็จ) — k = ที่นั่งคนน็อก หรือ null ถ้าไพ่หมดกอง
function settle(G, k) {
  const stake = G.stake, n = G.P.length, lines = G.ledger.slice();
  const add = (f, t, a, w) => { if (a > 0 && f !== t) lines.push({ f, t, a, w }); };
  if (k != null) {
    const others = G.P.filter(p => p.i !== k).map(p => ({ i: p.i, pts: p.pts })).sort((a, b) => a.pts - b.pts); // แต้มน้อยสุดก่อน = อันดับท้าย
    others.forEach(o => {
      const pos = others.findIndex(x => x.pts === o.pts); // แต้มเท่ากันนับอันดับเดียวกัน
      add(o.i, k, Math.round(stake * KNOCK_RATE[Math.min(pos, KNOCK_RATE.length - 1)]), 'แพ้น็อก อันดับ ' + (n - pos));
    });
  }
  G.P.forEach(p => {
    const cnt = p.h.filter(sp).length; if (!cnt) return;
    const mult = p.melded ? 1 : 2, amt = stake * mult * cnt;
    const to = G.spetoMode === 'knocker' && k != null ? [k] : G.P.filter(q => q.i !== p.i).map(q => q.i);
    to.forEach(t => add(p.i, t, amt, 'อมสเปโต' + (cnt > 1 ? ' ' + cnt + ' ใบ' : '') + (mult > 1 ? ' ไม่เคยเกิด ×2' : '')));
  });
  const delta = Array(n).fill(0);
  lines.forEach(l => { delta[l.f] -= l.a; delta[l.t] += l.a; });
  return { stake, delta, lines };
}

module.exports = { pee, settle, KNOCK_RATE };
