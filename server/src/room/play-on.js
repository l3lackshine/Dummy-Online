// room/play-on.js — หลังจบตา: ทุกคนกด "เล่นต่อ" → เริ่มตาใหม่ · มีคนกดออก/หมดเวลา → ที่เหลือกลับล็อบบี้
// เล่นคนเดียวกับบอท = ไม่มีเวลาหมด (รอจนกว่าจะกดเอง)
// Public: installPlayOn(ctx) → ctx.openNext · closeNext · checkNext · toLobby

function installPlayOn(ctx) {
  const { io, rooms, config } = ctx;

  function openNext(room) {
    if (config.NEXT_MS <= 0 || room.next) return;
    const humans = ctx.connectedPlayers(room);
    if (!humans.length) return;
    humans.forEach(p => {
      p.again = false;
    });
    const next = { until: humans.length > 1 ? Date.now() + config.NEXT_MS : null, n0: humans.length, timer: null };
    if (next.until) {
      next.timer = setTimeout(() => expireNext(room), config.NEXT_MS);
      if (next.timer.unref) next.timer.unref();
    }
    room.next = next;
  }

  function closeNext(room) {
    if (room.next && room.next.timer) clearTimeout(room.next.timer);
    room.next = null;
  }

  // พากลุ่มที่เหลือกลับล็อบบี้ (คนที่กดเล่นต่อไว้แล้วถือว่าพร้อม) · ห้องหาแมตช์ = กลับไปหาคนเพิ่ม
  function toLobby(room, notice) {
    closeNext(room);
    ctx.clearBotTimer(room);
    room.players = ctx.connectedPlayers(room);
    room.game = null;
    room.deck = null;
    room.players.forEach(p => {
      p.seat = null;
      p.ready = p.again === true;
      p.again = false;
    });
    if (room.match) ctx.backToSearching(room);
    room.players.forEach(p => io.to(p.id).emit('room:lobbyback', { notice: notice || '' }));
    if (notice) io.to(room.code).emit('system:notice', notice);
    ctx.emitLobby(room);
  }

  function startNext(room) {
    closeNext(room);
    if (ctx.startGame(room)) io.to(room.code).emit('system:notice', 'เริ่มตาใหม่!');
  }

  // เรียกทุกครั้งที่สถานะเปลี่ยน: ทุกคนยืนยันแล้ว → เริ่ม · คนน้อยลง → กลับล็อบบี้
  function checkNext(room) {
    const next = room.next;
    if (!next || !room.game || !room.game.over) return;
    const humans = ctx.connectedPlayers(room);
    if (!humans.length) return closeNext(room);
    if (humans.length < next.n0) return toLobby(room, 'มีผู้เล่นออกจากห้อง — กลับสู่ล็อบบี้เพื่อหาผู้เล่นเพิ่ม');
    if (humans.every(p => p.again)) startNext(room);
    else ctx.emitLobby(room);
  }

  function expireNext(room) {
    if (!ctx.alive(room) || !room.next) return;
    room.next.timer = null;
    const late = ctx.connectedPlayers(room).filter(p => !p.again);
    if (!late.length) return checkNext(room);
    late.forEach(p => kickLate(room, p));
    if (!ctx.connectedPlayers(room).length) {
      rooms.delete(room.code);
      return;
    }
    toLobby(room, late.map(p => p.name).join(', ') + ' ไม่ได้กดเล่นต่อ — กลับสู่ล็อบบี้');
  }

  // ไม่กดเล่นต่อทันเวลา → เชิญออก (ลบโทเคน: กลับเข้าที่นั่งเดิมไม่ได้)
  function kickLate(room, player) {
    const socket = io.sockets.sockets.get(player.id);
    io.to(player.id).emit('room:kicked', { reason: 'ไม่ได้กดเล่นต่อภายในเวลาที่กำหนด' });
    player.connected = false;
    player.id = null;
    player.token = null;
    if (socket) {
      socket.leave(room.code);
      socket.data.roomCode = null;
    }
  }

  Object.assign(ctx, { openNext, closeNext, checkNext, toLobby });
}

module.exports = installPlayOn;
