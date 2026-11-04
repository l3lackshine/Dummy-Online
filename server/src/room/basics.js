// room/basics.js — ตัวช่วยพื้นฐานของห้อง: ใครอยู่ในห้อง · ห้องยังใช้อยู่ไหม · กติกาของห้อง · รหัสห้อง/โทเคน
// ผู้เล่นแต่ละคนมี seat (ที่นั่งใน engine) แยกจากลำดับใน room.players — กันที่นั่งเลื่อนผิดเมื่อมีคนออก/เข้า
// player: { id (socket), uid, name, ch, bg, fr, connected, token, seat | null, ready, again, accepted }
// Public: installRoomBasics(ctx) → ctx.active · connectedPlayers · findPlayer · ruleOf · alive · newRoomCode · newToken · createRoom
const crypto = require('crypto');
const Rules = require('../rules');

function installRoomBasics(ctx) {
  const { rooms } = ctx;

  // เกมกำลังเล่นอยู่ (มีเกมและยังไม่จบ)
  const active = room => !!room.game && !room.game.over;
  const connectedPlayers = room => room.players.filter(p => p.connected && p.id);
  const findPlayer = (room, socketId) => room.players.find(p => p.id === socketId);
  // กติกาที่ห้องนี้เลือกไว้ (โหลดจาก src/rules/<id>) — โค้ดห้องไม่รู้จักกติกาของเกมใดเกมหนึ่งโดยตรง
  const ruleOf = room => Rules.get(room.rule);
  // ห้องนี้ยังเป็นห้องที่ใช้อยู่ (ไม่ถูกลบ/แทนที่) — ใช้เช็กใน timer ที่อาจทำงานหลังห้องถูกลบ
  const alive = room => rooms.get(room.code) === room;

  function newRoomCode() {
    let code;
    do {
      code = crypto.randomBytes(3).toString('hex').toUpperCase();
    } while (rooms.has(code));
    return code;
  }

  const newToken = () => crypto.randomBytes(16).toString('hex');

  // ห้องใหม่ (ค่าเริ่มต้นร่วมกันของทุกแบบ) — extra ใส่ค่าเฉพาะแบบ เช่น tutorial, match
  function createRoom(rule, options, allowBots, extra) {
    const room = {
      code: newRoomCode(),
      rule,
      options,
      allowBots,
      players: [],
      game: null,
      botTimer: null,
      emptyTimer: null,
      deck: null,
      shuffledBy: null,
      shuffleSeq: 0,
      lastWinner: null,
      round: 0,
      ...extra,
    };
    rooms.set(room.code, room);
    return room;
  }

  Object.assign(ctx, { active, connectedPlayers, findPlayer, ruleOf, alive, newToken, createRoom });
}

module.exports = installRoomBasics;
