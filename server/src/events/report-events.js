// events/report-events.js — Socket.IO: รายงานผู้เล่นจากโต๊ะเล่นและหน้าสรุปผลจบตา
// client ส่งแค่ "เลขที่นั่ง" (client ไม่รู้ id บัญชีของคนอื่น) → เซิร์ฟเวอร์หาว่าใครนั่งที่นั้นในห้องเดียวกัน แล้วบันทึกลงฐานข้อมูล
// ฐานข้อมูล (record_report ใน supabase/v18_admin_tools.sql) กันรายงานซ้ำ/รัวอีกชั้น · แอดมินดูได้ในหน้าแอดมิน แท็บรายงาน
// Public: registerReportEvents(socket, ctx) · REPORT_REASONS
// EXTEND: เหตุผลใหม่ = เพิ่มใน REPORT_REASONS + check ของ reports.reason (SQL) + REASONS ใน client/public/Code/Report/report.js

const REPORT_REASONS = ['name', 'spam', 'cheat', 'afk'];
const REPORT_COOLDOWN_MS = 20 * 1000; // กดรายงานติด ๆ กันไม่ได้ (ฐานข้อมูลจำกัดวันละ 10 เรื่องอยู่แล้ว)
const NOTE_MAX = 300;

function registerReportEvents(socket, ctx) {
  const { rooms, SB } = ctx;

  const reply = (ok, message, extra) => socket.emit('report:done', { ok, message, ...(extra || {}) });

  // หาผู้ถูกรายงาน: ต้องเป็นคนจริงที่ล็อกอิน อยู่ห้องเดียวกัน และไม่ใช่ตัวเอง
  function findTarget(room, reporter, seat) {
    if (!Number.isInteger(seat)) return null;
    const target = room.players.find(p => p.seat === seat);
    if (!target || target === reporter || !target.uid) return null;
    return target;
  }

  ctx.on(socket, 'player:report', raw => {
    if (!ctx.allow(socket)) return;
    if (!(SB.enabled() && socket.data.uid)) return reply(false, 'รายงานได้เฉพาะตอนล็อกอินบัญชี');
    const room = rooms.get(socket.data.roomCode);
    const reporter = room && ctx.findPlayer(room, socket.id);
    if (!reporter) return reply(false, 'ต้องอยู่ในห้องเดียวกับผู้เล่นที่จะรายงาน');

    const data = ctx.obj(raw);
    const reason = String(data.reason || '');
    if (!REPORT_REASONS.includes(reason)) return reply(false, 'เลือกเหตุผลการรายงาน');
    const target = findTarget(room, reporter, Number(data.seat));
    if (!target) return reply(false, 'รายงานได้เฉพาะผู้เล่นที่ล็อกอินบัญชี (บอทและผู้เล่นทั่วไปรายงานไม่ได้)');

    const now = Date.now();
    if (socket.data.reportAt && now - socket.data.reportAt < REPORT_COOLDOWN_MS) return reply(false, 'รอสักครู่ก่อนรายงานอีกครั้ง');
    socket.data.reportAt = now;

    SB.rpc('record_report', {
      p_reporter: socket.data.uid,
      p_target: target.uid,
      p_reason: reason,
      p_note: String(data.note || '').slice(0, NOTE_MAX),
      p_game: room.rule || null,
      p_room: room.code || null,
    })
      .then(result => reply(true, 'ส่งรายงานแล้ว ขอบคุณที่ช่วยดูแลชุมชน', { duplicate: !!(result && result.duplicate) }))
      .catch(e => reply(false, (e && e.message) || 'ส่งรายงานไม่สำเร็จ'));
  });
}

module.exports = registerReportEvents;
module.exports.REPORT_REASONS = REPORT_REASONS;
