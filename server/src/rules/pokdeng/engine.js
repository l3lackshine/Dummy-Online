'use strict';
const crypto = require('crypto');
const C = require('../simple-cards');
const { meta } = require('./meta');
function newGame(humans, opts = {}) {
  const options = opts.options || {}, stake = Math.max(1, Math.floor(Number(options.stake) || 20));
  const P = C.players(humans, 2), deck = C.freshDeck(opts); P.forEach(p => { p.h = [deck.pop(), deck.pop()]; p.stood = C.pok(p.h) > 0; p.dealer = p.i === 0; });
  const G = { rule: 'pokdeng', P, stock: deck, cur: 0, phase: 'play', over: false, res: null, gid: crypto.randomBytes(8).toString('hex'), v: 0, stake, logs: ['เจ้ามือคือ ' + P[0].n], actions: ['hit', 'stand'] };
  advance(G); return G;
}
function advance(G) {
  let tries = 0;
  while (tries++ < G.P.length && G.P[G.cur].stood) G.cur = (G.cur + 1) % G.P.length;
  if (G.P.every(p => p.stood)) finish(G);
}
function finish(G) {
  const dealer = G.P[0], scores = G.P.map(p => C.total(p.h)), rank = G.P.map(p => C.pok(p.h) || scores[p.i]);
  const delta = Array(G.P.length).fill(0), lines = [], nt = G.P.map(() => []);
  for (let i = 1; i < G.P.length; i++) {
    const a = C.pok(G.P[i].h), b = C.pok(dealer.h); let cmp;
    if (a || b) { const ar = a ? (a === 9 ? 2 : 1) : 0, br = b ? (b === 9 ? 2 : 1) : 0; cmp = Math.sign(ar - br); }
    else cmp = Math.sign(scores[i] - scores[0]);
    if (cmp > 0) { delta[i] += G.stake; delta[0] -= G.stake; lines.push({ f: 0, t: i, a: G.stake, w: 'ผู้เล่นชนะเจ้ามือ' }); nt[i].push('ชนะเจ้ามือ'); }
    else if (cmp < 0) { delta[i] -= G.stake; delta[0] += G.stake; lines.push({ f: i, t: 0, a: G.stake, w: 'แพ้เจ้ามือ' }); nt[i].push('แพ้เจ้ามือ'); }
    else nt[i].push('เสมอ');
  }
  G.P.forEach((p, i) => { p.pts = scores[i]; });
  G.over = true; G.phase = 'over';
  const winner = delta.indexOf(Math.max(...delta));
  G.res = { k: winner, pts: scores, nt, coin: { stake: G.stake, delta, lines }, ranks: G.P.map(p => ({ pok: C.pok(p.h), total: C.total(p.h) })) };
  G.logs.push('เทียบไพ่เสร็จแล้ว');
}
function act(G, seat, a) {
  if (G.over) return 'เกมจบแล้ว'; if (G.cur !== seat) return 'ยังไม่ใช่ตาของคุณ';
  const p = G.P[seat];
  if (a.t === 'stand') { p.stood = true; G.logs.push(p.n + ' อยู่'); G.cur = (G.cur + 1) % G.P.length; advance(G); return null; }
  if (a.t === 'hit') { if (p.stood) return 'ผู้เล่นนี้หยุดจั่วแล้ว'; if (C.pok(p.h)) return 'ได้ป๊อกแล้ว จั่วเพิ่มไม่ได้'; if (p.h.length >= 3) return 'จั่วได้สูงสุด 1 ใบเพิ่ม'; if (!G.stock.length) return 'ไพ่หมด'; p.h.push(G.stock.pop()); p.stood = true; G.logs.push(p.n + ' จั่วเพิ่ม 1 ใบ'); G.cur = (G.cur + 1) % G.P.length; advance(G); return null; }
  return 'คำสั่งไม่ถูกต้อง';
}
function botTurn(G) { const p = G.P[G.cur]; if (!p || G.over) return; const v = C.total(p.h); act(G, p.i, (!C.pok(p.h) && p.h.length < 3 && v < 5 && G.stock.length) ? { t: 'hit' } : { t: 'stand' }); }
function view(G, seat) { const v = C.baseView(G, seat); v.actions = !G.over && G.cur === seat ? (C.pok(G.P[seat].h) ? ['stand'] : ['hit', 'stand']) : []; v.dealer = 0; v.ranks = G.over ? G.res.ranks : null; return v; }
function winner(G) { return G && G.over && G.res ? G.res.k : null; }
module.exports = { meta, newGame, act, botTurn, view, winner };
