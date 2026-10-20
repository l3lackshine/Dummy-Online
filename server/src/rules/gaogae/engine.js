// กติกาเก้าเก (ไพ่ 3 ใบ + ค่าต๋ง/หมอบ-สู้-ตาม-เกทับ) — เซิร์ฟเวอร์ตัดสินทั้งหมด การนับเหรียญอยู่ในฟังก์ชัน settle
const S = require('../shared');
const { defaults } = require('./meta');
const MAX_RAISES = 3;

const hi = c => (c.r === 1 ? 14 : c.r);                 // ไพ่สูงสุด: A สูง 2 ต่ำ
const pip = c => (c.r >= 10 ? 0 : c.r);                  // A=1, 10/J/Q/K=0
// ประเมินไพ่ 3 ใบ → key เทียบแบบลำดับตัวอักษร (ใหญ่ชนะ) · 5 ตอง · 4 เรียง · 3 เซียน · 2 สี · 1 แต้ม
function evalHand(cs) {
  const r = cs.map(c => c.r).sort((a, b) => a - b), same = f => cs.every(c => f(c) === f(cs[0])), pts = cs.reduce((a, c) => a + pip(c), 0) % 10, top = Math.max(...cs.map(hi));
  if (same(c => c.r)) return { type: 'tong', key: [5, hi(cs[0])], name: 'ตอง', pts };
  if (same(c => c.s) && r[1] === r[0] + 1 && r[2] === r[1] + 1) return { type: 'seq', key: [4, r[2]], name: 'เรียง', pts };   // A นับต่ำเท่านั้น (A-2-3 ต่ำสุด, Q-K-A ไม่นับ)
  if (r[0] === 11 && r[1] === 12 && r[2] === 13) return { type: 'sean', key: [3], name: 'เซียน', pts };                     // K-Q-J คนละดอก
  if (same(c => c.s)) return { type: 'colour', key: [2, top], name: 'สี', pts };
  return { type: 'point', key: [1, pts, top], name: pts + ' แต้ม', pts };
}
const cmpKey = (a, b) => { for (let i = 0; i < Math.max(a.length, b.length); i++) { const d = (a[i] || 0) - (b[i] || 0); if (d) return d < 0 ? -1 : 1; } return 0; };

function newGame(humans, opts) {
  const o = Object.assign(defaults(), opts && opts.options), stake = S.num(o.stake, defaults().stake, 1, 1e6), raise = S.num(o.raise, defaults().raise, 1, 1e6);
  const total = Math.max(4, humans.length), deck = S.deckOf(opts);
  const P = S.makePlayers(humans, total, () => ({ h: [], folded: false, bet: stake }));
  for (let r = 0; r < 3; r++) for (let i = 0; i < total; i++) P[i].h.push(deck.shift());
  const first = S.rnd(total);
  const G = { rule: 'gaogae', P, cur: first, over: false, res: null, gid: S.gid(), v: 0, stake, raise, cb: stake, raises: 0, need: new Set(P.map(p => p.i)), shown: false, phase: 'bet', logs: [] };
  G.logs.push('ทุกคนลงค่าต๋ง ' + stake + ' เข้ากองกลาง', 'สุ่มได้ ' + P[first].n + ' เริ่มก่อน!');
  return G;
}
const pot = G => G.P.reduce((a, p) => a + p.bet, 0);
const active = G => G.P.filter(p => !p.folded);

function act(G, seat, a) {
  if (!G || G.over) return 'จบตาแล้ว';
  if (G.cur !== seat) return 'ยังไม่ถึงตาคุณ';
  const p = G.P[seat], toCall = G.cb - p.bet;
  if (a.t === 'fold') { p.folded = true; G.logs.push(p.n + ' หมอบ'); }
  else if (a.t === 'call') { p.bet = G.cb; G.logs.push(p.n + (toCall > 0 ? ' ตาม (+' + toCall + ')' : ' สู้')); }
  else if (a.t === 'raise') {
    if (G.raises >= MAX_RAISES) return 'เกทับครบ ' + MAX_RAISES + ' ครั้งแล้ว';
    G.cb += G.raise; G.raises++; p.bet = G.cb; G.need = new Set(active(G).map(x => x.i));
    G.logs.push(p.n + ' เกทับ! ยอดเป็น ' + G.cb);
  } else return 'คำสั่งไม่ถูกต้อง';
  G.need.delete(seat);
  if (active(G).length === 1) return settle(G, false), null;
  const nx = S.nextSeat(G, seat, s => !G.P[s].folded && G.need.has(s));
  if (nx < 0) settle(G, true); else G.cur = nx;
  return null;
}

