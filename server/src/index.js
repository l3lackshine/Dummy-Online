const express = require('express');
const http = require('http');
const cors = require('cors');
const { Server } = require('socket.io');
const crypto = require('crypto');
const Rules = require('./rules');
const { CHARS, BGS } = require('./rules/common');
const VERSION = require('../package.json').version;
const Shuffle = require('./shuffle');
const SB = require('./supabase');   // บัญชีผู้เล่น + บันทึกผลเกมลง Supabase (ปิดเองถ้าไม่ได้ตั้งค่า)

const PORT = process.env.PORT || 3000;
const ALLOWED_ORIGIN = process.env.CLIENT_ORIGIN || '*';
const APP_ORIGINS = ['https://localhost', 'http://localhost', 'capacitor://localhost']; // WebView ของแอป Android/iOS (Capacitor) — อนุญาตเสมอ แม้ตั้ง CLIENT_ORIGIN เจาะจงเว็บ
const ORIGINS = ALLOWED_ORIGIN === '*' ? true : [...ALLOWED_ORIGIN.split(','), ...APP_ORIGINS];
const app = express();
app.use(cors({ origin: ORIGINS }));
app.use(express.json());
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: ALLOWED_ORIGIN === '*' ? '*' : ORIGINS, methods: ['GET', 'POST'] }, maxHttpBufferSize: 1e5 });
const rooms = new Map();
const MAX_PLAYERS = 4;
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
    code: room.code, started: active(room), maxPlayers: MAX_PLAYERS,
    rule: { id: ruleOf(room).meta.id, name: ruleOf(room).meta.name }, options: room.options,
    youHost: !!forPlayer && forPlayer === host,
    // ไม่ส่งลำดับไพ่ที่สับแล้วออกไปเด็ดขาด — ส่งแค่ว่าสับแล้วหรือยัง
    shuffle: { ready: !!room.deck, needed: needShuffle(room), by: room.shuffledBy || null, shuffler: sh ? sh.name : null, youShuffler: !!forPlayer && forPlayer === sh, round: room.round || 0, seq: room.shuffleSeq || 0 },
    allowBots: room.allowBots !== false, // ห้องนี้เติมบอทในที่นั่งว่างหรือไม่ (ตั้งตอนสร้างห้อง เปลี่ยนไม่ได้ระหว่างเล่น)
    players: room.players.map(p => ({ name: p.name, ch: p.ch, bg: p.bg, connected: p.connected, host: p === host, shuffler: p === sh, seat: p.seat, you: !!forPlayer && p === forPlayer })),
  };
}
// จบตาแล้วจดผู้ชนะไว้ (ครั้งเดียวต่อเกม) เพื่อมอบสิทธิ์สับไพ่ตาถัดไป
function settle(room) {
  const G = room.game;
  if (!G || !G.over || G.settled) return;
  G.settled = true;
  const seat = ruleOf(room).winner(G);
  const w = seat == null ? null : room.players.find(p => p.seat === seat);
  recordResults(room);
  room.lastWinner = w || null;                 // ผู้ชนะเป็นบอท → ไม่มีคนจริงรับสิทธิ์ → เจ้าของห้องสับแทน
  room.round = (room.round || 0) + 1;
}
function emitLobby(room) { connectedPlayers(room).forEach(p => io.to(p.id).emit('room:lobby', publicLobby(room, p))); }
function emitStates(room) {
  if (!room.game) return;
  settle(room);
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
  room.players = humans;                       // คนที่หลุดไปแล้วไม่ถูกนับในตาใหม่
  room.players.forEach((p, i) => { p.seat = i; });
  const deck = room.deck; room.deck = null; room.shuffledBy = null;   // สำรับที่สับไว้ใช้ได้ครั้งเดียว ตาถัดไปต้องสับใหม่
  const minSeats = room.allowBots === false ? humans.length : MAX_PLAYERS; // ปิดบอท → ไม่เติมที่นั่งว่าง เล่นเท่าจำนวนคนจริง
  room.game = ruleOf(room).newGame(room.players.map(p => ({ id: p.id, n: p.name, ch: p.ch, bg: p.bg })), { deck, options: room.options, minSeats }); // ไม่มีสำรับ (เล่นคนเดียว) → engine สับเองด้วยเอนจิ้นเดียวกัน
  room.game.v++;
  if (SB.enabled()) room.players.forEach(p => { if (p.uid) SB.rpc('touch_last_game', { p_user: p.uid, p_game: room.rule }).catch(() => {}); });
  emitStates(room);
  scheduleBots(room);
  return true;
}
const cleanName = name => String(name == null ? '' : name).replace(/[\u0000-\u001f\u007f]/g, '').trim().slice(0, 14) || 'ผู้เล่น';
function joinRoom(socket, room, name, ch, bg) {
  const p = { id: socket.id, uid: socket.data.uid || null, name: cleanName(socket.data.uname || name), ch: CHARS.includes(ch) ? ch : null, bg: BGS.includes(bg) ? bg : null, connected: true, token: newToken(), seat: null };
  room.players.push(p);
  socket.data.roomCode = room.code;
  socket.join(room.code);
  checkEmpty(room);
  socket.emit('room:joined', { code: room.code, host: connectedPlayers(room)[0] === p, token: p.token });
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
  socket.data.roomCode = room.code; socket.join(room.code);
  if (room.game && p.seat != null && room.game.P[p.seat]) { const gp = room.game.P[p.seat]; gp.bot = false; gp.id = p.id; gp.n = p.name; }
  checkEmpty(room);
  socket.emit('room:joined', { code: room.code, host: connectedPlayers(room)[0] === p, token: p.token, rejoined: true });
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

// ===== ตรวจตัวตน: เมื่อเปิดใช้ Supabase ต้องแนบ access token ตอนเชื่อมต่อ (client ส่งใน auth.token) =====
io.use(async (socket, next) => {
  if (!SB.enabled()) return next();
  const u = await SB.verifyToken(socket.handshake.auth && socket.handshake.auth.token);
  if (!u) return next(new Error('unauthorized'));
  socket.data.uid = u.id; socket.data.uname = u.name;
  next();
});
// เมื่อจบตา: ส่งผลของผู้เล่นที่ล็อกอินแต่ละคนไปบันทึก (เหรียญ/สถิติ/เควส) แล้วแจ้งยอดใหม่กลับไปที่ client
function recordResults(room) {
  if (!SB.enabled()) return;
  const G = room.game, rid = room.rule, win = ruleOf(room).winner(G), gid = String(G.gid || room.code + ':' + room.round);
  for (const p of room.players) {
    if (!p.uid || p.seat == null || !G.P[p.seat]) continue;
    const seat = p.seat, delta = Math.round(Number(G.res && G.res.coin && G.res.coin.delta ? G.res.coin.delta[seat] : 0)) || 0;
    const args = { p_user: p.uid, p_gid: gid, p_game: rid, p_delta: delta, p_won: win === seat,
      p_melds: rid === 'dummy' ? (G.melds || []).filter(m => m.o === seat).length : 0, p_knock: rid === 'dummy' && !!G.res && G.res.k === seat, p_char: p.ch || null };
    SB.rpcRetry('record_game_result', args).then(r => { if (r && p.id) io.to(p.id).emit('wallet:update', { gid, ...r }); })
      .catch(e => console.error('record_game_result failed', e && e.message));
  }
}
const rulesPayload = () => ({ version: VERSION, default: Rules.DEFAULT, rules: Rules.list() });
io.on('connection', socket => {
  socket.emit('system:notice', 'เชื่อมต่อเซิร์ฟเวอร์แล้ว');
  socket.emit('rules:list', rulesPayload()); // รายการกฎ + ตัวเลือกของแต่ละกฎ ให้ client สร้างหน้าตั้งค่าห้องเอง
  on(socket, 'rules:get', () => { if (allow(socket)) socket.emit('rules:list', rulesPayload()); });
  on(socket, 'room:create', d => { const { name, ch, bg, rule, options, bots } = obj(d);
    if (!allow(socket)) return;
    if (socket.data.roomCode) return socket.emit('system:error', 'คุณอยู่ในห้องแล้ว');
    if (rooms.size >= MAX_ROOMS) return socket.emit('system:error', 'เซิร์ฟเวอร์เต็มชั่วคราว ลองใหม่อีกครั้ง');
    let code; do { code = roomCode(); } while (rooms.has(code));
    const rid = Rules.has(rule) ? rule : Rules.DEFAULT;
    // bots: false เฉพาะห้องที่สร้างเอง (ไม่ใช่โหมดเล่นคนเดียว) — ปิดได้ = ไม่เติมบอทในที่นั่งว่าง ต้องรอผู้เล่นจริง
    const room = { code, rule: rid, options: Rules.cleanOptions(rid, options), allowBots: bots !== false, players: [], game: null, botTimer: null, emptyTimer: null, deck: null, shuffledBy: null, shuffleSeq: 0, lastWinner: null, round: 0 };
    rooms.set(code, room);
    joinRoom(socket, room, name, ch, bg);
  });
  on(socket, 'room:join', d => { const { code, name, ch, bg } = obj(d);
    if (!allow(socket)) return;
    if (socket.data.roomCode) return socket.emit('system:error', 'คุณอยู่ในห้องแล้ว');
    const room = rooms.get(String(code || '').trim().toUpperCase());
    if (!room) return socket.emit('system:error', 'ไม่พบห้องนี้');
    if (active(room)) return socket.emit('system:error', 'เกมเริ่มแล้ว เข้าห้องไม่ได้');
    if (connectedPlayers(room).length >= MAX_PLAYERS) return socket.emit('system:error', 'ห้องเต็มแล้ว (4 คน)');
    joinRoom(socket, room, name, ch, bg);
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
    if (room.allowBots === false && connectedPlayers(room).length < 2) return socket.emit('system:error', 'ห้องนี้ปิดบอทไว้ ต้องมีผู้เล่นจริงอย่างน้อย 2 คนก่อนเริ่มเกม');
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
  // ===== สกิล "ป่วนสายตา": เซิร์ฟเวอร์แค่ตรวจโควตา/คูลดาวน์ แล้วส่งเอฟเฟกต์ภาพไปให้เป้าหมาย (ไม่แตะกติกา/ไพ่จริง) =====
  on(socket, 'skill:use', raw => {
    if (!allow(socket)) return; const d = obj(raw);
    const room = rooms.get(socket.data.roomCode); if (!room || !room.game) return;
    const p = findPlayer(room, socket.id); if (!p || p.seat == null) return;
    const res = (ok, error) => socket.emit('skill:result', { ok, id: 'scramble', error });
    if (d.id !== 'scramble') return res(false, 'สกิลนี้ยังไม่รองรับ');
    const t = room.players.find(x => x.seat === Number(d.to) && x.connected && x.id && x.seat !== p.seat);
    if (!t) return res(false, 'เป้าหมายต้องเป็นผู้เล่นจริงคนอื่นที่ออนไลน์อยู่');
    const sk = room.skUse && room.skUse.game === room.game ? room.skUse : (room.skUse = { game: room.game, m: {} });
    const m = sk.m[p.seat] || (sk.m[p.seat] = { n: 0, at: 0, last: null }), now = Date.now();
    if (m.n >= 2) return res(false, 'ใช้ครบโควตาของเกมนี้แล้ว');
    if (now - m.at < 18000) return res(false, 'สกิลยังคูลดาวน์');
    if (m.last === t.seat) return res(false, 'ใช้ซ้ำกับคนเดิมติดกันไม่ได้');
    const ms = Math.min(6000, Math.max(3000, Math.round(Number(d.ms) || 5000)));
    m.n++; m.at = now; m.last = t.seat;
    io.to(t.id).emit('skill:fx', { type: 'scramble', from: p.name, ms });
    io.to(room.code).emit('system:notice', p.name + ' ใช้ 🎭 ป่วนสายตา ใส่ ' + t.name);
    res(true);
  });
  on(socket, 'room:leave', () => { if (allow(socket)) leaveRoom(socket, false, true); });
  on(socket, 'disconnect', () => leaveRoom(socket, true));
});
if (require.main === module) server.listen(PORT, () => console.log(`Dummy Online backend listening on ${PORT}`));
module.exports = { server, io, rooms };
