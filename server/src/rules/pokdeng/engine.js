// กติกาป๊อกเด้ง — เซิร์ฟเวอร์ตัดสินทั้งหมด (การนับเหรียญอยู่ท้ายไฟล์นี้ในฟังก์ชัน finish)
const S = require('../shared');
const { defaults } = require('./meta');

const val = c => (c.r >= 10 ? 0 : c.r);
const taemOf = cs => cs.reduce((a, c) => a + val(c), 0) % 10;
// 3 ใบเรียงกัน: เลขต่อเนื่อง (A-2-3 ได้) หรือ Q-K-A (ไม่วน K-A-2)
function isStraight(cs) {
  const r = cs.map(c => c.r).sort((a, b) => a - b);
  return (r[1] === r[0] + 1 && r[2] === r[1] + 1) || (r[0] === 1 && r[1] === 12 && r[2] === 13);
}
// ประเมินไพ่ในมือ: rank (ใหญ่ชนะ) 6 ป๊อก · 5 ตอง · 4 เรียงฟลัช · 3 เรียง · 2 สามเหลือง · 1 ธรรมดา
function evalHand(cs, straights) {
  const taem = taemOf(cs), same = f => cs.every(c => f(c) === f(cs[0]));
  if (cs.length === 2) {
    const deng = same(c => c.s) || same(c => c.r) ? 2 : 1;
    if (taem >= 8) return { type: 'pok', rank: 6, taem, deng, name: 'ป๊อก ' + taem + (deng === 2 ? ' สองเด้ง' : '') };
    return { type: 'normal', rank: 1, taem, deng, name: taem + ' แต้ม' + (deng === 2 ? ' สองเด้ง' : '') };
  }
  if (same(c => c.r)) return { type: 'tong', rank: 5, taem, deng: 5, name: 'ตอง' };
  const st = straights && isStraight(cs), fl = same(c => c.s);
  if (st && fl) return { type: 'sflush', rank: 4, taem, deng: 5, name: 'เรียงฟลัช' };
  if (st) return { type: 'straight', rank: 3, taem, deng: 3, name: 'เรียง' };
  if (cs.every(c => c.r >= 11)) return { type: 'sam', rank: 2, taem: 0, deng: 3, name: 'สามเหลือง' };
  const deng = fl ? 3 : 1;
  return { type: 'normal', rank: 1, taem, deng, name: taem + ' แต้ม' + (fl ? ' สามเด้ง' : '') };
}
// เทียบมือผู้เล่น (p) กับเจ้ามือ (d) → { w:'p'|'d'|'tie', mult }
function compare(p, d, tie) {
  const special = h => h.rank >= 2 && h.rank <= 5;
  const out = (pw, W, L, mult) => ({ w: pw ? 'p' : 'd', mult: mult == null ? W.deng : mult, W, L });
  if (p.rank !== d.rank) {
    const pw = p.rank > d.rank, W = pw ? p : d, L = pw ? d : p;
    return out(pw, W, L, special(W) && special(L) ? Math.max(1, W.deng - L.deng) : W.deng);
  }
  if (p.taem !== d.taem) { const pw = p.taem > d.taem; return out(pw, pw ? p : d, pw ? d : p); }
  if (tie !== 'push' && p.deng !== d.deng) { const pw = p.deng > d.deng; return out(pw, pw ? p : d, pw ? d : p, Math.abs(p.deng - d.deng)); }
  return { w: 'tie', mult: 0 };
}

function newGame(humans, opts) {
  const o = Object.assign(defaults(), opts && opts.options), stake = S.num(o.stake, defaults().stake, 1, 1e6);
  const total = Math.max(4, humans.length), deck = S.deckOf(opts);
  const P = S.makePlayers(humans, total, () => ({ h: [], revealed: false }));
  const dealer = o.dealer === 'host' ? 0 : S.rnd(total);
  const G = { rule: 'pokdeng', P, stock: deck, dealer, cur: dealer, phase: 'player', queue: [], over: false, res: null, gid: S.gid(), v: 0, stake,
    straights: o.straights !== 'off', tie: o.tieRule === 'push' ? 'push' : 'deng', logs: [] };
  for (let r = 0; r < 2; r++) for (let k = 1; k <= total; k++) P[(dealer + k) % total].h.push(G.stock.shift());
  G.logs.push('เจ้ามือคือ ' + P[dealer].n + ' — แจกไพ่คนละ 2 ใบ');
  for (const p of P) { const e = evalHand(p.h, G.straights); if (e.type === 'pok') { p.revealed = true; G.logs.push(p.n + ' ' + e.name + '!'); } }
  if (P[dealer].revealed) { G.logs.push('เจ้ามือป๊อก เปิดเทียบทุกคนทันที'); finish(G); return G; }
  for (let k = 1; k < total; k++) { const s = (dealer + k) % total; if (!P[s].revealed) G.queue.push(s); }
  if (G.queue.length) { G.cur = G.queue[0]; G.phase = 'player'; } else { G.cur = dealer; G.phase = 'dealer'; G.logs.push('ถึงตาเจ้ามือ'); }
  return G;
}