// จบตา: ถ้าเหลือหลายคนเปิดไพ่เทียบ (shown) ไม่งั้นคนสุดท้ายชนะทันที — แบ่งกองกลางแล้วสร้างรายการจ่าย
function settle(G, show) {
  G.over = true; G.shown = show; G.phase = 'over';
  const act_ = active(G), ev = G.P.map(p => evalHand(p.h));
  let winners = act_;
  if (show) { let best = null; for (const p of act_) if (!best || cmpKey(ev[p.i].key, best) > 0) best = ev[p.i].key; winners = act_.filter(p => cmpKey(ev[p.i].key, best) === 0); }
  const cr = S.coinResult(G.P.length, G.stake), nW = winners.length;
  for (const l of G.P) {
    if (winners.includes(l)) continue;
    const why = l.folded ? 'หมอบ' : ev[l.i].name + ' แพ้';
    const base = Math.floor(l.bet / nW), extra = l.bet - base * nW;
    winners.forEach((w, k) => cr.pay(l.i, w.i, base + (k < extra ? 1 : 0), why));
  }
  const coin = cr.done(), top = winners.length === 1 ? winners[0].i : null;
  G.res = { k: top, title: !show ? G.P[winners[0].i].n + ' ชนะ (ทุกคนหมอบ)' : winners.length === 1 ? G.P[winners[0].i].n + ' ชนะ ' + ev[winners[0].i].name : 'เสมอ แบ่งกองกลาง: ' + winners.map(w => w.n).join(', '), pot: pot(G),
    rows: G.P.map(p => ({ i: p.i, cards: show && !p.folded ? p.h.map(c => c.id) : null, name: p.folded ? 'หมอบ' : ev[p.i].name, folded: p.folded, bet: p.bet, win: winners.includes(p) })), coin };
  G.logs.push(G.res.title);
}

function strength(e) { return e.type === 'tong' ? 1 : e.type === 'seq' ? .95 : e.type === 'sean' ? .85 : e.type === 'colour' ? .75 : .1 + e.key[1] * .06; }
function botTurn(G) {
  if (!G || G.over) return;
  const p = G.P[G.cur], s = strength(evalHand(p.h)), toCall = G.cb - p.bet;
  let t = 'call';
  if (toCall > 0 && s < .35 && S.rnd(100) >= 15) t = 'fold';
  else if (G.raises < MAX_RAISES && ((s >= .7 && S.rnd(100) < 55) || S.rnd(100) < 6)) t = 'raise';
  act(G, G.cur, { t });
}
function winner(G) { return G && G.over ? S.topWinner(G) : null; }

function view(G, seat) {
  const me = G.P[seat], e = evalHand(me.h);
  return {
    v: G.v, gid: G.gid, rule: 'gaogae', stake: G.stake, my: seat, cur: G.cur, phase: G.phase, over: G.over, res: G.res, logs: G.logs,
    pot: pot(G), cb: G.cb, raise: G.raise, raises: G.raises, maxRaises: MAX_RAISES, toCall: G.cb - me.bet, canRaise: G.raises < MAX_RAISES,
    hand: me.h.map(c => c.id), mine: { name: e.name, type: e.type },
    P: G.P.map(p => S.pubP(p, { n_cards: p.h.length, folded: p.folded, bet: p.bet, cards: G.over && G.shown && !p.folded ? p.h.map(c => c.id) : null })),
  };
}

module.exports = { newGame, act, botTurn, view, winner, evalHand, cmpKey };
