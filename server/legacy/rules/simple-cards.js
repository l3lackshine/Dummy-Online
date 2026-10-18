'use strict';
const crypto = require('crypto');
const Shuffle = require('../shuffle');
const card = id => ({ id, r: id % 13 + 1, s: Math.floor(id / 13) });
const value = c => c.r === 1 ? 1 : c.r >= 10 ? 0 : c.r;
const total = hand => hand.reduce((n, c) => n + value(c), 0) % 10;
const pok = hand => hand.length >= 2 && hand.length === 2 && (total(hand) === 8 || total(hand) === 9) ? total(hand) : 0;
const freshDeck = (opts, exclude = []) => {
  const ids = Shuffle.isValidIds(opts && opts.deck) ? opts.deck.slice() : Shuffle.shuffle().ids;
  return ids.filter(id => !exclude.includes(id)).map(card);
};
const bots = ['น้องมี่', 'ลุงหัว', 'ป้าน็อก', 'ตาโอ', 'พี่เกิด'];
function players(humans, minPlayers) {
  const n = Math.max(minPlayers, humans.length);
  return Array.from({ length: n }, (_, i) => ({ i, id: humans[i] ? humans[i].id : null, n: humans[i] ? humans[i].n : bots[(i - humans.length) % bots.length], ch: humans[i]?.ch || null, bg: humans[i]?.bg || null, bot: !humans[i], h: [], pts: 0 }));
}
function baseView(G, seat) {
  return { v: G.v, gid: G.gid, rule: G.rule, stake: G.stake, my: seat, cur: G.cur, phase: G.over ? null : G.phase, over: G.over,
    hand: G.P[seat].h.map(c => c.id), stock: G.stock ? G.stock.length : 0, disc: [], melds: [], must: null, ok: [], logs: G.logs.slice(-30),
    P: G.P.map(p => ({ i: p.i, n: p.n, ch: p.ch, bg: p.bg, bot: p.bot, n_cards: p.h.length, pts: G.over ? p.pts : null, melded: false, dealer: p.dealer || false, stood: !!p.stood, active: p.h.length > 0 })),
    res: G.res ? JSON.parse(JSON.stringify(G.res)) : null, actions: G.over ? [] : (G.actions || []) };
}
function settlePot(G, winners, loser = null) {
  const n = G.P.length, stake = G.stake, pot = n * stake, delta = Array(n).fill(-stake), lines = [];
  if (!winners.length) return { stake, delta: Array(n).fill(0), lines };
  const each = Math.floor(pot / winners.length), extra = pot % winners.length;
  winners.forEach((i, ix) => { const payout = each + (ix < extra ? 1 : 0); delta[i] += payout; lines.push({ f: -1, t: i, a: payout, w: 'แบ่งกองกลาง' }); });
  if (loser != null) lines.push({ f: loser, t: -1, a: stake, w: 'แพ้เกม' });
  return { stake, pot, delta, lines };
}
function endGame(G, scores, descriptions, winners, loser = null) {
  G.over = true; G.phase = 'over'; G.P.forEach((p, i) => { p.pts = scores[i] ?? 0; });
  const coin = settlePot(G, winners, loser);
  G.res = { k: loser != null ? loser : (winners[0] ?? null), pts: scores.slice(), nt: descriptions.map(x => [x || '']), coin, winners: winners.slice(), loser };
  G.logs.push('เกมจบแล้ว');
}
const randomIndex = n => crypto.randomInt(n);
module.exports = { card, value, total, pok, freshDeck, players, baseView, settlePot, endGame, randomIndex };
