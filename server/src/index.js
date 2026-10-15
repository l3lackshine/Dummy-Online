const express = require('express');
const http = require('http');
const cors = require('cors');
const { Server } = require('socket.io');
const crypto = require('crypto');
const Engine = require('./engine');

const PORT = process.env.PORT || 3000;
const ALLOWED_ORIGIN = process.env.CLIENT_ORIGIN || '*';
const app = express();
app.use(cors({ origin: ALLOWED_ORIGIN === '*' ? true : ALLOWED_ORIGIN.split(',') }));
app.use(express.json());
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: ALLOWED_ORIGIN === '*' ? '*' : ALLOWED_ORIGIN.split(','), methods: ['GET','POST'] } });
const rooms = new Map();
const MAX_PLAYERS = 4;
const roomCode = () => crypto.randomBytes(3).toString('hex').toUpperCase();

function publicLobby(room) {
  const hostIndex = room.players.findIndex(p => p.connected && p.id);
  return { code: room.code, started: !!room.game && !room.game.over, players: room.players.map((p,i) => ({ name:p.name, connected:p.connected, host:i===hostIndex, seat:i })), maxPlayers:MAX_PLAYERS };
}
function emitLobby(room) { io.to(room.code).emit('room:lobby', publicLobby(room)); }
function getRoom(socket) { return rooms.get(socket.data.roomCode); }
function findHumanSeat(room, socketId) { return room.players.findIndex(p => p.id === socketId); }
function emitStates(room) {
  if (!room.game) return;
  room.players.forEach((p, seat) => {
    if (p.connected && p.id) io.to(p.id).emit('game:state', Engine.view(room.game, seat));
  });
  emitLobby(room);
}
function scheduleBots(room) {
  if (!room.game || room.game.over || room.botTimer) return;
  const p = room.game.P[room.game.cur];
  if (!p || !p.bot) return;
  room.botTimer = setTimeout(() => {
    room.botTimer = null;
    if (!room.game || room.game.over) return;
    const now = room.game.P[room.game.cur];
    if (!now || !now.bot) return;
    Engine.botTurn(room.game);
    room.game.v++;
    emitStates(room);
    scheduleBots(room);
  }, 650);
}
function startGame(room) {
  room.players = room.players.filter(p => p.connected && p.id);
  if (room.players.length < 1 || room.players.length > MAX_PLAYERS) return false;
  if (room.botTimer) { clearTimeout(room.botTimer); room.botTimer = null; }
  room.game = Engine.newGame(room.players.map(p => ({ id:p.id, n:p.name })));
  room.game.v++;
  emitStates(room);
  scheduleBots(room);
  return true;
}
function joinRoom(socket, room, name) {
  const clean = String(name || 'ผู้เล่น').trim().slice(0,14) || 'ผู้เล่น';
  room.players.push({ id:socket.id, name:clean, connected:true });
  socket.data.roomCode = room.code;
  socket.join(room.code);
  socket.emit('room:joined', { code:room.code, host:room.players.length===1 });
  emitLobby(room);
}
function leaveRoom(socket, disconnected=false) {
  const room = getRoom(socket);
  if (!room) return;
  const i = findHumanSeat(room, socket.id);
  if (i >= 0) {
    if (room.game && !room.game.over) {
      const p = room.game.P[i];
      if (p) { p.bot = true; p.id = null; p.n = room.players[i].name + ' (บอท)'; }
      room.players[i].connected = false;
      room.players[i].id = null;
      emitStates(room);
      scheduleBots(room);
    } else {
      room.players.splice(i,1);
      emitLobby(room);
      if (!room.players.length) rooms.delete(room.code);
    }
  }
  if (!disconnected) socket.leave(room.code);
  socket.data.roomCode = null;
}
app.get('/health', (_req,res) => res.json({ ok:true, service:'dummy-online-5p', rooms:rooms.size }));
app.get('/', (_req,res) => res.send('Dummy Online backend is running'));

io.on('connection', socket => {
  socket.emit('system:notice', 'เชื่อมต่อเซิร์ฟเวอร์แล้ว');
  socket.on('room:create', ({name}={}) => {
    if (socket.data.roomCode) return socket.emit('system:error','คุณอยู่ในห้องแล้ว');
    let code; do { code = roomCode(); } while (rooms.has(code));
    const room = { code, players:[], game:null, botTimer:null };
    rooms.set(code,room);
    joinRoom(socket,room,name);
  });
  socket.on('room:join', ({code,name}={}) => {
    if (socket.data.roomCode) return socket.emit('system:error','คุณอยู่ในห้องแล้ว');
    const room = rooms.get(String(code||'').trim().toUpperCase());
    if (!room) return socket.emit('system:error','ไม่พบห้องนี้');
    if (room.game && !room.game.over) return socket.emit('system:error','เกมเริ่มแล้ว เข้าห้องไม่ได้');
    if (room.players.length >= MAX_PLAYERS) return socket.emit('system:error','ห้องเต็มแล้ว (4 คน)');
    joinRoom(socket,room,name);
  });
  socket.on('game:start', () => {
    const room = getRoom(socket);
    if (!room) return socket.emit('system:error','กรุณาเข้าห้องก่อน');
    const host = room.players.find(p => p.connected && p.id);
    if (host?.id !== socket.id) return socket.emit('system:error','เฉพาะเจ้าของห้องเริ่มเกมได้');
    if (!startGame(room)) return socket.emit('system:error','เริ่มเกมไม่ได้');
    io.to(room.code).emit('system:notice','เริ่มเกมแล้ว!');
  });
  socket.on('game:act', action => {
    const room = getRoom(socket);
    if (!room || !room.game) return socket.emit('system:error','ยังไม่มีเกมที่กำลังเล่น');
    const seat = findHumanSeat(room,socket.id);
    if (seat < 0) return socket.emit('system:error','ไม่พบที่นั่งของคุณ');
    const msg = Engine.act(room.game,seat,action||{});
    if (msg) { socket.emit('game:action-result', { ok:false, error:msg, action:action && action.t }); return socket.emit('system:error',msg); }
    socket.emit('game:action-result', { ok:true, action:action && action.t });
    room.game.v++;
    emitStates(room);
    scheduleBots(room);
  });
  socket.on('room:leave', () => leaveRoom(socket,false));
  socket.on('disconnect', () => leaveRoom(socket,true));
});
server.listen(PORT, () => console.log(`Dummy Online backend listening on ${PORT}`));
