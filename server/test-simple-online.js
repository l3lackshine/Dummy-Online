'use strict';
const assert=require('assert'), M=require('./test-mock-sio');
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const until=async(fn,ms=10000)=>{const t=Date.now();while(Date.now()-t<ms){if(fn())return;await sleep(10);}throw Error('timeout');};
function client(srv,name,rule,walletId){const c={name,joined:null,state:null,wallet:null,errors:[],sock:M.client(srv)};c.sock.on('room:joined',d=>c.joined=d);c.sock.on('game:state',s=>{c.state=s;if(!s.over&&s.cur===s.my){if(s.rule==='pokdeng')c.sock.emit('game:act',{t:'stand'});else if(s.rule==='oldmaid')c.sock.emit('game:act',{t:'draw'});}});c.sock.on('wallet:state',w=>c.wallet=w);c.sock.on('system:error',e=>c.errors.push(e));c.sock.emit('room:create',{name,rule,options:{stake:10},walletId});return c;}
(async()=>{
 const srv=M.load({BOT_DELAY_MS:2,EMPTY_ROOM_TTL_MS:30000,RATE_PER_SEC:1000});
 { const s=M.client(srv), id='d'.repeat(32); let state=null, results=[]; s.on('wallet:state',w=>state=w); s.on('wallet:spend-result',r=>results.push(r)); s.emit('wallet:open',{walletId:id,name:'shop-test'}); await until(()=>state); s.emit('wallet:spend',{amount:1,transactionId:'tx-price',itemId:'backs:midnight'}); await until(()=>results.length===1); assert.equal(results[0].ok,false,'server rejects a spoofed shop price'); s.emit('wallet:spend',{amount:200,transactionId:'tx-price',itemId:'backs:midnight'}); await until(()=>results.length===2); assert.equal(results[1].ok,true,'server accepts catalog price'); s.emit('wallet:spend',{amount:200,transactionId:'tx-price',itemId:'backs:midnight'}); await until(()=>results.length===3); assert.equal(results[2].duplicate,true,'shop retry cannot double-charge'); assert.equal(state.balance,4800,'shop balance is server authoritative'); console.log('  ✓ shop purchase validates server catalog price and is idempotent'); s.close(); }
 for(const rule of ['pokdeng','gaogae','oldmaid']){
   const id=({pokdeng:'a',gaogae:'b',oldmaid:'c'}[rule]).repeat(32), c=client(srv,rule,rule,id);
   await until(()=>c.joined&&c.wallet);const start=c.wallet.balance;
   c.sock.emit('game:shuffle');await until(()=>{const l=[...srv.sockets.sockets.values()].find(x=>x.id===c.sock.id);return l;});
   await until(()=>{const room=require.cache[require.resolve('./src/index.js')].exports.rooms.get(c.joined.code);return room&&room.deck;});
   c.sock.emit('game:start');await until(()=>c.state,5000);
   await until(()=>c.state&&c.state.over,15000);
   await until(()=>c.wallet&&c.wallet.balance!==start,5000).catch(()=>{});
   assert(c.state.res&&c.state.res.coin,'result must include server-calculated coin settlement: '+rule);
   assert(!c.errors.some(e=>/ชำระเหรียญไม่สำเร็จ/.test(e)),'settlement succeeds: '+rule);
   assert(c.wallet&&Number.isInteger(c.wallet.balance),'wallet state sent by server: '+rule);
   console.log('  ✓ '+rule+' completes online and settles through server wallet; balance '+start+' → '+c.wallet.balance);
   c.sock.close(); await sleep(20);
 }
 console.log('simple online tests passed');process.exit(0);
})().catch(e=>{console.error('simple online tests failed:',e.message);process.exit(1)});
