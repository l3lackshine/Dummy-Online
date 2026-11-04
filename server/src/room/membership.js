// room/membership.js — เข้าห้อง · ออกห้อง · เชื่อมต่อกลับด้วยโทเคน · ลบห้องที่ไม่มีคนเหลือ
// ออกระหว่างเกม = ที่นั่งกลายเป็นบอท แต่เก็บโทเคนไว้ให้กลับมาเล่นต่อได้ (ยกเว้นกดออกเอง)
// Public: installMembership(ctx) → ctx.joinRoom · leaveRoom · rejoinRoom · cleanFarm
const { CHARS, BGS } = require('../rules/common');
const NameFilter = require('../namefilter');
const Economy = require('../economy');

// ตัดอักขระควบคุม · ยาวไม่เกิน 14 · ชื่อหยาบ/แอบอ้างทีมงาน → "ผู้เล่น"
const cleanName = name => NameFilter.clean(name, 'ผู้เล่น');
// กรอบการ์ด (ของแต่งเท่านั้น ไม่มีผลกับเกม)
const cleanFrame = frame => (typeof frame === 'string' && /^[a-z0-9-]{1,40}$/.test(frame) ? frame : null);
// โหมดฟาร์มเมื่อเล่นกับบอท (ดู economy.js FARM)
const cleanFarm = farm => (Economy.FARM[farm] ? farm : 'coins');

function installMembership(ctx) {
  const { io, rooms, config } = ctx;

  // look = { name, ch, bg, fr, s5, farm, e2 } (ผ่านการตรวจของที่มีจริงมาแล้วใน withOwned)
  function joinRoom(socket, room, look) {
    const player = {
      id: socket.id,
      uid: socket.data.uid || null,
      name: cleanName(socket.data.uname || look.name),   // ล็อกอินแล้วใช้ชื่อจากบัญชีเสมอ
      ch: CHARS.includes(look.ch) ? look.ch : null,
      bg: BGS.includes(look.bg) ? look.bg : null,
      fr: cleanFrame(look.fr),
      s5: look.s5 === true,
      e2: look.e2 === true,
      farm: cleanFarm(look.farm),
      connected: true,
      token: ctx.newToken(),
      seat: null,
      ready: false,
    };
    room.players.push(player);
    socket.data.roomCode = room.code;
    socket.join(room.code);
    checkEmpty(room);
    socket.emit('room:joined', { code: room.code, host: ctx.connectedPlayers(room)[0] === player, token: player.token });
    ctx.emitLobby(room);
    return player;
  }

  // forget = กดออกเอง → ลบโทเคน กลับเข้าที่นั่งเดิมไม่ได้
  function leaveRoom(socket, disconnected = false, forget = false) {
    const room = rooms.get(socket.data.roomCode);
    if (!room) {
      socket.data.roomCode = null;
      return;
    }
    const player = ctx.findPlayer(room, socket.id);
    if (player) releaseSeat(room, player, forget);
    if (!disconnected) socket.leave(room.code);
    socket.data.roomCode = null;
    if (!room.players.length) return deleteRoom(room);
    checkEmpty(room);
    ctx.checkNext(room);
    if (room.match && !room.game) ctx.matchTick(room, true);
  }

  function releaseSeat(room, player, forget) {
    const inGame = room.game && player.seat != null && room.game.P[player.seat];
    if (!inGame) {
      room.players.splice(room.players.indexOf(player), 1);
      ctx.emitLobby(room);
      return;
    }
    if (ctx.active(room)) {   // ระหว่างตา: บอทเล่นแทน
      const seat = room.game.P[player.seat];
      seat.bot = true;
      seat.id = null;
      seat.n = player.name + ' (บอท)';
    }
    player.connected = false;
    player.id = null;
    if (forget) player.token = null;
    ctx.emitStates(room);
    ctx.scheduleBots(room);
  }

  function deleteRoom(room) {
    ctx.closeNext(room);
    ctx.clearMatchTimers(room);
    if (room.botTimer) clearTimeout(room.botTimer);
    if (room.emptyTimer) clearTimeout(room.emptyTimer);
    rooms.delete(room.code);
  }

  // เชื่อมต่อกลับ (รีเฟรชหน้า/เน็ตหลุด): ได้ที่นั่งเดิมคืน และบอทที่เล่นแทนอยู่ถูกปลดออก
  function rejoinRoom(socket, code, token) {
    const room = rooms.get(String(code || '').trim().toUpperCase());
    const player = room && token ? room.players.find(x => x.token && x.token === token) : null;
    if (!player) return false;
    detachOldSocket(room, player, socket);
    player.id = socket.id;
    player.connected = true;
    socket.data.roomCode = room.code;
    socket.join(room.code);
    const seat = room.game && player.seat != null && room.game.P[player.seat];
    if (seat) {
      seat.bot = false;
      seat.id = player.id;
      seat.n = player.name;
    }
    checkEmpty(room);
    socket.emit('room:joined', { code: room.code, host: ctx.connectedPlayers(room)[0] === player, token: player.token, rejoined: true });
    ctx.emitStates(room);
    ctx.emitLobby(room);
    return true;
  }

  // แท็บเก่าของคนเดียวกันยังต่ออยู่ → ถอดออกจากห้อง (ให้แท็บใหม่ถือที่นั่ง)
  function detachOldSocket(room, player, socket) {
    if (!player.id || player.id === socket.id) return;
    const old = io.sockets.sockets.get(player.id);
    if (!old) return;
    old.data.roomCode = null;
    old.leave(room.code);
  }

  // ห้องที่ไม่มีคนจริงเชื่อมต่ออยู่ → รอ EMPTY_ROOM_TTL แล้วลบ (กันหน่วยความจำรั่ว) · มีคนกลับมาก่อนก็ยกเลิก
  function checkEmpty(room) {
    if (!ctx.alive(room)) return;
    if (ctx.connectedPlayers(room).length) {
      if (room.emptyTimer) {
        clearTimeout(room.emptyTimer);
        room.emptyTimer = null;
      }
      return;
    }
    if (room.emptyTimer) return;
    room.emptyTimer = setTimeout(() => {
      if (ctx.connectedPlayers(room).length) return;
      if (room.botTimer) clearTimeout(room.botTimer);
      ctx.clearMatchTimers(room);
      rooms.delete(room.code);
    }, config.EMPTY_ROOM_TTL_MS);
  }

  Object.assign(ctx, { joinRoom, leaveRoom, rejoinRoom, cleanFarm });
}

module.exports = installMembership;
