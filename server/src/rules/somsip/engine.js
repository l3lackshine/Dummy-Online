// กติกาผสมสิบ — เซิร์ฟเวอร์ตัดสินทั้งหมด (ไพ่ 6 ใบครบ 3 คู่ที่รวมกันได้ 10) การนับเหรียญอยู่ในฟังก์ชัน finish
const S = require('../shared');
const { defaults } = require('./meta');
const MAX_TURNS = 400;

// คู่ที่ถูกต้อง: รวมกันได้ 10 (A=1) · 10-10 · J-J/Q-Q/K-K เท่านั้น · ไวลด์จับคู่กับไพ่ใดก็ได้
function canPair(a, b, W) {
  if (W(a) || W(b)) return true;
  if (a.r <= 9 && b.r <= 9 && a.r + b.r === 10) return true;
  if (a.r === 10 && b.r === 10) return true;
  return a.r >= 11 && a.r === b.r;
}
// จัดไพ่ 6 ใบเป็น 3 คู่ → [[i,j],…] หรือ null
function pairing(cs, W) {
  if (cs.length === 0) return [];
  const a = cs[0];
  for (let j = 1; j < cs.length; j++) if (canPair(a, cs[j], W)) {
    const rest = pairing(cs.slice(1, j).concat(cs.slice(j + 1)), W);
    if (rest) return [[a, cs[j]]].concat(rest);
  }
  return null;
}
// มือพิเศษ (ใช้ไพ่จริงเท่านั้น ไวลด์/โจ๊กเกอร์แทนไม่ได้): A จริง 3 ใบ หรือไพ่ 6 ใบดอกเดียวกันทั้งหมด
function special(cs, W, on) {
  if (!on || cs.length !== 6) return null;
  if (cs.filter(c => c.r === 1).length >= 3) return 'A สามใบ';
  if (cs.every(c => !c.joker && c.s === cs[0].s)) return 'ดอกเดียวกัน 6 ใบ';
  return null;
}
function maxPairs(cs, W) {
  let best = 0;
  (function go(arr, n) {
    if (n > best) best = n; if (arr.length < 2) return;
    const a = arr[0], rest = arr.slice(1); go(rest, n);
    for (let j = 0; j < rest.length; j++) if (canPair(a, rest[j], W)) go(rest.filter((_, k) => k !== j), n + 1);
  })(cs, 0);
  return best;
}
const wildFn = G => c => !!G.wildOn && (c.joker || (G.indRank != null && c.r === G.indRank));
function winKind(G, h) {
  if (h.length !== 6) return null;
  const W = wildFn(G), p = pairing(h, W);
  if (p) return { kind: 'pairs', pairs: p };
  const sp = special(h, W, G.wildOn); return sp ? { kind: 'special', name: sp } : null;
}

function newGame(humans, opts) {
  const o = Object.assign(defaults(), opts && opts.options), stake = S.num(o.stake, defaults().stake, 1, 1e6);
  const phuket = o.variant !== 'simple', total = Math.max(4, humans.length), deck = S.deckOf(opts);
  if (phuket) for (const id of [52, 53, 54]) deck.splice(S.rnd(deck.length + 1), 0, S.card(id));   // โจ๊กเกอร์ 3 ใบแทรกในสำรับที่สับแล้ว
  const P = S.makePlayers(humans, total, () => ({ h: [], pile: [] }));
  for (let r = 0; r < 5; r++) for (let i = 0; i < total; i++) P[i].h.push(deck.shift());
  const ind = phuket ? deck.shift() : null, first = S.rnd(total);
  const G = { rule: 'somsip', P, stock: deck, ind, indRank: ind && !ind.joker ? ind.r : null, wildOn: phuket, cur: first, phase: 'draw', over: false, res: null, gid: S.gid(), v: 0, stake,
    mult: o.special === 'x2' ? 2 : 1, turns: 0, logs: [] };
  G.logs.push(ind ? 'ตัวบอกไวลด์คือ ' + S.cn(ind) + (ind.joker ? ' (ไม่มีไวลด์เพิ่ม)' : ' — ไพ่เลข ' + S.RK[ind.r] + ' ทุกใบและโจ๊กเกอร์เป็นไวลด์') : 'แบบง่าย — ไม่มีไวลด์');
  G.logs.push('สุ่มได้ ' + P[first].n + ' เริ่มก่อน!');
  return G;
}