function finish(G) {
  G.over = true; G.phase = 'over';
  const ev = G.P.map(p => evalHand(p.h, G.straights)), dl = ev[G.dealer], cr = S.coinResult(G.P.length, G.stake), rows = [];
  for (const p of G.P) {
    const e = ev[p.i], row = { i: p.i, cards: p.h.map(c => c.id), name: e.name, taem: e.taem, deng: e.deng, dealer: p.i === G.dealer, result: 'dealer', mult: 0 };
    if (p.i !== G.dealer) {
      const r = compare(e, dl, G.tie);
      row.result = r.w === 'p' ? 'win' : r.w === 'd' ? 'lose' : 'tie'; row.mult = r.mult;
      const why = r.w === 'tie' ? '' : e.name + ' vs เจ้ามือ ' + dl.name + ' (' + r.mult + ' เท่า)';
      if (r.w === 'p') cr.pay(G.dealer, p.i, G.stake * r.mult, why); else if (r.w === 'd') cr.pay(p.i, G.dealer, G.stake * r.mult, why);
    }
    rows.push(row);
  }
  const coin = cr.done();
  G.res = { k: null, title: 'เจ้ามือ ' + G.P[G.dealer].n + ' — ' + dl.name, rows, coin };
  const m = Math.max(...coin.delta); G.res.k = m > 0 ? coin.delta.indexOf(m) : null;
  G.logs.push('จบตา — เปิดไพ่เทียบเจ้ามือ');
}

function act(G, seat, a) {
  if (!G || G.over) return 'จบตาแล้ว';
  if (G.cur !== seat) return 'ยังไม่ถึงตาคุณ';
  const p = G.P[seat];
  if (a.t === 'draw') {
    if (p.h.length >= 3) return 'จั่วได้ไม่เกิน 1 ใบ';
    p.h.push(G.stock.shift()); G.logs.push(p.n + ' จั่วเพิ่ม 1 ใบ');
  } else if (a.t === 'stay') G.logs.push(p.n + ' ไม่จั่ว');
  else return 'คำสั่งไม่ถูกต้อง';
  if (G.phase === 'player') {
    G.queue.shift();
    if (G.queue.length) G.cur = G.queue[0]; else { G.cur = G.dealer; G.phase = 'dealer'; G.logs.push('ถึงตาเจ้ามือ'); }
  } else finish(G);
  return null;
}

function botTurn(G) {
  if (!G || G.over) return;
  const p = G.P[G.cur], e = evalHand(p.h, G.straights);
  let draw = false;
  if (p.h.length < 3) draw = G.cur === G.dealer ? e.taem <= 3 : e.taem <= 4 || (e.taem === 5 && e.deng < 2 && S.rnd(2) === 0);
  act(G, G.cur, { t: draw ? 'draw' : 'stay' });
}

function winner(G) { return G && G.over ? S.topWinner(G) : null; }

function view(G, seat) {
  const me = G.P[seat], e = evalHand(me.h, G.straights);
  return {
    v: G.v, gid: G.gid, rule: 'pokdeng', stake: G.stake, my: seat, cur: G.cur, phase: G.phase, over: G.over, res: G.res, logs: G.logs,
    dealer: G.dealer, queue: G.queue.slice(), canDraw: !G.over && G.cur === seat && me.h.length < 3,
    hand: me.h.map(c => c.id), mine: { name: e.name, taem: e.taem, deng: e.deng, type: e.type },
    stock: G.stock.length,
    P: G.P.map(p => S.pubP(p, { n_cards: p.h.length, cards: G.over || p.revealed ? p.h.map(c => c.id) : null, pok: p.revealed })),
  };
}

module.exports = { newGame, act, botTurn, view, winner, evalHand, compare };
