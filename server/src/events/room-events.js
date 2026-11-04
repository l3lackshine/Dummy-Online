// events/room-events.js — Socket.IO: สร้างห้อง · เข้าห้องด้วยรหัส · เชื่อมต่อกลับ · พร้อม · โหมดฟาร์ม · ออก
// Public: registerRoomEvents(socket, ctx)
const Rules = require('../rules');

// ค่าหน้าตาผู้เล่นที่ใช้ตอนเข้าห้อง (ผ่าน withOwned แล้ว)
const lookOf = data => ({ name: data.name, ch: data.ch, bg: data.bg, fr: data.fr, s5: data.s5, farm: data.farm, e2: data.e2 });

function registerRoomEvents(socket, ctx) {
  const { rooms, config } = ctx;
  const { on, allow, obj } = ctx;

  // tutorial: true = ห้องสอนเล่นดัมมี่ (สำรับจัดไว้ บอทตามสคริปต์ ไม่บันทึกผล/ไม่หักสตามิน่า)
  // bots: false = ไม่เติมบอทในที่นั่งว่าง ต้องรอผู้เล่นจริง (ห้องสร้างเองเท่านั้น)
  on(socket, 'room:create', raw => ctx.withOwned(socket, raw, data => {
    if (!allow(socket)) return;
    if (socket.data.roomCode) return socket.emit('system:error', 'คุณอยู่ในห้องแล้ว');
    if (rooms.size >= config.MAX_ROOMS) return socket.emit('system:error', 'เซิร์ฟเวอร์เต็มชั่วคราว ลองใหม่อีกครั้ง');
    const tutorial = data.tutorial === true;
    const ruleId = tutorial ? 'dummy' : Rules.has(data.rule) ? data.rule : Rules.DEFAULT;
    const options = Rules.cleanOptions(ruleId, tutorial ? {} : data.options);
    const room = ctx.createRoom(ruleId, options, tutorial || data.bots !== false, { tutorial });
    ctx.joinRoom(socket, room, lookOf(data));
  }));

  on(socket, 'room:join', raw => ctx.withOwned(socket, raw, data => {
    if (!allow(socket)) return;
    if (socket.data.roomCode) return socket.emit('system:error', 'คุณอยู่ในห้องแล้ว');
    const room = rooms.get(String(data.code || '').trim().toUpperCase());
    if (!room || room.match) return socket.emit('system:error', 'ไม่พบห้องนี้');   // ห้องจับคู่เข้าด้วยรหัสไม่ได้
    if (ctx.active(room)) return socket.emit('system:error', 'เกมเริ่มแล้ว เข้าห้องไม่ได้');
    if (ctx.connectedPlayers(room).length >= config.MAX_PLAYERS) return socket.emit('system:error', 'ห้องเต็มแล้ว (4 คน)');
    ctx.joinRoom(socket, room, lookOf(data));
  }));

  // เปลี่ยนโหมดฟาร์มของตัวเอง (มีผลตอนจบตาที่ยังไม่จบ)
  on(socket, 'player:farm', raw => {
    const room = rooms.get(socket.data.roomCode);
    const player = room && room.players.find(p => p.id === socket.id);
    if (!player || !allow(socket)) return;
    player.farm = ctx.cleanFarm(obj(raw).farm);
    ctx.emitLobby(room);
  });

  on(socket, 'room:rejoin', raw => {
    const { code, token } = obj(raw);
    if (!allow(socket)) return;
    if (socket.data.roomCode) return;
    if (!ctx.rejoinRoom(socket, code, token)) socket.emit('room:rejoin-failed');
  });

  // ผู้เล่น (ไม่ใช่เจ้าของห้อง) กดพร้อม/ยกเลิกพร้อมในล็อบบี้
  on(socket, 'game:ready', raw => {
    if (!allow(socket)) return;
    const room = rooms.get(socket.data.roomCode);
    if (!room || ctx.active(room)) return;
    const player = ctx.findPlayer(room, socket.id);
    if (!player) return;
    player.ready = !!obj(raw).ready;
    ctx.emitLobby(room);
  });

  on(socket, 'room:leave', () => {
    if (allow(socket)) ctx.leaveRoom(socket, false, true);
  });
  on(socket, 'disconnect', () => ctx.leaveRoom(socket, true));
}

module.exports = registerRoomEvents;
