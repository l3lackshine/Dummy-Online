const express = require('express');
const http = require('http');
const cors = require('cors');
const { Server } = require('socket.io');
const crypto = require('crypto');

const PORT = process.env.PORT || 3000;
const ALLOWED_ORIGIN = process.env.CLIENT_ORIGIN || '*';
const app = express();
app.use(cors({ origin: ALLOWED_ORIGIN === '*' ? true : ALLOWED_ORIGIN.split(',') }));
app.use(express.json());
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: ALLOWED_ORIGIN === '*' ? '*' : ALLOWED_ORIGIN.split(','), methods: ['GET','POST'] }
});

const rooms = new Map();
const SUITS = ['♠','♥','♦','♣'];
const RANKS = ['A','2','3','4','5','6','7','8','9','10','J','Q','K'];
const card = (suit, rank) => ({ id: `${suit}-${rank}`, suit, rank });
function shuffledDeck() {
  const deck = SUITS.flatMap(s => RANKS.map(r => card(s,r)));
  for (let i=deck.length-1;i>0;i--) {
    const j = crypto.randomInt(i+1); [deck[i],deck[j]]=[deck[j],deck[i]];
  }
  return deck;
}
function roomCode() { return crypto.randomBytes(3).toString('hex').toUpperCase(); }
function publicRoom(room) {
  return {
    code: room.code, started: room.started, setupStarted: room.setupStarted, currentPlayer: room.currentPlayer,
    players: room.players.map((p,i)=>({ id:p.id, name:p.name, seat:i, cardCount:p.hand.length, connected:p.connected, score:p.score||0, roundCoins:p.roundCoins||0 })),
    stockCount: room.stock.length, discard: room.discard.slice(-1)[0] || null, discardPile: room.discard,
    settings: room.settings, melds: room.melds || [], mustMeldCount: room.mustMeldCards?.length || 0, firstChoices: room.players.map(p=>({id:p.id, rank:p.firstRank||null})), cutRequests: room.cutRequests||0,
    turnMessage: room.started ? `${room.players[room.currentPlayer]?.name || ''} กำลังเล่น` : (room.setupStarted ? 'เลือกไพ่ J / Q / K / A เพื่อจับสิทธิ์เริ่มก่อน' : 'รอผู้เล่นเข้าห้อง')
  };
}
function emitRoom(room) { io.to(room.code).emit('room:update', publicRoom(room)); }
function findPlayer(room, socketId) { return room.players.find(p=>p.id===socketId); }
function safeHand(room, socketId) {
  const player = findPlayer(room,socketId);
  if (player) io.to(socketId).emit('game:hand', player.hand);
}
function startGame(room, firstPlayerIndex=0) {
  const count=room.players.length;
  if (count < 2 || count > 4) return false;
  let deck = shuffledDeck();
  if ((room.cutRequests||0)>0) { const cut=crypto.randomInt(1,deck.length); deck=deck.slice(cut).concat(deck.slice(0,cut)); }
  const cardsPerPlayer = count===2 ? 11 : count===3 ? 9 : 7;
  room.players.forEach(p => { p.hand=deck.splice(0,cardsPerPlayer); p.score=p.score||0; p.roundCoins=0; });
  room.stock = deck; room.discard = [room.stock.pop()];
  room.currentPlayer = firstPlayerIndex; room.started = true; room.setupStarted=false; room.hasDrawn = false; room.melds = [];
  room.lastDiscardOwner=null; room.lastDiscardCard=null; room.previousDiscardCard=null; room.lastDrawnFromDiscard=null; room.mustMeldCards=[];
  room.players.forEach(p => safeHand(room,p.id)); emitRoom(room); return true;
}
function finishFirstChoice(room) {
  if (!room.setupStarted || room.players.some(p=>!p.firstRank)) return;
  const ranks=['J','Q','K','A']; let revealed;
  do { revealed=ranks[crypto.randomInt(ranks.length)]; } while(!room.players.some(p=>p.firstRank===revealed));
  const matches=room.players.map((p,i)=>({p,i})).filter(x=>x.p.firstRank===revealed);
  const winner=matches[crypto.randomInt(matches.length)];
  io.to(room.code).emit('game:first-result',{rank:revealed,playerId:winner.p.id,playerName:winner.p.name,cutRequests:room.cutRequests||0});
  if (!startGame(room,winner.i)) io.to(room.code).emit('system:error','เริ่มเกมไม่ได้ ต้องมีผู้เล่น 2–4 คน');
}
function isCurrent(room, socket) {
  return room.started && room.players[room.currentPlayer]?.id === socket.id;
}
function validMeld(cards) {
  if (!Array.isArray(cards) || cards.length < 3) return false;
  const sameRank = cards.every(c=>c.rank===cards[0].rank) && new Set(cards.map(c=>c.suit)).size===cards.length;
  const sameSuit = cards.every(c=>c.suit===cards[0].suit);
  if (sameRank) return true;
  if (!sameSuit) return false;
  const order = RANKS;
  const indexes = cards.map(c=>order.indexOf(c.rank)).sort((a,b)=>a-b);
  return indexes.every((v,i)=>i===0 || v===indexes[i-1]+1);
}
app.get('/health', (_req,res)=>res.json({ok:true,service:'dummy-online-5p',rooms:rooms.size}));
app.get('/', (_req,res)=>res.send('Dummy Online 5P backend is running'));

