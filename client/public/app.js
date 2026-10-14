
(() => {
  const $ = s => document.querySelector(s);
  const app = $('#app');
  const config = window.DUMMY_CONFIG || {BACKEND_URL:'http://localhost:3000'};
  const state = {socket:null, name:localStorage.getItem('dummyName')||'', code:'', room:null, hand:[], selected:new Set(), tab:'play', isHost:false,
    coins:Number(localStorage.getItem('dummyCoins')||'5000'), gems:Number(localStorage.getItem('dummyGems')||'20'),
    owned:JSON.parse(localStorage.getItem('dummyOwned')||'["classic"]'), skin:localStorage.getItem('dummySkin')||'classic', message:'',error:'',solo:false,soloDeck:[],soloDiscard:[],soloTurn:0,soloHasDrawn:false,soloPlayers:[],discardIndex:null,discardModal:false,pendingDiscardPick:false,pendingHandCount:0,soloMustMeldCards:[],soloMelds:[],melds:[],settings:{spetoPoints:50,previousDiscardPoints:30,coinPerPoint:1}};
  const skins=[
    {id:'classic',name:'คลาสสิก',price:0,kind:'classic',currency:'coin',desc:'ลายมาตรฐาน ฟรี'},
    {id:'gold',name:'ทองคำ',price:2500,kind:'gold',currency:'coin',desc:'ขอบทองสุดหรู'},
    {id:'candy',name:'ลูกกวาด',price:150,currency:'gem',kind:'candy',desc:'สีรุ้งสดใส'},
    {id:'forest',name:'ป่ามหัศจรรย์',price:4000,currency:'coin',kind:'forest',desc:'สีเขียวมรกต'},
    {id:'flame',name:'เปลวไฟ',price:250,currency:'gem',kind:'flame',desc:'สีร้อนแรง'},
    {id:'bunny',name:'กระต่ายน้อย',price:300,currency:'gem',kind:'bunny',desc:'พาสเทลน่ารัก'}
  ];
  function saveWallet(){localStorage.setItem('dummyCoins',state.coins);localStorage.setItem('dummyGems',state.gems);localStorage.setItem('dummyOwned',JSON.stringify(state.owned));localStorage.setItem('dummySkin',state.skin)}
  function esc(s){return String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
  function validMeld(cards){if(!Array.isArray(cards)||cards.length<3)return false;const suits=new Set(cards.map(c=>c.suit)),ranks=cards.map(c=>c.rank);if(ranks.every(r=>r===ranks[0]))return suits.size===cards.length; if(suits.size!==1)return false;const order=['A','2','3','4','5','6','7','8','9','10','J','Q','K'];const indexes=ranks.map(r=>order.indexOf(r)).sort((a,b)=>a-b);return indexes.every((v,i)=>i===0||v===indexes[i-1]+1)}
  function connect(){
    if(state.socket) return;
    if(!window.io){state.error='โหลด Socket.IO ไม่สำเร็จ ตรวจสอบอินเทอร์เน็ต';render();return}
    state.socket=io(config.BACKEND_URL,{transports:['websocket','polling']});
    state.socket.on('connect',()=>{state.error='';render()});
    state.socket.on('connect_error',()=>{state.error='เชื่อมต่อเซิร์ฟเวอร์ไม่ได้ โปรดเปิด backend ที่ '+config.BACKEND_URL;render()});
    state.socket.on('system:notice',m=>{state.message=m;state.error='';render()});
    state.socket.on('system:error',m=>{state.pendingDiscardPick=false;state.error=m;render()});
    state.socket.on('room:joined',d=>{state.code=d.code;state.isHost=d.isHost;state.tab='play';render()});
    state.socket.on('room:update',room=>{state.room=room;if(room.melds)state.melds=room.melds;render()});
    state.socket.on('game:hand',hand=>{state.hand=hand;state.selected.clear();if(state.pendingDiscardPick){const count=Math.max(0,hand.length-state.pendingHandCount);state.pendingDiscardPick=false;state.discardModal=false;state.discardIndex=null;state.message=`หยิบไพ่เข้ามือแล้ว ${count} ใบ`;state.error='';}render()});
    state.socket.on('game:melds',melds=>{state.melds=melds;if(state.room)state.room.melds=melds;render()});
  }
  function header(){return `<header class="topbar"><div class="brand">🃏 ดัมมี่<span>ออนไลน์</span> <small style="font-size:13px;color:#fff">สูงสุด 4 คน</small></div><div class="wallet"><span class="pill">🪙 ${state.coins.toLocaleString()}</span><span class="pill">💎 ${state.gems}</span><button class="smallbtn" data-tab="shop">🛍️ Shop</button></div></header><nav class="tabs">${[['play','🎮 เล่นเกม'],['rooms','🌐 ห้องออนไลน์'],['shop','🛍️ ร้านสกิน'],['profile','👤 โปรไฟล์']].map(([id,label])=>`<button class="tab ${state.tab===id?'active':''}" data-tab="${id}">${label}</button>`).join('')}</nav>`}
  function render(){
    if(!app)return;
    let content='';
    if(state.tab==='shop') content=shop();
    else if(state.tab==='rooms') content=rooms();
    else if(state.tab==='profile') content=profile();
    else content=play();
    app.innerHTML=`<div class="wrap">${header()}${state.error?`<div class="notice error">⚠️ ${esc(state.error)}</div>`:''}${state.message?`<div class="notice">${esc(state.message)}</div>`:''}${content}<div class="footer">ต้นแบบเกมเพื่อความบันเทิง • ไม่มีการเดิมพันหรือถอนเงินจริง • ระบบเหรียญในหน้านี้เป็นเดโม</div></div>`;
    app.querySelectorAll('[data-tab]').forEach(b=>b.addEventListener('click',()=>{state.tab=b.dataset.tab;render()}));
    bind();
  }
  function play(){
    if(!state.room) return `<section class="grid"><div class="panel"><h2 class="section-title">🌈 เล่นดัมมี่กับเพื่อน</h2><p class="muted">สร้างห้องส่วนตัว หรือเข้าห้องด้วยรหัสเพื่อเล่นกับผู้เล่นจริง สูงสุด 4 คนต่อห้อง</p><label class="muted">ชื่อในเกม</label><input id="playerName" class="field" maxlength="18" placeholder="ตั้งชื่อเล่น" value="${esc(state.name)}"><div class="formrow"><button id="soloGame" class="green">🤖 เล่นคนเดียวกับบอท</button><button id="createRoom">✨ สร้างห้องออนไลน์</button><button class="secondary" data-tab="rooms">🔎 เข้าห้อง</button></div><div class="asset-note">🟢 สถานะเซิร์ฟเวอร์: ${state.socket?.connected?'เชื่อมต่อแล้ว':'กำลังเชื่อมต่อ/ยังไม่พร้อม'}<br>ออนไลน์เล่นได้ 2–4 คน • เล่นคนเดียวกับบอทได้</div></div><div class="panel"><h2 class="section-title">🎁 รางวัลรายวัน</h2><p class="muted">รับเหรียญฟรีวันละครั้งเพื่อสะสมสกิน</p><button id="dailyReward" class="green">รับเหรียญฟรี +500 🪙</button><div style="height:12px"></div><h3>สกินที่ใช้อยู่</h3>${skinPreview(state.skin)}<p class="muted">เปลี่ยนลายไพ่ได้ในร้านค้า</p><button class="secondary" data-tab="shop">ไปที่ร้านสกิน</button></div></section>`;
    const room=state.room;
    const players=room.players.map((p,i)=>`<div class="player ${room.started&&room.currentPlayer===i?'active':''}"><div>🎭 ${esc(p.name)}</div><div class="muted">${p.cardCount} ใบ ${p.connected?'🟢':'⚪'}</div></div>`).join('');
    const cards=state.hand.map(c=>`<div class="playing-card ${['♥','♦'].includes(c.suit)?'red':''} ${state.selected.has(c.id)?'selected':''}" data-card="${esc(c.id)}"><span class="small">${c.rank}${c.suit}</span><span class="big">${c.suit}</span><span class="small" style="align-self:flex-end;transform:rotate(180deg)">${c.rank}${c.suit}</span></div>`).join('');
    const pileCards=(room.discardPile||[]).map((c,i)=>`<div role="button" tabindex="0" aria-label="เลือก ${c.rank}${c.suit}${i===room.discardPile.length-1?' ไพ่ใบบนสุด':''}" class="playing-card pile-pick-card ${['♥','♦'].includes(c.suit)?'red':''} ${state.discardIndex===i?'selected':''}" data-discard-index="${i}"><span class="small">${c.rank}${c.suit}</span><span class="big">${c.suit}</span><span class="small" style="align-self:flex-end;transform:rotate(180deg)">${c.rank}${c.suit}</span>${i===room.discardPile.length-1?'<span class="pile-top-tag">บนสุด</span>':''}</div>`).join('');
    const discard=room.discard?`<div role="button" tabindex="0" id="discardPileOpen" class="discard-pile-trigger" aria-label="เปิดรายการไพ่กองทิ้ง"><div class="discard ${['♥','♦'].includes(room.discard.suit)?'red':''}"><span>${room.discard.rank}${room.discard.suit}</span></div><span class="pile-count">${(room.discardPile||[]).length} ใบ · แตะเพื่อดูไพ่</span></div>`:'<div role="button" tabindex="0" id="discardPileOpen" class="discard-pile-trigger"><div class="discard">—</div><span class="pile-count">กองทิ้งว่าง</span></div>';
    const shownMelds=room.melds||state.melds||[];
    const meldArea=shownMelds.length?`<section class="meld-area"><h3>🀄 ชุดไพ่ที่เกิดแล้ว</h3><div class="meld-groups">${shownMelds.map(m=>`<div class="meld-group"><div class="muted">${esc(m.playerName||'ผู้เล่น')}</div><div class="meld-cards">${(m.cards||[]).map(c=>`<div class="playing-card meld-card ${['♥','♦'].includes(c.suit)?'red':''}"><span class="small">${c.rank}${c.suit}</span><span class="big">${c.suit}</span></div>`).join('')}</div></div>`).join('')}</div></section>`:`<section class="meld-area"><h3>🀄 ชุดไพ่ที่เกิดแล้ว</h3><p class="muted">ยังไม่มีชุดไพ่ที่ลง</p></section>`;
    const mustMeldCount=state.solo?state.soloMustMeldCards.length:(room.mustMeldCount||0);
    const mustMeldNotice=mustMeldCount?`<div class="notice error">⚠️ คุณหยิบไพ่จากกองทิ้งหลายใบ ต้องนำไพ่ที่หยิบมาเกิดให้ครบก่อนทิ้งไพ่ (${mustMeldCount} ใบที่ยังไม่เกิด)</div>`:'';
    const discardModal=state.discardModal?`<div class="modal-backdrop" id="discardModalBackdrop"><section class="discard-modal" role="dialog" aria-modal="true" aria-label="ไพ่ในกองทิ้ง"><div class="row modal-heading"><div><h3>🃏 ไพ่ในกองทิ้ง (${(room.discardPile||[]).length} ใบ)</h3><p class="muted">แตะไพ่ที่ต้องการหยิบ ไพ่ใบนั้นและไพ่ที่อยู่ด้านบนจะเข้ามือทั้งหมด</p></div><button class="ghost smallbtn" id="closeDiscardModal">ปิด</button></div><div class="discard-modal-cards">${pileCards||'<span class="muted">ไม่มีไพ่ในกองทิ้ง</span>'}</div><div class="muted">${Number.isInteger(state.discardIndex)?`เลือก ${room.discardPile.length-state.discardIndex} ใบ ตั้งแต่ไพ่ลำดับ ${state.discardIndex+1} ถึงใบบนสุด`:'เลือกไพ่ก่อนหยิบ'}</div><div class="actions"><button id="confirmDiscardPick" ${!room.started||!room.discardPile?.length||!Number.isInteger(state.discardIndex)||state.pendingDiscardPick?'disabled':''}>หยิบไพ่ที่เลือกเข้ามือ</button><button id="cancelDiscardPick" class="secondary">ยกเลิก</button></div></section></div>`:'';
    const setup=room.setupStarted?`<div class="panel" style="margin:12px 0"><h3>🎴 เลือกไพ่จับสิทธิ์เริ่มก่อน</h3><p class="muted">เลือก J, Q, K หรือ A คนที่ตรงกับไพ่ที่ระบบเปิดจะเริ่มก่อนและเป็นผู้สับไพ่</p><div class="actions">${['J','Q','K','A'].map(r=>`<button data-first-rank="${r}">${r}</button>`).join('')}<button id="cutDeck" class="secondary">✂️ ขอตัดไพ่ (${room.cutRequests||0})</button></div><p class="muted">${(room.firstChoices||[]).map(x=>esc(room.players.find(p=>p.id===x.id)?.name||'ผู้เล่น')+': '+(x.rank||'ยังไม่เลือก')).join(' • ')}</p></div>`:'';
    return `<section class="panel"><div class="row" style="justify-content:space-between"><div><h2 class="section-title">🃏 ห้อง ${room.code}</h2><div class="muted">${state.solo?'โหมดฝึกซ้อมกับบอท 3 ตัว • เล่นได้ทันที':`แชร์รหัสนี้ให้เพื่อน • ${room.players.length}/4 คน`}</div></div><button class="ghost smallbtn" id="leaveRoom">ออกจากห้อง</button></div><div class="players" style="margin:14px 0">${players}</div><div class="game-table"><div class="muted">${room.started?'ตาเล่น: '+esc(room.players[room.currentPlayer]?.name||''):'รอเริ่มเกม'}</div><div class="center-cards"><div><div class="stock">🂠</div><div class="muted">กองจั่ว ${room.stockCount}</div></div><div><div class="muted">กองทิ้ง</div>${discard}</div></div><div class="muted">แตะไพ่กองทิ้งเพื่อดูไพ่ทั้งหมด แล้วเลือกไพ่ที่จะหยิบ</div><div class="muted">เลือกไพ่ในมือด้านล่าง แล้วกดทิ้ง / เลือก 3 ใบขึ้นไปเพื่อลงชุด</div></div>${mustMeldNotice}${meldArea}<h3>ไพ่ในมือ (${state.hand.length})</h3><div class="cardrow">${cards||'<span class="muted">ไพ่จะแสดงเมื่อเริ่มเกม</span>'}</div><div class="actions"><button id="drawStock" class="secondary" ${!room.started?'disabled':''}>🂠 จั่วไพ่</button><button id="drawDiscard" ${!room.started||!room.discard?'disabled':''}>หยิบกองทิ้ง</button><button id="discardCard" class="pink" ${!room.started||!state.selected.size?'disabled':''}>ทิ้งไพ่ที่เลือก</button><button id="meldCards" class="green" ${!room.started||state.selected.size<3?'disabled':''}>ลงชุดไพ่</button></div>${state.isHost&&!room.started&&!room.setupStarted&&!state.solo?`<div class="panel" style="margin-top:16px"><h3>⚙️ ตั้งค่าคะแนนก่อนเริ่ม</h3><div class="grid"><label class="muted">สเปโต (คะแนนโอน) <input id="spetoPoints" class="field" type="number" min="0" value="${room.settings?.spetoPoints??50}"></label><label class="muted">ไพ่ต่อจากกองทิ้ง (คะแนนโอน) <input id="previousDiscardPoints" class="field" type="number" min="0" value="${room.settings?.previousDiscardPoints??30}"></label><label class="muted">อัตราเหรียญต่อคะแนน <input id="coinPerPoint" class="field" type="number" min="0" value="${room.settings?.coinPerPoint??1}"></label></div><p class="muted">ค่าเริ่มต้น: สเปโต 50, ไพ่ต่อกองทิ้ง 30, เหรียญต่อคะแนน 1 (ปรับได้)</p><button id="startGame">🚀 เริ่มจับสิทธิ์ (ผู้เล่น 2–4 คน)</button></div>`:''}${setup}<div class="muted" style="margin-top:12px">คะแนน: ${room.players.map(p=>`${esc(p.name)} คะแนน ${p.score||0} / เหรียญรอบนี้ ${p.roundCoins||0}`).join(' • ')} | อัตราเหรียญ/คะแนน ${room.settings?.coinPerPoint??1}</div></section>${discardModal}`;
  }
  function rooms(){return `<section class="grid"><div class="panel"><h2 class="section-title">🌐 ห้องออนไลน์</h2><label class="muted">ชื่อในเกม</label><input id="playerName" class="field" maxlength="18" placeholder="ตั้งชื่อเล่น" value="${esc(state.name)}"><div class="formrow"><input id="roomCode" class="field" placeholder="รหัสห้อง เช่น A1B2C3" maxlength="6"><button id="joinRoom" class="green">เข้าห้อง</button></div><p class="muted">ใช้รหัสห้องที่เพื่อนส่งให้ • ห้องละ 2–4 คน</p></div><div class="panel"><h2 class="section-title">✨ สร้างห้องใหม่</h2><p class="muted">เป็นหัวหน้าห้องและเริ่มเกมได้เมื่อมีผู้เล่น 2–4 คน</p><button id="createRoom">สร้างห้องส่วนตัว</button></div></section>`}
  function skinPreview(id){const s=skins.find(x=>x.id===id)||skins[0];return `<div class="skinpreview ${s.kind}">✦</div>`}
  function shop(){return `<section class="panel"><div class="row" style="justify-content:space-between"><div><h2 class="section-title">🛍️ ร้านสกินไพ่</h2><p class="muted">สะสมลายไพ่สีสันสดใส ใช้เหรียญหรือเพชรในเกม</p></div><div class="pill">🪙 ${state.coins.toLocaleString()}　💎 ${state.gems}</div></div><div class="shopgrid">${skins.map(s=>`<article class="skin">${skinPreview(s.id)}<strong>${s.name}</strong><p class="muted">${s.desc}</p><p>${s.price===0?'ฟรี':(s.currency==='gem'?'💎 '+s.price:'🪙 '+s.price)}</p>${state.owned.includes(s.id)?`<button class="smallbtn ${state.skin===s.id?'green':'secondary'}" data-equip="${s.id}">${state.skin===s.id?'✓ ใช้อยู่':'ใช้งาน'}</button>`:`<button class="smallbtn" data-buy="${s.id}">ซื้อสกิน</button>`}</article>`).join('')}</div><div class="asset-note" style="margin-top:14px">ระบบซื้อใช้สกุลเงินจำลองที่เก็บในเบราว์เซอร์ ยังไม่ใช่ระบบชำระเงินจริง และไม่ควรใช้เป็นยอดเงินจริง</div><h3>เติมเพชร (ตัวอย่างหน้าร้าน)</h3><div class="row"><button class="secondary" data-gems="50">💎 +50 ฟรีเดโม</button><button class="secondary" data-gems="200">💎 +200 ฟรีเดโม</button></div><p class="muted">ปุ่มนี้เพิ่มเพชรเดโมเท่านั้น ไม่มีการตัดเงิน</p></section>`}
  function profile(){return `<section class="panel"><h2 class="section-title">👤 โปรไฟล์ผู้เล่น</h2><label class="muted">ชื่อเล่น</label><input id="playerName" class="field" maxlength="18" value="${esc(state.name)}" placeholder="ชื่อเล่น"><button id="saveName" style="margin-top:10px">บันทึกชื่อ</button><div class="row" style="margin-top:18px"><div class="pill">🪙 เหรียญ ${state.coins.toLocaleString()}</div><div class="pill">💎 เพชร ${state.gems}</div><div class="pill">🎴 สกิน ${state.owned.length}</div></div><h3>สกินที่ใช้อยู่</h3>${skinPreview(state.skin)}<p class="muted">บัญชีในต้นแบบนี้ยังไม่ผูกระบบ login หรือฐานข้อมูลถาวร</p></section>`}
  function soloMakeDeck(){
    const suits=['♠','♥','♦','♣'], ranks=['A','2','3','4','5','6','7','8','9','10','J','Q','K'];
    const deck=suits.flatMap(suit=>ranks.map(rank=>({id:`${suit}-${rank}-${Math.random().toString(36).slice(2,8)}`,suit,rank})));
    for(let i=deck.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[deck[i],deck[j]]=[deck[j],deck[i]]}
    return deck;
  }
  function startSolo(name){
    state.solo=true;state.isHost=false;state.code='SOLO';state.selected.clear();state.soloDeck=soloMakeDeck();state.soloDiscard=[];state.soloHasDrawn=false;state.soloTurn=0;state.soloMustMeldCards=[];state.soloMelds=[];
    state.soloPlayers=[{id:'you',name:name||'ผู้เล่น',hand:[]},...['บอทมะลิ','บอทสายฟ้า','บอทขนมปัง'].map((n,i)=>({id:'bot'+i,name:n,hand:[]}))];
    state.soloPlayers.forEach(player=>player.hand=state.soloDeck.splice(0,7));state.soloDiscard.push(state.soloDeck.pop());state.hand=state.soloPlayers[0].hand;
    state.room={code:'SOLO',started:true,currentPlayer:0,players:state.soloPlayers.map((player,i)=>({id:player.id,name:player.name,seat:i,cardCount:player.hand.length,connected:true,score:0})),stockCount:state.soloDeck.length,discard:state.soloDiscard.at(-1),discardPile:state.soloDiscard,settings:state.settings,melds:state.soloMelds,mustMeldCount:0,turnMessage:'ตาของคุณ'};
    state.message='เริ่มเกมฝึกซ้อมแล้ว แจกไพ่ให้ผู้เล่น 4 คนเรียบร้อย';state.error='';state.tab='play';render();
  }
  function soloDraw(source){
    if(!state.solo||state.soloTurn!==0){state.error='รอให้ถึงตาของคุณก่อน';render();return}
    if(state.soloHasDrawn){state.error='คุณจั่วไพ่แล้ว ต้องทิ้งไพ่ก่อน';render();return}
    let picked=[]; if(source==='discard'){const ix=Number.isInteger(state.discardIndex)?state.discardIndex:state.soloDiscard.length-1;picked=state.soloDiscard.splice(ix);state.discardIndex=null;}else{const card=state.soloDeck.pop();if(card)picked=[card]}
    if(!picked.length){state.error='กองไพ่ที่เลือกหมดแล้ว';render();return}
    if(source==='discard')state.soloMustMeldCards=picked.length>1?picked.map(c=>c.id):[];else state.soloMustMeldCards=[];state.hand.push(...picked);state.soloPlayers[0].hand=state.hand;state.discardModal=false;state.discardIndex=null;state.soloHasDrawn=true;state.room.discard=state.soloDiscard.at(-1)||null;state.room.discardPile=state.soloDiscard;state.room.stockCount=state.soloDeck.length;state.room.players[0].cardCount=state.hand.length;state.room.mustMeldCount=state.soloMustMeldCards.length;state.message=state.soloMustMeldCards.length?'หยิบไพ่หลายใบ ต้องนำไพ่ที่หยิบมาลงชุดให้ครบก่อนจึงจะทิ้งไพ่ได้':'จั่วไพ่แล้ว เลือกไพ่ 1 ใบแล้วกด “ทิ้งไพ่ที่เลือก”';state.error='';render();
  }
  function soloDiscard(id){
    if(state.soloMustMeldCards.length){state.error=`ต้องนำไพ่ที่หยิบจากกองทิ้งมาเกิดให้ครบก่อน (${state.soloMustMeldCards.length} ใบ)`;render();return}
    if(!state.soloHasDrawn){state.error='ต้องจั่วไพ่ก่อนทิ้ง';render();return}
    const index=state.hand.findIndex(card=>card.id===id);if(index<0)return;
    const [card]=state.hand.splice(index,1);state.soloDiscard.push(card);state.soloPlayers[0].hand=state.hand;state.soloHasDrawn=false;state.selected.clear();state.room.players[0].cardCount=state.hand.length;state.room.discard=card;state.room.discardPile=state.soloDiscard;state.room.stockCount=state.soloDeck.length;state.soloTurn=1;state.room.currentPlayer=1;state.message='บอททั้ง 4 กำลังเล่น...';state.error='';render();window.setTimeout(soloBotsTurn,650);
  }
  function soloMeld(){
    if(!state.soloHasDrawn){state.error='ต้องจั่วไพ่ก่อนจึงจะลงชุดเกิดได้';render();return}
    const ids=[...state.selected];const cards=ids.map(id=>state.hand.find(c=>c.id===id)).filter(Boolean);
    if(!validMeld(cards)){state.error='ชุดไพ่ไม่ถูกต้อง ต้องเป็นตองหรือไพ่เรียงดอกเดียวกัน 3 ใบขึ้นไป';render();return}
    if(state.soloMustMeldCards.length&&!cards.some(c=>state.soloMustMeldCards.includes(c.id))){state.error='ต้องลงชุดโดยใช้ไพ่ที่หยิบจากกองทิ้งก่อน';render();return}
    state.hand=state.hand.filter(c=>!ids.includes(c.id));state.soloPlayers[0].hand=state.hand;state.soloMelds.push({playerId:'you',playerName:state.soloPlayers[0].name,cards});state.soloMustMeldCards=state.soloMustMeldCards.filter(id=>!ids.includes(id));state.room.melds=state.soloMelds;state.room.mustMeldCount=state.soloMustMeldCards.length;state.room.players[0].cardCount=state.hand.length;state.selected.clear();state.message=state.soloMustMeldCards.length?`เกิดแล้ว ยังต้องเกิดไพ่จากกองทิ้งอีก ${state.soloMustMeldCards.length} ใบ`:'ลงชุดไพ่สำเร็จ';state.error='';render();
  }
  function soloBotsTurn(){
    if(!state.solo||!state.room)return;
    for(let index=1;index<4;index++){
      const bot=state.soloPlayers[index];
      if(state.soloDeck.length)bot.hand.push(state.soloDeck.pop());
      if(bot.hand.length){const tossed=bot.hand.splice(Math.floor(Math.random()*bot.hand.length),1)[0];state.soloDiscard.push(tossed)}
      state.room.players[index].cardCount=bot.hand.length;state.room.discard=state.soloDiscard.at(-1)||null;state.room.discardPile=state.soloDiscard;state.room.stockCount=state.soloDeck.length;
    }
    state.soloTurn=0;state.room.currentPlayer=0;state.room.players.forEach((player,index)=>player.cardCount=state.soloPlayers[index].hand.length);state.message='ถึงตาคุณแล้ว จั่วไพ่เพื่อเล่นต่อ';state.error='';render();
  }
  function bind(){
    const on=(id,fn)=>{const el=document.getElementById(id);if(el)el.addEventListener('click',fn)};
    const readName=()=>{const el=document.getElementById('playerName');state.name=(el?.value||'ผู้เล่น').trim().slice(0,18)||'ผู้เล่น';localStorage.setItem('dummyName',state.name);return state.name};
    on('createRoom',()=>{connect();if(!state.socket?.connected){state.error='กำลังเชื่อมต่อเซิร์ฟเวอร์ ลองอีกครั้ง';render();return}state.socket.emit('room:create',{name:readName()})});
    on('soloGame',()=>startSolo(readName()));
    on('joinRoom',()=>{connect();if(!state.socket?.connected){state.error='ยังเชื่อมต่อเซิร์ฟเวอร์ไม่ได้';render();return}const code=$('#roomCode')?.value||'';state.socket.emit('room:join',{name:readName(),code})});
    on('startGame',()=>{const read=(id,fallback)=>Number(document.getElementById(id)?.value??fallback);state.socket?.emit('game:start',{settings:{spetoPoints:read('spetoPoints',50),previousDiscardPoints:read('previousDiscardPoints',30),coinPerPoint:read('coinPerPoint',1)}})});
    app.querySelectorAll('[data-first-rank]').forEach(el=>el.addEventListener('click',()=>state.socket?.emit('game:choose-first',{rank:el.dataset.firstRank})));
    on('cutDeck',()=>state.socket?.emit('game:cut-request'));
    app.querySelectorAll('[data-discard-index]').forEach(el=>{const choose=()=>{state.discardIndex=Number(el.dataset.discardIndex);render()};el.addEventListener('click',choose);el.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();choose()}})});
    const openDiscard=()=>{if(!state.room?.discardPile?.length){state.error='กองทิ้งยังไม่มีไพ่';render();return}state.discardModal=true;if(!Number.isInteger(state.discardIndex)||state.discardIndex>=state.room.discardPile.length)state.discardIndex=state.room.discardPile.length-1;render()};
    on('discardPileOpen',openDiscard);
    on('closeDiscardModal',()=>{state.discardModal=false;render()});
    on('cancelDiscardPick',()=>{state.discardModal=false;render()});
    on('drawStock',()=>{if(state.solo){soloDraw('stock');return}state.socket?.emit('game:draw',{source:'stock'})});
    on('drawDiscard',openDiscard);
    on('confirmDiscardPick',()=>{if(!Number.isInteger(state.discardIndex)){state.error='เลือกไพ่ในกองทิ้งก่อน';render();return}if(state.solo){soloDraw('discard');state.discardModal=false;return}if(!state.socket?.connected){state.error='ยังไม่ได้เชื่อมต่อเซิร์ฟเวอร์';render();return}state.pendingHandCount=state.hand.length;state.pendingDiscardPick=true;state.error='';state.message='กำลังหยิบไพ่เข้ามือ...';state.socket.emit('game:draw',{source:'discard',discardIndex:state.discardIndex});render()});
    on('discardCard',()=>{if(state.selected.size!==1){state.error='เลือกไพ่ 1 ใบเพื่อทิ้ง';render();return}if(state.solo){soloDiscard([...state.selected][0]);return}state.socket?.emit('game:discard',{cardId:[...state.selected][0]})});
    on('meldCards',()=>{if(state.solo){soloMeld();return}state.socket?.emit('game:meld',{cardIds:[...state.selected]})});
    on('leaveRoom',()=>{if(state.solo){state.solo=false;state.room=null;state.hand=[];state.selected.clear();state.soloPlayers=[];state.message='ออกจากโหมดฝึกซ้อมแล้ว';render();return}state.socket?.disconnect();state.socket=null;state.room=null;state.hand=[];state.code='';state.isHost=false;connect();render()});
    on('dailyReward',()=>{const today=new Date().toDateString();if(localStorage.getItem('dummyDaily')===today){state.error='รับเหรียญวันนี้ไปแล้ว';}else{state.coins+=500;localStorage.setItem('dummyDaily',today);state.message='รับเหรียญฟรี +500 แล้ว!';saveWallet()}render()});
    on('saveName',()=>{readName();state.message='บันทึกชื่อแล้ว';render()});
    app.querySelectorAll('[data-card]').forEach(el=>el.addEventListener('click',()=>{const id=el.dataset.card;state.selected.has(id)?state.selected.delete(id):state.selected.add(id);render()}));
    app.querySelectorAll('[data-buy]').forEach(el=>el.addEventListener('click',()=>{const s=skins.find(x=>x.id===el.dataset.buy);if(!s)return;const balance=s.currency==='gem'?state.gems:state.coins;if(balance<s.price){state.error='ยอดเงินในเกมไม่พอ';render();return}if(s.currency==='gem')state.gems-=s.price;else state.coins-=s.price;state.owned.push(s.id);state.skin=s.id;saveWallet();state.message='ซื้อสกิน '+s.name+' สำเร็จ';render()}));
    app.querySelectorAll('[data-equip]').forEach(el=>el.addEventListener('click',()=>{state.skin=el.dataset.equip;saveWallet();state.message='เปลี่ยนสกินแล้ว';render()}));
    app.querySelectorAll('[data-gems]').forEach(el=>el.addEventListener('click',()=>{state.gems+=Number(el.dataset.gems);saveWallet();state.message='เพิ่มเพชรเดโมแล้ว (ไม่มีการชำระเงินจริง)';render()}));
  }
  connect();render();
})();
