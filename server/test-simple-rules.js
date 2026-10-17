'use strict';
const assert = require('assert');
const Rules = require('./src/rules');
const P = (n) => ({ id: 'id-' + n, n: 'P' + n });
const humans = [P(0),P(1),P(2),P(3),P(4),P(5)];
function ok(v, m) { assert(v, m); console.log('  ✓ ' + m); }

console.log('\n[Simple rules] registry and player counts');
for (const id of ['pokdeng','gaogae','oldmaid']) {
  const R=Rules.get(id), G=R.newGame(humans,{options:{stake:10}});
  ok(G.P.length===6 && G.P.every(p=>p.h.length>0), id+' รองรับผู้เล่น 6 คนและแจกไพ่');
  const view=R.view(G,0);
  ok(view.P.every(p=>!Object.prototype.hasOwnProperty.call(p,'h')),'view '+id+' ไม่ส่งไพ่ในมือคนอื่น');
}
console.log('\n[Pok Deng] basic turn and settlement');
{
 const R=Rules.get('pokdeng'), G=R.newGame([P(0),P(1),P(2)],{options:{stake:10}}); let turns=0;
 while(!G.over && turns++<20){const i=G.cur; const result=R.act(G,i,{t:'stand'});assert.equal(result,null);G.v++;}
 ok(G.over && G.res.coin.delta.reduce((a,b)=>a+b,0)===0,'ป๊อกเด้งจบได้และยอดเหรียญรวมเป็นศูนย์');
 ok(G.res.coin.delta.length===3,'ป๊อกเด้งคำนวณผลให้ทุกที่นั่ง');
}
console.log('\n[Gao Gae] pot distribution and rank evaluation');
{
 const R=Rules.get('gaogae'), G=R.newGame([P(0),P(1),P(2),P(3)],{options:{stake:25}});
 ok(!G.over && G.phase==='decision' && R.view(G,0).actions.includes('fight') && R.view(G,0).actions.includes('fold'),'เก้าเกเริ่มด้วยช่วงให้ผู้เล่นตัดสินใจสู้หรือหมอบ');
 let turns=0; while(!G.over && turns++<10) { const i=G.cur; assert.equal(R.act(G,i,{t:'fight'}),null); }
 ok(G.over && G.res.coin.delta.reduce((a,b)=>a+b,0)===0,'เก้าเกเปิดผลหลังผู้เล่นทุกคนตัดสินใจ และยอดเหรียญรวมเป็นศูนย์');
 ok(G.res.coin.delta.length===4 && G.res.ranks.length===4,'เก้าเกส่งอันดับครบทุกคน');
 const E=R.evaluate;
 const card=(r,s)=>({id:(s*13)+(r-1),r,s});
 ok(E([card(4,0),card(4,1),card(4,2)]).category===6,'ตองได้อันดับสูงสุดในตารางมาตรฐาน');
 ok(E([card(2,0),card(3,0),card(4,0)]).category===5,'เรียงดอกเดียวกันสูงกว่าเรียงธรรมดา');
}
console.log('\n[Old Maid] no hidden cards and finite end');
{
 const R=Rules.get('oldmaid'), G=R.newGame([P(0),P(1),P(2)],{options:{stake:10}});
 ok(G.P.reduce((n,p)=>n+p.h.length,0)<=51,'อีแก่ใช้สำรับ 51 ใบ');
 ok(!G.P.some(p=>p.h.some(c=>c.id===11)),'อีแก่ตัด Q♠ ออก');
 let turns=0; while(!G.over&&turns++<3000){R.botTurn(G);G.v++;}
 ok(G.over && turns<3000,'อีแก่จบได้ ไม่วนไม่สิ้นสุด');
 ok(G.res.lastCard!=null && G.res.coin.delta.reduce((a,b)=>a+b,0)===0,'ผู้ถือไพ่ใบสุดท้ายแพ้ และกองกลางแจกครบ');
 ok(R.view(G,0).P.every(p=>!Object.prototype.hasOwnProperty.call(p,'h')),'อีแก่ไม่เปิดมือคู่แข่ง');
}
console.log('\n[Korat] guardrail');
{
 const R=Rules.get('korat'); ok(R.meta.enabled===false,'สมสิบโคราชถูกปิดไว้จนกว่ายืนยันกติกาท้องถิ่น');
 assert.throws(()=>R.newGame([P(0),P(1)],{}),/ยังไม่เปิดให้เล่น/); ok(true,'สมสิบโคราชไม่ใช้กติกาที่เดาขึ้นเอง');
}
console.log('simple rule tests passed');