io.on('connection', socket => {
  socket.emit('system:notice', 'เชื่อมต่อเซิร์ฟเวอร์แล้ว');

  socket.on('room:create', ({name}={}) => {
    if (socket.data.roomCode) return socket.emit('system:error','คุณอยู่ในห้องแล้ว');
    let code; do { code=roomCode(); } while(rooms.has(code));
    const room={code,players:[],started:false,setupStarted:false,currentPlayer:0,stock:[],discard:[],hasDrawn:false,melds:[],mustMeldCards:[],settings:{spetoPoints:50,previousDiscardPoints:30,coinPerPoint:1},cutRequests:0};
    rooms.set(code,room);
    joinRoom(socket,room,name);
  });
  socket.on('room:join', ({code,name}={}) => {
    const room=rooms.get(String(code||'').trim().toUpperCase());
    if (!room) return socket.emit('system:error','ไม่พบห้องนี้');
    if (room.started || room.setupStarted) return socket.emit('system:error','เกมเริ่มหรือจับสิทธิ์แล้ว เข้าห้องไม่ได้');
    if (room.players.length>=4) return socket.emit('system:error','ห้องเต็มแล้ว (สูงสุด 4 คน)');
    joinRoom(socket,room,name);
  });
  socket.on('game:start', ({settings}={}) => {
    const room=rooms.get(socket.data.roomCode);
    if (!room) return socket.emit('system:error','กรุณาเข้าห้องก่อน');
    if (room.players[0]?.id!==socket.id) return socket.emit('system:error','เฉพาะคนสร้างห้องเริ่มเกมได้');
    if (room.players.length<2 || room.players.length>4) return socket.emit('system:error','ต้องมีผู้เล่น 2–4 คนก่อนเริ่มเกม');
    if (room.started || room.setupStarted) return socket.emit('system:error','เริ่มขั้นตอนเกมไปแล้ว');
    const n=(v,d)=>Number.isFinite(Number(v))?Math.max(0,Math.min(100000,Math.round(Number(v)))):d;
    room.settings={spetoPoints:n(settings?.spetoPoints,50),previousDiscardPoints:n(settings?.previousDiscardPoints,30),coinPerPoint:n(settings?.coinPerPoint,1)};
    room.setupStarted=true; room.cutRequests=0; room.players.forEach(p=>p.firstRank=null);
    io.to(room.code).emit('system:notice','เริ่มจับสิทธิ์เล่นก่อน เลือก J, Q, K หรือ A'); emitRoom(room);
  });
  socket.on('game:choose-first', ({rank}={}) => {
    const room=rooms.get(socket.data.roomCode); if(!room||!room.setupStarted) return socket.emit('system:error','ยังไม่ได้เริ่มจับสิทธิ์');
    const p=findPlayer(room,socket.id); if(!p) return;
    if(!['J','Q','K','A'].includes(rank)) return socket.emit('system:error','เลือกได้เฉพาะ J, Q, K หรือ A');
    if(p.firstRank) return socket.emit('system:error','คุณเลือกไพ่ไปแล้ว');
    p.firstRank=rank; emitRoom(room); finishFirstChoice(room);
  });
  socket.on('game:cut-request', () => {
    const room=rooms.get(socket.data.roomCode); if(!room||!room.setupStarted) return socket.emit('system:error','ขอตัดไพ่ได้ระหว่างจับสิทธิ์เริ่มเกมเท่านั้น');
    room.cutRequests=(room.cutRequests||0)+1; io.to(room.code).emit('system:notice',`${findPlayer(room,socket.id)?.name||'ผู้เล่น'} ขอตัดไพ่แล้ว`); emitRoom(room);
  });
  socket.on('game:draw', ({source,discardIndex}={}) => {
    const room=rooms.get(socket.data.roomCode);
    if (!room || !isCurrent(room,socket)) return socket.emit('system:error','ยังไม่ใช่ตาของคุณ');
    if (room.hasDrawn) return socket.emit('system:error','คุณจั่วไพ่แล้ว ต้องทิ้งไพ่ก่อน');
    let drawn; const p=findPlayer(room,socket.id);
    if (source==='discard') {
      const index=Number.isInteger(discardIndex)?discardIndex:room.discard.length-1;
      if(index<0||index>=room.discard.length) return socket.emit('system:error','เลือกกองทิ้งไม่ถูกต้อง');
      const taken=room.discard.splice(index); p.hand.push(...taken); room.lastDrawnFromDiscard=taken.map(c=>c.id); room.mustMeldCards=taken.length>1?taken.map(c=>c.id):[];
    } else { drawn=room.stock.pop(); if (!drawn) return socket.emit('system:error','ไม่มีไพ่ให้จั่ว'); p.hand.push(drawn); room.lastDrawnFromDiscard=null; room.mustMeldCards=[]; }
    room.hasDrawn=true; safeHand(room,socket.id); emitRoom(room);
  });
  socket.on('game:discard', ({cardId}={}) => {
    const room=rooms.get(socket.data.roomCode);
    if (!room || !isCurrent(room,socket)) return socket.emit('system:error','ยังไม่ใช่ตาของคุณ');
    if (!room.hasDrawn) return socket.emit('system:error','ต้องจั่วไพ่ก่อนทิ้ง');
    if ((room.mustMeldCards||[]).length) return socket.emit('system:error',`คุณหยิบไพ่จากกองทิ้งหลายใบ ต้องนำไพ่ที่หยิบมาเกิดให้ครบก่อน (${room.mustMeldCards.length} ใบที่ยังไม่เกิด)`);
    const p=findPlayer(room,socket.id);
    const idx=p.hand.findIndex(c=>c.id===cardId);
    if (idx<0) return socket.emit('system:error','ไม่พบไพ่ใบนี้');
    const [c]=p.hand.splice(idx,1); room.previousDiscardCard=room.discard.at(-1)||null; room.lastDiscardCard=c; room.lastDiscardOwner=p.id; room.discard.push(c);
    room.hasDrawn=false; room.currentPlayer=(room.currentPlayer+1)%room.players.length;
    safeHand(room,socket.id); emitRoom(room);
    if (room.stock.length===0) io.to(room.code).emit('system:notice','ไพ่กองจั่วหมดแล้ว กรุณาจบเกม/เริ่มรอบใหม่');
  });
  socket.on('game:meld', ({cardIds}={}) => {
    const room=rooms.get(socket.data.roomCode);
    if (!room || !isCurrent(room,socket)) return socket.emit('system:error','ยังไม่ใช่ตาของคุณ');
    if (!room.hasDrawn) return socket.emit('system:error','ต้องจั่วไพ่ก่อนจึงจะลงชุดเกิดได้');
    if (!Array.isArray(cardIds)) return socket.emit('system:error','กรุณาเลือกไพ่ที่จะลงชุด');
    const p=findPlayer(room,socket.id);
    const cards=cardIds.map(id=>p.hand.find(c=>c.id===id)).filter(Boolean);
    if (cards.length !== (cardIds||[]).length || !validMeld(cards)) return socket.emit('system:error','ชุดไพ่ไม่ถูกต้อง (ต้องเป็นตองหรือไพ่เรียงดอกเดียวกัน 3 ใบขึ้นไป)');
    const forced=room.mustMeldCards||[];
    if (forced.length && !cards.some(c=>forced.includes(c.id))) return socket.emit('system:error','คุณต้องลงชุดโดยใช้ไพ่ที่หยิบจากกองทิ้งก่อน');
    p.hand=p.hand.filter(c=>!cardIds.includes(c.id));
    room.mustMeldCards=forced.filter(id=>!cardIds.includes(id));
    room.melds.push({playerId:p.id,playerName:p.name,cards});
    const picked = (room.lastDrawnFromDiscard||[]).filter(id=>cards.some(c=>c.id===id));
    if(picked.length && room.lastDiscardOwner && room.lastDiscardOwner!==p.id) {
      const speto = cards.some(c=>picked.includes(c.id) && ((c.rank==='2'&&c.suit==='♣')||(c.rank==='Q'&&c.suit==='♠')));
      const lastCard=room.lastDiscardCard; const prev=room.previousDiscardCard;
      let award=0, reason='';
      if(speto) { award=room.settings.spetoPoints; reason='สเปโต'; }
      else if(lastCard && prev && cards.some(c=>c.id===lastCard.id) && cards.some(c=>c.id===prev.id)) { award=room.settings.previousDiscardPoints; reason='ไพ่ต่อจากกองทิ้ง'; }
      if(award>0) { const loser=room.players.find(x=>x.id===room.lastDiscardOwner); if(loser){loser.score=(loser.score||0)-award;p.score=(p.score||0)+award;const coinMove=award*(room.settings.coinPerPoint||0);loser.roundCoins=(loser.roundCoins||0)-coinMove;p.roundCoins=(p.roundCoins||0)+coinMove;io.to(room.code).emit('system:notice',`${p.name} เกิดด้วย ${reason}: รับ ${award} คะแนนจาก ${loser.name}`); } }
      room.lastDrawnFromDiscard=room.lastDrawnFromDiscard.filter(id=>!picked.includes(id));
    }
    safeHand(room,socket.id);
    io.to(room.code).emit('game:melds',room.melds);
    emitRoom(room);
  });
  socket.on('disconnect', () => {
    const code=socket.data.roomCode, room=rooms.get(code);
    if (!room) return;
    const p=findPlayer(room,socket.id);
    if (p) p.connected=false;
    emitRoom(room);
    // Keep room state briefly available to the remaining players; production needs reconnect/auth handling.
    setTimeout(()=>{
      const r=rooms.get(code); if (!r) return;
      const i=r.players.findIndex(x=>x.id===socket.id);
      if (i>=0 && !r.players[i].connected) r.players.splice(i,1);
      if (!r.players.length) rooms.delete(code);
      else { if (r.currentPlayer>=r.players.length) r.currentPlayer=0; emitRoom(r); }
    }, 30000);
  });
});
function joinRoom(socket,room,name) {
  const cleanName=String(name||'ผู้เล่น').trim().slice(0,18)||'ผู้เล่น';
  if(room.players.length>=4) return socket.emit('system:error','ห้องเต็มแล้ว (สูงสุด 4 คน)');
  room.players.push({id:socket.id,name:cleanName,hand:[],connected:true,score:0,roundCoins:0,firstRank:null});
  socket.data.roomCode=room.code; socket.join(room.code);
  socket.emit('room:joined',{code:room.code,isHost:room.players.length===1});
  emitRoom(room);
}
server.listen(PORT,()=>console.log(`Dummy Online 5P backend listening on ${PORT}`));
