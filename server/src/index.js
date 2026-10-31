const express = require('express');
const http = require('http');
const cors = require('cors');
const { Server } = require('socket.io');
const crypto = require('crypto');
const Rules = require('./rules');
const { CHARS, BGS } = require('./rules/common');
const VERSION = require('../package.json').version;
const Shuffle = require('./shuffle');
const SB = require('./supabase');
const Skills = require('./skills'); // สกิลที่ต้องเช็กสิทธิ์ + ตรวจว่ามีตัวละคร/กรอบจริง   // บัญชีผู้เล่น + บันทึกผลเกมลง Supabase (ปิดเองถ้าไม่ได้ตั้งค่า)

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
const OPENING_MS = Number(process.env.OPENING_MS != null ? process.env.OPENING_MS : 5000); // เวลาให้แอนิเมชันสับ+แจกไพ่ก่อนบอทเดินตาแรก
const NEXT_MS = Number(process.env.NEXT_MS != null ? process.env.NEXT_MS : 20000); // เวลาให้ทุกคนกด 'เล่นต่อ' หลังจบตา (0 = ปิดระบบนี้)
const MATCH_WAIT_MS = Number(process.env.MATCH_WAIT_MS || 20000), MATCH_PROMPT_MS = Number(process.env.MATCH_PROMPT_MS || 10000), MATCH_CD_MS = Number(process.env.MATCH_CD_MS || 5000); // Find Match: รอหาคน / เวลาโหวต / นับถอยหลังก่อนเริ่ม
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
const needShuffle = () => false;   // เซิร์ฟเวอร์สับให้เองตอนเริ่มเกม (ผู้เล่นไม่ต้องกดสับ) — คงฟังก์ชันไว้ให้ไคลเอนต์รุ่นเก่า
function publicLobby(room, forPlayer) {
  settle(room);                                // idempotent: ให้ล็อบบี้สะท้อนผู้ชนะตาก่อนเสมอ
  const host = connectedPlayers(room)[0], sh = shufflerOf(room);
  const others = connectedPlayers(room).filter(p => p !== host), allReady = others.every(p => p.ready); // เจ้าของห้องถือว่าพร้อมเสมอ
  return {
    code: room.code, started: active(room), maxPlayers: MAX_PLAYERS,
    rule: { id: ruleOf(room).meta.id, name: ruleOf(room).meta.name }, options: room.options,
    youHost: !!forPlayer && forPlayer === host,
    // ไม่ส่งลำดับไพ่ที่สับแล้วออกไปเด็ดขาด — ส่งแค่ว่าสับแล้วหรือยัง
    shuffle: { ready: !!room.deck, needed: needShuffle(room), by: room.shuffledBy || null, shuffler: sh ? sh.name : null, youShuffler: !!forPlayer && forPlayer === sh, round: room.round || 0, seq: room.shuffleSeq || 0 },
    allowBots: room.allowBots !== false, // ห้องนี้เติมบอทในที่นั่งว่างหรือไม่ (ตั้งตอนสร้างห้อง เปลี่ยนไม่ได้ระหว่างเล่น)
    allReady, waitingFor: others.filter(p => !p.ready).map(p => p.name),
    match: room.match ? { state: room.match.state, humans: connectedPlayers(room).length, max: MAX_PLAYERS, waitedMs: Date.now() - (room.match.since || Date.now()), cdLeftMs: room.match.state === 'countdown' ? Math.max(0, room.match.cdUntil - Date.now()) : null,
      prompt: room.match.prompt ? { leftMs: Math.max(0, room.match.prompt.until - Date.now()), voted: forPlayer ? (room.match.prompt.votes[forPlayer.id] || null) : null } : null } : null,
    next: room.next ? { leftMs: room.next.until ? Math.max(0, room.next.until - Date.now()) : null } : null,
    players: room.players.map(p => ({ name: p.name, ch: p.ch, bg: p.bg, fr: p.fr || null, s5: !!p.s5, connected: p.connected, host: p === host, ready: p === host || !!p.ready, again: !!p.again, farm: forPlayer && p === forPlayer ? p.farm : undefined, shuffler: p === sh, seat: p.seat, you: !!forPlayer && p === forPlayer })),
  };
}
// จบตาแล้วจดผู้ชนะไว้ (ครั้งเดียวต่อเกม) เพื่อมอบสิทธิ์สับไพ่ตาถัดไป
function settle(room) {
  const G = room.game;
  if (!G || !G.over || G.settled) return;
  G.settled = true;
  const seat = ruleOf(room).winner(G);
  const w = seat == null ? null : room.players.find(p => p.seat === seat);
  if (!room.tutorial) recordResults(room);   // ตาสอนเล่นไม่นับผล ไม่หักสตามิน่า
  room.lastWinner = w || null;                 // ผู้ชนะเป็นบอท → ไม่มีคนจริงรับสิทธิ์ → เจ้าของห้องสับแทน
  room.round = (room.round || 0) + 1;
  openNext(room);
}
// ===== หลังจบตา: ทุกคนกด "เล่นต่อ" → เริ่มตาใหม่ · ใครกดออก/หมดเวลา → ที่เหลือกลับไปล็อบบี้ =====
function openNext(room) {
  if (NEXT_MS <= 0 || room.next) return;
  const humans = connectedPlayers(room); if (!humans.length) return;
  humans.forEach(p => { p.again = false; });
  const n = { until: humans.length > 1 ? Date.now() + NEXT_MS : null, n0: humans.length, timer: null };   // คนเดียว (เล่นกับบอท) = ไม่มีเวลาหมด
  if (n.until) { n.timer = setTimeout(() => expireNext(room), NEXT_MS); if (n.timer.unref) n.timer.unref(); }
  room.next = n;
}
function closeNext(room) { if (room.next && room.next.timer) clearTimeout(room.next.timer); room.next = null; }
// พากลุ่มที่เหลือกลับล็อบบี้ (คนที่เคยกดเล่นต่อไว้ถือว่าพร้อมแล้ว) — ใช้เมื่อมีคนออก/หมดเวลา
function toLobby(room, notice) {
  closeNext(room);
  if (room.botTimer) { clearTimeout(room.botTimer); room.botTimer = null; }
  room.players = connectedPlayers(room); room.game = null; room.deck = null;
  room.players.forEach(p => { p.seat = null; p.ready = p.again === true; p.again = false; });
  if (room.match) { room.match.state = 'searching'; room.match.since = Date.now(); room.match.prompt = null; clearMatchTimers(room); matchTick(room); }
  room.players.forEach(p => io.to(p.id).emit('room:lobbyback', { notice: notice || '' }));
  if (notice) io.to(room.code).emit('system:notice', notice);
  emitLobby(room);
}
function startNext(room) { closeNext(room); if (startGame(room)) io.to(room.code).emit('system:notice', 'เริ่มตาใหม่!'); }
function checkNext(room) { // เรียกทุกครั้งที่สถานะเปลี่ยน: ทุกคนยืนยันแล้ว → เริ่ม
  const n = room.next; if (!n || !room.game || !room.game.over) return;
  const humans = connectedPlayers(room); if (!humans.length) return closeNext(room);
  if (humans.length < n.n0) return toLobby(room, 'มีผู้เล่นออกจากห้อง — กลับสู่ล็อบบี้เพื่อหาผู้เล่นเพิ่ม');
  if (humans.every(p => p.again)) startNext(room);
  else emitLobby(room);
}
function expireNext(room) {
  if (!alive(room) || !room.next) return; room.next.timer = null;
  const late = connectedPlayers(room).filter(p => !p.again);
  if (!late.length) return checkNext(room);
  late.forEach(p => { const sk = io.sockets.sockets.get(p.id); io.to(p.id).emit('room:kicked', { reason: 'ไม่ได้กดเล่นต่อภายในเวลาที่กำหนด' }); p.connected = false; p.id = null; p.token = null; if (sk) { sk.leave(room.code); sk.data.roomCode = null; } });
  if (connectedPlayers(room).length) toLobby(room, late.map(p => p.name).join(', ') + ' ไม่ได้กดเล่นต่อ — กลับสู่ล็อบบี้'); else { rooms.delete(room.code); }
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
  }, Math.max(BOT_DELAY, (room.openingUntil || 0) - Date.now()));
}
// ห้องที่ไม่มีคนจริงเชื่อมต่ออยู่ → รอ EMPTY_ROOM_TTL แล้วลบ (กันหน่วยความจำรั่ว) ถ้ามีคนกลับมาก่อนก็ยกเลิก
function checkEmpty(room) {
  if (!alive(room)) return;
  if (connectedPlayers(room).length) { if (room.emptyTimer) { clearTimeout(room.emptyTimer); room.emptyTimer = null; } return; }
  if (room.emptyTimer) return;
  room.emptyTimer = setTimeout(() => {
    if (connectedPlayers(room).length) return;
    if (room.botTimer) clearTimeout(room.botTimer);
    clearMatchTimers(room); rooms.delete(room.code);
  }, EMPTY_ROOM_TTL);
}
// ===== Find Match: จับคู่ผู้เล่นออนไลน์ (กติกา+ตัวเลือกเดียวกัน) เข้าห้องจับคู่ → ครบ 4 คนนับถอยหลังแล้วเริ่มเอง =====
// ไม่ครบในเวลา → ถามผู้เล่นทุกคน "รอต่อ / เติมบอท" (เติมบอทเมื่อทุกคนเลือกเติม) · ผู้เล่นออกระหว่างนับถอยหลัง → ยกเลิกนับ กลับไปหาคน
const matchTimer = (m, k, ms, fn) => { clearTimeout(m[k]); m[k] = setTimeout(fn, ms); if (m[k].unref) m[k].unref(); };
function clearMatchTimers(room) { const m = room.match; if (!m) return; ['waitTimer', 'promptTimer', 'cdTimer'].forEach(k => { clearTimeout(m[k]); m[k] = null; }); }
function armSearch(room) { const m = room.match; m.since = m.since || Date.now(); matchTimer(m, 'waitTimer', MATCH_WAIT_MS, () => openPrompt(room)); }
function matchTick(room, emit) { // เรียกหลังคนเข้า/ออก
  const m = room.match; if (!m || room.game) return; const n = connectedPlayers(room).length; if (!n) return;
  if (n >= MAX_PLAYERS) return startCountdown(room);
  if (m.state === 'countdown') { clearTimeout(m.cdTimer); m.cdTimer = null; m.state = 'searching'; m.cdUntil = null; }
  if (!m.waitTimer && !m.prompt) armSearch(room);
  if (emit) emitLobby(room);
}
function startCountdown(room) {
  const m = room.match; if (m.state === 'countdown') return;
  clearMatchTimers(room); m.prompt = null; m.state = 'countdown'; m.cdUntil = Date.now() + MATCH_CD_MS;
  matchTimer(m, 'cdTimer', MATCH_CD_MS, () => { m.cdTimer = null; if (room.game) return; if (connectedPlayers(room).length < MAX_PLAYERS) return matchTick(room, true); connectedPlayers(room).forEach(p => { p.ready = true; }); startGame(room); });
  emitLobby(room);
}
function openPrompt(room) {
  const m = room.match; m.waitTimer = null; const n = connectedPlayers(room).length;
  if (!m || room.game || m.state !== 'searching' || n < 1 || n >= MAX_PLAYERS) return;
  m.prompt = { until: Date.now() + MATCH_PROMPT_MS, votes: {} }; matchTimer(m, 'promptTimer', MATCH_PROMPT_MS, () => resolvePrompt(room)); emitLobby(room);
}
function resolvePrompt(room) {
  const m = room.match; if (!m || !m.prompt) return; clearTimeout(m.promptTimer); m.promptTimer = null;
  const humans = connectedPlayers(room), votes = m.prompt.votes; m.prompt = null;
  if (humans.length && humans.every(p => votes[p.id] === 'bots')) { humans.forEach(p => { p.ready = true; }); return void startGame(room); }  // ทุกคนเลือกเติมบอท
  armSearch(room); io.to(room.code).emit('system:notice', 'ยังรอผู้เล่นเพิ่มต่อไป…'); emitLobby(room);
}
function startGame(room) {
  const humans = connectedPlayers(room);
  if (humans.length < 1 || humans.length > MAX_PLAYERS) return false;
  if (room.botTimer) { clearTimeout(room.botTimer); room.botTimer = null; }
  room.players = humans;                       // คนที่หลุดไปแล้วไม่ถูกนับในตาใหม่
  room.players.forEach((p, i) => { p.seat = i; });
  const sh = room.deck ? null : Shuffle.shuffle(), deck = room.deck || sh.ids; room.deck = null; room.shuffledBy = null; room.shuffleSeq = (room.shuffleSeq || 0) + 1; // สับใหม่ทุกตาโดยเซิร์ฟเวอร์
  room.players.forEach(p => { p.ready = false; });   // สำรับที่สับไว้ใช้ได้ครั้งเดียว ตาถัดไปต้องสับใหม่
  const minSeats = room.allowBots === false ? humans.length : MAX_PLAYERS; // ปิดบอท → ไม่เติมที่นั่งว่าง เล่นเท่าจำนวนคนจริง
  const tut = room.tutorial && room.rule === 'dummy' ? DummyTutorial : null;   // ห้องสอนเล่น: สำรับจัดไว้ + บอทตามสคริปต์ (ตาจริงสับด้วยเอนจินปกติเสมอ)
  room.game = ruleOf(room).newGame(room.players.map(p => ({ id: p.id, n: p.name, ch: p.ch, bg: p.bg })), tut ? { deck: tut.deck(), options: room.options, minSeats: MAX_PLAYERS, first: 0, script: tut.script() } : { deck, options: room.options, minSeats }); // ไม่มีสำรับ (เล่นคนเดียว) → engine สับเองด้วยเอนจิ้นเดียวกัน
  room.game.humans0 = room.players.length; room.game.bots0 = room.game.P.length - room.players.length;   // ตัดสินตอนเริ่ม: คนหลุดกลางเกมแล้วบอทเล่นแทน ไม่ทำให้กลายเป็นเกมบอท
  closeNext(room); if (room.match) { clearMatchTimers(room); room.match.state = 'playing'; room.match.prompt = null; } room.game.v++; room.openingUntil = Date.now() + OPENING_MS;
  if (SB.enabled()) room.players.forEach(p => { if (p.uid) SB.rpc('touch_last_game', { p_user: p.uid, p_game: room.rule }).catch(() => {}); });
  emitStates(room);
  scheduleBots(room);
  return true;
}
const NameFilter = require('./namefilter');
const Economy = require('./economy');
const DummyTutorial = require('./rules/dummy/tutorial');
const cleanName = name => NameFilter.clean(name, 'ผู้เล่น'); // ตัดอักขระควบคุม · ยาวไม่เกิน 14 · ชื่อหยาบ/แอบอ้างทีมงาน → "ผู้เล่น"
const cleanFrame = f => (typeof f === 'string' && /^[a-z0-9-]{1,40}$/.test(f) ? f : null); // กรอบการ์ด (ของแต่งเท่านั้น ไม่มีผลกับเกม)
const cleanFarm = f => (Economy.FARM[f] ? f : 'coins');   // โหมดฟาร์มเมื่อเล่นกับบอท (ดู economy.js FARM)
function joinRoom(socket, room, name, ch, bg, fr, s5, farm, e2) {
  const p = { id: socket.id, uid: socket.data.uid || null, name: cleanName(socket.data.uname || name), ch: CHARS.includes(ch) ? ch : null, bg: BGS.includes(bg) ? bg : null, fr: cleanFrame(fr), s5: s5 === true, e2: e2 === true, farm: cleanFarm(farm), connected: true, token: newToken(), seat: null, ready: false };
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
  if (!room.players.length) { closeNext(room); clearMatchTimers(room); if (room.botTimer) clearTimeout(room.botTimer); if (room.emptyTimer) clearTimeout(room.emptyTimer); rooms.delete(room.code); }
  else { checkEmpty(room); checkNext(room); if (room.match && !room.game) matchTick(room, true); }
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
// โหมดบัญชี: ตรวจว่าผู้เล่นมีตัวละคร/กรอบที่ส่งมาจริงก่อนเข้าห้อง (ไม่มี/ตรวจไม่ได้ = ใช้ค่าว่าง) · โหมดในเครื่อง = ผ่านทันที
function withOwned(socket, raw, fn) {
  const d = obj(raw);
  // fr === 'char' = ขอใช้กรอบประจำตัวละคร (ปลด 4★) → กลายเป็น 'ch-<ตัวละคร>' เมื่อดาวถึง
  const claim = { s5: d.s5 === true, e2: d.e2 === true, cf: d.fr === 'char' };
  const perkFrame = (ch, fr, pk) => (pk.cf && ch ? 'ch-' + ch : fr === 'char' ? null : fr);
  if (!(SB.enabled() && socket.data.uid)) { const pk = { s5: claim.s5, e2: claim.e2, cf: claim.cf }; return fn(Object.assign({}, d, pk, { fr: perkFrame(d.ch, d.fr, pk) })); }
  // พื้นหลังแสดงในช่องที่นั่งให้ทุกคนเห็น → ต้องมีของจริงด้วย
  Promise.all([Skills.verifyOwned(SB, socket.data.uid, 'characters', d.ch), d.fr === 'char' ? null : Skills.verifyOwned(SB, socket.data.uid, 'frames', d.fr), Skills.verifyOwned(SB, socket.data.uid, 'backgrounds', d.bg)])
    .then(([ch, fr, bg]) => Skills.verifyStarPerks(SB, socket.data.uid, ch, claim).then(pk => [ch, fr, bg, pk]))
    .then(([ch, fr, bg, pk]) => { try { fn(Object.assign({}, d, { ch, bg, fr: perkFrame(ch, fr, pk), s5: pk.s5, e2: pk.e2 })); } catch (e) { console.error('handler error:', e && e.message); } })
    .catch(e => console.error('verifyOwned error:', e && e.message));
}
const obj = d => (d && typeof d === 'object' && !Array.isArray(d) ? d : {});
// ส่งกุญแจแพ็กแอสเซ็ตตามสิทธิ์ผู้เล่น (ดู src/packkeys.js) — ต้องตั้ง PACK_MASTER ใน Environment
app.get('/pack-key', require('./packkeys').route({ master: process.env.PACK_MASTER, verifyToken: SB.verifyToken, ownsItem: SB.ownsItem }));
app.get('/health', (_req, res) => res.json({ ok: true, service: 'dummy-online-4p', version: VERSION, rules: Rules.list().map(r => r.id), rooms: rooms.size, db: SB.enabled() }));   // db = ต่อฐานข้อมูลอยู่ไหม (ไม่บอกค่าคีย์)
app.get('/', (_req, res) => res.send('Dummy Online backend is running'));

// ===== ตรวจตัวตน: เมื่อเปิดใช้ Supabase ต้องแนบ access token ตอนเชื่อมต่อ (client ส่งใน auth.token) =====
io.use(async (socket, next) => {
  if (!SB.enabled()) return next();
  const u = await SB.verifyToken(socket.handshake.auth && socket.handshake.auth.token);
  if (!u) return next(new Error('unauthorized'));
  socket.data.uid = u.id; socket.data.uname = u.name;
  next();
});
// เมื่อจบตา: ให้เหรียญตามอันดับแก่ผู้เล่นที่ล็อกอิน (ไม่มีการเดิมพัน — ดู src/economy.js) แล้วแจ้งยอด/EXP ใหม่กลับไปที่ client
// อันดับใช้ผลชิป/แต้มในโต๊ะของตานั้น (G.res.coin.delta) · ฐานข้อมูลเป็นคนตัดเพดานรายวันและคิด EXP/เลเวล/แบทเทิลพาส
function standings(room) {
  const G = room.game, d = (G.res && G.res.coin && G.res.coin.delta) || G.P.map(() => 0), win = ruleOf(room).winner(G);
  const r = Economy.ranks(d.map((v, i) => (Number(v) || 0) + (i === win ? 0.5 : 0)));   // เสมอกัน: ผู้ชนะตามกติกาได้อันดับดีกว่า
  const humans = G.humans0 != null ? G.humans0 : room.players.filter(p => p.seat != null && G.P[p.seat] && !G.P[p.seat].bot).length;
  return { ranks: r, seats: G.P.length, humans, bots: (G.bots0 != null ? G.bots0 : G.P.length - humans) > 0 };
}
function recordResults(room) {
  if (!SB.enabled()) return;
  const G = room.game, rid = room.rule, gid = String(G.gid || room.code + ':' + room.round), st = standings(room);
  for (const p of room.players) {
    if (!p.uid || p.seat == null || !G.P[p.seat]) continue;
    const seat = p.seat, rank = st.ranks[seat], reward = Economy.reward(rank, st.seats, st.bots ? 1 : st.humans);   // โต๊ะมีบอท: ไม่มีโบนัสคนจริง (ฟาร์ม ×2 อย่างเดียว)
    const args = { p_user: p.uid, p_gid: gid, p_game: rid, p_delta: reward, p_won: rank === 1,
      p_melds: rid === 'dummy' ? (G.melds || []).filter(m => m.o === seat).length : 0, p_knock: rid === 'dummy' && !!G.res && G.res.k === seat, p_char: p.ch || null,
      p_bots: st.bots, p_farm: p.farm || 'coins', p_rank: rank, p_seats: st.seats };   // มีบอท = หักสตามิน่า + ได้ของตามโหมดฟาร์ม (ฐานข้อมูลตัดสิน)
    SB.rpcRetry('record_game_result', args).then(r => { if (r && p.id) io.to(p.id).emit('wallet:update', { gid, rank, seats: st.seats, humans: st.humans, bots: st.bots, reward, ...r }); })
      .catch(e => console.error('record_game_result failed', e && e.message));
  }
}
const rulesPayload = () => ({ version: VERSION, default: Rules.DEFAULT, rules: Rules.list() });
io.on('connection', socket => {
  socket.emit('system:notice', 'เชื่อมต่อเซิร์ฟเวอร์แล้ว');
  socket.emit('rules:list', rulesPayload()); // รายการกฎ + ตัวเลือกของแต่ละกฎ ให้ client สร้างหน้าตั้งค่าห้องเอง
  on(socket, 'rules:get', () => { if (allow(socket)) socket.emit('rules:list', rulesPayload()); });
  on(socket, 'room:create', raw => withOwned(socket, raw, d => { const { name, ch, bg, fr, rule, options, bots } = d;
    if (!allow(socket)) return;
    if (socket.data.roomCode) return socket.emit('system:error', 'คุณอยู่ในห้องแล้ว');
    if (rooms.size >= MAX_ROOMS) return socket.emit('system:error', 'เซิร์ฟเวอร์เต็มชั่วคราว ลองใหม่อีกครั้ง');
    let code; do { code = roomCode(); } while (rooms.has(code));
    const tut = d.tutorial === true;   // ห้องสอนเล่น: ดัมมี่ สำรับจัดไว้ บอทตามสคริปต์ ไม่บันทึกผล/ไม่หักสตามิน่า
    const rid = tut ? 'dummy' : Rules.has(rule) ? rule : Rules.DEFAULT;
    // bots: false เฉพาะห้องที่สร้างเอง (ไม่ใช่โหมดเล่นคนเดียว) — ปิดได้ = ไม่เติมบอทในที่นั่งว่าง ต้องรอผู้เล่นจริง
    const room = { code, rule: rid, options: Rules.cleanOptions(rid, tut ? {} : options), allowBots: tut || bots !== false, players: [], game: null, botTimer: null, emptyTimer: null, deck: null, shuffledBy: null, shuffleSeq: 0, lastWinner: null, round: 0, tutorial: tut };
    rooms.set(code, room);
    joinRoom(socket, room, name, ch, bg, fr, d.s5, d.farm, d.e2);
  }));
  // Find Match: เข้าห้องจับคู่ที่เปิดอยู่ (กติกา+ตัวเลือกเดียวกัน เลือกห้องที่คนมากสุดก่อน) หรือสร้างห้องจับคู่ใหม่
  on(socket, 'match:find', raw => withOwned(socket, raw, d => { const { name, ch, bg, fr, rule, options } = d;
    if (!allow(socket)) return;
    if (socket.data.roomCode) return socket.emit('system:error', 'คุณอยู่ในห้องแล้ว');
    const rid = Rules.has(rule) ? rule : Rules.DEFAULT, opts = Rules.cleanOptions(rid, options), key = rid + '|' + JSON.stringify(opts);
    const open = [...rooms.values()].filter(r => r.match && r.match.key === key && r.match.state === 'searching' && !r.game && connectedPlayers(r).length < MAX_PLAYERS).sort((a, b) => connectedPlayers(b).length - connectedPlayers(a).length)[0];
    let room = open;
    if (!room) {
      if (rooms.size >= MAX_ROOMS) return socket.emit('system:error', 'เซิร์ฟเวอร์เต็มชั่วคราว ลองใหม่อีกครั้ง');
      let code; do { code = roomCode(); } while (rooms.has(code));
      room = { code, rule: rid, options: opts, allowBots: true, players: [], game: null, botTimer: null, emptyTimer: null, deck: null, shuffledBy: null, shuffleSeq: 0, lastWinner: null, round: 0, match: { key, state: 'searching', since: Date.now(), prompt: null, waitTimer: null, promptTimer: null, cdTimer: null, cdUntil: null } };
      rooms.set(code, room);
    }
    joinRoom(socket, room, name, ch, bg, fr, d.s5, d.farm, d.e2);
    const p = findPlayer(room, socket.id); if (p) p.ready = true;   // ห้องจับคู่ไม่มีปุ่มพร้อม
    matchTick(room, true);
  }));
  // โหวตตอนหาคนไม่ครบ: 'wait' รอต่อ · 'bots' เติมบอทแล้วเล่นเลย (เริ่มเมื่อทุกคนเลือกเติมบอท)
  on(socket, 'match:choice', raw => {
    if (!allow(socket)) return; const room = rooms.get(socket.data.roomCode), c = String(obj(raw).c || '');
    if (!room || !room.match || !room.match.prompt || !['wait', 'bots'].includes(c)) return;
    room.match.prompt.votes[socket.id] = c;
    if (connectedPlayers(room).every(p => room.match.prompt.votes[p.id])) resolvePrompt(room); else emitLobby(room);
  });
  on(socket, 'room:join', raw => withOwned(socket, raw, d => { const { code, name, ch, bg, fr } = d;
    if (!allow(socket)) return;
    if (socket.data.roomCode) return socket.emit('system:error', 'คุณอยู่ในห้องแล้ว');
    const room = rooms.get(String(code || '').trim().toUpperCase());
    if (!room || room.match) return socket.emit('system:error', 'ไม่พบห้องนี้');
    if (active(room)) return socket.emit('system:error', 'เกมเริ่มแล้ว เข้าห้องไม่ได้');
    if (connectedPlayers(room).length >= MAX_PLAYERS) return socket.emit('system:error', 'ห้องเต็มแล้ว (4 คน)');
    joinRoom(socket, room, name, ch, bg, fr, d.s5, d.farm, d.e2);
  }));
  // เปลี่ยนโหมดฟาร์มของตัวเองในห้อง (มีผลตอนจบตาถัดไปที่ยังไม่จบ)
  on(socket, 'player:farm', d => { const room = rooms.get(socket.data.roomCode), p = room && room.players.find(x => x.id === socket.id); if (!p || !allow(socket)) return; p.farm = cleanFarm(obj(d).farm); emitLobby(room); });
  on(socket, 'room:rejoin', d => { const { code, token } = obj(d);
    if (!allow(socket)) return;
    if (socket.data.roomCode) return;
    if (!rejoinRoom(socket, code, token)) socket.emit('room:rejoin-failed');
  });
  on(socket, 'game:start', () => {
    { const r0 = rooms.get(socket.data.roomCode); if (r0 && r0.match && !r0.game) return socket.emit('system:error', 'ห้องจับคู่จะเริ่มเกมให้เองเมื่อผู้เล่นครบ'); }
    if (!allow(socket)) return;
    const room = rooms.get(socket.data.roomCode);
    if (!room) return socket.emit('system:error', 'กรุณาเข้าห้องก่อน');
    if (connectedPlayers(room)[0]?.id !== socket.id) return socket.emit('system:error', 'เฉพาะเจ้าของห้องเริ่มเกมได้');
    if (active(room)) return socket.emit('system:error', 'เกมกำลังเล่นอยู่');
    if (room.allowBots === false && connectedPlayers(room).length < 2) return socket.emit('system:error', 'ห้องนี้ปิดบอทไว้ ต้องมีผู้เล่นจริงอย่างน้อย 2 คนก่อนเริ่มเกม');
    { const others = connectedPlayers(room).filter(p => p.id !== socket.id), wait = others.filter(p => !p.ready); if (wait.length) return socket.emit('system:error', 'ยังมีผู้เล่นที่ยังไม่พร้อม: ' + wait.map(p => p.name).join(', ')); }
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
  // ผู้เล่น (ไม่ใช่เจ้าของห้อง) กดพร้อม/ยกเลิกพร้อม ในล็อบบี้
  on(socket, 'game:ready', raw => {
    if (!allow(socket)) return; const room = rooms.get(socket.data.roomCode); if (!room || active(room)) return;
    const p = findPlayer(room, socket.id); if (!p) return; p.ready = !!obj(raw).ready; emitLobby(room);
  });
  // อีโมจิสั้น ๆ ในล็อบบี้ (รายการตายตัว ส่งต่อให้ทุกคนในห้อง)
  // ใช้ได้ทั้งห้องรอและบนโต๊ะเล่น · สติกเกอร์ตัวละคร (c:*) ต้องปลด 2★ ของตัวที่ใช้อยู่ · กันกดรัว 1.5 วิ
  const EMOTES = ['👍', '😀', '😂', '😎', '🔥', '👋', '🙏', '❤️'], CHAR_EMOTES = ['c:happy', 'c:laugh', 'c:wow', 'c:sad'];
  on(socket, 'room:emote', raw => {
    if (!allow(socket)) return; const room = rooms.get(socket.data.roomCode); if (!room) return;
    const p = findPlayer(room, socket.id), e = String(obj(raw).e || ''); if (!p) return;
    if (!EMOTES.includes(e) && !(CHAR_EMOTES.includes(e) && p.e2 && p.ch)) return;
    const now = Date.now(); if (p.emAt && now - p.emAt < 1500) return; p.emAt = now;
    io.to(room.code).emit('room:emote', { from: p.name, e, ch: p.ch || null });
  });
  // หน้าสรุป: กดเล่นต่อ (yes) หรือกดออก (no)
  on(socket, 'game:again', raw => {
    if (!allow(socket)) return; const room = rooms.get(socket.data.roomCode); if (!room || !room.next || !room.game || !room.game.over) return;
    const p = findPlayer(room, socket.id); if (!p) return;
    if (obj(raw).yes === false) return leaveRoom(socket, false, true);
    p.again = true; checkNext(room);
  });
  on(socket, 'game:act', raw => {
    if (!allow(socket)) return;
    const room = rooms.get(socket.data.roomCode);
    if (!room || !room.game) return socket.emit('system:error', 'ยังไม่มีเกมที่กำลังเล่น');
    const p = findPlayer(room, socket.id);
    if (!p || p.seat == null) return socket.emit('system:error', 'ไม่พบที่นั่งของคุณ');
    const action = cleanAction(raw);
    if (!action) return socket.emit('system:error', 'คำสั่งไม่ถูกต้อง');
    const blocked = Skills.actionBlocked(room.rule, p.ch, action.t); // คำสั่งที่ต้องมีสกิล (เช่น ฝากออโต้ = มือไว)
    if (blocked) { socket.emit('game:action-result', { ok: false, error: blocked, action: action.t }); return socket.emit('system:error', blocked); }
    const msg = ruleOf(room).act(room.game, p.seat, action);
    if (msg) { socket.emit('game:action-result', { ok: false, error: msg, action: action.t }); return socket.emit('system:error', msg); }
    socket.emit('game:action-result', { ok: true, action: action.t });
    room.game.v++;
    emitStates(room);
    scheduleBots(room);
  });
  // ป่วนสายตาถูกยกเลิกแล้ว (สกิล v3 ไม่มีสกิลที่กระทบผู้เล่นอื่น) — ตอบกลับไว้เผื่อ client เก่า
  on(socket, 'skill:use', () => { if (allow(socket)) socket.emit('skill:result', { ok: false, error: 'สกิลนี้ถูกยกเลิกแล้ว' }); });
  on(socket, 'room:leave', () => { if (allow(socket)) leaveRoom(socket, false, true); });
  on(socket, 'disconnect', () => leaveRoom(socket, true));
});
if (require.main === module) server.listen(PORT, () => console.log(`Dummy Online backend listening on ${PORT}`));
module.exports = { server, io, rooms };
