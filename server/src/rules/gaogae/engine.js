'use strict';
const crypto = require('crypto');
const C = require('../simple-cards');
const { meta } = require('./meta');
const rankValue = c => c.r === 1 ? 1 : c.r >= 10 ? 0 : c.r;
function evaluate(h) {
  const ranks = h.map(c => c.r).sort((a,b)=>a-b), suits = h.map(c=>c.s), vals = h.map(rankValue), points = vals.reduce((a,b)=>a+b,0)%10;
  const counts = new Map(); h.forEach(c=>counts.set(c.r,(counts.get(c.r)||0)+1));
  const tong = counts.size === 1;
  const flush = new Set(suits).size === 1;
  const seq = (() => { const r = [...ranks].sort((a,b)=>a-b); return r[1] === r[0]+1 && r[2] === r[1]+1 || (r.join(',') === '1,12,13'); })();
  const seian = h.every(c=>c.r>=11 && c.r<=13);
  let category = points === 0 ? 0 : 1, label = points === 0 ? 'ไพ่ตาย' : 'แต้ม';
  if (tong) { category=6; label='ตอง'; }
  else if (flush && seq) { category=5; label='เรียงดอกเดียวกัน'; }
  else if (seq) { category=4; label='เรียง'; }
  else if (seian) { category=3; label='เซียน'; }
  else if (flush) { category=2; label='ฟลัช'; }
  const high = [...h].map(c=>c.r===1?14:c.r).sort((a,b)=>b-a);
  return { category, label, points, tie: high };
}
function compare(a,b) { if(a.category!==b.category)return a.category-b.category; if(a.points!==b.points)return a.points-b.points; for(let i=0;i<Math.max(a.tie.length,b.tie.length);i++) if((a.tie[i]||0)!==(b.tie[i]||0)) return (a.tie[i]||0)-(b.tie[i]||0); return 0; }
function newGame(humans, opts = {}) {
  const stake = Math.max(1, Math.floor(Number((opts.options||{}).stake)||20)), P = C.players(humans,2), deck = C.freshDeck(opts);
  P.forEach(p => { p.h = [deck.pop(),deck.pop(),deck.pop()]; p.rank = evaluate(p.h); p.pts = p.rank.points; });
  const scores = P.map(p=>p.rank.points), best = P.reduce((a,p)=>!a||compare(p.rank,a.rank)>0?p:a,null).rank;
  const winners = P.filter(p=>compare(p.rank,best)===0).map(p=>p.i);
  const coin = C.settlePot({P,stake}, winners);
  const G = { rule:'gaogae', P, stock:deck, cur:0, phase:'over', over:true, gid:crypto.randomBytes(8).toString('hex'), v:1, stake, logs:['แจกไพ่เก้าเกครบแล้ว'], res:{ k:winners[0], pts:scores, nt:P.map(p=>[p.rank.label+' '+p.rank.points+' แต้ม']), coin, winners, ranks:P.map(p=>({category:p.rank.category,label:p.rank.label,points:p.rank.points})) }, actions:[] };
  return G;
}
function act() { return 'เกมนี้เปิดไพ่เทียบผลทันที ไม่ต้องส่งคำสั่งเพิ่ม'; }
function botTurn() {}
function view(G, seat) { const v=C.baseView(G,seat); v.ranks=G.res.ranks; v.winners=G.res.winners; return v; }
function winner(G) { return G && G.over && G.res ? G.res.k : null; }
module.exports = { meta, newGame, act, botTurn, view, winner, evaluate, compare };
