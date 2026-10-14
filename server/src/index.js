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
    code: room.code, started: room.started, currentPlayer: room.currentPlayer,
    players: room.players.map((p,i)=>({ id:p.id, name:p.name, seat:i, cardCount:p.hand.length, connected:p.connected })),
    stockCount: room.stock.length,
    discard: room.discard.slice(-1)[0] || null,
    turnMessage: room.started ? `${room.players[room.currentPlayer]?.name || ''} กำลังเล่น` : 'รอผู้เล่นเข้าห้อง'
  };
}
function emitRoom(room) { io.to(room.code).emit('room:update', publicRoom(room)); }
function findPlayer(room, socketId) { return room.players.find(p=>p.id===socketId); }
function safeHand(room, socketId) {
  const player = findPlayer(room,socketId);
  if (player) io.to(socketId).emit('game:hand', player.hand);
}
function startGame(room) {
  if (room.players.length !== 5) return false;
  const deck = shuffledDeck();
  room.players.forEach(p => p.hand = deck.splice(0,7));
  room.stock = deck;
  room.discard = [room.stock.pop()];
  room.currentPlayer = 0;
  room.started = true;
  room.hasDrawn = false;
  room.melds = [];
  room.players.forEach(p => safeHand(room,p.id));
  emitRoom(room);
  return true;
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
    const room={code,players:[],started:false,currentPlayer:0,stock:[],discard:[],hasDrawn:false,melds:[]};
    rooms.set(code,room);
    joinRoom(socket,room,name);
  });
  socket.on('room:join', ({code,name}={}) => {
    const room=rooms.get(String(code||'').trim().toUpperCase());
    if (!room) return socket.emit('system:error','ไม่พบห้องนี้');
    if (room.started) return socket.emit('system:error','เกมเริ่มแล้ว เข้าห้องไม่ได้');
    if (room.players.length>=5) return socket.emit('system:error','ห้องเต็มแล้ว (5 คน)');
    joinRoom(socket,room,name);
  });
  socket.on('game:start', () => {
    const room=rooms.get(socket.data.roomCode);
    if (!room) return socket.emit('system:error','กรุณาเข้าห้องก่อน');
    if (room.players[0]?.id!==socket.id) return socket.emit('system:error','เฉพาะคนสร้างห้องเริ่มเกมได้');
    if (!startGame(room)) return socket.emit('system:error','ต้องมีผู้เล่นครบ 5 คนก่อนเริ่มเกม');
    io.to(room.code).emit('system:notice','เริ่มเกมแล้ว!');
  });
  socket.on('game:draw', ({source}={}) => {
    const room=rooms.get(socket.data.roomCode);
    if (!room || !isCurrent(room,socket)) return socket.emit('system:error','ยังไม่ใช่ตาของคุณ');
    if (room.hasDrawn) return socket.emit('system:error','คุณจั่วไพ่แล้ว ต้องทิ้งไพ่ก่อน');
    let drawn;
    if (source==='discard') drawn=room.discard.pop();
    else drawn=room.stock.pop();
    if (!drawn) return socket.emit('system:error','ไม่มีไพ่ให้จั่ว');
    const p=findPlayer(room,socket.id); p.hand.push(drawn);
    room.hasDrawn=true; safeHand(room,socket.id); emitRoom(room);
  });
  socket.on('game:discard', ({cardId}={}) => {
    const room=rooms.get(socket.data.roomCode);
    if (!room || !isCurrent(room,socket)) return socket.emit('system:error','ยังไม่ใช่ตาของคุณ');
    if (!room.hasDrawn) return socket.emit('system:error','ต้องจั่วไพ่ก่อนทิ้ง');
    const p=findPlayer(room,socket.id);
    const idx=p.hand.findIndex(c=>c.id===cardId);
    if (idx<0) return socket.emit('system:error','ไม่พบไพ่ใบนี้');
    const [c]=p.hand.splice(idx,1); room.discard.push(c);
    room.hasDrawn=false; room.currentPlayer=(room.currentPlayer+1)%room.players.length;
    safeHand(room,socket.id); emitRoom(room);
    if (room.stock.length===0) io.to(room.code).emit('system:notice','ไพ่กองจั่วหมดแล้ว กรุณาจบเกม/เริ่มรอบใหม่');
  });
  socket.on('game:meld', ({cardIds}={}) => {
    const room=rooms.get(socket.data.roomCode);
    if (!room || !isCurrent(room,socket)) return socket.emit('system:error','ยังไม่ใช่ตาของคุณ');
    const p=findPlayer(room,socket.id);
    const cards=(cardIds||[]).map(id=>p.hand.find(c=>c.id===id)).filter(Boolean);
    if (cards.length !== (cardIds||[]).length || !validMeld(cards)) return socket.emit('system:error','ชุดไพ่ไม่ถูกต้อง (ต้นแบบรองรับตอง/เรียง 3 ใบขึ้นไป)');
    p.hand=p.hand.filter(c=>!cardIds.includes(c.id));
    room.melds.push({playerId:p.id,playerName:p.name,cards});
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
  room.players.push({id:socket.id,name:cleanName,hand:[],connected:true});
  socket.data.roomCode=room.code; socket.join(room.code);
  socket.emit('room:joined',{code:room.code,isHost:room.players.length===1});
  emitRoom(room);
}
server.listen(PORT,()=>console.log(`Dummy Online 5P backend listening on ${PORT}`));
