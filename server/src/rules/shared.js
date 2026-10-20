// ตัวช่วยกลางสำหรับกฎเกมไพ่ไทยที่ใช้ไพ่ 52 ใบ (ป๊อกเด้ง / เก้าเก / ผสมสิบ / อีแก่)
// — ไม่มีกติกาของเกมใดอยู่ที่นี่ มีแต่การ์ด ผู้เล่น/บอท และตัวช่วยจ่ายเหรียญ
const crypto = require('crypto');
const Shuffle = require('../shuffle');
const { CHARS, BGS, rnd, rndBg, rndChar } = require('./common');

const SU = ['♠', '♥', '♦', '♣'], RK = ['', 'A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
// id 0..51 → r (1=A..13=K), s (0♠ 1♥ 2♦ 3♣) — ตรงกับ client; id 52+ = โจ๊กเกอร์ (ใช้เฉพาะผสมสิบ)
const card = id => (id >= 52 ? { id, r: 0, s: -1, joker: true } : { id, r: id % 13 + 1, s: (id / 13) | 0 });
const cn = c => (c.joker ? '🃏' : RK[c.r] + SU[c.s]);
const gid = () => crypto.randomBytes(6).toString('hex');
const BOTS = ['น้องมี่', 'ลุงหัว', 'ป้าน็อก', 'ตาโอ', 'พี่เกิด'];

// สำรับที่สับแล้วจากบริการสับไพ่กลาง (ถ้าไม่มี สับเองด้วยเอนจิ้นเดียวกัน)
const deckOf = opts => (opts && Shuffle.isValidIds(opts.deck) ? opts.deck : Shuffle.shuffle().ids).map(card);

// สร้างผู้เล่นให้ครบ total ที่นั่ง (ที่ว่าง = บอท) — หน้าตาเหมือนดัมมี่เพื่อให้ client ใช้ av()/ที่นั่งร่วมกันได้
function makePlayers(humans, total, extra) {
  return Array.from({ length: total }, (_, i) => Object.assign({
    i, id: humans[i] ? humans[i].id : null, n: humans[i] ? humans[i].n : BOTS[i - humans.length],
    bg: humans[i] && BGS.includes(humans[i].bg) ? humans[i].bg : rndBg(),
    ch: humans[i] && CHARS.includes(humans[i].ch) ? humans[i].ch : rndChar(),
    bot: !humans[i],
  }, extra ? extra(i) : {}));
}
const pubP = (p, more) => Object.assign({ i: p.i, n: p.n, ch: p.ch, bg: p.bg, bot: p.bot }, more || {});

// ผลเหรียญ: เพิ่มรายการจ่าย f → t จำนวน a (เหตุผล w) แล้วคำนวณ delta ต่อที่นั่งจากรายการเอง (รวมเป็นศูนย์เสมอ)
function coinResult(total, stake) {
  const lines = [];
  return {
    pay(f, t, a, w) { a = Math.round(a); if (a > 0 && f !== t) lines.push({ f, t, a, w }); },
    done() { const delta = Array(total).fill(0); for (const l of lines) { delta[l.f] -= l.a; delta[l.t] += l.a; } return { stake, delta, lines }; },
  };
}
const nextSeat = (G, from, ok) => { const n = G.P.length; for (let k = 1; k <= n; k++) { const s = (from + k) % n; if (ok(s)) return s; } return -1; };
const shuffleArr = a => { for (let i = a.length - 1; i > 0; i--) { const j = rnd(i + 1); [a[i], a[j]] = [a[j], a[i]]; } return a; };
// ผู้ชนะที่ใช้ให้สิทธิ์สับไพ่ตาถัดไป: ที่นั่งที่ได้เหรียญสุทธิมากที่สุด (ต้องมากกว่า 0)
function topWinner(G) { const d = G && G.res && G.res.coin && G.res.coin.delta; if (!d) return null; const m = Math.max(...d); return m > 0 ? d.indexOf(m) : null; }
const num = (v, d, lo, hi) => { v = Math.round(Number(v)); return Number.isFinite(v) ? Math.min(hi, Math.max(lo, v)) : d; };

module.exports = { SU, RK, card, cn, gid, BOTS, deckOf, makePlayers, pubP, coinResult, nextSeat, shuffleArr, topWinner, num, rnd };
