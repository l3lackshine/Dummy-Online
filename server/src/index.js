const express = require('express');
const http = require('http');
const cors = require('cors');
const { Server } = require('socket.io');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const Rules = require('./rules');
const { CHARS, BGS } = require('./rules/common');
const VERSION = require('../package.json').version;
const Shuffle = require('./shuffle');
const Wallet = require('./wallet');
const wallet = new Wallet({ initialBalance: Number(process.env.INITIAL_COINS || 5000) });
let SKIN_CATALOG = null;
try { SKIN_CATALOG = JSON.parse(fs.readFileSync(path.join(__dirname, '../../client/public/skin/skins.json'), 'utf8')); } catch (_) { SKIN_CATALOG = null; }
// Rooms are in-memory, so reservations from games lost during a process restart must be refunded.
wallet.releaseOrphanedReservations();

const PORT = process.env.PORT || 3000;
const ALLOWED_ORIGIN = process.env.CLIENT_ORIGIN || '*';
const app = express();
app.use(cors({ origin: ALLOWED_ORIGIN === '*' ? true : ALLOWED_ORIGIN.split(',') }));
app.use(express.json());
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: ALLOWED_ORIGIN === '*' ? '*' : ALLOWED_ORIGIN.split(','), methods: ['GET', 'POST'] }, maxHttpBufferSize: 1e5 });
const rooms = new Map();
const MAX_PLAYERS = 6;
const MAX_ROOMS = Number(process.env.MAX_ROOMS || 300);
const BOT_DELAY = Number(process.env.BOT_DELAY_MS || 650);        // ปรับได้เพื่อทดสอบ
const EMPTY_ROOM_TTL = Number(process.env.EMPTY_ROOM_TTL_MS || 120000); // ห้องที่ไม่มีคนจริงเหลือ จะถูกลบหลังเวลานี้ (เผื่อเชื่อมต่อกลับ)
const RATE_PER_SEC = Number(process.env.RATE_PER_SEC || 20);
const roomCode = () => crypto.randomBytes(3).toString('hex').toUpperCase();
const newToken = () => crypto.randomBytes(16).toString('hex');

// ผู้เล่นแต่ละคนมี seat (ที่นั่งใน engine) แยกจากลำดับใน room.players — กันที่นั่งเลื่อนผิดเมื่อมีคนออก/เข้า
// player: { id(socket), name, ch, bg, connected, token, seat|null }
const active = room => !!room.game && !room.game.over;
const connectedPlayers = room => room.players.filter(p => p.connected && p.id);
const findPlayer = (room, socketId) => room.players.find(p => p.id === socketId);
// กติกาที่ห้องนี้เลือกไว้ (โหลดจาก src/rules/<id>) — index.js ไม่รู้จักกติกาของเกมใดเกมหนึ่งโดยตรง
const ruleOf = room => Rules.get(room.rule);