function refill(G) {                                   // กองจั่วหมด → สับกองทิ้งทุกกองเป็นกองจั่วใหม่
  const all = G.P.flatMap(p => p.pile.splice(0)); S.shuffleArr(all); G.stock = all;
  if (all.length) G.logs.push('กองจั่วหมด — สับกองทิ้งเป็นกองจั่วใหม่');
}
function act(G, seat, a) {
  if (!G || G.over) return 'จบตาแล้ว';
  if (G.cur !== seat) return 'ยังไม่ถึงตาคุณ';
  const p = G.P[seat];
  if (a.t === 'draw' || a.t === 'take') {
    if (G.phase !== 'draw') return 'คุณหยิบไพ่ไปแล้วในตานี้';
    if (a.t === 'take') { if (!p.pile.length) return 'ยังไม่มีไพ่ในกองทิ้งหน้าคุณ'; const c = p.pile.pop(); p.h.push(c); G.logs.push(p.n + ' เก็บ ' + S.cn(c) + ' จากกองทิ้ง'); }
    else { if (!G.stock.length) refill(G); if (!G.stock.length) return 'ไม่มีไพ่ให้จั่ว'; p.h.push(G.stock.shift()); G.logs.push(p.n + ' จั่วไพ่'); }
    G.phase = 'discard'; return null;
  }
  if (G.phase !== 'discard') return 'ต้องจั่วหรือเก็บไพ่ก่อน';
  if (a.t === 'win') {
    const w = winKind(G, p.h); if (!w) return 'ไพ่ยังไม่ครบ 3 คู่';
    finish(G, seat, w); return null;
  }
  if (a.t === 'dis') {
    const i = p.h.findIndex(c => c.id === a.id); if (i < 0) return 'ไม่พบไพ่ใบนี้ในมือ';
    const c = p.h.splice(i, 1)[0], nx = (seat + 1) % G.P.length;
    G.P[nx].pile.push(c); G.phase = 'draw'; G.cur = nx; G.logs.push(p.n + ' ทิ้ง ' + S.cn(c));
    if (++G.turns >= MAX_TURNS) finish(G, null, null);
    return null;
  }
  return 'คำสั่งไม่ถูกต้อง';
}

function finish(G, seat, w) {
  G.over = true; G.phase = 'over';
  const cr = S.coinResult(G.P.length, G.stake);
  if (seat != null) {
    const m = w.kind === 'special' ? G.mult : 1;
    for (const p of G.P) if (p.i !== seat) cr.pay(p.i, seat, G.stake * m, w.kind === 'special' ? 'มือพิเศษ ' + w.name : 'ผสมสิบ 3 คู่');
  }
  const coin = cr.done(), W = wildFn(G);
  G.res = { k: seat, coin, title: seat == null ? 'เล่นนานเกินไป — เสมอ' : G.P[seat].n + ' ผสมสิบ!' + (w.kind === 'special' ? ' (' + w.name + ')' : ''),
    pairs: seat != null && w.kind === 'pairs' ? w.pairs.map(pr => pr.map(c => c.id)) : null,
    rows: G.P.map(p => ({ i: p.i, cards: seat === p.i ? p.h.map(c => c.id) : null, name: seat === p.i ? 'ชนะ' : '', win: seat === p.i })) };
  void W; G.logs.push(G.res.title);
}

// ===== บอท =====
function visibleCount(G, me, rank) { let n = 0; const add = c => { if (c && !c.joker && c.r === rank) n++; }; G.P.forEach(p => p.pile.forEach(add)); me.h.forEach(add); add(G.ind); return n; }
function score5(G, me, h) {                              // ยิ่งสูงยิ่งดี: จำนวนคู่ ×10 + โอกาสของใบที่ยังเหลือเดี่ยว
  const W = wildFn(G), mp = maxPairs(h, W);
  let pot = 0;
  if (mp < 2 || h.length < 5) pot = 0; else {
    const partner = r => (r <= 9 ? 10 - r : r);          // เลขที่ต้องมาจับคู่ (J/Q/K/10 จับกับเลขเดียวกัน)
    let best = 0; for (const c of h) { if (W(c)) { best = Math.max(best, 5); continue; } best = Math.max(best, 4 - visibleCount(G, me, partner(c.r))); }
    pot = best;
  }
  return mp * 10 + pot + (h.filter(W).length * 3);
}
function bestDiscard(G, me, h6) {
  let best = -1, pick = [];
  h6.forEach((c, i) => { const s = score5(G, me, h6.filter((_, k) => k !== i)); if (s > best) { best = s; pick = [c]; } else if (s === best) pick.push(c); });
  return { score: best, card: pick[S.rnd(pick.length)] };
}
function botTurn(G) {
  if (!G || G.over) return;
  const me = G.P[G.cur];
  if (G.phase === 'draw') {
    const top = me.pile[me.pile.length - 1];
    let take = false;
    if (top) { const h6 = me.h.concat([top]); take = !!winKind(G, h6) || bestDiscard(G, me, h6).score > score5(G, me, me.h); }
    return void act(G, G.cur, { t: take ? 'take' : 'draw' });
  }
  if (winKind(G, me.h)) return void act(G, G.cur, { t: 'win' });
  act(G, G.cur, { t: 'dis', id: bestDiscard(G, me, me.h).card.id });
}
function winner(G) { return G && G.over && G.res ? G.res.k : null; }

function view(G, seat) {
  const me = G.P[seat], w = G.cur === seat && G.phase === 'discard' && !G.over ? winKind(G, me.h) : null;
  return {
    v: G.v, gid: G.gid, rule: 'somsip', stake: G.stake, my: seat, cur: G.cur, phase: G.phase, over: G.over, res: G.res, logs: G.logs,
    hand: me.h.map(c => c.id), stock: G.stock.length, ind: G.ind ? G.ind.id : null, wildRank: G.indRank, wildOn: G.wildOn,
    canWin: !!w, winName: w ? (w.kind === 'special' ? w.name : '3 คู่') : null,
    wild: me.h.filter(wildFn(G)).map(c => c.id),
    P: G.P.map(p => S.pubP(p, { n_cards: p.h.length, pile: p.pile.map(c => c.id) })),
  };
}

module.exports = { newGame, act, botTurn, view, winner, canPair, pairing, winKind };
