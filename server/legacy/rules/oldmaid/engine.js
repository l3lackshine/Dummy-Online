'use strict';
const crypto = require('crypto');
const C = require('../simple-cards');
const { meta } = require('./meta');
function discardPairs(p) {
  const groups = new Map(); p.h.forEach(c => { if(!groups.has(c.r))groups.set(c.r,[]); groups.get(c.r).push(c); });
  const gone = new Set(); for (const cards of groups.values()) for (let i=0;i+1<cards.length;i+=2) { gone.add(cards[i].id); gone.add(cards[i+1].id); }
  p.h = p.h.filter(c=>!gone.has(c.id)); return gone.size;
}
const active = G => G.P.filter(p=>p.h.length>0);
function nextSeat(G, from) { for(let step=1;step<=G.P.length;step++){const i=(from+step)%G.P.length;if(G.P[i].h.length>0)return i;}return from; }
function finish(G) {
  const holders=G.P.filter(p=>p.h.length>0), loser=holders[0]?.i ?? null;
  const winners=G.P.filter(p=>p.i!==loser).map(p=>p.i), scores=G.P.map(p=>p.h.length===1?-1:0), nt=G.P.map(p=>[p.i===loser?'ถือไพ่ใบสุดท้าย แพ้':'รอดจากไพ่ใบสุดท้าย']);
  const coin=C.settlePot(G,winners,loser);
  G.P.forEach((p,i)=>{p.pts=scores[i];});
  G.over=true;G.phase='over';G.res={k:loser,pts:scores,nt,coin,winners,loser,lastCard:loser==null?null:G.P[loser].h[0]?.id};G.logs.push(loser==null?'เกมจบแล้ว':G.P[loser].n+' เหลือไพ่ใบสุดท้าย');
}
function newGame(humans, opts={}) {
  const stake=Math.max(1,Math.floor(Number((opts.options||{}).stake)||20)), P=C.players(humans,2), deck=C.freshDeck(opts,[11]);
  let ix=0;while(deck.length){P[ix%P.length].h.push(deck.pop());ix++;} P.forEach(discardPairs);
  const G={rule:'oldmaid',P,stock:[],cur:0,phase:'draw',over:false,res:null,gid:crypto.randomBytes(8).toString('hex'),v:0,stake,logs:['แจกไพ่แล้ว ทุกคนทิ้งคู่ที่มี'],actions:['draw']};
  G.cur=P[0].h.length?0:nextSeat(G,P.length-1); if(G.P.reduce((n,p)=>n+p.h.length,0)<=1)finish(G); return G;
}
function draw(G,seat) {
  const p=G.P[seat], ti=nextSeat(G,seat), target=G.P[ti]; if(!target||!target.h.length)return 'ไม่มีผู้เล่นถัดไปให้จั่ว';
  const card=target.h.splice(C.randomIndex(target.h.length),1)[0]; p.h.push(card); const removed=discardPairs(p);
  G.logs.push(p.n+' จั่วไพ่จาก '+target.n+(removed?' และทิ้งคู่ '+removed+' ใบ':''));
  const remaining=G.P.reduce((n,q)=>n+q.h.length,0); if(remaining<=1){finish(G);return null;}
  G.cur=nextSeat(G,seat); return null;
}
function act(G,seat,a) { if(G.over)return 'เกมจบแล้ว';if(G.cur!==seat)return 'ยังไม่ใช่ตาของคุณ';if(a.t==='draw')return draw(G,seat);return 'คำสั่งไม่ถูกต้อง'; }
function botTurn(G) { if(!G.over)draw(G,G.cur); }
function view(G,seat) { const v=C.baseView(G,seat);v.actions=!G.over&&G.cur===seat?['draw']:[];v.next=G.over?null:G.P[nextSeat(G,G.cur)].i;return v; }
function winner(G) { return G&&G.over&&G.res?(G.res.winners[0] ?? null):null; }
module.exports={meta,newGame,act,botTurn,view,winner,discardPairs};