// สิทธิ์กดสับไพ่: ตาแรก = เจ้าของห้อง · ตาถัดไป = ผู้ชนะตาก่อนหน้า (ถ้าเขาออก/หลุด/เป็นบอท → กลับไปเป็นเจ้าของห้อง)
function shufflerOf(room) {
  const w = room.lastWinner;
  if (w && w.connected && w.id && room.players.includes(w)) return w;
  return connectedPlayers(room)[0] || null;
}
// ทุกห้อง (รวมห้องเล่นกับบอทคนเดียว) ต้องกดสับไพ่ก่อนเริ่มทุกตา
const needShuffle = () => true;
function publicLobby(room, forPlayer) {
  settle(room);                                // idempotent: ให้ล็อบบี้สะท้อนผู้ชนะตาก่อนเสมอ
  const host = connectedPlayers(room)[0], sh = shufflerOf(room);
  return {
    code: room.code, started: active(room), maxPlayers: Math.min(MAX_PLAYERS, ruleOf(room).meta.maxPlayers || MAX_PLAYERS),
    rule: { id: ruleOf(room).meta.id, name: ruleOf(room).meta.name }, options: room.options,
    youHost: !!forPlayer && forPlayer === host,
    // ไม่ส่งลำดับไพ่ที่สับแล้วออกไปเด็ดขาด — ส่งแค่ว่าสับแล้วหรือยัง
    shuffle: { ready: !!room.deck, needed: needShuffle(room), by: room.shuffledBy || null, shuffler: sh ? sh.name : null, youShuffler: !!forPlayer && forPlayer === sh, round: room.round || 0, seq: room.shuffleSeq || 0 },
    players: room.players.map(p => ({ name: p.name, ch: p.ch, bg: p.bg, connected: p.connected, host: p === host, shuffler: p === sh, seat: p.seat, you: !!forPlayer && p === forPlayer })),
  };
}
// ชำระเหรียญโดยเซิร์ฟเวอร์เท่านั้น: ผลจาก engine เป็นข้อมูลอ้างอิง แต่ client ไม่มีสิทธิ์ส่งยอดเหรียญมาเอง
function settleCoins(room) {
  const G = room.game;
  if (!G || !G.over || G.walletSettled) return true;
  const players = room.players.filter(p => p.walletId && p.reservationId && p.seat != null);
  if (!players.length) { G.walletSettled = true; return true; }
  const entries = players.map(p => ({
    walletId: p.walletId, reservationId: p.reservationId,
    delta: Math.trunc(Number(G.res && G.res.coin && G.res.coin.delta && G.res.coin.delta[p.seat]) || 0),
    reason: 'ผลเกม ' + G.gid
  }));
  const result = wallet.settleBatch(room.code + ':' + G.gid + ':coins', entries);
  if (!result.ok) {
    console.error('coin settlement failed', room.code, G.gid, result.error);
    connectedPlayers(room).forEach(p => io.to(p.id).emit('system:error', 'ชำระเหรียญไม่สำเร็จ: ' + result.error + ' กรุณาติดต่อผู้ดูแล'));
    return false;
  }
  G.walletSettled = true;
  players.forEach(p => { p.reservationId = null; if (p.connected && p.id) io.to(p.id).emit('wallet:state', wallet.state(p.walletId)); });
  return true;
}
// จบตาแล้วจดผู้ชนะไว้ (ครั้งเดียวต่อเกม) เพื่อมอบสิทธิ์สับไพ่ตาถัดไป
function settle(room) {
  const G = room.game;
  if (!G || !G.over || G.settled) return;
  if (!settleCoins(room)) return;
  G.settled = true;
  const seat = ruleOf(room).winner(G);
  const w = seat == null ? null : room.players.find(p => p.seat === seat);
  room.lastWinner = w || null;                 // ผู้ชนะเป็นบอท → ไม่มีคนจริงรับสิทธิ์ → เจ้าของห้องสับแทน
  room.round = (room.round || 0) + 1;
}
function emitLobby(room) { connectedPlayers(room).forEach(p => io.to(p.id).emit('room:lobby', publicLobby(room, p))); }
function emitStates(room) {
  if (!room.game) return;
  settle(room);
  room.players.forEach(p => { if (p.connected && p.id && p.walletId) io.to(p.id).emit('wallet:state', wallet.state(p.walletId)); });
  room.players.forEach(p => { if (p.connected && p.id && p.seat != null && room.game.P[p.seat]) io.to(p.id).emit('game:state', ruleOf(room).view(room.game, p.seat)); });
  emitLobby(room);
}
function alive(room) { return rooms.get(room.code) === room; }
function scheduleBots(room) {
  if (!alive(room) || !room.game || room.game.over || room.botTimer) return;
  const p = room.game.P[room.game.cur];
  if (!p || !p.bot) return;
  room.botTimer = setTimeout(() => {
    room.botTimer = null;
    if (!alive(room) || !room.game || room.game.over) return;
    const now = room.game.P[room.game.cur];
    if (!now || !now.bot) return;
    try { ruleOf(room).botTurn(room.game); } catch (e) { console.error('botTurn error', e); return; }
    room.game.v++;
    emitStates(room);
    scheduleBots(room);
  }, BOT_DELAY);
}
// ห้องที่ไม่มีคนจริงเชื่อมต่ออยู่ → รอ EMPTY_ROOM_TTL แล้วลบ (กันหน่วยความจำรั่ว) ถ้ามีคนกลับมาก่อนก็ยกเลิก
function checkEmpty(room) {
  if (!alive(room)) return;
  if (connectedPlayers(room).length) { if (room.emptyTimer) { clearTimeout(room.emptyTimer); room.emptyTimer = null; } return; }
  if (room.emptyTimer) return;
  room.emptyTimer = setTimeout(() => {
    if (connectedPlayers(room).length) return;
    if (room.botTimer) clearTimeout(room.botTimer);
    rooms.delete(room.code);
  }, EMPTY_ROOM_TTL);
}
function startGame(room) {
  const humans = connectedPlayers(room);
  if (humans.length < 1 || humans.length > MAX_PLAYERS) return false;
  if (room.botTimer) { clearTimeout(room.botTimer); room.botTimer = null; }
  const stake = Math.max(1, Math.floor(Number(room.options && room.options.stake) || 20));
  // วงเงินสำรองครอบคลุมการจ่ายตามกฎดัมมี่ปัจจุบัน (รวมโบนัส/ตีปี้) ก่อนเริ่มตา
  const exposure = stake * 60 + 500;
  const reserved = [];
  for (const p of humans) {
    if (!p.walletId) continue;
    const rid = room.code + ':' + ((room.round || 0) + 1) + ':' + p.walletId;
    const r = wallet.reserve(p.walletId, rid, exposure, 'reserve game ' + room.code);
    if (!r.ok) {
      reserved.forEach(x => { wallet.release(x.rid, 'game start cancelled'); x.p.reservationId = null; });
      humans.forEach(q => { if (q.connected && q.id && q.walletId) io.to(q.id).emit('wallet:state', wallet.state(q.walletId)); });
      const who = p.name || 'ผู้เล่น';
      connectedPlayers(room).forEach(q => io.to(q.id).emit('system:error', who + ': ' + r.error + ' (เดิมพัน ' + stake + ' 🪙)'));
      return false;
    }
    p.reservationId = rid; reserved.push({ p, rid });
  }
  room.players = humans;                       // คนที่หลุดไปแล้วไม่ถูกนับในตาใหม่
  room.players.forEach((p, i) => { p.seat = i; });
  const deck = room.deck; room.deck = null; room.shuffledBy = null;
  try {
    room.game = ruleOf(room).newGame(room.players.map(p => ({ id: p.id, n: p.name, ch: p.ch, bg: p.bg })), { deck, options: room.options });
  } catch (e) {
    reserved.forEach(x => { wallet.release(x.rid, 'game creation failed'); x.p.reservationId = null; });
    throw e;
  }
  room.game.v++;
  room.players.forEach(p => { if (p.connected && p.id) io.to(p.id).emit('wallet:state', wallet.state(p.walletId)); });
  emitStates(room);
  scheduleBots(room);
  return true;
}
const cleanName = name => String(name == null ? '' : name).replace(/[\u0000-\u001f\u007f]/g, '').trim().slice(0, 14) || 'ผู้เล่น';
function joinRoom(socket, room, name, ch, bg, walletId) {
  if (/^[a-f0-9]{32,64}$/i.test(String(walletId || '')) && room.players.some(p => p.walletId === String(walletId).toLowerCase())) { socket.emit('system:error', 'กระเป๋าเหรียญเดียวกันเข้าห้องนี้ซ้ำไม่ได้'); return false; }
  const w = wallet.ensure(walletId, cleanName(name));
  const p = { id: socket.id, name: cleanName(name), ch: CHARS.includes(ch) ? ch : null, bg: BGS.includes(bg) ? bg : null, connected: true, token: newToken(), walletId: w.walletId, reservationId: null, seat: null };
  room.players.push(p);
  socket.data.roomCode = room.code;
  socket.data.walletId = p.walletId;
  socket.join(room.code);
  checkEmpty(room);
  socket.emit('room:joined', { code: room.code, host: connectedPlayers(room)[0] === p, token: p.token, walletId: p.walletId });
  socket.emit('wallet:state', wallet.state(p.walletId));
  emitLobby(room);
}
// ปล่อยที่นั่งของ socket นี้ — ระหว่างเกม ที่นั่งกลายเป็นบอทแต่เก็บ token ไว้ให้กลับมาเล่นต่อได้
function leaveRoom(socket, disconnected = false, forget = false) {
  const room = rooms.get(socket.data.roomCode);
  if (!room) { socket.data.roomCode = null; return; }
  const p = findPlayer(room, socket.id);
  if (p) {
    if (room.game && p.seat != null && room.game.P[p.seat]) {
      if (active(room)) { const gp = room.game.P[p.seat]; gp.bot = true; gp.id = null; gp.n = p.name + ' (บอท)'; }
      p.connected = false; p.id = null;
      if (forget) p.token = null;              // กดออกเอง = ไม่ให้กลับเข้าที่นั่งเดิม
      emitStates(room);
      scheduleBots(room);
    } else {
      room.players.splice(room.players.indexOf(p), 1);
      emitLobby(room);
    }
  }
  if (!disconnected) socket.leave(room.code);
  socket.data.roomCode = null;
  if (!room.players.length) { if (room.botTimer) clearTimeout(room.botTimer); if (room.emptyTimer) clearTimeout(room.emptyTimer); rooms.delete(room.code); }
  else checkEmpty(room);
}
// เชื่อมต่อกลับด้วย token (รีเฟรชหน้า/เน็ตหลุด) — ได้ที่นั่งเดิมคืน และบอทที่ครองที่นั่งอยู่ถูกปลดออก
function rejoinRoom(socket, code, token) {
  const room = rooms.get(String(code || '').trim().toUpperCase());
  const p = room && token ? room.players.find(x => x.token && x.token === token) : null;
  if (!p) return false;
  if (p.id && p.id !== socket.id) { const old = io.sockets.sockets.get(p.id); if (old) { old.data.roomCode = null; old.leave(room.code); } }
  p.id = socket.id; p.connected = true;
  socket.data.roomCode = room.code; socket.data.walletId = p.walletId; socket.join(room.code);
  if (room.game && p.seat != null && room.game.P[p.seat]) { const gp = room.game.P[p.seat]; gp.bot = false; gp.id = p.id; gp.n = p.name; }
  checkEmpty(room);
  socket.emit('room:joined', { code: room.code, host: connectedPlayers(room)[0] === p, token: p.token, walletId: p.walletId, rejoined: true });
  if (p.walletId) socket.emit('wallet:state', wallet.state(p.walletId));
  emitStates(room);
  emitLobby(room);
  return true;
}
// กันสแปมเหตุการณ์ต่อ socket
function allow(socket) {
  const now = Date.now(), b = socket.data.bucket || (socket.data.bucket = { t: now, n: 0 });
  if (now - b.t >= 1000) { b.t = now; b.n = 0; }
  if (++b.n > RATE_PER_SEC) { socket.emit('system:error', 'ส่งคำสั่งเร็วเกินไป'); return false; }
  return true;
}
// รับเฉพาะฟิลด์ที่ engine ใช้จริง และจำกัดขนาด
function cleanAction(a) {
  if (!a || typeof a !== 'object') return null;
  const out = { t: String(a.t || '') };
  if (Array.isArray(a.ids)) out.ids = a.ids.slice(0, 24).map(Number);
  for (const k of ['i', 'k', 'id']) if (a[k] != null) out[k] = Number(a[k]);
  return out;
}
// exception ใน handler ของ socket.io ที่ไม่ถูกดักจะทำให้โปรเซสล้มทั้งตัว (payload จาก client เชื่อถือไม่ได้) จึงห่อทุก handler
const on = (socket, ev, fn) => socket.on(ev, (...a) => { try { fn(...a); } catch (e) { console.error('handler error:', ev, e && e.message); } });
const obj = d => (d && typeof d === 'object' && !Array.isArray(d) ? d : {});
app.get('/health', (_req, res) => res.json({ ok: true, service: 'dummy-online-4p', version: VERSION, rules: Rules.list().map(r => r.id), rooms: rooms.size }));
app.get('/', (_req, res) => res.send('Dummy Online backend is running'));

