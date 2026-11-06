// events/emote-events.js — Socket.IO: อีโมตในห้องรอและบนโต๊ะเล่น (รายการตายตัว ส่งต่อให้ทุกคนในห้อง)
// สติกเกอร์ตัวละคร (c:*) ต้องปลด 2★ ของตัวที่ใช้อยู่ (เซิร์ฟเวอร์ตรวจตอนเข้าห้อง) · กันกดรัว 1.5 วินาที
// บัญชีที่แอดมินปิดอีโมต (v18 muted_until) ส่งไม่ได้ — ตรวจผ่าน moderation.js
// Public: registerEmoteEvents(socket, ctx)
// EXTEND: อีโมตใหม่ เพิ่มใน EMOTES / CHAR_EMOTES และฝั่ง client (Code/Table/emote.js)

const Moderation = require('../moderation');

const EMOTES = ['👍', '😀', '😂', '😎', '🔥', '👋', '🙏', '❤️'];
const CHAR_EMOTES = ['c:happy', 'c:laugh', 'c:wow', 'c:sad'];
const EMOTE_COOLDOWN_MS = 1500;

function registerEmoteEvents(socket, ctx) {
  const { io, rooms } = ctx;

  ctx.on(socket, 'room:emote', raw => {
    if (!ctx.allow(socket)) return;
    const room = rooms.get(socket.data.roomCode);
    if (!room) return;
    const player = ctx.findPlayer(room, socket.id);
    const emote = String(ctx.obj(raw).e || '');
    if (!player) return;
    const allowed = EMOTES.includes(emote) || (CHAR_EMOTES.includes(emote) && player.e2 && player.ch);
    if (!allowed) return;
    const now = Date.now();
    if (player.emAt && now - player.emAt < EMOTE_COOLDOWN_MS) return;
    player.emAt = now;
    Moderation.isMuted(ctx.SB, socket.data.uid).then(muted => {
      if (muted) return socket.emit('system:error', 'บัญชีนี้ถูกปิดการส่งอีโมตชั่วคราว');
      io.to(room.code).emit('room:emote', { from: player.name, e: emote, ch: player.ch || null });
    });
  });
}

module.exports = registerEmoteEvents;
