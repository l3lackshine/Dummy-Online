// กติกาอีแก่ (Old Maid) — เซิร์ฟเวอร์ตัดสินทั้งหมด การนับเหรียญอยู่ในฟังก์ชัน finish
const S = require('../shared');
const { defaults } = require('./meta');
const REMOVED = 50;   // Q♣ ถูกเอาออก ให้ควีนเหลือ 3 ใบ → จับคู่ได้ 1 คู่ เหลือควีนเดี่ยว 1 ใบเสมอ

// ทิ้งคู่เลขเดียวกันออกจากมือ (ทีละ 2 ใบ) → คืนจำนวนใบที่ทิ้ง
function dropPairs(h) {
  let dropped = 0;
  for (let r = 1; r <= 13; r++) {
    const idx = h.map((c, i) => (c.r === r ? i : -1)).filter(i => i >= 0), n = idx.length - (idx.length % 2);
    idx.slice(0, n).reverse().forEach(i => h.splice(i, 1)); dropped += n;
  }
  return dropped;
}
const alive = G => G.P.filter(p => !p.out);
const markOut = (G, p) => { if (!p.out && !p.h.length) { p.out = true; G.out.push(p.i); G.logs.push(p.n + ' หมดมือ — รอดแล้ว!'); } };
// ผู้ที่ตอนนี้ต้องถูกจั่ว (ที่นั่งก่อนหน้าที่ยังเล่นอยู่)
const srcOf = (G, cur) => { const n = G.P.length; for (let k = 1; k < n; k++) { const s = (cur - k + n) % n; if (!G.P[s].out) return s; } return -1; };

function newGame(humans, opts) {
  const o = Object.assign(defaults(), opts && opts.options), stake = S.num(o.stake, defaults().stake, 1, 1e6);
  const total = Math.max(4, humans.length), deck = S.deckOf(opts).filter(c => c.id !== REMOVED);
  const P = S.makePlayers(humans, total, () => ({ h: [], out: false }));
  deck.forEach((c, i) => P[i % total].h.push(c));
  const G = { rule: 'eekae', P, cur: 0, phase: 'pick', over: false, res: null, gid: S.gid(), v: 0, stake, mode: o.mode === 'first' ? 'first' : 'all', out: [], disc: 0, logs: [] };
  for (const p of P) G.disc += dropPairs(p.h);
  G.logs.push('แจกไพ่ 51 ใบ ทิ้งคู่แรกแล้ว (ทิ้งไป ' + G.disc + ' ใบ)');
  for (const p of P) markOut(G, p);
  if (alive(G).length <= 1) { finish(G); return G; }
  const live = alive(G); G.cur = live[S.rnd(live.length)].i;
  G.logs.push('สุ่มได้ ' + P[G.cur].n + ' จั่วก่อน!');
  return G;
}

function finish(G) {
  G.over = true; G.phase = 'over';
  const loser = alive(G)[0] || null, cr = S.coinResult(G.P.length, G.stake), first = G.out.length ? G.out[0] : null;
  if (loser) {
    if (G.mode === 'first' && first != null) cr.pay(loser.i, first, G.stake * (G.P.length - 1), 'อีแก่ จ่ายให้คนหมดไพ่ก่อน');
    else for (const p of G.P) if (p.i !== loser.i) cr.pay(loser.i, p.i, G.stake, 'อีแก่');
  }
  const coin = cr.done();
  G.res = { k: first, loser: loser ? loser.i : null, coin, title: loser ? loser.n + ' ถืออีแก่ — แพ้!' : 'จบเกม',
    rows: G.P.map(p => ({ i: p.i, cards: loser && p.i === loser.i ? p.h.map(c => c.id) : null, name: p.i === (loser && loser.i) ? 'ถืออีแก่ 👵' : 'รอดลำดับที่ ' + (G.out.indexOf(p.i) + 1), loser: !!loser && p.i === loser.i, order: G.out.indexOf(p.i) + 1 })) };
  G.logs.push(G.res.title);
}

function act(G, seat, a) {
  if (!G || G.over) return 'จบตาแล้ว';
  if (G.cur !== seat) return 'ยังไม่ถึงตาคุณ';
  if (a.t !== 'pick') return 'คำสั่งไม่ถูกต้อง';
  const me = G.P[seat], si = srcOf(G, seat), src = G.P[si];
  if (!src || !src.h.length) return 'ไม่มีไพ่ให้จั่ว';
  const i = a.i; if (!Number.isInteger(i) || i < 0 || i >= src.h.length) return 'เลือกไพ่ไม่ถูกต้อง';
  const c = src.h.splice(i, 1)[0], mate = me.h.findIndex(x => x.r === c.r);
  if (mate >= 0) { me.h.splice(mate, 1); G.disc += 2; G.logs.push(me.n + ' จั่วจาก ' + src.n + ' ได้คู่ ' + S.RK[c.r] + ' ทิ้ง!'); }
  else { me.h.push(c); G.logs.push(me.n + ' จั่วไพ่จาก ' + src.n); }
  S.shuffleArr(me.h); S.shuffleArr(src.h);                       // สลับตำแหน่งไพ่ในมือ กันเดาจากตำแหน่ง
  markOut(G, src); markOut(G, me);
  if (alive(G).length <= 1) { finish(G); return null; }
  G.cur = S.nextSeat(G, seat, s => !G.P[s].out);
  return null;
}

function botTurn(G) {
  if (!G || G.over) return;
  const src = G.P[srcOf(G, G.cur)];
  act(G, G.cur, { t: 'pick', i: S.rnd(src.h.length) });
}
function winner(G) { return G && G.over && G.res ? G.res.k : null; }

function view(G, seat) {
  const me = G.P[seat], si = !G.over && !me.out ? srcOf(G, seat) : -1;
  return {
    v: G.v, gid: G.gid, rule: 'eekae', stake: G.stake, my: seat, cur: G.cur, phase: G.phase, over: G.over, res: G.res, logs: G.logs,
    hand: me.h.map(c => c.id), disc: G.disc, mode: G.mode,
    src: G.cur === seat && !G.over ? si : -1, srcN: G.cur === seat && !G.over && si >= 0 ? G.P[si].h.length : 0,
    P: G.P.map(p => S.pubP(p, { n_cards: p.h.length, out: p.out, order: G.out.indexOf(p.i) + 1 })),
  };
}

module.exports = { newGame, act, botTurn, view, winner, dropPairs };
