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
function compare(a,b) {
  if(a.category!==b.category)return a.category-b.category;
  if(a.points!==b.points)return a.points-b.points;
  for(let i=0;i<Math.max(a.tie.length,b.tie.length);i++) if((a.tie[i]||0)!==(b.tie[i]||0)) return (a.tie[i]||0)-(b.tie[i]||0);
  return 0;
}
function finish(G) {
  const contenders = G.P.filter(p => p.choice !== 'fold');
  let winners = [];
  if (contenders.length) {
    let best = contenders[0].rank;
    for (const p of contenders) if (compare(p.rank, best) > 0) best = p.rank;
    winners = contenders.filter(p => compare(p.rank, best) === 0).map(p => p.i);
  }
  const coin = C.settlePot(G, winners);
  const scores = G.P.map(p=>p.rank.points);
  const nt = G.P.map(p => [p.choice === 'fold' ? 'หมอบ ไม่ร่วมชิงกองกลาง' : (winners.includes(p.i) ? 'ชนะ/เสมออันดับสูงสุด' : p.rank.label+' '+p.rank.points+' แต้ม')]);
  G.P.forEach(p => { p.pts = p.rank.points; });
  G.over = true; G.phase = 'over';
  G.res = { k: winners[0] ?? null, pts: scores, nt, coin, winners, ranks: G.P.map(p=>({category:p.rank.category,label:p.rank.label,points:p.rank.points,folded:p.choice==='fold'})) };
  G.logs.push('ทุกคนตัดสินใจแล้ว เปิดไพ่และแบ่งกองกลาง');
}
function newGame(humans, opts = {}) {
  const stake = Math.max(1, Math.floor(Number((opts.options||{}).stake)||20)), P = C.players(humans,2), deck = C.freshDeck(opts);
  P.forEach(p => { p.h = [deck.pop(),deck.pop(),deck.pop()]; p.rank = evaluate(p.h); p.pts = p.rank.points; p.choice = null; p.stood = false; });
  const G = { rule:'gaogae', P, stock:deck, cur:0, phase:'decision', over:false, gid:crypto.randomBytes(8).toString('hex'), v:1, stake, logs:['แจกไพ่เก้าเกครบแล้ว เลือกสู้หรือหมอบ'], res:null, actions:['fight','fold'] };
  return G;
}
function act(G, seat, a) {
  if (G.over) return 'เกมจบแล้ว';
  if (G.cur !== seat) return 'ยังไม่ใช่ตาของคุณ';
  const p = G.P[seat];
  if (p.choice) return 'คุณตัดสินใจไปแล้ว';
  if (!a || !['fight','fold'].includes(a.t)) return 'กรุณาเลือกสู้หรือหมอบ';
  // ถ้าเหลือผู้เล่นที่ยังไม่ตัดสินใจคนสุดท้าย ให้เขาเลือกได้ตามปกติ
  if (a.t === 'fold' && G.P.every(q => q === p || q.choice === 'fold')) return 'คุณเป็นคนสุดท้ายที่ยังไม่ตัดสินใจ ต้องเลือกสู้เพื่อให้เกมมีผล';
  p.choice = a.t; p.stood = true;
  G.logs.push(p.n + (a.t === 'fight' ? ' เลือกสู้' : ' เลือกหมอบ'));
  if (G.P.every(q => q.choice)) { finish(G); return null; }
  for (let step=1; step<=G.P.length; step++) {
    const next=(seat+step)%G.P.length;
    if (!G.P[next].choice) { G.cur=next; break; }
  }
  return null;
}
function botTurn(G) {
  if (!G || G.over) return;
  const p = G.P[G.cur];
  if (p && p.bot) act(G, p.i, { t:'fight' });
}
function view(G, seat) {
  const v=C.baseView(G,seat);
  v.actions=!G.over && G.cur===seat && !G.P[seat].choice ? ['fight','fold'] : [];
  v.ranks=G.over ? G.res.ranks : null;
  v.winners=G.over ? G.res.winners : null;
  v.P=v.P.map((p,i)=>({...p,stood:!!G.P[i].choice,choice:G.P[i].choice}));
  return v;
}
function winner(G) { return G && G.over && G.res ? G.res.k : null; }
module.exports = { meta, newGame, act, botTurn, view, winner, evaluate, compare };
