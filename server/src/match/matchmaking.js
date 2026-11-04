// match/matchmaking.js — หาแมตช์: ห้องจับคู่ (กติกา+ตัวเลือกเดียวกัน) · ครบ 4 คนเปิดหน้าต่างกดพร้อม → ทุกคนกดพร้อมเริ่มทันที
// ไม่กดพร้อมในเวลา → เชิญออก ที่เหลือกลับไปหาคน · มีคนออกระหว่างรอกดพร้อม → ที่เหลือกลับไปหาคน
// ห้องธรรมดา: หาไม่ครบในเวลา → ถาม "รอต่อ / เติมบอท" (เติมเมื่อทุกคนเลือก) · ห้องแรงก์: ไม่มีบอทเลย รอจนครบ
// Public: installMatchmaking(ctx) → ctx.findOrCreateMatchRoom · matchTick · acceptReady · voteFill · clearMatchTimers · backToSearching · markMatchPlaying
const Rules = require('../rules');

const MATCH_TIMERS = ['waitTimer', 'promptTimer', 'readyTimer'];

function installMatchmaking(ctx) {
  const { io, rooms, config } = ctx;

  function setMatchTimer(match, key, ms, fn) {
    clearTimeout(match[key]);
    match[key] = setTimeout(fn, ms);
    if (match[key].unref) match[key].unref();
  }

  function clearMatchTimers(room) {
    const match = room.match;
    if (!match) return;
    for (const key of MATCH_TIMERS) {
      clearTimeout(match[key]);
      match[key] = null;
    }
  }

  // ---------- หาห้อง ----------
  // ห้องที่รอคนอยู่และเข้าได้ (เลือกห้องที่คนมากสุดก่อน) · บัญชีเดียวกันไม่ลงห้องเดียวกัน (กันเปิดหลายแท็บปั่นแต้ม)
  function findOpenRoom(key, uid) {
    const candidates = [...rooms.values()].filter(
      room =>
        room.match &&
        room.match.key === key &&
        room.match.state === 'searching' &&
        !room.game &&
        ctx.connectedPlayers(room).length < config.MAX_PLAYERS &&
        !(uid && room.players.some(p => p.uid === uid))
    );
    candidates.sort((a, b) => ctx.connectedPlayers(b).length - ctx.connectedPlayers(a).length);
    return candidates[0] || null;
  }

  // ranked = ห้องแรงก์: กติกามาตรฐานของเกม (ไม่สนตัวเลือกที่ส่งมา) · ไม่มีบอท · คิวแยกจากห้องธรรมดา
  // คืน null เมื่อเซิร์ฟเวอร์เต็ม
  function findOrCreateMatchRoom(rule, options, ranked, uid) {
    const ruleId = Rules.has(rule) ? rule : Rules.DEFAULT;
    const cleanOptions = Rules.cleanOptions(ruleId, ranked ? {} : options);
    const key = (ranked ? 'R|' : '') + ruleId + '|' + JSON.stringify(cleanOptions);
    const open = findOpenRoom(key, uid);
    if (open) return open;
    if (rooms.size >= config.MAX_ROOMS) return null;
    const match = {
      key,
      ranked,
      state: 'searching',
      since: Date.now(),
      prompt: null,
      waitTimer: null,
      promptTimer: null,
      readyTimer: null,
      readyUntil: null,
    };
    return ctx.createRoom(ruleId, cleanOptions, !ranked, { match });
  }

  // ---------- สถานะการค้นหา (เรียกหลังคนเข้า/ออก) ----------
  function armSearch(room) {
    const match = room.match;
    match.since = match.since || Date.now();
    if (!match.ranked) setMatchTimer(match, 'waitTimer', config.MATCH_WAIT_MS, () => openPrompt(room));
  }

  function matchTick(room, emit) {
    const match = room.match;
    if (!match || room.game) return;
    const count = ctx.connectedPlayers(room).length;
    if (!count) return;
    if (count >= config.MAX_PLAYERS) return openReady(room);
    if (match.state === 'ready') cancelReady(room);
    if (!match.waitTimer && !match.prompt) armSearch(room);
    if (emit) ctx.emitLobby(room);
  }

  // หลังจบตาแล้วมีคนออก: ที่เหลือกลับไปหาคนเพิ่ม
  function backToSearching(room) {
    room.match.state = 'searching';
    room.match.since = Date.now();
    room.match.prompt = null;
    clearMatchTimers(room);
    matchTick(room);
  }

  function markMatchPlaying(room) {
    clearMatchTimers(room);
    room.match.state = 'playing';
    room.match.prompt = null;
  }

  // ---------- หน้าต่างกดพร้อม ----------
  function openReady(room) {
    const match = room.match;
    if (match.state === 'ready') return ctx.emitLobby(room);
    clearMatchTimers(room);
    match.prompt = null;
    match.state = 'ready';
    match.readyUntil = Date.now() + config.MATCH_READY_MS;
    room.players.forEach(p => {
      p.accepted = false;
    });
    setMatchTimer(match, 'readyTimer', config.MATCH_READY_MS, () => expireReady(room));
    ctx.emitLobby(room);
  }

  function cancelReady(room) {
    const match = room.match;
    clearTimeout(match.readyTimer);
    match.readyTimer = null;
    match.state = 'searching';
    match.readyUntil = null;
    room.players.forEach(p => {
      p.accepted = false;
    });
  }

  function acceptReady(room, player) {
    const match = room.match;
    if (!match || match.state !== 'ready' || room.game || !player) return;
    player.accepted = true;
    const humans = ctx.connectedPlayers(room);
    const everyoneReady = humans.length >= config.MAX_PLAYERS && humans.every(p => p.accepted);
    if (!everyoneReady) return ctx.emitLobby(room);
    humans.forEach(p => {
      p.ready = true;
    });
    ctx.startGame(room);
  }

  function expireReady(room) {
    const match = room.match;
    if (!ctx.alive(room) || !match || match.state !== 'ready' || room.game) return;
    match.readyTimer = null;
    ctx
      .connectedPlayers(room)
      .filter(p => !p.accepted)
      .forEach(p => kickNotReady(room, p));
    cancelReady(room);
    if (!room.players.length) {
      clearMatchTimers(room);
      rooms.delete(room.code);
      return;
    }
    io.to(room.code).emit('system:notice', 'มีผู้เล่นไม่กดพร้อม — กลับไปหาผู้เล่นเพิ่ม');
    matchTick(room, true);
  }

  function kickNotReady(room, player) {
    const socket = io.sockets.sockets.get(player.id);
    io.to(player.id).emit('room:kicked', { reason: 'ไม่ได้กดพร้อมภายในเวลา' });
    room.players.splice(room.players.indexOf(player), 1);
    if (socket) {
      socket.leave(room.code);
      socket.data.roomCode = null;
    }
  }

  // ---------- โหวตรอต่อ / เติมบอท (ห้องธรรมดาที่หาไม่ครบ) ----------
  function openPrompt(room) {
    const match = room.match;
    match.waitTimer = null;
    const count = ctx.connectedPlayers(room).length;
    if (!match || match.ranked || room.game || match.state !== 'searching' || count < 1 || count >= config.MAX_PLAYERS) return;
    match.prompt = { until: Date.now() + config.MATCH_PROMPT_MS, votes: {} };
    setMatchTimer(match, 'promptTimer', config.MATCH_PROMPT_MS, () => resolvePrompt(room));
    ctx.emitLobby(room);
  }

  function resolvePrompt(room) {
    const match = room.match;
    if (!match || !match.prompt) return;
    clearTimeout(match.promptTimer);
    match.promptTimer = null;
    const humans = ctx.connectedPlayers(room);
    const votes = match.prompt.votes;
    match.prompt = null;
    if (humans.length && humans.every(p => votes[p.id] === 'bots')) {
      // ทุกคนเลือกเติมบอท
      humans.forEach(p => {
        p.ready = true;
      });
      ctx.startGame(room);
      return;
    }
    armSearch(room);
    io.to(room.code).emit('system:notice', 'ยังรอผู้เล่นเพิ่มต่อไป…');
    ctx.emitLobby(room);
  }

  // choice: 'wait' รอต่อ · 'bots' เติมบอทแล้วเล่นเลย — ครบทุกคนแล้วสรุปทันที
  function voteFill(room, socketId, choice) {
    const match = room.match;
    if (!match || !match.prompt || !['wait', 'bots'].includes(choice)) return;
    match.prompt.votes[socketId] = choice;
    const allVoted = ctx.connectedPlayers(room).every(p => match.prompt.votes[p.id]);
    if (allVoted) resolvePrompt(room);
    else ctx.emitLobby(room);
  }

  Object.assign(ctx, {
    findOrCreateMatchRoom,
    matchTick,
    acceptReady,
    voteFill,
    clearMatchTimers,
    backToSearching,
    markMatchPlaying,
  });
}

module.exports = installMatchmaking;
