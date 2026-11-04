// events/game-events.js — Socket.IO บนโต๊ะ: เริ่มเกม · สับไพ่ · เดิน · เล่นต่อหลังจบตา
// Public: registerGameEvents(socket, ctx)
const Shuffle = require('../shuffle');
const Skills = require('../skills');

function registerGameEvents(socket, ctx) {
  const { io, rooms } = ctx;
  const { on, allow, obj } = ctx;

  // เจ้าของห้องกดเริ่ม (ห้องจับคู่เริ่มเองเมื่อทุกคนกดพร้อม)
  on(socket, 'game:start', () => {
    const current = rooms.get(socket.data.roomCode);
    if (current && current.match && !current.game)
      return socket.emit('system:error', 'ห้องจับคู่จะเริ่มเกมให้เองเมื่อผู้เล่นครบ');
    if (!allow(socket)) return;
    const room = rooms.get(socket.data.roomCode);
    const error = startError(room);
    if (error) return socket.emit('system:error', error);
    if (!ctx.startGame(room)) return socket.emit('system:error', 'เริ่มเกมไม่ได้');
    io.to(room.code).emit('system:notice', 'เริ่มเกมแล้ว!');
  });

  function startError(room) {
    if (!room) return 'กรุณาเข้าห้องก่อน';
    const connected = ctx.connectedPlayers(room);
    if (connected[0]?.id !== socket.id) return 'เฉพาะเจ้าของห้องเริ่มเกมได้';
    if (ctx.active(room)) return 'เกมกำลังเล่นอยู่';
    if (room.allowBots === false && connected.length < 2) return 'ห้องนี้ปิดบอทไว้ ต้องมีผู้เล่นจริงอย่างน้อย 2 คนก่อนเริ่มเกม';
    const notReady = connected.filter(p => p.id !== socket.id && !p.ready);
    if (notReady.length) return 'ยังมีผู้เล่นที่ยังไม่พร้อม: ' + notReady.map(p => p.name).join(', ');
    return null;
  }

  // สับไพ่ก่อนเริ่มตา: เจ้าของห้อง (ตาแรก) หรือผู้ชนะตาก่อนหน้า (ตาถัดไป) — สับซ้ำได้จนกว่าจะเริ่ม
  on(socket, 'game:shuffle', () => {
    if (!allow(socket)) return;
    const room = rooms.get(socket.data.roomCode);
    if (!room) return socket.emit('system:error', 'กรุณาเข้าห้องก่อน');
    if (ctx.active(room)) return socket.emit('system:error', 'เกมกำลังเล่นอยู่ สับไพ่ไม่ได้');
    const shuffler = ctx.shufflerOf(room);
    if (!shuffler || shuffler.id !== socket.id) {
      const owner = shuffler ? shuffler.name : 'เจ้าของห้อง';
      return socket.emit(
        'system:error',
        'สิทธิ์สับไพ่เป็นของ ' + owner + (room.round ? ' (ผู้ชนะตาก่อนหน้า)' : ' (เจ้าของห้อง)')
      );
    }
    const result = Shuffle.shuffle();
    room.deck = result.ids;
    room.shuffledBy = shuffler.name;
    room.shuffleSeq = (room.shuffleSeq || 0) + 1;
    // ส่งแค่ชนิดท่าสับสำหรับแอนิเมชัน ไม่ส่งลำดับไพ่
    io.to(room.code).emit('room:shuffled', { by: shuffler.name, seq: room.shuffleSeq, steps: result.steps.map(x => x.t) });
    ctx.emitLobby(room);
  });

  // หน้าสรุป: กดเล่นต่อ (yes) หรือกดออก (no)
  on(socket, 'game:again', raw => {
    if (!allow(socket)) return;
    const room = rooms.get(socket.data.roomCode);
    if (!room || !room.next || !room.game || !room.game.over) return;
    const player = ctx.findPlayer(room, socket.id);
    if (!player) return;
    if (obj(raw).yes === false) return ctx.leaveRoom(socket, false, true);
    player.again = true;
    ctx.checkNext(room);
  });

  on(socket, 'game:act', raw => {
    if (!allow(socket)) return;
    const room = rooms.get(socket.data.roomCode);
    if (!room || !room.game) return socket.emit('system:error', 'ยังไม่มีเกมที่กำลังเล่น');
    const player = ctx.findPlayer(room, socket.id);
    if (!player || player.seat == null) return socket.emit('system:error', 'ไม่พบที่นั่งของคุณ');
    const action = ctx.cleanAction(raw);
    if (!action) return socket.emit('system:error', 'คำสั่งไม่ถูกต้อง');
    // คำสั่งที่ต้องมีสกิล (เช่น ฝากออโต้ = มือไว) หรือกติกาไม่ยอม → แจ้งผู้เล่น
    const error = Skills.actionBlocked(room.rule, player.ch, action.t) || ctx.ruleOf(room).act(room.game, player.seat, action);
    if (error) {
      socket.emit('game:action-result', { ok: false, error, action: action.t });
      return socket.emit('system:error', error);
    }
    socket.emit('game:action-result', { ok: true, action: action.t });
    room.game.v++;
    ctx.emitStates(room);
    ctx.scheduleBots(room);
  });

  // สกิลที่กระทบผู้เล่นอื่นถูกยกเลิกแล้ว (สกิล v3) — ตอบกลับไว้เผื่อ client เก่า
  on(socket, 'skill:use', () => {
    if (allow(socket)) socket.emit('skill:result', { ok: false, error: 'สกิลนี้ถูกยกเลิกแล้ว' });
  });
}

module.exports = registerGameEvents;