const rulesPayload = () => ({ version: VERSION, default: Rules.DEFAULT, rules: Rules.list() });
io.on('connection', socket => {
  socket.emit('system:notice', 'เชื่อมต่อเซิร์ฟเวอร์แล้ว');
  socket.emit('rules:list', rulesPayload()); // รายการกฎ + ตัวเลือกของแต่ละกฎ ให้ client สร้างหน้าตั้งค่าห้องเอง
  on(socket, 'rules:get', () => { if (allow(socket)) socket.emit('rules:list', rulesPayload()); });
  on(socket, 'wallet:open', d => { if (!allow(socket)) return; const { walletId, name } = obj(d); const w = wallet.ensure(walletId, cleanName(name)); socket.data.walletId = w.walletId; socket.emit('wallet:state', wallet.state(w.walletId)); });
  on(socket, 'wallet:spend', d => { if (!allow(socket)) return; const walletId = socket.data.walletId; if (!walletId) return socket.emit('wallet:spend-result', { ok: false, error: 'กรุณาเชื่อมต่อกระเป๋าเหรียญก่อน' }); const { amount, transactionId, itemId } = obj(d); const key = String(itemId || ''), sep = key.indexOf(':'), kind = sep < 0 ? '' : key.slice(0, sep), id = sep < 0 ? '' : key.slice(sep + 1); const item = SKIN_CATALOG && Array.isArray(SKIN_CATALOG[kind]) ? SKIN_CATALOG[kind].find(x => x.id === id) : null; const price = item ? Math.floor(Number(item.price) || 0) : -1; if (!item || price <= 0 || Number(amount) !== price) { socket.emit('wallet:spend-result', { ok: false, error: 'สินค้า/ราคาไม่ถูกต้อง', itemId: key }); return; } const r = wallet.spend(walletId, transactionId, price, 'shop item ' + key); socket.emit('wallet:spend-result', { ...r, itemId: key }); socket.emit('wallet:state', wallet.state(walletId)); });
  on(socket, 'room:create', d => { const { name, ch, bg, rule, options, walletId } = obj(d);
    if (!allow(socket)) return;
    if (socket.data.roomCode) return socket.emit('system:error', 'คุณอยู่ในห้องแล้ว');
    if (rooms.size >= MAX_ROOMS) return socket.emit('system:error', 'เซิร์ฟเวอร์เต็มชั่วคราว ลองใหม่อีกครั้ง');
    let code; do { code = roomCode(); } while (rooms.has(code));
    const rid = Rules.has(rule) ? rule : Rules.DEFAULT;
    if (Rules.get(rid).meta.enabled === false) return socket.emit('system:error', 'กติกานี้ยังไม่เปิดให้เล่น ต้องยืนยันกติกาท้องถิ่นก่อน');
    const room = { code, rule: rid, options: Rules.cleanOptions(rid, options), players: [], game: null, botTimer: null, emptyTimer: null, deck: null, shuffledBy: null, shuffleSeq: 0, lastWinner: null, round: 0 };
    rooms.set(code, room);
    joinRoom(socket, room, name, ch, bg, walletId);
  });
  on(socket, 'room:join', d => { const { code, name, ch, bg, walletId } = obj(d);
    if (!allow(socket)) return;
    if (socket.data.roomCode) return socket.emit('system:error', 'คุณอยู่ในห้องแล้ว');
    const room = rooms.get(String(code || '').trim().toUpperCase());
    if (!room) return socket.emit('system:error', 'ไม่พบห้องนี้');
    if (active(room)) return socket.emit('system:error', 'เกมเริ่มแล้ว เข้าห้องไม่ได้');
    if (connectedPlayers(room).length >= Math.min(MAX_PLAYERS, ruleOf(room).meta.maxPlayers || MAX_PLAYERS)) return socket.emit('system:error', 'ห้องเต็มแล้ว (' + Math.min(MAX_PLAYERS, ruleOf(room).meta.maxPlayers || MAX_PLAYERS) + ' คน)');
    joinRoom(socket, room, name, ch, bg, walletId);
  });
  on(socket, 'room:rejoin', d => { const { code, token } = obj(d);
    if (!allow(socket)) return;
    if (socket.data.roomCode) return;
    if (!rejoinRoom(socket, code, token)) socket.emit('room:rejoin-failed');
  });
  on(socket, 'game:start', () => {
    if (!allow(socket)) return;
    const room = rooms.get(socket.data.roomCode);
    if (!room) return socket.emit('system:error', 'กรุณาเข้าห้องก่อน');
    if (connectedPlayers(room)[0]?.id !== socket.id) return socket.emit('system:error', 'เฉพาะเจ้าของห้องเริ่มเกมได้');
    if (active(room)) return socket.emit('system:error', 'เกมกำลังเล่นอยู่');
    if (ruleOf(room).meta.enabled === false) return socket.emit('system:error', 'กติกานี้ยังไม่เปิดให้เล่น ต้องยืนยันกติกาท้องถิ่นก่อน');
    if (!room.deck && needShuffle(room)) { const sh = shufflerOf(room); return socket.emit('system:error', 'ต้องให้ ' + (sh ? sh.name : 'ผู้สับไพ่') + ' กดสับไพ่ก่อนเริ่มเกม'); }
    if (!startGame(room)) return socket.emit('system:error', 'เริ่มเกมไม่ได้');
    io.to(room.code).emit('system:notice', 'เริ่มเกมแล้ว!');
  });
  // สับไพ่ก่อนเริ่มตา: เจ้าของห้อง (ตาแรก) หรือผู้ชนะตาก่อนหน้า (ตาถัดไป) เท่านั้น — สับซ้ำได้จนกว่าจะเริ่มเกม
  on(socket, 'game:shuffle', () => {
    if (!allow(socket)) return;
    const room = rooms.get(socket.data.roomCode);
    if (!room) return socket.emit('system:error', 'กรุณาเข้าห้องก่อน');
    if (active(room)) return socket.emit('system:error', 'เกมกำลังเล่นอยู่ สับไพ่ไม่ได้');
    const sh = shufflerOf(room);
    if (!sh || sh.id !== socket.id) return socket.emit('system:error', 'สิทธิ์สับไพ่เป็นของ ' + (sh ? sh.name : 'เจ้าของห้อง') + (room.round ? ' (ผู้ชนะตาก่อนหน้า)' : ' (เจ้าของห้อง)'));
    const r = Shuffle.shuffle();
    room.deck = r.ids; room.shuffledBy = sh.name; room.shuffleSeq = (room.shuffleSeq || 0) + 1;
    io.to(room.code).emit('room:shuffled', { by: sh.name, seq: room.shuffleSeq, steps: r.steps.map(x => x.t) }); // ส่งแค่ชนิดท่าสับสำหรับแอนิเมชัน ไม่ส่งลำดับไพ่
    emitLobby(room);
  });
  on(socket, 'game:act', raw => {
    if (!allow(socket)) return;
    const room = rooms.get(socket.data.roomCode);
    if (!room || !room.game) return socket.emit('system:error', 'ยังไม่มีเกมที่กำลังเล่น');
    const p = findPlayer(room, socket.id);
    if (!p || p.seat == null) return socket.emit('system:error', 'ไม่พบที่นั่งของคุณ');
    const action = cleanAction(raw);
    if (!action) return socket.emit('system:error', 'คำสั่งไม่ถูกต้อง');
    const msg = ruleOf(room).act(room.game, p.seat, action);
    if (msg) { socket.emit('game:action-result', { ok: false, error: msg, action: action.t }); return socket.emit('system:error', msg); }
    socket.emit('game:action-result', { ok: true, action: action.t });
    room.game.v++;
    emitStates(room);
    scheduleBots(room);
  });
  on(socket, 'room:leave', () => { if (allow(socket)) leaveRoom(socket, false, true); });
  on(socket, 'disconnect', () => leaveRoom(socket, true));
});
if (require.main === module) server.listen(PORT, () => console.log(`Dummy Online backend listening on ${PORT}`));
module.exports = { server, io, rooms, wallet };
